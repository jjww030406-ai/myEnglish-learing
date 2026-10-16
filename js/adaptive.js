/* =====================================================================
   自适应难度引擎（Ai 实时调难度，循序渐进）
   ---------------------------------------------------------------------
   原来的问题：难度基本只看「累计掌握词数」这一条静态阶梯 ——
   学得吃力的人不会因为一直错而变简单，学得快的人也不会被加速，
   新用户还可能因为词库顺序（云端共享词排在最前）一上来就碰到难词。

   现在改成三层：
     ① 本地规则层（零延迟、离线可用）：每答一次题就重算一次难度档
     ② 云端 AI 层（真正"动起来"）：把你的学习画像发给大模型，让它给出
        难度档 / 每天几个词 / 一句为什么，结果按天缓存 + 节流刷新
     ③ 硬门槛层（安全绳）：不管 AI 说什么，都不许违背"循序渐进"
        —— 掌握词数不到 5 个就只能是第 1 档（最简单），一天最多升 1 档

   难度档（1~6）直接决定三件事：
     · 每天练几个词（wpd）
     · 新词里混多少复习词（newRatio）
     · 新词从词频表的第几位开始取（freqCap）——这才是"别一上来就难"的关键
   ===================================================================== */
(function () {
  "use strict";

  /* 六档难度：从「最简单的词、量最少」到「词频更深、量更大」 */
  var LEVELS = [
    null,
    { lv: 1, name: "起步",   wpd: 6,  newRatio: 0.85, freqCap: 60,   mode: "cn",     icon: "🌱" },
    { lv: 2, name: "打基础", wpd: 6,  newRatio: 0.75, freqCap: 150,  mode: "cn",     icon: "🌿" },
    { lv: 3, name: "稳步走", wpd: 8,  newRatio: 0.65, freqCap: 400,  mode: "letter", icon: "🌿" },
    { lv: 4, name: "上手了", wpd: 10, newRatio: 0.55, freqCap: 900,  mode: "letter", icon: "🌳" },
    { lv: 5, name: "熟练",   wpd: 12, newRatio: 0.45, freqCap: 1600, mode: "dict",   icon: "🌳" },
    { lv: 6, name: "进阶",   wpd: 14, newRatio: 0.4,  freqCap: 99999,mode: "dict",   icon: "🏆" }
  ];
  var MIN_LV = 1, MAX_LV = 6;

  var K_LV  = "el_diff_v1";      // 本地规则档位（含日期，用于"一天最多升一档"）
  var K_AI  = "el_ai_diff_v1";   // AI 建议缓存
  var cloud = null;
  try {
    var CFG = window.CLOUD_CONFIG || {};
    if (window.WorkBuddyCloud && CFG.endpoint && CFG.publishableKey) {
      cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CFG.endpoint, publishableKey: CFG.publishableKey
      });
    }
  } catch (e) { /* 云服务不可用 → 只跑本地规则 */ }

  var st = { aiBusy: false, lastKick: 0 };

  /* ---------------- 工具 ---------------- */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function read(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function clamp(n, a, b) { n = Number(n) || 0; return Math.max(a, Math.min(b, n)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* 词频排名：第 0 位是 the，越靠后越难。没有排名的词按"很难"处理。 */
  var RANK = null;
  function rankOf(w) {
    if (!RANK) {
      RANK = {};
      (typeof WORD_FREQ !== "undefined" ? WORD_FREQ : []).forEach(function (x, i) { RANK[x] = i; });
    }
    var r = RANK[String(w || "").toLowerCase()];
    return typeof r === "number" ? r : 99999;
  }

  /* ---------------- 哪些词「值得做成单词卡」 ----------------
     虚词（the / of / and / is / to …）不该拿来背 —— 它们没有画面感，
     背了也说不出话，应该放到语法课里学。这里一律排除，
     否则"越常见越先学"这条规则会让人第一天就在背 of / and / to。 */
  var STOP = {};
  ("a an the of and to in for is on that by this with it not or be are am was were been being " +
   "from at as all more an will can us if has have had do does did which their any only his " +
   "out up may other they he she we you i me my your our them what who where when why how but " +
   "so than then also just very could should would might must shall over under into about after " +
   "before between during without within against off above below there here because while " +
   "its his hers theirs mine ours whose whom these those some each every both either neither " +
   "nor yet since unless although though until whether again once twice ").split(/\s+/)
    .forEach(function (w) { if (w) STOP[w] = 1; });

  /* 零基础核心词：人工编排的开头那批（hello / hi / thanks / water …），
     本来就按"从最基础开始"排过序 —— 比纯词频更适合第一天。
     ⚠️ 必须在本文件加载时立刻快照：daily.js 之后会用云端词库重写 WORDS 的顺序。 */
  var CORE = {};
  (function () {
    var src = [];
    try { if (typeof BASE_WORDS !== "undefined" && BASE_WORDS.length) src = BASE_WORDS; } catch (e) {}
    if (!src.length) { try { src = (typeof WORDS !== "undefined") ? WORDS : []; } catch (e2) { src = []; } }
    src.slice(0, 150).forEach(function (x, i) {
      if (x && x.w && !STOP[String(x.w).toLowerCase()] && !(x.w in CORE)) CORE[x.w] = i;
    });
  })();
  function coreIdx(w) {
    var v = CORE[String(w || "").toLowerCase()];
    return typeof v === "number" ? v : -1;
  }
  /* 排序分：核心词按人工顺序优先（+1 避免第 0 个被当成 falsy），其余按词频接在后面 */
  function teachScore(w) {
    var c = coreIdx(w);
    if (c >= 0) return c + 1;
    return 500 + Math.min(rankOf(w), 4000);
  }
  function isTeachable(w) {
    var s = String(w || "").toLowerCase();
    if (STOP[s]) return false;
    if (s.length < 2) return false;
    return true;
  }

  /* ---------------- 学习画像 ---------------- */
  function profile() {
    var log = (typeof S !== "undefined" && Array.isArray(S.practiceLog)) ? S.practiceLog : [];
    var recent = log.slice(-20);
    var n = recent.length;
    var right = 0, assisted = 0;
    recent.forEach(function (x) { if (x.ok) right++; if (x.as) assisted++; });
    var acc = n ? right / n : 0;
    var assistRate = n ? assisted / n : 0;
    // 最近的连续答错次数（从尾巴往回数）
    var bad = 0;
    for (var i = log.length - 1; i >= 0; i--) { if (log[i].ok) break; bad++; }

    var mastered = 0, weak = 0, fresh = 0;
    try {
      (typeof WORDS !== "undefined" ? WORDS : []).forEach(function (w) {
        var m = mastery(w.w);
        if (m === 5) mastered++; else if (m === 0) fresh++; else weak++;
      });
    } catch (e) {}
    var wrong = 0;
    try { wrong = openWrongWords().length; } catch (e) {}
    var days = 0;
    try { days = streakDays(); } catch (e) {}
    var total = 0;
    try { total = (typeof S !== "undefined" && Array.isArray(S.days)) ? S.days.length : 0; } catch (e) {}

    return {
      n: n, acc: acc, assistRate: assistRate, badStreak: bad,
      mastered: mastered, weak: weak, fresh: fresh, wrong: wrong,
      streakDays: days, totalDays: total
    };
  }

  /* ---------------- ① 本地规则层：实时算档位 ----------------
     每次作答后都会重算，所以"最近手感"一变差，下一次出题立刻变简单。 */
  function ruleLv(p) {
    var lv;
    if (p.n < 8) {
      lv = 1;                                   // 样本太少，一律从最简单起步
    } else if (p.acc >= 0.9)      lv = 5;
    else if (p.acc >= 0.8)        lv = 4;
    else if (p.acc >= 0.68)       lv = 3;
    else if (p.acc >= 0.5)        lv = 2;
    else                          lv = 1;

    /* 硬门槛：循序渐进。掌握词数不够，再高的正确率也不许往上冲。 */
    if (p.mastered < 5)       lv = Math.min(lv, 1);
    else if (p.mastered < 15) lv = Math.min(lv, 2);
    else if (p.mastered < 40) lv = Math.min(lv, 3);
    else if (p.mastered < 80) lv = Math.min(lv, 4);

    /* 一半以上的题是"看了答案才拼出来的" → 不算真会，压回低档 */
    if (p.assistRate > 0.5) lv = Math.min(lv, 2);

    /* 保护优先：连错 3 次以上、或错题堆了 15 个以上 → 立刻退一档 */
    if (p.badStreak >= 3 || p.wrong > 15) lv = Math.max(1, lv - 1);

    /* 一天最多升一档：防止某天手感爆棚直接从 1 档跳到 5 档 */
    var keep = read(K_LV);
    var t = todayStr();
    if (keep && keep.d === t && typeof keep.lv === "number" && lv > keep.lv) lv = keep.lv + 1;
    lv = clamp(lv, MIN_LV, MAX_LV);
    if (!keep || keep.d !== t || keep.lv !== lv) write(K_LV, { d: t, lv: lv });
    return lv;
  }

  /* ---------------- ② 云端 AI 层 ----------------
     把画像交给大模型，让它综合判断（正确率、看答案比例、错题堆积、学习天数）。
     结果会被"硬门槛"和"一天最多升一档"再夹一遍，AI 说错了也不会坑到人。 */
  async function pickModel() {
    var cached = null;
    try { cached = localStorage.getItem("el_model"); } catch (e) {}
    var ids = [];
    try {
      var ms = await cloud.llm.models.list();
      ids = (ms || []).filter(function (x) { return x && x.id && x.disabled !== true; })
                      .map(function (x) { return x.id; });
    } catch (e) { return cached || null; }
    if (!ids.length) return cached || null;
    if (cached && ids.indexOf(cached) >= 0) return cached;
    var ok = ids.filter(function (id) { return !/^auto$/i.test(id); });   // auto 在流式接口会挂住
    if (!ok.length) ok = ids;
    var prefer = ok.filter(function (id) { return /^hy/i.test(id); });
    var id = prefer[0] || ok[0];
    try { localStorage.setItem("el_model", id); } catch (e) {}
    return id;
  }

  async function aiTune(force) {
    if (!cloud) return null;
    var c = read(K_AI);
    var now = Date.now();
    // 节流：同一天 6 小时内不重复问；非强制时 10 分钟内不重复问
    if (c && c.date === todayStr() && !force && (now - (c.ts || 0)) < 6 * 3600e3) return c;
    if (!force && c && (now - (c.ts || 0)) < 10 * 60e3) return c;
    if (st.aiBusy) return c;

    var p = profile();
    var modelId = null;
    try { modelId = await pickModel(); } catch (e) { return null; }
    if (!modelId) return null;

    var sys = "你是一位教零基础中国人学英语的老师，负责实时调整学习难度。原则：宁可简单也不要难，学得吃力就降档。只输出 JSON，不要 markdown。";
    var user =
      "这是这位学习者最近的表现，请判断现在该给多难的练习。\n" +
      "最近 20 次作答正确率：" + Math.round(p.acc * 100) + "%\n" +
      "其中看了答案才答对的占比：" + Math.round(p.assistRate * 100) + "%\n" +
      "最近连续答错：" + p.badStreak + " 次\n" +
      "已掌握（连对3次）单词：" + p.mastered + " 个；学过但没熟：" + p.weak + " 个；没学过：" + p.fresh + " 个\n" +
      "待订正的错题：" + p.wrong + " 个；连续学习：" + p.streakDays + " 天\n" +
      "难度档 1~6（1=最简单：每天6个词、只取最高频的60个词；6=最难：每天14个词、词频不限）。\n" +
      "规则：正确率高、错题少、看答案少 → 可以升；正确率低或连错多 → 必须降；数据少 → 取 1。\n" +
      '只输出 JSON：{"lv":1-6,"wpd":4-16,"reason":"用一句话说明为什么定这个难度","tip":"给学习者一句具体建议"}';

    var answer = "";
    st.aiBusy = true;
    try {
      await Promise.race([
        (async function () {
          for await (var chunk of cloud.llm.chat.completions.create({
            model: modelId, stream: true,
            messages: [{ role: "system", content: sys }, { role: "user", content: user }]
          })) {
            var d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
            if (d) answer += d;
          }
        })(),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 30000); })
      ]);
    } catch (e) { /* 超时也继续：可能已经收到半截内容 */ }
    st.aiBusy = false;

    var i = String(answer).indexOf("{"), j = String(answer).lastIndexOf("}");
    if (i < 0 || j < i) return c;
    var o = null;
    try { o = JSON.parse(String(answer).slice(i, j + 1)); } catch (e) {
      try { o = JSON.parse(String(answer).slice(i, j + 1).replace(/,\s*([}\]])/g, "$1")); } catch (e2) { return c; }
    }
    if (!o) return c;

    var out = {
      date: todayStr(), ts: now,
      lv: clamp(o.lv, MIN_LV, MAX_LV),
      wpd: clamp(o.wpd, 4, 16),
      reason: String(o.reason || "").slice(0, 120),
      tip: String(o.tip || "").slice(0, 120)
    };
    write(K_AI, out);
    return out;
  }

  /* ---------------- ③ 合并：规则 + AI + 硬门槛 ---------------- */
  function today(force) {
    var p = profile();
    var rule = ruleLv(p);
    var L = LEVELS[rule];

    var ai = null;
    var cached = read(K_AI);
    if (cached && cached.date === todayStr()) ai = cached;

    var lv = rule, wpd = L.wpd, src = "规则实时计算", reason = "", tip = "";
    if (ai && typeof ai.lv === "number") {
      // AI 只能在规则档位上下浮动 1 档，防止它一上来就给人上难度
      var merged = clamp(ai.lv, Math.max(MIN_LV, rule - 1), Math.min(MAX_LV, rule + 1));
      // 但"降难度"永远听最保守的那个：谁更低听谁的
      lv = Math.min(merged, rule);
      wpd = clamp(ai.wpd || L.wpd, 4, Math.max(4, L.wpd + 2));
      src = "AI 实时调节";
      reason = ai.reason || "";
      tip = ai.tip || "";
    }

    /* 硬门槛最后再夹一遍：不管谁说了什么，这些条件不允许突破 */
    var hard = "";
    if (p.mastered < 5)       { lv = Math.min(lv, 1); hard = "刚起步，只给最高频、最简单的词"; }
    else if (p.mastered < 15) { lv = Math.min(lv, 2); }
    else if (p.mastered < 40) { lv = Math.min(lv, 3); }
    else if (p.mastered < 80) { lv = Math.min(lv, 4); }
    if (p.n < 8)              { lv = 1; hard = hard || "还在摸底，先从最简单的开始"; }
    if (p.badStreak >= 3)     { lv = Math.max(1, lv - 1); hard = "刚才连错了几次，先退一档练熟"; }
    if (p.assistRate > 0.5)   { lv = Math.min(lv, 2); hard = hard || "看答案的比例偏高，先巩固"; }

    var cfg = LEVELS[clamp(lv, MIN_LV, MAX_LV)];
    return {
      lv: cfg.lv, name: cfg.name, icon: cfg.icon,
      wpd: wpd, newRatio: cfg.newRatio, freqCap: cfg.freqCap, mode: cfg.mode,
      src: src, reason: reason, tip: tip, hard: hard,
      profile: p, ruleLv: rule
    };
  }

  /* ---------------- 触发点 ----------------
     onPractice：每答一题都会调，内部做节流（10 分钟 + 每 6 小时），不会狂问 AI。 */
  function onPractice() {
    try {
      var now = Date.now();
      if (now - st.lastKick < 60e3) return;      // 1 分钟内最多触发一次评估
      st.lastKick = now;
      var p = profile();
      if (p.n < 5) return;                       // 数据太少，先别问 AI
      aiTune(false).then(function (r) {
        if (r && typeof render === "function") { try { render(); } catch (e) {} }
      }).catch(function () {});
    } catch (e) {}
  }

  /* 首页 / 完成一轮 / 交卷后主动刷一次（force=true 表示"刚做完一轮，重新判断"） */
  function kick(force) {
    if (!cloud) return;
    try {
      var p = profile();
      if (p.n < 5) return;
      aiTune(!!force).then(function (r) {
        if (r && typeof render === "function") { try { render(); } catch (e) {} }
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------------- 首页展示：把"AI 现在给你定的是什么难度"讲清楚 ---------------- */
  function block() {
    var a = today();
    var p = a.profile;
    var accTxt = p.n >= 5 ? ("最近 " + p.n + " 次正确率 <b>" + Math.round(p.acc * 100) + "%</b>") : "刚开练，还在摸你的水平";
    var lines = [];
    lines.push("每天 <b>" + a.wpd + "</b> 个词 · 新词只从「词频前 <b>" + (a.freqCap >= 99999 ? "全部" : a.freqCap) + "</b> 名」里挑");
    if (a.reason) lines.push("🤖 " + esc(a.reason));
    if (a.tip)    lines.push("💡 " + esc(a.tip));
    if (a.hard)   lines.push("🛟 " + esc(a.hard));

    return `<div class="card adaptive-card">
      <div class="ad-head">
        <span class="ad-title">🎚 当前难度：${a.icon} 第 ${a.lv} 档 · ${a.name}</span>
        <span class="ad-src ${a.src === "AI 实时调节" ? "is-ai" : ""}">${a.src}</span>
      </div>
      <p class="muted ad-sub">${accTxt}${p.assistRate > 0.3 ? " · 看答案 " + Math.round(p.assistRate * 100) + "%" : ""}${p.wrong ? " · 待订正 " + p.wrong + " 个" : ""}</p>
      <ul class="ad-lines">${lines.map(function (t) { return `<li>${t}</li>`; }).join("")}</ul>
      <p class="muted ad-foot">难度每答一次题就会重算；学得吃力会自动退档，不会硬顶着往上加。</p>
    </div>`;
  }

  window.Adaptive = {
    profile: profile,
    today: today,
    block: block,
    kick: kick,
    onPractice: onPractice,
    aiTune: aiTune,
    LEVELS: LEVELS,
    rankOf: rankOf,
    teachScore: teachScore,
    isTeachable: isTeachable,
    coreIdx: coreIdx,
    /* 给 app.js 用：这个词在当前难度档里够不够简单。
       人工编排的零基础核心词（hello / thanks / water …）任何档都放行 ——
       它们本来就是给第一天用的，不该被词频门槛挡在外面。 */
    isEasyEnough: function (w, lv) {
      if (coreIdx(w) >= 0) return true;
      var cfg = LEVELS[clamp(lv || 1, MIN_LV, MAX_LV)];
      return rankOf(w) < cfg.freqCap;
    }
  };
})();
