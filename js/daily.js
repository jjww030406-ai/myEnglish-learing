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
   "shall been over under into about after before between during without within against off above below").split(" ")
    .forEach(function (w) { STOP[w] = 1; });

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
  async function fetchCn(w) {
    try {
      var r = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(w) + "&langpair=en|zh-CN");
      if (!r.ok) return null;
      var d = await r.json();
      var t = d && d.responseData && d.responseData.translatedText;
      // 过滤掉配额/警告占位文本；正常中文释义才采用
      if (t && d.responseStatus === 200 && !/MYMEMORY|QUOTA|WARNING|WE COULD NOT/i.test(t)) return String(t).trim();
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
    if (!j.cn) return null;
    return { cn: j.cn, pos: j.pos || dict.pos || "", s: j.s || dict.ex || dict.def || dict.w, sentCn: j.sentCn || "" };
  }

  // 合成一个单词条目：优先种子，其次大模型，最后英文释义兜底
  function assemble(w, dict, extra) {
    dict = dict || {}; extra = extra || {};
    var cn = extra.cn || (dict.def ? dict.def : "（暂无释义）");
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
    function add(w) { if (w && w.w && !seen[w.w]) { seen[w.w] = 1; out.push(w); } }
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
    var extra = (typeof PHRASES_EXTRA !== "undefined") ? PHRASES_EXTRA : [];
    applyPhrases(extra, shared);
    // 首次（云端还没存过）把分级语料也写进共享，让其他用户能学到
    if (shared.length === 0 && extra.length) {
      sbUpsertPhrases(extra.map(function (p) { return { en: p.en, cn: p.cn, ph: p.ph, level: p.level }; }));
    }
    return PHRASES;
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

    // 候选队列：优先 2200 词真实词频表（永不绕回），其次旧的有限清单
    var queue = (typeof WORD_FREQ !== "undefined" && WORD_FREQ.length) ? WORD_FREQ
              : (typeof WORD_LIST !== "undefined" ? WORD_LIST : []);

    // 断更补齐：上次补充到今天差几天，就一次性补几天（封顶 MAX_MAKEUP_DAYS）
    var missed = daysBetween(readLastSup(), dateStr);
    var days = Math.max(1, Math.min(missed + 1, MAX_MAKEUP_DAYS));   // +1 含今天；同一天则只补 1 天
    var want = Math.min(days * DAILY_N, (queue && queue.length) || 0);
    var makeupNote = days > 1 ? ("补齐 " + days + " 天漏学的") : "今日";

    var picked = pickDaily(queue, want, dateStr);
    var need = picked.filter(function (w) { return !have[w] && !STOP[w] && /^[a-z]{2,12}$/.test(w); });

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
