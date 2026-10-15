/* =====================================================================
   内容自动扩充引擎（取代原来会"学到 290 词就停"的旧逻辑）
   设计目标：网站按真实词频自己往后引入新词，永不绕回、无需人工扩充。
   内容来源（按优先级自动取，哪级有就用哪级）：
     1. 内置精选词库 BASE_WORDS（253 个，含 34 个词源详解）
     2. 种子词库 WORD_SEED（最常用的几百个内容词，带中文，零依赖）
     3. 运行时从免费词典 API 现抓（音标 / 例句，无需 key、支持 CORS）
     4. 浏览器端大模型（若云服务可用）补全中文；不可用则英文释义兜底
     5. 个人本地缓存（localStorage）+ 云端共享词库（Supabase，自动累积）
   所有词合并去重后写入全局 WORDS，课程引擎直接用它。
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
  function pickDaily(list, n, dateStr) {
    list = list || [];
    if (!list.length) return [];
    var h = 0;
    for (var i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
    var start = h % list.length, out = [];
    for (var k = 0; k < n; k++) out.push(list[(start + k) % list.length]);
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
    (typeof BASE_WORDS !== "undefined" ? BASE_WORDS : []).forEach(add);
    // 种子表
    var seed = (typeof WORD_SEED !== "undefined") ? WORD_SEED : {};
    Object.keys(seed).forEach(function (k) {
      var s = seed[k];
      add({ w: k, ph: s.ph || "", cn: s.cn, s: s.s, sentCn: s.sentCn || "", pos: s.pos || "", src: "seed" });
    });
    (lib || []).forEach(add);
    WORDS = out;
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

    var picked = pickDaily(queue, 12, dateStr);
    var need = picked.filter(function (w) { return !have[w] && !STOP[w] && /^[a-z]{2,12}$/.test(w); });

    if (!need.length) {
      window.DAILY_INFO = { status: "ok", text: "🌐 词库已就绪 · 共 " + WORDS.length + " 词（每天自动补充）" };
      applyWords(lib); safeRender();
      return { words: WORDS, info: window.DAILY_INFO };
    }

    window.DAILY_INFO = { status: "loading", text: "🌐 正在补充新词… (0/" + need.length + ")" };
    safeRender();

    var fresh = [];
    for (var i = 0; i < need.length; i++) {
      var w = need[i];
      var dict = await fetchDict(w);
      var extra = (seed[w]) || null;
      if (!extra && cloud) { var g = await genCn(dict || { w: w }); if (g) extra = g; }
      if (!dict && !extra) continue;            // 连词典都查不到，跳过这个词
      var entry = assemble(w, dict, extra || {});
      fresh.push(entry);
      window.DAILY_INFO = { status: "loading", text: "🌐 正在补充新词… (" + (i + 1) + "/" + need.length + ")" };
      safeRender();
    }

    if (fresh.length) {
      lib = lib.concat(fresh);
      saveLib(lib);
      sbUpsert(fresh);                          // 写回云端共享词库，其他用户也能用
    }
    applyWords(lib);
    window.DAILY_INFO = {
      status: "ok",
      text: "🌐 今日新增 " + fresh.length + " 个单词 · 词库共 " + WORDS.length + " 词（每天自动补充）"
    };
    safeRender();
    return { words: WORDS, info: window.DAILY_INFO };
  }

  window.DailyEngine = {
    loadDailyWords: loadDailyWords, pickDaily: pickDaily, extractJSON: extractJSON,
    localDateStr: localDateStr, fetchDict: fetchDict, genCn: genCn, applyWords: applyWords
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { pickDaily: pickDaily, extractJSON: extractJSON, localDateStr: localDateStr };
  }
})();
