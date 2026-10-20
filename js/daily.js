/* =====================================================================
   内容自动扩充引擎（取代原来会"学到 290 词就停"的旧逻辑）
   设计目标：网站按真实词频自己往后引入新词，永不绕回、无需人工扩充。
   内容来源（按优先级自动取，哪级有就用哪级）——全部运行时动态获取，没有任何写死上限：
     1. 云端共享词库 __global_words__（Supabase，已预置数百词，并随用户使用自动累积）
     2. 运行时从真实词频队列 WORD_FREQ（约 2200 常用词，按使用频率逐日引入新词，永不绕回）
     3. 运行时从免费词典 / 翻译 API 现抓（音标 / 例句 / 中文，无需 key、支持 CORS）
     4. 浏览器端大模型（若云服务可用）补全中文；不可用则英文释义兜底
     5. 个人本地缓存（localStorage）+ 内置精选 / 种子词库仅作离线兜底
   所有词合并去重后写入全局 WORDS，课程引擎直接用它。词库会随使用持续增长，不是固定 253 个。
   ===================================================================== */
(function () {
  "use strict";

  /* ⚠️ 必须在任何地方改写 WORDS 之前先留一份底稿。
     下面 applyWords() 会用「云端共享词 + 本地生成词」重写全局 WORDS，
     如果不在这里快照，data.js 里人工编写的 253 个零基础词（带音标/例句/词根/解析）
     就会永远进不了词库 —— 用户学到的只剩下按词频现抓的词。 */
  var BASE_WORDS = (typeof WORDS !== "undefined" && WORDS.length) ? WORDS.slice() : [];

  var CFG = window.CLOUD_CONFIG || {};
  var SYNC = CFG.sync || {};
  var cloud = null;
  try {
    if (window.WorkBuddyCloud && CFG.endpoint && CFG.publishableKey) {
      cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CFG.endpoint,
        publishableKey: CFG.publishableKey
      });
    }
  } catch (e) { console.error("云服务初始化失败：", e); }

  window.DAILY_INFO = {
    status: cloud ? "loading" : "local",
    text: cloud ? "正在联网获取今日单词…" : "本地词库 · 每天自动从词典补充新词（联网后中文更准）"
  };
  window.TODAY_STR = localDateStr();

  // 口语基础库快照（data.js 的 72 句），稍后和分级语料、云端共享合并进全局 PHRASES
  var BASE_PHRASES = (typeof PHRASES !== "undefined") ? PHRASES.slice() : [];
  // 基础 72 句对应的阶段 level（沿用 curriculum 原分配：索引 0-40 对应 s1-s14）
  var BASE_PHRASE_LEVEL = {};
  [[1, [0, 1, 2]], [2, [3, 4, 5, 6]], [3, [7, 8, 9, 10]], [4, [11, 12]], [5, [13, 14, 15]],
   [6, [16, 17, 18]], [7, [19, 20]], [8, [21, 22, 23]], [9, [24, 25]], [10, [26, 27, 28]],
   [11, [29, 30, 31]], [12, [32, 33, 34]], [13, [35, 36, 37]], [14, [38, 39, 40]]].forEach(function (p) {
    p[1].forEach(function (i) { BASE_PHRASE_LEVEL[i] = p[0]; });
  });
  function phraseLevel(i) { return BASE_PHRASE_LEVEL[i] || 14; }

  // 虚词黑名单：这些不是"生词卡"该教的（语法课里教），自动跳过，不生成卡片
  var STOP = {};
  ("the of and to in for is on that by this with it not or be are from at as all more an was will can us if " +
   "has which their any only his first am out up may other do does did have had been being they he she we you i " +
   "me my your our them what who where when why how but so than then also just very could should would might must " +
   "shall been over under into about after before between during without within against off above below " +
   // —— 网站 SEO / 单位缩写 / 月份等"不是该背的生词"：来自 google-10000 前 2000 词的噪音，屏蔽掉
   "search page site pm am re jan info rights copyright policy products software services contact email web " +
   "links review list number date back top home free news business service price time system post online " +
   "health world data next used last most music buy make them should product good video well where public " +
   "books high school through each webb also rights school click view please available support message " +
   "best information services some these its like than find name just state year day two after then " +
   "rights public books high school each links review list name just over state year day into email two " +
   "pm jan info re search page site copyright policy products software services contact web links " +
   "mon fri sat sun oct nov dec feb mar apr aug sept sept").split(" ")
    .forEach(function (w) { STOP[w] = 1; });

  // 一个词能不能进「拼写/生词」体系：必须全小写、2~12 字母、且不是虚词黑名单。
  // 首字母大写的基本是专有名词（人名、地名、品牌），不该当"要背的单词"来考拼写
  // —— 比如 John / Mary / Tom。这一关既挡住新词生成，也用来清洗历史脏数据。
  function isSpellable(w) {
    return w && /^[a-z]{2,12}$/.test(w) && !STOP[w] && !NAMES[w];
  }

  // 常见英文名 / 姓氏黑名单：这些词基本只作专有名词用，不该当"要背的单词"考拼写
  // （john / mary / tom 这类）。注意只收「几乎不当普通英文词用」的名字，避免误伤
  // will / rose / mark / joy 这种本身也是常用词的词。共享上传前也会过这一关，
  // 不让人名再写进云端共享表污染其他用户。
  var NAMES = {};
  ("john mary james robert michael david william richard joseph thomas charles christopher " +
   "daniel matthew anthony paul andrew joshua kenneth kevin brian george edward ronald timothy " +
   "jason jeffrey ryan jacob gary nicholas eric jonathan stephen larry justin scott brandon " +
   "benjamin samuel gregory alexander patrick jack dennis jerry tyler aaron henry douglas peter " +
   "adam nathan zachary kyle noah ethan jeremy walter christian keith roger terry sean gerald " +
   "harold jeremiah lawrence arthur jesse bryan joe jordan billy bruce albert willie gabriel " +
   "logan alan juan wayne roy ralph randy eugene vincent russell louis philip bobby johnny " +
   "bradley patricia jennifer linda elizabeth barbara susan jessica sarah karen nancy lisa betty " +
   "margaret sandra ashley dorothy kimberly emily donna michelle carol amanda melissa deborah " +
   "stephanie rebecca sharon laura cynthia kathleen amy angela shirley anna brenda pamela emma " +
   "nicole helen samantha katherine christine debbie rachel carolyn janet catherine maria heather " +
   "diane olivia julie joyce victoria kelly christina lauren joan evelyn judith megan cheryl " +
   "andrea hannah martha jacqueline frances charlotte fred sam tom jim bob ron ted dan " +
   "smith johnson williams brown jones miller davis garcia rodriguez wilson martinez anderson " +
   "thompson harris sanchez lewis robinson torres nguyen flores adams nelson rivera campbell " +
   "mitchell roberts").split(" ")
    .forEach(function (w) { NAMES[w] = 1; });

  /* ---------------- 工具 ---------------- */
  function localDateStr(d) {
    d = d || new Date();
    var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"),
        day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  /* ---------------- 断更补齐 ----------------
     记录"上次补充词库的日期"（localStorage），回来时按漏掉的天数一次性补齐，
     最多补齐 MAX_MAKEUP_DAYS 天，避免一次抓太多打爆免费 API。 */
  var SUP_KEY = "el_lastsup";
  var DAILY_N = 30;            // 每天常态化补充量（与 pickDaily 批次一致）
  var MAX_MAKEUP_DAYS = 14;    // 断更最多补齐的天数上限
  function readLastSup() { try { return localStorage.getItem(SUP_KEY) || null; } catch (e) { return null; } }
  function writeLastSup(d) { try { localStorage.setItem(SUP_KEY, d); } catch (e) {} }
  function daysBetween(a, b) {
    if (!a) return 0;
    var da = new Date(a + "T00:00:00"), db = new Date(b + "T00:00:00");
    if (isNaN(da) || isNaN(db)) return 0;
    var diff = Math.round((db - da) / 86400000);
    return diff > 0 ? diff : 0;
  }
  function pickDaily(list, n, dateStr) {
    list = list || [];
    if (!list.length) return [];
    var h = 0;
    for (var i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
    var start = h % list.length, out = [];
    for (var k = 0; k < n; k++) out.push(list[(start + k) % list.length]);
    return out;
  }
  /* 取新词：从"日期哈希位置"起回绕扫描整个池子，只收"库里还没有 + 可拼写 + 非黑名单"的词。
     关键改进：① 回绕 → 池子走到尽头也不会"假耗尽"后停摆；② 跳过 have（已入库的）→ 绝不重复加。
     最多扫一遍池子就停，池子真走完时优雅返回现有能找到的全部，不会死循环。 */
  function pickFresh(list, n, dateStr, have) {
    list = list || [];
    if (!list.length) return [];
    var h = 0;
    for (var i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
    var start = h % list.length, out = [], seen = {}, scanned = 0;
    while (out.length < n && scanned < list.length) {
      var w = list[(start + scanned) % list.length];
      scanned++;
      if (!w || have[w] || seen[w]) continue;
      if (STOP[w] || !/^[a-z]{2,12}$/.test(w)) continue;
      seen[w] = 1; out.push(w);
    }
    return out;
  }
  /* 限并发执行：同一时刻最多 limit 个异步任务在跑，避免一次性打爆免费 API */
  async function mapLimit(arr, limit, fn) {
    var i = 0, out = new Array(arr.length);
    async function worker() {
      while (i < arr.length) {
        var idx = i++;
        if (idx >= arr.length) break;
        out[idx] = await fn(arr[idx], idx);
      }
    }
    var ws = [], n = Math.min(limit, arr.length);
    for (var c = 0; c < n; c++) ws.push(worker());
    await Promise.all(ws);
    return out;
  }
  function extractJSON(str) {
    if (!str) return {};
    var s = String(str).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    var a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a < 0 || b < 0 || b < a) return {};
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return {}; }
  }
  function safeRender() { try { if (typeof render === "function") render(); } catch (e) {} }

  /* ---------------- 网络：免费词典 API（音标 / 例句，永远可用） ---------------- */
  async function fetchDict(w) {
    try {
      var r = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(w.toLowerCase()));
      if (!r.ok) return null;
      var arr = await r.json(), first = arr[0] || {};
      var ph = (first.phonetics || []).map(function (p) { return p.text; }).find(Boolean) || "";
      var m0 = (first.meanings || [])[0] || {};
      var pos = m0.partOfSpeech || "";
      var def0 = (m0.definitions || [])[0] || {};
      return { w: w, ph: ph, pos: pos, def: def0.definition || "", ex: def0.example || "" };
    } catch (e) { return null; }
  }

  /* ---------------- 网络：免费翻译 API（中文兜底，零依赖、无需 key、CORS 开放） ---------------- */
  function hasCJK(s) { return /[\u4e00-\u9fff]/.test(String(s || "")); }
  async function fetchCn(w) {
    try {
      var r = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(w) + "&langpair=en|zh-CN");
      if (!r.ok) return null;
      var d = await r.json();
      var t = d && d.responseData && d.responseData.translatedText;
      // 过滤掉配额/警告占位文本；正常中文释义才采用
      if (t && d.responseStatus === 200 && !/MYMEMORY|QUOTA|WARNING|WE COULD NOT/i.test(t)) {
        var s = String(t).trim();
        // ⚠️ 关键校验：mymemory 查不到译文时会「原样返回英文单词」（如 digital → digital），
        // 不校验就会把英文词当成中文释义存进词库。必须是真中文、且不等于原词才采用。
        if (hasCJK(s) && s.toLowerCase() !== String(w).toLowerCase()) return s;
      }
      return null;
    } catch (e) { return null; }
  }

  /* ---------------- 网络：大模型补全中文（可选） ---------------- */
  async function getModel() {
    try {
      var cached = localStorage.getItem("el_model");
      if (cached) return { id: cached };
      var models = await cloud.llm.models.list();
      var list = models || [];
      var m = list.find(function (x) { return x.disabled !== true; }) || list[0];
      if (!m) return null;
      localStorage.setItem("el_model", m.id);
      return { id: m.id };
    } catch (e) { return null; }
  }
  async function genCn(dict) {
    var model = await getModel();
    if (!model) return null;
    var sys = "你是一个为零基础中文学习者编写英语词库的助手。根据英文单词及在线词典信息，只输出一个 JSON 对象（不要 markdown、不要额外文字）。字段：cn(中文释义，顿号分隔，简洁), pos(词性), s(一个 A2 简单英文例句), sentCn(例句中文翻译)。";
    var user = "单词: " + dict.w + "\n音标: " + (dict.ph || "（无）") + "\n词性: " + (dict.pos || "（无）") + "\n英文释义: " + (dict.def || "（无）");
    var answer = "";
    try {
      for await (var chunk of cloud.llm.chat.completions.create({
        model: model.id, stream: true,
        messages: [{ role: "system", content: sys }, { role: "user", content: user }]
      })) {
        var d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if (d) answer += d;
      }
    } catch (e) { return null; }
    var j = extractJSON(answer);
    // AI 偶尔也会漏出英文，必须校验是真中文才采用
    if (!j.cn || !hasCJK(j.cn)) return null;
    return { cn: j.cn, pos: j.pos || dict.pos || "", s: j.s || dict.ex || dict.def || dict.w, sentCn: j.sentCn || "" };
  }

  // 合成一个单词条目：优先种子，其次大模型，最后英文释义兜底
  function assemble(w, dict, extra) {
    dict = dict || {}; extra = extra || {};
    // 中文释义只接受真中文；拿不到就留空（界面上会提示「暂无中文释义」），
    // 绝不把英文释义 / 英文单词本身冒充中文 —— 否则「看中文拼英文」根本没法做。
    var cn = (extra.cn && hasCJK(extra.cn)) ? extra.cn : "";
    var s = extra.s || dict.ex || (dict.def ? ("e.g. " + dict.def) : w);
    return {
      w: w,
      ph: dict.ph || "",
      cn: cn,
      s: s,
      sentCn: extra.sentCn || "",
      pos: extra.pos || dict.pos || "",
      def: dict.def || "",
      src: extra.cn ? "seed" : (dict.def ? "api" : "miss")
    };
  }

  /* ---------------- 本地 + 云端共享词库缓存 ---------------- */
  function readLib() { try { return JSON.parse(localStorage.getItem("el_lib_v2") || "[]"); } catch (e) { return []; } }
  function saveLib(lib) { try { localStorage.setItem("el_lib_v2", JSON.stringify(lib)); } catch (e) {} }

  function sbHeaders() {
    return {
      "apikey": SYNC.anonKey || "", "Authorization": "Bearer " + (SYNC.anonKey || ""),
      "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"
    };
  }
  // 云端共享词库：复用已有的 learning_progress 表，用保留主键 __global_words__ 存全站累积的生成词。
  // 这样无需新建表，零配置即可让"一个用户生成的词，其他用户也能学到"（best-effort，失败不影响本地）。
  var SHARED_KEY = "__global_words__";
  async function sbLoadShared() {
    if (!SYNC.enabled || !SYNC.url) return [];
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_KEY + "&select=data", { headers: sbHeaders() });
      if (!r.ok) return [];
      var rows = await r.json();
      var arr = (rows && rows[0] && rows[0].data && rows[0].data.words) || [];
      return arr.map(function (x) { return { w: x.w, ph: x.ph || "", cn: x.cn || "", s: x.s || "", sentCn: x.sentCn || "", pos: x.pos || "", src: "cloud" }; });
    } catch (e) { return []; }
  }
  async function sbUpsert(words) {
    if (!SYNC.enabled || !SYNC.url || !words.length) return;
    // 上传前先过滤：只共享"真能拼写"的词典词，绝不把名字/专有名词写进共享表污染所有人
    words = (words || []).filter(function (x) { return x && isSpellable(x.w); });
    if (!words.length) return;
    try {
      // 读出已有共享词，合并新词后整行写回（保留主键那一行）
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_KEY + "&select=data", { headers: sbHeaders() });
      var old = [];
      if (r.ok) { var rows = await r.json(); old = (rows && rows[0] && rows[0].data && rows[0].data.words) || []; }
      var seen = {}, merged = [];
      old.forEach(function (x) { if (x && x.w && !seen[x.w]) { seen[x.w] = 1; merged.push(x); } });
      words.forEach(function (x) { if (x && x.w && !seen[x.w]) { seen[x.w] = 1; merged.push(x); } });
      await fetch(SYNC.url + "/rest/v1/learning_progress", {
        method: "POST", headers: sbHeaders(),
        body: JSON.stringify([{ profile_id: SHARED_KEY, data: { words: merged }, updated_at: new Date().toISOString() }])
      });
    } catch (e) {}
  }

  /* ---------------- 装配全局 WORDS（基础 + 种子 + 本地/云端生成） ---------------- */
  function applyWords(lib) {
    var seen = {}, out = [];
    function add(w) {
      if (!w || !w.w || seen[w.w]) return;
      // 人名 / 专有名词（首字母大写的 John/Mary/Tom 之类）不是"要背的单词"，
      // 一律不进拼写体系。这条同时清洗「云端共享词库 / 本地存档」里已被污染的人名。
      if (!isSpellable(w.w)) return;
      seen[w.w] = 1;
      // 历史脏数据清洗：早期版本可能把「翻译 API 原样返回的英文」存成了中文释义
      // （如 digital 的 cn 就是 "digital"）。凡是不含真中文的释义一律清空，
      // 界面会显示「暂无中文释义」，比拿英文冒充中文诚实。
      if (w.cn && !hasCJK(w.cn)) w.cn = "";
      out.push(w);
    }
    // 云端共享 / 本地累积的词优先（运行时动态抓取、逐日扩充的部分）
    (lib || []).forEach(add);
    // 以下为离线兜底：断网或云端不可达时才用，绝不写死上限
    (typeof BASE_WORDS !== "undefined" ? BASE_WORDS : []).forEach(add);
    var seed = (typeof WORD_SEED !== "undefined") ? WORD_SEED : {};
    Object.keys(seed).forEach(function (k) {
      var s = seed[k];
      add({ w: k, ph: s.ph || "", cn: s.cn, s: s.s, sentCn: s.sentCn || "", pos: s.pos || "", src: "seed" });
    });
    WORDS = out;
    // 顺手把「已学会的词 / 今日已学单词」里可能混进去的人名脏词清掉，
    // 不然首页进度、单词卡还会把 John 这类当已掌握单词秀出来。
    if (typeof S !== "undefined" && S) {
      if (Array.isArray(S.learned)) S.learned = S.learned.filter(function (x) { return isSpellable(x); });
      if (Array.isArray(S.todayWords)) S.todayWords = S.todayWords.filter(function (x) { return isSpellable(x); });
    }
  }

  /* ---------------- 口语（PHRASES）动态装配：基础72 + 分级语料 + 云端共享 ----------------
     基础 72 句永远排在最前（索引 0-71 稳定，"已会"记录才不会因为顺序变化而错位），
     之后接分级扩展语料（phrases-extra.js，按 level 1-14），最后接云端共享新增句。
     今日练哪几句由 app.js 的 todayPhrases() 按用户当前阶段 level 过滤决定。 */
  var SHARED_PHRASES_KEY = "__global_phrases__";
  async function sbLoadSharedPhrases() {
    if (!SYNC.enabled || !SYNC.url) return [];
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_PHRASES_KEY + "&select=data", { headers: sbHeaders() });
      if (!r.ok) return [];
      var rows = await r.json();
      var arr = (rows && rows[0] && rows[0].data && rows[0].data.phrases) || [];
      return arr.map(function (x) { return { en: x.en, cn: x.cn || "", ph: x.ph || "", level: x.level || 14 }; });
    } catch (e) { return []; }
  }
  async function sbUpsertPhrases(arr) {
    if (!SYNC.enabled || !SYNC.url || !arr.length) return;
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_PHRASES_KEY + "&select=data", { headers: sbHeaders() });
      var old = [];
      if (r.ok) { var rows = await r.json(); old = (rows && rows[0] && rows[0].data && rows[0].data.phrases) || []; }
      var seen = {}, merged = [];
      old.forEach(function (x) { if (x && x.en && !seen[x.en]) { seen[x.en] = 1; merged.push(x); } });
      arr.forEach(function (x) { if (x && x.en && !seen[x.en]) { seen[x.en] = 1; merged.push(x); } });
      await fetch(SYNC.url + "/rest/v1/learning_progress", {
        method: "POST", headers: sbHeaders(),
        body: JSON.stringify([{ profile_id: SHARED_PHRASES_KEY, data: { phrases: merged }, updated_at: new Date().toISOString() }])
      });
    } catch (e) {}
  }
  function applyPhrases(extra, shared) {
    var seen = {}, out = [];
    function add(p) { if (p && p.en && !seen[p.en]) { seen[p.en] = 1; out.push(p); } }
    BASE_PHRASES.forEach(function (p, i) { var q = {}; for (var k in p) q[k] = p[k]; q.level = q.level || phraseLevel(i); add(q); });
    (extra || []).forEach(function (p) { var q = {}; for (var k in p) q[k] = p[k]; q.level = q.level || 14; add(q); });
    (shared || []).forEach(function (p) { var q = {}; for (var k in p) q[k] = p[k]; q.level = q.level || 14; add(q); });
    PHRASES = out;
    return out;
  }
  async function loadDailyPhrases() {
    var shared = await sbLoadSharedPhrases();
    // PHRASES_NATIVE：native 真会说的地道口语（按场景分组），和课文英语一起进库
    var extra = ((typeof PHRASES_EXTRA !== "undefined") ? PHRASES_EXTRA : [])
      .concat((typeof PHRASES_NATIVE !== "undefined") ? PHRASES_NATIVE : []);
    applyPhrases(extra, shared);
    // 首次（云端还没存过）把分级语料也写进共享，让其他用户能学到
    if (shared.length === 0 && extra.length) {
      sbUpsertPhrases(extra.map(function (p) { return { en: p.en, cn: p.cn, ph: p.ph, level: p.level }; }));
    }
    return PHRASES;
  }

  /* ---------------- 自建 Python 后端（可选层）----------------
     填了 CLOUD_CONFIG.backend 后，补词走 /api/enrich（服务端爬词典 + AI 整理），
     不填或后端没出结果时自动回落原直连管线，绝不卡住。 */
  function backendBase() {
    var b = (window.CLOUD_CONFIG && window.CLOUD_CONFIG.backend) || "";
    b = (b || "").trim();
    return b ? b.replace(/\/+$/, "") : "";
  }
  async function enrichWord(w) {
    var base = backendBase();
    if (!base) return null;
    try {
      var r = await fetch(base + "/api/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: w })
      });
      if (!r.ok) return null;
      var j = await r.json();
      if (j && j.ai) {
        var p = extractJSON(j.ai);
        if (p && p.cn) {
          return { w: w, ph: p.ph || "", cn: p.cn, s: p.s || w, sentCn: p.sentCn || "", pos: p.pos || "", def: p.cn, src: "backend" };
        }
      }
      return null;   // 后端没给结构化结果 → 回落原管线
    } catch (e) { return null; }
  }

  // 把用户学习画像发给后端 /api/plan，让 AI 给出今日重点（不配后端则回落 null）
  function fetchPlan(profile) {
    var base = backendBase();
    if (!base) return Promise.resolve(null);
    return fetch(base + "/api/plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: profile || {} })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* ---------------- 主流程 ---------------- */
  async function loadDailyWords() {
    var dateStr = localDateStr();
    var lib = readLib();
    var shared = await sbLoadShared();          // 云端共享词库（其他用户生成过的）
    if (shared.length) lib = lib.concat(shared);

    var have = {};
    (typeof BASE_WORDS !== "undefined" ? BASE_WORDS : []).forEach(function (w) { have[w.w] = 1; });
    var seed = (typeof WORD_SEED !== "undefined") ? WORD_SEED : {};
    Object.keys(seed).forEach(function (k) { have[k] = 1; });
    lib.forEach(function (w) { have[w.w] = 1; });

    // 候选队列：基础词频表 + 中级补充词表（B1–B2）拼接，池子更大、质量更干净，且取词会回绕
    var queue = []
      .concat((typeof WORD_FREQ !== "undefined" && WORD_FREQ.length) ? WORD_FREQ : [])
      .concat((typeof WORD_FREQ_EXTRA !== "undefined" && WORD_FREQ_EXTRA.length) ? WORD_FREQ_EXTRA : [])
      .concat((typeof WORD_LIST !== "undefined" && WORD_LIST.length) ? WORD_LIST : []);

    // 断更补齐：上次补充到今天差几天，就一次性补几天（封顶 MAX_MAKEUP_DAYS）
    var missed = daysBetween(readLastSup(), dateStr);
    var days = Math.max(1, Math.min(missed + 1, MAX_MAKEUP_DAYS));   // +1 含今天；同一天则只补 1 天
    var want = Math.min(days * DAILY_N, (queue && queue.length) || 0);
    var makeupNote = days > 1 ? ("补齐 " + days + " 天漏学的") : "今日";

    var picked = pickFresh(queue, want, dateStr, have);
    var need = picked;

    if (!need.length) {
      writeLastSup(dateStr);                     // 今天已补过，记一下，避免重复补
      window.DAILY_INFO = { status: "ok", text: "🌐 词库已就绪 · 共 " + WORDS.length + " 词（每天自动补充）" };
      applyWords(lib); safeRender();
      return { words: WORDS, info: window.DAILY_INFO };
    }

    window.DAILY_INFO = { status: "loading", text: "🌐 正在" + makeupNote + "新词… (0/" + need.length + ")" };
    safeRender();

    var fresh = [];
    var done = 0;
    var results = await mapLimit(need, 4, function (w) {
      return (async function () {
        // 优先走自建 Python 后端：服务端爬词典 + AI 整理（绕过 CORS、藏 key）
        if (backendBase()) {
          var be = await enrichWord(w);
          if (be) {
            done++;
            window.DAILY_INFO = { status: "loading", text: "🌐 正在" + makeupNote + "新词… (" + done + "/" + need.length + ")" };
            safeRender();
            return be;
          }
          // 后端未出结果（没配 key / 网络异常）→ 回落原直连管线
        }
        var dict = await fetchDict(w);
        var extra = (seed[w]) || null;
        if (!extra) { var cn = await fetchCn(w); if (cn) extra = { cn: cn }; }   // 翻译 API：中文零依赖兜底
        if (!extra && cloud) { var g = await genCn(dict || { w: w }); if (g) extra = g; }
        if (!dict && !extra) return null;            // 连词典都查不到，跳过这个词
        done++;
        window.DAILY_INFO = { status: "loading", text: "🌐 正在" + makeupNote + "新词… (" + done + "/" + need.length + ")" };
        safeRender();
        return assemble(w, dict, extra || {});
      })();
    });
    for (var ri = 0; ri < results.length; ri++) { if (results[ri]) fresh.push(results[ri]); }

    if (fresh.length) {
      lib = lib.concat(fresh);
      saveLib(lib);
      sbUpsert(fresh);                          // 写回云端共享词库，其他用户也能用
    }
    writeLastSup(dateStr);                       // 无论补了多少，今天算补过了
    applyWords(lib);
    window.DAILY_INFO = {
      status: "ok",
      text: "🌐 " + makeupNote + "新词 " + fresh.length + " 个 · 词库共 " + WORDS.length + " 词"
    };
    safeRender();
    return { words: WORDS, info: window.DAILY_INFO };
  }

  /* ---------------- 阅读（READING）动态装配：基础12 + 分级语料 + 云端共享 ---------------- */
  var SHARED_READING_KEY = "__global_reading__";
  async function sbLoadSharedReading() {
    if (!SYNC.enabled || !SYNC.url) return [];
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_READING_KEY + "&select=data", { headers: sbHeaders() });
      if (!r.ok) return [];
      var rows = await r.json();
      var arr = (rows && rows[0] && rows[0].data && rows[0].data.reading) || [];
      return arr.map(function (x) { return { lv: x.lv || 1, topic: x.topic || "", title: x.title || "", en: x.en || "", cn: x.cn || "" }; });
    } catch (e) { return []; }
  }
  async function sbUpsertReading(arr) {
    if (!SYNC.enabled || !SYNC.url || !arr.length) return;
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_READING_KEY + "&select=data", { headers: sbHeaders() });
      var old = [];
      if (r.ok) { var rows = await r.json(); old = (rows && rows[0] && rows[0].data && rows[0].data.reading) || []; }
      var seen = {}, merged = [];
      old.forEach(function (x) { if (x && x.title && !seen[x.title]) { seen[x.title] = 1; merged.push(x); } });
      arr.forEach(function (x) { if (x && x.title && !seen[x.title]) { seen[x.title] = 1; merged.push(x); } });
      await fetch(SYNC.url + "/rest/v1/learning_progress", { method: "POST", headers: sbHeaders(), body: JSON.stringify([{ profile_id: SHARED_READING_KEY, data: { reading: merged }, updated_at: new Date().toISOString() }]) });
    } catch (e) {}
  }
  function applyReading(extra, shared) {
    var seen = {}, out = [];
    function add(p) { if (p && p.title && !seen[p.title]) { seen[p.title] = 1; out.push(p); } }
    (typeof READING !== "undefined" ? READING : []).forEach(add);
    (extra || []).forEach(add);
    (shared || []).forEach(add);
    READING = out;
    return out;
  }
  async function loadDailyReading() {
    var shared = await sbLoadSharedReading();
    var extra = (typeof READING_EXTRA !== "undefined") ? READING_EXTRA : [];
    applyReading(extra, shared);
    if (shared.length === 0 && extra.length) sbUpsertReading(extra.map(function (p) { return { lv: p.lv, topic: p.topic, title: p.title, en: p.en, cn: p.cn }; }));
    return READING;
  }

  /* ---------------- 语法（GRAMMAR）动态装配：基础20 + 分级课 + 云端共享 ---------------- */
  var SHARED_GRAMMAR_KEY = "__global_grammar__";
  var BASE_GRAMMAR_LEVEL = {};
  [[1, [0]], [2, [1, 2]], [3, [3]], [4, [4]], [5, [5]], [6, [6]], [7, [7]], [8, [8]], [9, [9]], [10, [10, 11]], [11, [12, 13]], [12, [14, 15]], [13, [16, 17]], [14, [18, 19]]].forEach(function (p) {
    p[1].forEach(function (i) { BASE_GRAMMAR_LEVEL[i] = p[0]; });
  });
  function grammarLevel(i) { return BASE_GRAMMAR_LEVEL[i] || 14; }
  async function sbLoadSharedGrammar() {
    if (!SYNC.enabled || !SYNC.url) return [];
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_GRAMMAR_KEY + "&select=data", { headers: sbHeaders() });
      if (!r.ok) return [];
      var rows = await r.json();
      var arr = (rows && rows[0] && rows[0].data && rows[0].data.grammar) || [];
      return arr.map(function (x) { return x; });
    } catch (e) { return []; }
  }
  async function sbUpsertGrammar(arr) {
    if (!SYNC.enabled || !SYNC.url || !arr.length) return;
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_GRAMMAR_KEY + "&select=data", { headers: sbHeaders() });
      var old = [];
      if (r.ok) { var rows = await r.json(); old = (rows && rows[0] && rows[0].data && rows[0].data.grammar) || []; }
      var seen = {}, merged = [];
      old.forEach(function (x) { if (x && x.t && !seen[x.t]) { seen[x.t] = 1; merged.push(x); } });
      arr.forEach(function (x) { if (x && x.t && !seen[x.t]) { seen[x.t] = 1; merged.push(x); } });
      await fetch(SYNC.url + "/rest/v1/learning_progress", { method: "POST", headers: sbHeaders(), body: JSON.stringify([{ profile_id: SHARED_GRAMMAR_KEY, data: { grammar: merged }, updated_at: new Date().toISOString() }]) });
    } catch (e) {}
  }
  function applyGrammar(extra, shared) {
    var seen = {}, out = [];
    function add(p) { if (p && p.t && !seen[p.t]) { seen[p.t] = 1; out.push(p); } }
    // 云端共享的语法优先（运行时动态提供、可随时在云端增删，不写死在代码里）
    (shared || []).forEach(add);
    (extra || []).forEach(function (p) { var q = {}; for (var k in p) q[k] = p[k]; q.level = q.level || 14; add(q); });
    // 本地语法仅作离线兜底
    (typeof GRAMMAR !== "undefined" ? GRAMMAR : []).forEach(function (p, i) { var q = {}; for (var k in p) q[k] = p[k]; q.level = q.level || grammarLevel(i); add(q); });
    GRAMMAR = out;
    return out;
  }
  async function loadDailyGrammar() {
    var shared = await sbLoadSharedGrammar();
    var extra = (typeof GRAMMAR_EXTRA !== "undefined") ? GRAMMAR_EXTRA : [];
    applyGrammar(extra, shared);
    if (shared.length === 0 && extra.length) sbUpsertGrammar(extra.map(function (p) { return p; }));
    return GRAMMAR;
  }

  /* ---------------- 用法（PHRASALVERBS）动态装配：基础种子 + 云端共享 ---------------- */
  var SHARED_PHRASALS_KEY = "__global_phrasals__";
  async function sbLoadSharedPhrasals() {
    if (!SYNC.enabled || !SYNC.url) return [];
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_PHRASALS_KEY + "&select=data", { headers: sbHeaders() });
      if (!r.ok) return [];
      var rows = await r.json();
      var arr = (rows && rows[0] && rows[0].data && rows[0].data.phrasals) || [];
      return arr.map(function (x) { return { phrase: x.phrase, cn: x.cn || "", ex: x.ex || "", exCn: x.exCn || "", level: x.level || 1, note: x.note || "", pat: x.pat || "", tests: x.tests || [] }; });
    } catch (e) { return []; }
  }
  async function sbUpsertPhrasals(arr) {
    if (!SYNC.enabled || !SYNC.url || !arr.length) return;
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_PHRASALS_KEY + "&select=data", { headers: sbHeaders() });
      var old = [];
      if (r.ok) { var rows = await r.json(); old = (rows && rows[0] && rows[0].data && rows[0].data.phrasals) || []; }
      var seen = {}, merged = [];
      old.forEach(function (x) { if (x && x.phrase && !seen[x.phrase]) { seen[x.phrase] = 1; merged.push(x); } });
      arr.forEach(function (x) { if (x && x.phrase && !seen[x.phrase]) { seen[x.phrase] = 1; merged.push(x); } });
      await fetch(SYNC.url + "/rest/v1/learning_progress", {
        method: "POST", headers: sbHeaders(),
        body: JSON.stringify([{ profile_id: SHARED_PHRASALS_KEY, data: { phrasals: merged }, updated_at: new Date().toISOString() }])
      });
    } catch (e) {}
  }
  function applyPhrasals(shared) {
    var seen = {}, out = [];
    function add(p) { if (p && p.phrase && !seen[p.phrase]) { seen[p.phrase] = 1; out.push(p); } }
    // 云端共享优先（运行时动态提供、可随时增删），本地种子仅作离线兜底
    (shared || []).forEach(add);
    (typeof PHRASALVERBS !== "undefined" ? PHRASALVERBS : []).forEach(function (p) { var q = {}; for (var k in p) q[k] = p[k]; q.level = q.level || 1; add(q); });
    PHRASALVERBS = out;
    return out;
  }
  async function loadDailyPhrasals() {
    var shared = await sbLoadSharedPhrasals();
    applyPhrasals(shared);
    if (shared.length === 0 && (typeof PHRASALVERBS !== "undefined") && PHRASALVERBS.length) {
      sbUpsertPhrasals(PHRASALVERBS.map(function (p) { return p; }));
    }
    return PHRASALVERBS;
  }

  /* ---------------- 语法测验题库（__global_gquiz__）：云端动态提供，可随时增删 ----------------
     每节课除了自带 quiz，还可以在云端放「换题库」：用户答对过的原题会被这里的题替换掉，
     这样重做时不会一直看到同一道已会的题。键用「课标题」保证顺序变动也不错位。 */
  var SHARED_GQUIZ_KEY = "__global_gquiz__";
  window.GQUIZ_BANK = window.GQUIZ_BANK || {};   // { "第1课：be 动词…": [ {q,opts,a,e}, … ] }（云端动态提供）
  async function sbLoadSharedGQuiz() {
    if (!SYNC.enabled || !SYNC.url) return {};
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_GQUIZ_KEY + "&select=data", { headers: sbHeaders() });
      if (!r.ok) return {};
      var rows = await r.json();
      var d = (rows && rows[0] && rows[0].data) || {};
      return d.bank || {};
    } catch (e) { return {}; }
  }
  async function loadDailyGQuiz() {
    window.GQUIZ_BANK = await sbLoadSharedGQuiz();
    return window.GQUIZ_BANK;
  }

  window.DailyEngine = {
    loadDailyWords: loadDailyWords, loadDailyPhrases: loadDailyPhrases,
    loadDailyReading: loadDailyReading, loadDailyGrammar: loadDailyGrammar, loadDailyPhrasals: loadDailyPhrasals, loadDailyGQuiz: loadDailyGQuiz,
    pickDaily: pickDaily, extractJSON: extractJSON,
    localDateStr: localDateStr, fetchDict: fetchDict, genCn: genCn,
    applyWords: applyWords, applyPhrases: applyPhrases, applyReading: applyReading, applyGrammar: applyGrammar, applyPhrasals: applyPhrasals
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { pickDaily: pickDaily, extractJSON: extractJSON, localDateStr: localDateStr };
  }
})();
