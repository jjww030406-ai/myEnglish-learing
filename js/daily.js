/* =====================================================================
   每日词引擎：让应用真正「联网 + 每天更新」。
   流程：
     1. 按日期从常用词清单里挑 8 个词（日期一变，词就变，全自动）
     2. 实时去在线词典 dictionaryapi.dev 抓音标 / 词性 / 英文释义
     3. 用云服务「免密钥大模型」补全中文释义 / 例句 / 逐词释义 / 词源
     4. 按日期缓存进浏览器 localStorage，并累积成你的个人词库
   离线 / 云服务不可用时，自动回落到内置基础词库，绝不白屏。
   所有云服务调用都走官方 SDK（window.WorkBuddyCloud），不手写 fetch。
   ===================================================================== */
(function () {
  "use strict";

  var CFG = window.CLOUD_CONFIG || {};
  var cloud = null;
  try {
    if (window.WorkBuddyCloud && CFG.endpoint && CFG.publishableKey) {
      cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CFG.endpoint,
        publishableKey: CFG.publishableKey
      });
    }
  } catch (e) {
    console.error("云服务初始化失败：", e);
  }

  // 默认状态：渲染时横幅会读这个
  window.DAILY_INFO = {
    status: cloud ? "loading" : "offline",
    text: cloud ? "正在联网获取今日单词…" : "未连接云服务 · 暂用内置基础词库（联网后每天自动更新）"
  };
  // 本地日期（用于「今日新词」徽标对比）
  window.TODAY_STR = localDateStr();

  /* ---------------- 纯工具函数（可在 Node 下单元测试） ---------------- */
  function localDateStr(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  // 用日期做种子，从清单里挑 n 个连续（可环绕）的词——同一天永远挑同一组
  function pickDaily(list, n, dateStr) {
    list = list || [];
    if (!list.length) return [];
    var h = 0;
    for (var i = 0; i < dateStr.length; i++) {
      h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
    }
    var start = h % list.length;
    var out = [];
    for (var k = 0; k < n; k++) out.push(list[(start + k) % list.length]);
    return out;
  }

  // 从模型输出里尽量抠出 JSON（容错：去代码块、掐头去尾）
  function extractJSON(str) {
    if (!str) return {};
    var s = String(str).trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    var a = s.indexOf("{");
    var b = s.lastIndexOf("}");
    if (a < 0 || b < 0 || b < a) return {};
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return {}; }
  }

  // 把「词典原始数据 + 模型 JSON」拼成应用统一的单词对象
  function assembleWord(dict, json) {
    json = json || {};
    var sw = [];
    if (Array.isArray(json.sentWords)) {
      json.sentWords.forEach(function (x) {
        if (Array.isArray(x) && x.length >= 2) sw.push([String(x[0]), String(x[1])]);
      });
    }
    return {
      w: dict.w,
      ph: dict.ph || (json.ph || ""),
      cn: json.cn || "（暂未生成释义）",
      s: json.s || (dict.def ? dict.def : dict.w),
      sentCn: json.sentCn || "",
      pos: json.pos || dict.pos || "",
      senses: json.senses || "",
      plural: json.plural || "",
      sentWords: sw,
      tip: json.tip || "",
      root: json.root || "",
      why: json.why || "",
      _today: dict._today || ""
    };
  }

  /* ---------------- 网络 / 云服务调用 ---------------- */
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
    } catch (e) {
      console.error("获取模型列表失败：", e);
      return null;
    }
  }

  // 实时抓取在线词典（dictionaryapi.dev，免费、无需密钥）
  async function fetchDict(w) {
    try {
      var r = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(w.toLowerCase()));
      if (!r.ok) return null;
      var arr = await r.json();
      var first = arr[0] || {};
      var ph = (first.phonetics || []).map(function (p) { return p.text; }).find(Boolean) || "";
      var m0 = (first.meanings || [])[0] || {};
      var pos = m0.partOfSpeech || "";
      var def = ((m0.definitions || [])[0] || {}).definition || "";
      return { w: w, ph: ph, pos: pos, def: def };
    } catch (e) {
      return null;
    }
  }

  // 用大模型把英文词补全成中文友好的学习内容（流式收集）
  async function genWord(dict, dateStr) {
    var model = await getModel();
    if (!model) return null;
    var sys = "你是一个为零基础中文学习者编写英语词库的助手。根据给出的英文单词及其在线词典信息，生成简洁、准确、适合初学者的内容。严格只输出一个 JSON 对象，不要输出任何额外文字或 markdown 代码块。JSON 字段（全部必填，没有就给空字符串）：cn(中文释义，用顿号分隔多个义项，简洁), pos(词性，如「名词」「动词」「名词／动词」), senses(其他常见含义或用法说明，没有给空字符串), s(一个 A2 水平的简单英文例句，长度适中、自然地道、用上该单词), sentCn(该例句的中文翻译), sentWords(例句里 2-4 个实义词组成的数组，每个元素是 [英文单词, 中文] 的二元组), tip(给初学者的记忆技巧，或名词的复数/不可数提示，没有给空字符串), plural(若作名词请给出复数形式，不可数请写「不可数」，不是名词给空字符串), root(这个意思是怎么来的，简短词源或联想，没有给空字符串), why(这个例句为什么这样用、有什么语法点，简短，没有给空字符串)。";
    var user = "单词: " + dict.w + "\n音标: " + (dict.ph || "（无）") + "\n词性: " + (dict.pos || "（无）") + "\n英文释义: " + (dict.def || "（无）") + "\n请生成 JSON。";

    var answer = "";
    try {
      for await (var chunk of cloud.llm.chat.completions.create({
        model: model.id,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ],
        stream: true
      })) {
        var d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if (d) answer += d;
      }
    } catch (e) {
      console.error("大模型生成失败（" + dict.w + "）：", e);
      return null;
    }
    var json = extractJSON(answer);
    var wd = assembleWord(dict, json);
    wd._today = dateStr;
    return wd;
  }

  /* ---------------- 本地词库缓存 ---------------- */
  function readLib() {
    try { return JSON.parse(localStorage.getItem("el_lib_v1") || "[]"); }
    catch (e) { return []; }
  }
  function saveLib(lib) {
    try { localStorage.setItem("el_lib_v1", JSON.stringify(lib)); } catch (e) {}
  }

  function safeRender() {
    try { if (typeof render === "function") render(); } catch (e) {}
  }

  /* ---------------- 主流程 ---------------- */
  async function loadDailyWords() {
    var dateStr = localDateStr();
    var lib = readLib();
    var existing = {};
    lib.forEach(function (w) { existing[w.w] = true; });

    var picked = pickDaily(window.WORD_LIST || [], 8, dateStr);
    var need = picked.filter(function (w) { return !existing[w]; });

    // 没连上云服务 → 回落内置词库
    if (!cloud) {
      window.DAILY_INFO = {
        status: "offline",
        text: "未连接云服务 · 暂用内置基础词库（联网后每天自动更新）"
      };
      if (typeof BASE_WORDS !== "undefined" && BASE_WORDS.length) WORDS = BASE_WORDS;
      safeRender();
      return { words: WORDS, info: window.DAILY_INFO };
    }

    // 今天已经生成过 → 直接用缓存，不重复消耗大模型
    if (!need.length) {
      window.DAILY_INFO = {
        status: "ok",
        text: "🌐 今日单词已就绪 · 个人词库共 " + lib.length + " 个（每天自动更新）"
      };
      WORDS = lib.length ? lib : (typeof BASE_WORDS !== "undefined" ? BASE_WORDS : WORDS);
      safeRender();
      return { words: WORDS, info: window.DAILY_INFO };
    }

    // 逐词：实时抓词典 + 大模型生成
    window.DAILY_INFO = {
      status: "loading",
      text: "🌐 正在联网生成今日单词… (0/" + need.length + ")"
    };
    safeRender();

    var done = 0;
    for (var i = 0; i < need.length; i++) {
      var w = need[i];
      var dict = await fetchDict(w) || { w: w, ph: "", pos: "", def: "" };
      var g = await genWord(dict, dateStr);
      if (g) { lib.push(g); saveLib(lib); }
      done++;
      window.DAILY_INFO = {
        status: "loading",
        text: "🌐 正在联网生成今日单词… (" + done + "/" + need.length + ")"
      };
      safeRender();
    }

    window.DAILY_INFO = {
      status: "ok",
      text: "🌐 今日新增 " + need.length + " 个单词 · 个人词库共 " + lib.length + " 个（每天自动更新）"
    };
    WORDS = lib;
    safeRender();
    return { words: WORDS, info: window.DAILY_INFO };
  }

  // 暴露给前端引导启动 & 给 Node 测试用纯函数
  window.DailyEngine = {
    loadDailyWords: loadDailyWords,
    pickDaily: pickDaily,
    extractJSON: extractJSON,
    assembleWord: assembleWord,
    localDateStr: localDateStr,
    fetchDict: fetchDict,
    genWord: genWord
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { pickDaily: pickDaily, extractJSON: extractJSON, assembleWord: assembleWord, localDateStr: localDateStr };
  }
})();
