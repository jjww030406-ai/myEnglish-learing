/* 语法「每日一练」：每天 5 道选择题，题目动态生成，答完给答案 + 解析
   ------------------------------------------------------------------
   设计要点：
   1) 题目不写死 —— 由云端大模型按「学习者当前阶段 + 已掌握词数」现出一套，
      每天一套（按日期缓存），做完了可以点「再来一组」重新生成一套新的。
   2) 断网 / 云服务不可用 → 自动回落到本地语法题库（GRAMMAR 各课测验里抽），
      保证任何时候点进来都有题做，不会空白。
   3) 交卷后逐题给出：正确答案 + 中文解析（为什么选这个、其他错在哪）+ 得分。
*/
(function () {
  "use strict";

  var S_KEY = "gq_daily_v1";           // 每日缓存键（按日期复用当天那套题）
  var st = { list: [], picked: [], checked: false, loading: false, src: "", err: "" };
  var cloud = null;

  try {
    var CFG = window.CLOUD_CONFIG || {};
    if (window.WorkBuddyCloud && CFG.endpoint && CFG.publishableKey) {
      cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CFG.endpoint, publishableKey: CFG.publishableKey
      });
    }
  } catch (e) { /* 云服务不可用 → 走本地题库 */ }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(S_KEY) || "null");
      if (c && c.date === todayStr() && c.list && c.list.length) return c.list;
    } catch (e) {}
    return null;
  }
  function writeCache(list) {
    try { localStorage.setItem(S_KEY, JSON.stringify({ date: todayStr(), list: list })); } catch (e) {}
  }

  /* 从大模型输出里抠出 JSON 数组（模型偶尔会加 markdown 代码块或多余文字） */
  function parseArr(txt) {
    var i = String(txt || "").indexOf("[");
    if (i < 0) return null;
    var j = String(txt).lastIndexOf("]");
    if (j < i) return null;
    var raw = String(txt).slice(i, j + 1);
    try { return JSON.parse(raw); } catch (e) {}
    try { return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1")); } catch (e2) { return null; }
  }
  var DAILY_N = 8;                       // 每天题目数量（从 5 调到 8）
  var FOCUS = ["时态", "固定搭配", "综合"]; // 按天轮换的练习重点
  function dayIndex() {
    var d = new Date();
    var base = Date.UTC(2026, 0, 1);
    var t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((t - base) / 86400000);
  }
  function todayFocus() { return FOCUS[dayIndex() % FOCUS.length]; }

  /* 只保留结构完整的题，避免模型偶尔少给字段导致页面崩 */
  function normalize(list) {
    return (list || []).filter(function (x) {
      return x && x.q && x.opts && x.opts.length >= 2 && typeof x.a === "number";
    }).map(function (x) {
      var opts = (x.opts || []).slice(0, 4);
      var a = Math.max(0, Math.min(opts.length - 1, x.a | 0));
      return { q: String(x.q), opts: opts, a: a, e: String(x.e || "") };
    }).slice(0, DAILY_N);
  }
  /* AI 偶尔只给 3~4 题 → 用本地题库补足到 8 题，保证每天都是满 8 题 */
  function topUp(list, topic) {
    if (list.length >= DAILY_N) return list.slice(0, DAILY_N);
    var seen = {};
    list.forEach(function (q) { seen[String(q.q).slice(0, 30)] = 1; });
    localBank(topic).forEach(function (q) {
      if (list.length >= DAILY_N) return;
      var k = String(q.q).slice(0, 30);
      if (seen[k]) return;
      seen[k] = 1; list.push(q);
    });
    return list;
  }

  /* 本地题库：优先用当日重点（时态/固定搭配）的题，没有或综合时混用全部 */
  function localBank(topic) {
    var arr = (typeof GQ_EXTRA !== "undefined" ? GQ_EXTRA : []).filter(function (x) {
      return x && x.q && x.opts && x.opts.length >= 2 && typeof x.a === "number";
    }).map(function (x) {
      return { q: x.q, opts: x.opts.slice(0, 4), a: Math.max(0, Math.min((x.opts || []).length - 1, x.a | 0)), e: x.e || "" };
    });
    if (topic && topic !== "综合") {
      var f = arr.filter(function (x) { return x.topic === topic; });
      if (f.length) return f;
    }
    return arr;
  }

  /* 本地兜底：当日重点题 + 语法课测验题，随机凑满 8 题 */
  function localFallback() {
    var pool = localBank(todayFocus());
    (typeof GRAMMAR !== "undefined" ? GRAMMAR : []).forEach(function (g) {
      (g.quiz || []).forEach(function (q) {
        if (q && q.q && q.opts) pool.push({ q: q.q, opts: q.opts, a: q.a, e: q.e || "" });
      });
    });
    if (!pool.length) return [];
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, DAILY_N);
  }

  /* 选模型：auto 这个别名在流式接口上会一直挂着不结束，必须避开；优先用实测稳定的 hy3 系列 */
  async function pickModel() {
    var cached = null;
    try { cached = localStorage.getItem("el_model"); } catch (e) {}
    var ids = [];
    try {
      var ms = await cloud.llm.models.list();
      ids = (ms || []).filter(function (x) { return x && x.id && x.disabled !== true; })
                      .map(function (x) { return x.id; });
    } catch (e) { if (cached) return cached; return null; }
    if (!ids.length) return cached || null;
    if (cached && ids.indexOf(cached) >= 0) return cached;
    var ok = ids.filter(function (id) { return !/^auto$/i.test(id); });
    if (!ok.length) ok = ids;
    var prefer = ok.filter(function (id) { return /^hy/i.test(id); });
    var id = prefer[0] || ok[0];
    try { localStorage.setItem("el_model", id); } catch (e) {}
    return id;
  }

  async function genByAI() {
    if (!cloud) return null;
    var modelId = null;
    try { modelId = await pickModel(); } catch (e) { return null; }
    if (!modelId) return null;

    var stage = "";
    try { var si = (typeof stageInfo === "function") ? stageInfo() : null; if (si) stage = si.name + "（" + si.tip + "）"; } catch (e) {}
    var mc = 0;
    try { mc = (typeof masteredCount === "function") ? masteredCount() : 0; } catch (e) {}

    var sys = "你是一位教零基础中国人学英语的老师。出题要简单、实用、是日常真会用到的句子。只输出 JSON，不要 markdown。";
    var focus = todayFocus();
    var focusReq = focus === "时态"
      ? "本期重点：时态（一般现在/进行/过去/现在完成/将来等）。每题解析必须讲清『为什么用这个时态』，并点出干扰项时态错在哪。"
      : focus === "固定搭配"
        ? "本期重点：固定搭配（如 make a decision、do homework、take care of 等高频动宾/介副词搭配）。每题解析必须讲清『为什么偏偏是这个动词/介词』。"
        : "题型混合：时态与固定搭配都考一点。每题解析都要讲清『为什么』。";
    var user =
      "请出 " + DAILY_N + " 道英语语法选择题。\n" +
      "学习者情况：当前阶段 " + (stage || "零基础入门") + "，已掌握约 " + mc + " 个单词。\n" +
      "要求：\n" +
      "1. 每题 4 个选项，只有 1 个正确；\n" +
      "2. 题干里用 ___ 表示要填的空，句子是日常会说的话，词汇不超过初中水平；\n" +
      "3. " + focusReq + "\n" +
      "4. 题目尽量考不同的点，不要重复；\n" +
      "5. 每道题必须写中文解析，讲清楚「为什么选这个、其他选项错在哪」，不要只报答案。\n" +
      '只输出 JSON 数组：[{"q":"题干","opts":["A","B","C","D"],"a":0,"e":"中文解析"}]';

    var answer = "";
    var done = false;
    try {
      // 25 秒还没出完就当失败：拿已经收到的半截内容试试能不能凑出整题，凑不出就回落本地题库
      await Promise.race([
        (async function () {
          for await (var chunk of cloud.llm.chat.completions.create({
            model: modelId, stream: true,
            messages: [{ role: "system", content: sys }, { role: "user", content: user }]
          })) {
            var d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
            if (d) answer += d;
          }
          done = true;
        })(),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 45000); })
      ]);
    } catch (e) {
      if (!String(answer || "").trim()) return null;
    }
    var list = normalize(parseArr(answer));
    if (!list.length && !done) return null;
    return list;
  }

  window.GrammarQuiz = {
    state: st,
    focus: function () { return todayFocus(); },
    /* 取题：当天缓存 → AI 现出 → 本地题库兜底。force=true 表示「再来一组」强制换新的 */
    async load(force) {
      if (st.loading) return st.list;
      if (!force) {
        var c = readCache();
        if (c) { st.list = c; st.src = "cache"; st.picked = []; st.checked = false; return c; }
        if (st.list && st.list.length) return st.list;
      }
      st.loading = true; st.err = "";
      try {
        var ai = await genByAI();
        if (ai && ai.length) { st.list = topUp(ai, todayFocus()); st.src = st.list.length >= DAILY_N ? "ai" : "mix"; writeCache(st.list); }
        else { st.list = localFallback(); st.src = "local"; }
      } catch (e) {
        st.list = localFallback(); st.src = "local"; st.err = String((e && e.message) || e);
      }
      st.loading = false; st.picked = []; st.checked = false;
      return st.list;
    },
    pick: function (qi, k) { if (st.checked) return; st.picked[qi] = k; },
    submit: function () { st.checked = true; },
    /* 「再来一组」：清空当前这套（不在这里出题，由页面调用 load(true) 以便拿到 Promise） */
    again: function () { st.list = []; st.picked = []; st.checked = false; st.src = ""; },
    answered: function () { return st.list.filter(function (_, i) { return st.picked[i] != null; }).length; },
    score: function () {
      var n = 0;
      st.list.forEach(function (q, i) { if (st.picked[i] === q.a) n++; });
      return n;
    },
    srcLabel: function () {
      return st.src === "ai" || st.src === "mix" ? "🌐 今日题目由云端动态生成" :
             st.src === "cache" ? "🌐 今日题目（云端生成）" :
             "📦 离线：先用本地题库，联网后自动换成新题";
    }
  };
})();
