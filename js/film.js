/* =====================================================================
   影视学习（🎬）：看电影 / 剧学英语
   ---------------------------------------------------------------------
   两条片源路径（版权原因不内置任何别人的影视）：
     1) YouTube 链接：粘贴链接 → 用 YouTube IFrame API 嵌入播放；
        字幕由你自己提供（上传 .srt/.vtt，或粘贴纯文本自动切句）。
     2) 原创示例短片：AI 写的原创剧本 + 真人发音，打开即用，合法。

   学习增强（叠在影片/短片之上）：
     · 双语字幕：英文 / 中英 / 中文 三档随时切换
     · 变速：0.5x ~ 2x（YouTube 用原生变速；短片按节奏放慢并自动慢速朗读）
     · 点词发音：点任意英文字词 → 真人慢速朗读，帮你记住怎么读
     · 单句循环：锁住当前一句反复听，直到听清为止
     · 上一句 / 重播本句 / 下一句：精确跳到某句
   字幕本身由用户自带（个人学习用途），我们不发行任何影视或字幕文件。
   ===================================================================== */
(function () {
  "use strict";

  var K_LINK = "el_film_link", K_SRT = "el_film_srt", K_SUB = "el_film_sub", K_RATE = "el_film_rate";

  var st = {
    mode: "yt",          // "yt" | "demo"
    backend: null,       // 当前激活的后端对象
    cues: [],            // [{start, end, en, cn}]
    cur: -1,
    playing: false,
    rate: 1,
    subMode: "both",     // "en" | "both" | "cn"
    loop: -1,            // 循环的句子索引，-1 表示不循环
    showSubs: true,
    ytId: "",
    demoScene: 0,
    _tick: null,
    _yt: null,
    _ytHolder: null,
    _ytReady: false,
    _demoElapsed: 0,
    _demoLast: 0,
    _rootId: ""
  };

  /* ---------------- 字幕解析 ---------------- */
  function tcToSec(s) {
    // 支持 00:00:01,000 与 00:00:01.000
    var m = String(s).trim().match(/(\d+):(\d+):(\d+)[.,](\d+)/) || String(s).trim().match(/(\d+):(\d+)[.,](\d+)/);
    if (!m) return 0;
    if (m[4] !== undefined) return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
    return (+m[1]) * 60 + (+m[2]) + (+m[3]) / 1000;
  }

  // 解析 SRT / VTT；也支持「纯文本逐行」（没有时间戳时按序号均分）
  function parseSubs(text) {
    text = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!text) return [];
    var cues = [];
    // 有标准时间戳块？
    if (/\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}/.test(text)) {
      var blocks = text.split(/\n\s*\n/);
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i].trim();
        if (!b) continue;
        var lines = b.split("\n");
        var tm = null, j = 0;
        // 跳过序号行（纯数字）
        while (j < lines.length && /^\d+$/.test(lines[j].trim())) j++;
        for (; j < lines.length; j++) {
          if (/-->\s*/.test(lines[j])) { tm = lines[j]; break; }
        }
        if (!tm) continue;
        var parts = tm.split(/-->/);
        var start = tcToSec(parts[0]);
        var end = parts[1] ? tcToSec(parts[1]) : start + 3;
        var txt = lines.slice(j + 1).join(" ").trim();
        if (!txt) continue;
        cues.push(splitCn(txt, start, end));
      }
    } else {
      // 纯文本：每行一句，按 4 秒均分（可在播放器里再调）
      var arr = text.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
      for (var k = 0; k < arr.length; k++) {
        cues.push(splitCn(arr[k], k * 4, k * 4 + 3.6));
      }
    }
    return cues.sort(function (a, b) { return a.start - b.start; });
  }

  // 若一行里用 " / " 或 "｜" 隔开中英文，拆出 cn；否则 cn 留空
  function splitCn(line, start, end) {
    line = line.trim();
    var cn = "";
    var m = line.match(/^(.*?)\s*[\/｜|]\s*(.+)$/);
    if (m) { line = m[1].trim(); cn = m[2].trim(); }
    return { start: start, end: end, en: line, cn: cn };
  }

  function extractYTId(url) {
    if (!url) return "";
    var m = String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    m = String(url).match(/^[A-Za-z0-9_-]{11}$/);
    if (m) return m[0];
    return "";
  }

  /* ---------------- YouTube IFrame API ---------------- */
  var _ytApiReady = null;
  function ytApi() {
    if (_ytApiReady) return _ytApiReady;
    _ytApiReady = new Promise(function (resolve) {
      if (window.YT && window.YT.Player) { resolve(window.YT); return; }
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (prev) prev();
        resolve(window.YT);
      };
      var tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = function () { resolve(null); };
      (document.head || document.body).appendChild(tag);
    });
    return _ytApiReady;
  }

  function ensureYTHolder() {
    if (!st._ytHolder) {
      st._ytHolder = document.createElement("div");
      st._ytHolder.id = "filmYtHolder";
      st._ytHolder.style.width = "100%";
      st._ytHolder.style.aspectRatio = "16 / 9";
    }
    return st._ytHolder;
  }

  var RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

  /* ---------------- 原创示例短片（AI 剧本 + 真人发音） ---------------- */
  // 完全原创内容，不涉及任何影视版权，可放心内置。
  var DEMOS = [
    {
      title: "☕ 在咖啡店点单",
      scene: "一家美国街角咖啡店，你第一次自己点单。",
      lines: [
        ["Hi! What can I get for you?", "嗨！你想喝点什么？"],
        ["Could I get a medium latte, please?", "请给我一杯中杯拿铁，谢谢。"],
        ["Sure! Would you like it hot or iced?", "好！你要热的还是冰的？"],
        ["Iced, please. And can I add an extra shot?", "冰的，谢谢。能多加一份浓缩吗？"],
        ["Of course. Anything to eat?", "当然可以。要点点吃的吗？"],
        ["A butter croissant, that's all.", "一个黄油可颂就好。"],
        ["Great, that's one iced latte with an extra shot and a croissant.", "好的，一杯加浓冰拿铁加一个可颂。"],
        ["That'll be six dollars and twenty cents.", "一共六美元二十美分。"],
        ["Here you go. Thank you!", "给你，谢谢！"],
        ["Your order will be ready in a minute. Have a seat!", "你的单子一会儿就好，先找个位子坐吧！"]
      ]
    },
    {
      title: "✈️ 在机场问路",
      scene: "你刚到机场，要赶下一班飞机，需要找到登机口。",
      lines: [
        ["Excuse me, where is gate B12?", "打扰一下，B12 登机口在哪里？"],
        ["Go straight, then turn left at the end.", "一直走，走到尽头左转。"],
        ["Is it far from here?", "离这儿远吗？"],
        ["Not too far, about a five-minute walk.", "不远，走过去大概五分钟。"],
        ["And is there a restroom nearby?", "附近有洗手间吗？"],
        ["Yes, it's right behind you.", "有，就在你身后。"],
        ["Perfect, thank you so much!", "太好了，非常感谢！"],
        ["You're welcome. Have a safe flight!", "不客气，祝你一路平安！"]
      ]
    }
  ];

  function buildDemoCues(sceneIdx) {
    var d = DEMOS[sceneIdx] || DEMOS[0];
    var cues = [], t = 0;
    d.lines.forEach(function (ln) {
      var en = ln[0], cn = ln[1];
      var dur = Math.max(2.2, en.split(/\s+/).length * 0.42);  // 按词数给时长
      cues.push({ start: t, end: t + dur, en: en, cn: cn });
      t += dur + 0.35;
    });
    return cues;
  }

  /* ---------------- 后端：获取/控制播放位置 ---------------- */
  // 后端统一接口：play/pause/seek(sec)/time()/rate(r)/duration()/destroy()
  function makeYTBackend() {
    return {
      type: "yt",
      play: function () { try { if (st._yt && st._yt.playVideo) st._yt.playVideo(); } catch (e) {} },
      pause: function () { try { if (st._yt && st._yt.pauseVideo) st._yt.pauseVideo(); } catch (e) {} },
      seek: function (s) { try { if (st._yt && st._yt.seekTo) st._yt.seekTo(s, true); } catch (e) {} },
      time: function () { try { return st._yt && st._yt.getCurrentTime ? st._yt.getCurrentTime() : 0; } catch (e) { return 0; } },
      rate: function (r) { try { if (st._yt && st._yt.setPlaybackRate) st._yt.setPlaybackRate(r); } catch (e) {} },
      duration: function () { try { return st._yt && st._yt.getDuration ? st._yt.getDuration() : 0; } catch (e) { return 0; } },
      destroy: function () {}
    };
  }

  function makeDemoBackend() {
    return {
      type: "demo",
      play: function () { st._demoLast = nowMs(); st.playing = true; },
      pause: function () { st.playing = false; },
      seek: function (s) { st._demoElapsed = s; st.cur = -1; },
      time: function () { return st._demoElapsed; },
      rate: function () {},
      duration: function () { return st.cues.length ? st.cues[st.cues.length - 1].end : 0; },
      destroy: function () {}
    };
  }
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  /* ---------------- 加载片源 ---------------- */
  function loadYT(id) {
    st.mode = "yt";
    st.ytId = id;
    st.backend = makeYTBackend();
    st.cur = -1;
    var holder = ensureYTHolder();
    ytApi().then(function (YT) {
      if (!YT) { renderNote("YouTube 播放器加载失败，请检查网络（国内访问 YouTube 可能需要代理）。"); return; }
      if (!st._yt) {
        st._yt = new YT.Player(holder, {
          videoId: id,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: function () { st._ytReady = true; st.backend.rate(st.rate); },
            onError: function () { renderNote("这个视频无法播放（可能已下架或地区限制）。换一个链接试试。"); }
          }
        });
      } else {
        try { st._yt.loadVideoById(id); } catch (e) {}
      }
      startTick();
    });
  }

  function loadDemo(idx) {
    st.mode = "demo";
    st.demoScene = idx;
    st.cues = buildDemoCues(idx);
    st.backend = makeDemoBackend();
    st._demoElapsed = 0;
    st.cur = -1;
    st.playing = false;
    persistScene();
    startTick();
  }

  // 应用已解析的字幕（yt 或 demo 通用）
  function applyCues(cues) {
    st.cues = cues;
    st.cur = -1;
    if (st.mode === "demo") { st._demoElapsed = 0; st.playing = false; }
    if (st.backend && st.backend.seek) st.backend.seek(0);
    renderSubs();
  }

  /* ---------------- 播放控制 ---------------- */
  function togglePlay() {
    if (!st.backend) return;
    if (st.playing) { st.backend.pause(); st.playing = false; }
    else {
      if (st.mode === "demo") { if (st.cur < 0) st.cur = 0; st.backend.play(); }
      else st.backend.play();
      st.playing = true;
    }
    refreshBar();
    if (st.mode === "demo" && st.cur >= 0 && st.cur < st.cues.length) speakCue(st.cur);
  }
  function seekToCue(i) {
    if (i < 0) i = 0; if (i >= st.cues.length) i = st.cues.length - 1;
    if (i < 0) return;
    st.backend.seek(st.cues[i].start + 0.01);
    st._demoElapsed = st.cues[i].start + 0.01;
    st.cur = i - 1;            // 让 tick 重新触发本句（含朗读）
    st.loop = -1;
    refreshBar();
  }
  function prevCue() { seekToCue(st.cur - 1); }
  function nextCue() { seekToCue(st.cur + 1); }
  function replayCue() {
    if (st.cur >= 0) { st.backend.seek(st.cues[st.cur].start + 0.01); st._demoElapsed = st.cues[st.cur].start + 0.01; speakCue(st.cur); }
  }
  function toggleLoop() {
    st.loop = (st.loop === st.cur && st.cur >= 0) ? -1 : st.cur;
    refreshBar();
  }
  function setRate(r) {
    st.rate = r;
    try { localStorage.setItem(K_RATE, String(r)); } catch (e) {}
    if (st.backend && st.backend.rate) st.backend.rate(r);
    refreshBar();
  }
  function cycleSub() {
    st.subMode = st.subMode === "en" ? "both" : st.subMode === "both" ? "cn" : "en";
    try { localStorage.setItem(K_SUB, st.subMode); } catch (e) {}
    renderSubs();
    refreshBar();
  }
  function toggleSubs() { st.showSubs = !st.showSubs; renderSubs(); refreshBar(); }

  function speakCue(i) {
    var c = st.cues[i]; if (!c) return;
    if (typeof speak === "function") { try { speak(c.en, st.rate < 0.85); } catch (e) {} }
  }
  function speakWord(w) {
    if (typeof speak === "function") { try { speak(w, true); } catch (e) {} }
    flashWord(w);
  }

  /* ---------------- 主循环：同步字幕 ---------------- */
  function startTick() {
    if (st._tick) return;
    st._tick = setInterval(function () {
      var root = document.getElementById(st._rootId);
      if (!root) { stopTick(); return; }          // 离开页面 → 自清理
      if (st.mode === "demo" && st.playing) {
        var dt = (nowMs() - st._demoLast) / 1000 / st.rate;
        st._demoElapsed += dt;
        st._demoLast = nowMs();
      }
      var t = st.backend ? st.backend.time() : 0;
      var idx = -1;
      for (var i = 0; i < st.cues.length; i++) {
        if (t >= st.cues[i].start && t < st.cues[i].end) { idx = i; break; }
      }
      if (idx !== st.cur) {
        st.cur = idx;
        if (st.mode === "demo" && st.playing && idx >= 0) speakCue(idx);
        renderSubs();
      }
      refreshProgress();
      if (st.loop >= 0 && st.cur === st.loop && st.cues[st.loop]) {
        if (t >= st.cues[st.loop].end - 0.05) {
          st.backend.seek(st.cues[st.loop].start + 0.01);
          st._demoElapsed = st.cues[st.loop].start + 0.01;
          speakCue(st.loop);
        }
      }
      if (st.mode === "demo" && st.playing && st.cues.length && t >= st.cues[st.cues.length - 1].end) {
        st.playing = false; refreshBar();
      }
    }, 200);
  }
  function stopTick() { if (st._tick) { clearInterval(st._tick); st._tick = null; } }

  /* ---------------- 渲染 ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function wordSpans(en) {
    return String(en).split(/(\s+)/).map(function (tok) {
      if (/^\s+$/.test(tok)) return tok;
      var w = tok.replace(/[^A-Za-z']/g, "");
      if (!w) return esc(tok);
      return '<span class="fw" data-w="' + esc(w) + '">' + esc(tok) + "</span>";
    }).join("");
  }

  function renderSubs() {
    var box = document.getElementById("filmSubs");
    if (!box) return;
    if (!st.showSubs) { box.innerHTML = ""; return; }
    var c = st.cues[st.cur];
    if (!c) { box.innerHTML = '<div class="film-empty">▶ 点上面的播放，开始看字幕</div>'; return; }
    var html = '<div class="film-line' + (st.loop === st.cur ? " is-loop" : "") + '">';
    if (st.subMode !== "cn") html += '<div class="film-en">' + wordSpans(c.en) + "</div>";
    if (st.subMode !== "en" && c.cn) html += '<div class="film-cn">' + esc(c.cn) + "</div>";
    html += "</div>";
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  function renderNote(msg) {
    var box = document.getElementById("filmNote");
    if (!box) return;
    box.innerHTML = msg ? '<div class="film-note">⚠️ ' + esc(msg) + "</div>" : "";
  }

  function refreshBar() {
    var root = document.getElementById(st._rootId); if (!root) return;
    var playBtn = root.querySelector('[data-film="play"]');
    if (playBtn) playBtn.textContent = st.playing ? "⏸ 暂停" : "▶ 播放";
    var loopBtn = root.querySelector('[data-film="loop"]');
    if (loopBtn) loopBtn.classList.toggle("on", st.loop === st.cur && st.cur >= 0);
    var subBtn = root.querySelector('[data-film="sub"]');
    if (subBtn) subBtn.textContent = "字幕：" + (st.subMode === "en" ? "英文" : st.subMode === "both" ? "中英" : "中文");
    var hideBtn = root.querySelector('[data-film="hide"]');
    if (hideBtn) hideBtn.classList.toggle("on", !st.showSubs);
    var rateSel = root.querySelector('[data-film="rate"]');
    if (rateSel) rateSel.value = String(st.rate);
  }

  function refreshProgress() {
    var bar = document.getElementById("filmProgress");
    if (!bar || !st.cues.length) return;
    var dur = st.backend ? st.backend.duration() : 0;
    var t = st.backend ? st.backend.time() : 0;
    if (!dur) dur = st.cues[st.cues.length - 1].end;
    var pct = dur ? Math.min(100, (t / dur) * 100) : 0;
    bar.style.width = pct + "%";
  }

  function flashWord(w) {
    var box = document.getElementById("filmWordTip");
    if (!box) return;
    box.innerHTML = '<span class="fwt-w">🔊 ' + esc(w) + "</span><span class=\"fwt-hint\">已用真人慢速朗读</span>";
    box.classList.add("show");
    clearTimeout(box._t);
    box._t = setTimeout(function () { box.classList.remove("show"); }, 1400);
  }

  /* ---------------- 挂载（幂等：重渲染时复用 YouTube 播放器） ---------------- */
  function mount(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return;
    st._rootId = rootId;

    try { st.subMode = localStorage.getItem(K_SUB) || "both"; } catch (e) {}
    try { st.rate = parseFloat(localStorage.getItem(K_RATE)) || 1; } catch (e) {}

    var lastLink = "", lastSrt = "";
    try { lastLink = localStorage.getItem(K_LINK) || ""; } catch (e) {}
    try { lastSrt = localStorage.getItem(K_SRT) || ""; } catch (e) {}

    root.innerHTML = `
      <div class="page-head ph-film">
        <button class="ph-back" data-v="home">← 返回首页</button>
        <span class="ph-ico">🎬</span>
        <div class="ph-tx"><h1>影视学习</h1><p>看电影 / 剧学英语：双语字幕 + 变速 + 点词发音 + 单句循环。片源用你自己的链接或字幕，合法又自由。</p></div>
      </div>

      <div class="card film-card">
        <div class="film-tabs">
          <button class="ftab on" data-ftab="yt">📺 YouTube 链接</button>
          <button class="ftab" data-ftab="demo">🎬 原创示例短片</button>
        </div>

        <div id="filmYtPanel" class="film-panel">
          <div class="film-load">
            <input id="filmUrl" class="film-url" placeholder="粘贴 YouTube 链接（如 https://youtu.be/xxxx）" value="${esc(lastLink)}">
            <button class="btn" data-film="load">加载影片</button>
            <button class="btn ghost" data-film="upload">📂 上传字幕</button>
            <button class="btn ghost" data-film="paste">✏️ 粘贴字幕</button>
            <input id="filmFile" type="file" accept=".srt,.vtt,.txt" hidden>
          </div>
          <div id="filmPlayer" class="film-player"><div class="film-ph">在上方粘贴 YouTube 链接并点「加载影片」</div></div>
          <div id="filmNote"></div>
          <div class="film-hint">字幕由你提供：上传 .srt/.vtt 文件，或点「粘贴字幕」粘贴文本（每行一句，中英文用 / 隔开也行）。没有时间轴也行，会自动按句切分。</div>
        </div>

        <div id="filmDemoPanel" class="film-panel" hidden>
          <div class="film-demos" id="filmDemos"></div>
          <div id="filmStage" class="film-stage">
            <div class="fs-scene">🎬 ${esc(DEMOS[st.demoScene] ? DEMOS[st.demoScene].title : "")}</div>
            <div class="fs-desc">${esc(DEMOS[st.demoScene] ? DEMOS[st.demoScene].scene : "")}</div>
          </div>
        </div>

        <div class="film-bar">
          <button class="btn" data-film="prev">⏮ 上一句</button>
          <button class="btn primary" data-film="play">▶ 播放</button>
          <button class="btn" data-film="replay">↻ 重播本句</button>
          <button class="btn" data-film="next">下一句 ⏭</button>
          <button class="btn ghost" data-film="loop">🔁 单句循环</button>
          <span class="film-sp"></span>
          <label class="film-lbl">速度
            <select class="film-rate" data-film="rate">
              ${RATES.map(function (r) { return '<option value="' + r + '"' + (r === st.rate ? " selected" : "") + ">" + r + "x</option>"; }).join("")}
            </select>
          </label>
          <button class="btn ghost" data-film="sub">字幕：中英</button>
          <button class="btn ghost" data-film="hide">👁 隐藏字幕</button>
        </div>

        <div id="filmProgressWrap" class="film-progress-wrap"><div id="filmProgress" class="film-progress"></div></div>

        <div id="filmSubs" class="film-subs"><div class="film-empty">▶ 点上面的播放，开始看字幕</div></div>
        <div id="filmWordTip" class="film-word-tip"></div>

        <div id="filmSrtBox" class="film-srt-box" hidden>
          <textarea id="filmSrt" class="film-srt" placeholder="把字幕内容粘贴到这里（支持 .srt / .vtt 格式，或每行一句的纯文本）。中英文可用 / 隔开。"></textarea>
          <div class="film-srt-actions">
            <button class="btn primary" data-film="srtok">用这段字幕</button>
            <button class="btn ghost" data-film="srtcancel">取消</button>
          </div>
        </div>
      </div>`;

    // 复用已有的 YouTube 播放器容器（避免重渲染重建）
    var playerSlot = root.querySelector("#filmPlayer");
    if (st.mode === "yt" && st._ytHolder && st._ytHolder.parentNode !== playerSlot) {
      playerSlot.innerHTML = "";
      playerSlot.appendChild(st._ytHolder);
    }

    // 示例短片列表
    var demosBox = root.querySelector("#filmDemos");
    demosBox.innerHTML = DEMOS.map(function (d, i) {
      return '<button class="film-demo' + (i === st.demoScene ? " on" : "") + '" data-demo="' + i + '">' + esc(d.title) + "</button>";
    }).join("");

    bind(root);
    refreshBar();
    startTick();

    // 进入时按记忆恢复上次选择
    if (st.mode === "demo") { switchTab("demo"); if (!st.cues.length) loadDemo(st.demoScene); }
  }

  function bind(root) {
    root.querySelector('[data-v="home"]').onclick = function () { goView("home"); };

    root.querySelectorAll("[data-ftab]").forEach(function (b) {
      b.onclick = function () { switchTab(b.getAttribute("data-ftab")); };
    });

    root.querySelector('[data-film="load"]').onclick = function () {
      var url = root.querySelector("#filmUrl").value.trim();
      var id = extractYTId(url);
      if (!id) { renderNote("没认出 YouTube 链接，请确认是 youtube.com/watch?v= 或 youtu.be/ 链接。"); return; }
      try { localStorage.setItem(K_LINK, url); } catch (e) {}
      renderNote("");
      loadYT(id);
      var slot = root.querySelector("#filmPlayer");
      slot.innerHTML = "";
      if (st._ytHolder) slot.appendChild(st._ytHolder);
    };
    root.querySelector('[data-film="upload"]').onclick = function () { root.querySelector("#filmFile").click(); };
    root.querySelector("#filmFile").onchange = function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { applyUploaded(String(rd.result)); };
      rd.readAsText(f);
    };
    root.querySelector('[data-film="paste"]').onclick = function () {
      var box = root.querySelector("#filmSrtBox");
      box.hidden = !box.hidden;
      if (!box.hidden) root.querySelector("#filmSrt").focus();
    };
    root.querySelector('[data-film="srtok"]').onclick = function () {
      var txt = root.querySelector("#filmSrt").value;
      var cues = parseSubs(txt);
      if (!cues.length) { renderNote("没解析出字幕，检查一下格式？"); return; }
      try { localStorage.setItem(K_SRT, txt); } catch (e) {}
      applyCues(cues);
      root.querySelector("#filmSrtBox").hidden = true;
      renderNote("已载入 " + cues.length + " 条字幕" + (st.mode === "yt" ? "（点影片播放即可同步）" : ""));
    };
    root.querySelector('[data-film="srtcancel"]').onclick = function () { root.querySelector("#filmSrtBox").hidden = true; };

    root.querySelector('[data-film="play"]').onclick = togglePlay;
    root.querySelector('[data-film="prev"]').onclick = prevCue;
    root.querySelector('[data-film="replay"]').onclick = replayCue;
    root.querySelector('[data-film="next"]').onclick = nextCue;
    root.querySelector('[data-film="loop"]').onclick = toggleLoop;
    root.querySelector('[data-film="sub"]').onclick = cycleSub;
    root.querySelector('[data-film="hide"]').onclick = toggleSubs;
    root.querySelector('[data-film="rate"]').onchange = function (e) { setRate(parseFloat(e.target.value) || 1); };

    root.querySelectorAll("[data-demo]").forEach(function (b) {
      b.onclick = function () { loadDemo(parseInt(b.getAttribute("data-demo"), 10) || 0); switchTab("demo"); renderStage(); };
    });

    // 点词发音
    root.querySelector("#filmSubs").onclick = function (e) {
      var sp = e.target.closest(".fw");
      if (sp) speakWord(sp.getAttribute("data-w"));
    };
  }

  function renderStage() {
    var stage = document.getElementById("filmStage");
    if (!stage) return;
    var d = DEMOS[st.demoScene] || DEMOS[0];
    stage.innerHTML = '<div class="fs-scene">🎬 ' + esc(d.title) + '</div><div class="fs-desc">' + esc(d.scene) + '</div>';
  }

  function switchTab(tab) {
    st.mode = (tab === "demo") ? "demo" : "yt";
    var root = document.getElementById(st._rootId); if (!root) return;
    root.querySelectorAll("[data-ftab]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-ftab") === tab); });
    root.querySelector("#filmYtPanel").hidden = (tab !== "yt");
    root.querySelector("#filmDemoPanel").hidden = (tab !== "demo");
    if (tab === "demo") { if (!st.cues.length) loadDemo(st.demoScene); renderStage(); }
    else { renderNote(""); }
  }

  function applyUploaded(txt) {
    var cues = parseSubs(txt);
    if (!cues.length) { renderNote("这个文件没解析出字幕，确认是 .srt / .vtt 文本？"); return; }
    try { localStorage.setItem(K_SRT, txt); } catch (e) {}
    applyCues(cues);
    renderNote("已载入 " + cues.length + " 条字幕" + (st.mode === "yt" ? "（点影片播放即可同步）" : "（短片将按此字幕播放）"));
  }
  function persistScene() { try { localStorage.setItem("el_film_demo", String(st.demoScene)); } catch (e) {} }

  window.Film = {
    mount: mount, state: st, parseSubs: parseSubs, extractYTId: extractYTId,
    loadDemo: loadDemo, loadYT: loadYT
  };
})();
