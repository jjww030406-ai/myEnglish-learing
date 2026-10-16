/* =====================================================================
   情景对话：你一句，AI 一句（真人角色扮演 + 语音回答 + 顺手纠音）
   ---------------------------------------------------------------------
   和「口语」页不一样：口语页是背现成的句子，这里是真的在聊天 ——
   你说什么（打字或说话），AI 扮演那个场景里的老外接话，还会：
     · 用真人发音把它的回答念出来（有道在线发音，失败回落浏览器朗读）
     · 你说的英文不地道时，告诉你 native 会怎么说、为什么
     · 给你 2~3 句「你可以这样回」，点一下就填进输入框

   三个能力各有兜底，任何一环不可用都不会把页面搞崩：
     语音输入 → 浏览器语音识别；不支持就隐藏麦克风，照样能打字聊
     AI 回答  → 云端大模型；不可用会明确提示，不会假装听懂
     语音朗读 → 在线真人发音 → 浏览器内置朗读 → 静默
   ===================================================================== */
(function () {
  "use strict";

  var CFG = window.CLOUD_CONFIG || {};
  var cloud = null;
  try {
    if (window.WorkBuddyCloud && CFG.endpoint && CFG.publishableKey) {
      cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CFG.endpoint, publishableKey: CFG.publishableKey
      });
    }
  } catch (e) {}

  /* 场景 = AI 要扮演谁。每个场景都写清"这个角色会说什么、不会说什么" */
  var SCENES = [
    { id: "cafe",   icon: "☕", name: "咖啡店",  who: "咖啡店店员",
      sys: "你是美国一家咖啡店的店员，正在接待一位英语还不熟练的中国顾客。说话热情但简短，一次只说 1~2 句。会问杯型、冷热、要不要奶、要不要食物、要不要会员积分。" },
    { id: "food",   icon: "🍽", name: "餐厅",    who: "餐厅服务员",
      sys: "你是美国一家餐厅的服务员，正在接待一位英语还不熟练的中国客人。会问几位、想吃什么、口味、要不要喝的，最后会问要不要打包。" },
    { id: "shop",   icon: "🛒", name: "购物",    who: "服装店店员",
      sys: "你是美国一家服装店的店员。会问想买什么、尺码、颜色，会说价格和能不能试穿。" },
    { id: "street", icon: "🗺", name: "问路",    who: "路过的本地人",
      sys: "你是一个友善的美国本地人，有人向你问路。用最简单的方位说法（go straight / turn left / it's on your right / two blocks），一次只指一段路，别一口气说太复杂。" },
    { id: "chat",   icon: "💬", name: "闲聊",    who: "新认识的朋友",
      sys: "你是一个友善的美国人，刚认识一位正在学英语的中国朋友。聊日常：你从哪来、做什么工作、周末干什么、喜欢什么。会顺着对方的话追问，让对话能继续下去。" },
    { id: "work",   icon: "💼", name: "职场",    who: "外国同事",
      sys: "你是一位外国同事，和一位英语还不熟练的中国同事在聊工作。语气专业但友好，用职场常见说法（Could you… / Let's… / I'll send you…）。" },
    { id: "airport",icon: "✈️", name: "机场",    who: "机场工作人员",
      sys: "你是美国机场的值机/安检工作人员。会要护照、问行李、告知登机口和时间，用词简单直接。" },
    { id: "doctor", icon: "🏥", name: "看医生",  who: "诊所前台/医生",
      sys: "你是美国一家诊所的医生，正在接诊一位英语还不熟练的病人。会问哪里不舒服、多久了、有没有发烧，语气温和，用词简单。" }
  ];

  var K_STORE = "el_talk_v1";
  var st = {
    scene: "cafe",
    msgs: [],          // {who:'ai'|'me', text, cn, better, betterCn, hints:[], ts}
    busy: false,
    err: "",
    listening: false,
    autoSpeak: true,
    started: false
  };

  /* ---------------- 存取 ---------------- */
  function save() {
    try {
      localStorage.setItem(K_STORE, JSON.stringify({
        scene: st.scene, msgs: st.msgs.slice(-40), autoSpeak: st.autoSpeak
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(K_STORE) || "null");
      if (d && d.scene) {
        st.scene = d.scene;
        st.msgs = Array.isArray(d.msgs) ? d.msgs : [];
        if (typeof d.autoSpeak === "boolean") st.autoSpeak = d.autoSpeak;
      }
    } catch (e) {}
  }
  load();

  function scene() {
    return SCENES.filter(function (s) { return s.id === st.scene; })[0] || SCENES[0];
  }

  /* ---------------- 模型 ---------------- */
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
    var ok = ids.filter(function (id) { return !/^auto$/i.test(id); });  // auto 在流式接口会挂住
    if (!ok.length) ok = ids;
    var prefer = ok.filter(function (id) { return /^hy/i.test(id); });
    var id = prefer[0] || ok[0];
    try { localStorage.setItem("el_model", id); } catch (e) {}
    return id;
  }

  /* 从模型输出里抠出 JSON（模型经常顺手加 markdown 代码块或前后缀文字） */
  function parseObj(txt) {
    var s = String(txt || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    var a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a < 0 || b < a) return null;
    var raw = s.slice(a, b + 1);
    try { return JSON.parse(raw); } catch (e) {}
    try { return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1")); } catch (e2) { return null; }
  }

  /* ---------------- 开场白 ---------------- */
  function greeting(sc) {
    return "Hi! Welcome to " + (sc.id === "cafe" ? "our coffee shop" : "our shop") +
           ". What can I get for you?";
  }

  async function start() {
    if (st.started || st.msgs.length) return;
    st.started = true;
    var sc = scene();
    // 开场白先本地给一句（立刻有声音，不用等 AI），再让 AI 接着演
    st.msgs.push({
      who: "ai", text: "Hi there! What can I get for you today?",
      cn: "嗨！今天想吃点/喝点什么？", ts: Date.now()
    });
    save();
  }

  /* ---------------- 发送一句，拿 AI 的回答 ---------------- */
  async function send(text) {
    text = String(text || "").trim();
    if (!text || st.busy) return null;
    if (!cloud) { st.err = "no_cloud"; return null; }

    st.err = "";
    st.busy = true;
    st.msgs.push({ who: "me", text: text, ts: Date.now() });
    if (typeof render === "function") { try { render(); } catch (e) {} }

    var sc = scene();
    var modelId = await pickModel();
    if (!modelId) { st.busy = false; st.err = "no_model"; return null; }

    // 只带最近 8 句上下文：够连贯，又不至于把 prompt 撑爆
    var hist = st.msgs.slice(-8).map(function (m) {
      return (m.who === "me" ? "Learner" : sc.who) + ": " + m.text;
    }).join("\n");

    var sys =
      sc.sys + "\n" +
      "重要规则：\n" +
      "1. 你只说英文，一次 1~2 句，句子短、用日常口语，词汇不超过初中水平；\n" +
      "2. 不要替学习者把话说完，不要长篇大论，不要跳出角色；\n" +
      "3. 如果学习者说的英文有语法或用词不地道的地方，在 better 字段给出 native 会怎么说的版本，\n" +
      "   并在 betterCn 里用中文说明「为什么这样说更好」；说得没问题就留空字符串；\n" +
      "4. hints 给 2~3 句学习者接下来可以回的英文（简短、地道），帮他把对话接下去。\n" +
      '只输出 JSON：{"reply":"你要说的英文","cn":"这句话的中文意思","better":"更地道的说法（没有问题就空字符串）","betterCn":"中文说明为什么","hints":["可以回的第1句","可以回的第2句"]}';

    var user = "对话记录：\n" + hist + "\n\n学习者刚说了：" + text + "\n请你接话。";

    var answer = "";
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
    } catch (e) { /* 超时也继续，看能不能从半截内容里抠出 JSON */ }

    var o = parseObj(answer);
    var reply = o && String(o.reply || "").trim();
    if (!reply) {
      // 模型没按格式来 → 把它说的话原样当回答，别让对话断掉
      var plain = String(answer || "").trim().replace(/^"|"$/g, "");
      reply = plain || "Sorry, can you say that again?";
      o = { cn: "", better: "", betterCn: "", hints: [] };
    }

    var msg = {
      who: "ai",
      text: reply,
      cn: String((o && o.cn) || ""),
      better: String((o && o.better) || ""),
      betterCn: String((o && o.betterCn) || ""),
      hints: ((o && o.hints) || []).filter(function (h) { return h && String(h).trim(); }).slice(0, 3),
      ts: Date.now()
    };
    st.msgs.push(msg);
    st.busy = false;
    save();

    // 立刻用真人发音念出来
    if (st.autoSpeak) { try { speak(reply); } catch (e) {} }
    return msg;
  }

  function reset() { st.msgs = []; st.started = false; st.err = ""; save(); }
  function setScene(id) { st.scene = id; st.msgs = []; st.started = false; st.err = ""; save(); }
  function toggleAuto() { st.autoSpeak = !st.autoSpeak; save(); return st.autoSpeak; }

  /* ---------------- 语音输入 ---------------- */
  var recog = null;
  function canListen() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
  function listen(onResult, onEnd, onErr) {
    if (!canListen()) { onErr && onErr("unsupported"); return false; }
    try {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recog = new SR();
      recog.lang = "en-US";
      recog.interimResults = true;
      recog.continuous = false;
      var finalTxt = "";
      recog.onresult = function (e) {
        var t = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalTxt += e.results[i][0].transcript;
          else t += e.results[i][0].transcript;
        }
        onResult && onResult(finalTxt + t, !!finalTxt);
      };
      recog.onerror = function (e) { onErr && onErr(e.error || "error"); };
      recog.onend = function () { st.listening = false; onEnd && onEnd(finalTxt); };
      recog.start();
      st.listening = true;
      return true;
    } catch (e) { onErr && onErr(String(e.message || e)); return false; }
  }
  function stopListen() { try { if (recog) recog.stop(); } catch (e) {} st.listening = false; }

  window.Talk = {
    state: st, SCENES: SCENES,
    scene: scene,
    start: start, send: send, reset: reset, setScene: setScene,
    toggleAuto: toggleAuto,
    canListen: canListen, listen: listen, stopListen: stopListen,
    hasCloud: function () { return !!cloud; }
  };
})();
