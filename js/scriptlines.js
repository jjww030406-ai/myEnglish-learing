/* =====================================================================
   台词精读（📝）：用「原创情景喜剧式」对话练地道英语
   ---------------------------------------------------------------------
   为什么是「原创」：老友记等影视的剧本/字幕受版权保护，不能抓取或内置。
   所以这里全部是对话原创、角色原创（Corner Bean 咖啡馆的六个朋友），
   但刻意模仿情景喜剧的轻松语感 —— 你要的不是"某一集"，而是"用生活化
   的对话学地道说法"，这部分完全可以原创且零版权风险。

   三个练习模式，对应你的需求：
     · 精读：双语 + 可点词发音 + 每句「💡 讲解」（这个词/短语为什么这么用）
     · 跟读：听原句 → 用麦克风跟读 → 自动比对、给出命中率 + 漏掉的词
             （不支持语音的浏览器，改用键盘跟读，照样能打分）
     · 填空：每句挖掉 1~3 个关键词，你填进去 → 逐空判对错

   依赖全局：speak()（真人发音）、goView()、render()、save()、S（学习状态）
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------- 原创剧情数据 ----------------
     角色：Mia / Leo / Zoe / Ben / Coco / Sam（六人朋友圈）
     地点：Corner Bean 咖啡馆，以及他们的公寓客厅等日常场景
     每条：who 说话人, en 英文, cn 中文, notes 讲解(短语/词), blanks 要挖的词 */
  var SCENES = [
    {
      icon: "☕", title: "Corner Bean 咖啡馆", who: "六人组的周末据点",
      setting: "周末上午，几个人窝在 Corner Bean 咖啡馆，边喝咖啡边聊今天怎么过。",
      lines: [
        { who: "Mia", en: "Morning, everyone! Grab a seat, I'll grab us some coffee.", cn: "早上好各位！随便坐，我去给大家弄点咖啡。",
          notes: ["grab a seat = 找个座坐下（grab 在这里是「随手拿下/取」）", "grab us some coffee = 给大家弄点咖啡来"], blanks: ["grab"] },
        { who: "Leo", en: "You don't have to. I can grab my own.", cn: "不用麻烦，我自己来就行。",
          notes: ["have to = 不得不 / 必须", "my own = 我自己的（own 强调「本人」）"], blanks: ["own"] },
        { who: "Sam", en: "So, what's the plan for today?", cn: "那今天有什么安排？",
          notes: ["what's the plan = 今天怎么安排 / 什么计划（口语高频）"], blanks: ["plan"] },
        { who: "Zoe", en: "I was thinking we could catch a movie later.", cn: "我在想待会儿去看场电影。",
          notes: ["catch a movie = 看场电影（catch 口语里常表「赶上看」）", "later = 待会儿 / 晚些时候"], blanks: ["catch"] },
        { who: "Ben", en: "Again? We went to the movies last week!", cn: "又去？我们上周刚看过电影！",
          notes: ["last week = 上周", "went 是 go 的过去式"], blanks: ["went"] },
        { who: "Coco", en: "Don't be such a grump, Ben. Movies are fun.", cn: "别这么扫兴嘛 Ben，看电影多开心。",
          notes: ["grump = 爱抱怨的人 / 扫兴鬼（口语）", "Don't be such a... = 别这么……嘛"], blanks: ["grump"] },
        { who: "Mia", en: "How about we decide after coffee?", cn: "要不喝完咖啡再决定？",
          notes: ["How about... = ……怎么样（提建议）", "after coffee = 喝完咖啡后"], blanks: ["decide"] },
        { who: "Sam", en: "Deal. Coffee first, always.", cn: "成交。先喝咖啡，永远的真理。",
          notes: ["Deal! = 成交 / 说定了（口语常用）"], blanks: ["Deal"] }
      ]
    },
    {
      icon: "🛋", title: "公寓客厅里的八卦", who: "沙发上的夜聊",
      setting: "晚上，在 Sam 和 Leo 的公寓客厅，几个人窝在沙发上闲聊 Leo 的暧昧对象。",
      lines: [
        { who: "Zoe", en: "Okay, spill it. Did you text her back?", cn: "好了快说，你回她消息了吗？",
          notes: ["spill it = 快说 / 坦白（口语，别憋着）", "text back = 回消息（text 作动词）"], blanks: ["spill"] },
        { who: "Leo", en: "I did, but she left me on read.", cn: "回了，但她看了不回（已读不回）。",
          notes: ["left me on read = 已读不回（社媒口语）"], blanks: ["read"] },
        { who: "Mia", en: "Ouch. That's rough.", cn: "哎哟，那挺扎心的。",
          notes: ["Ouch = 哎哟（表同情/被戳到）", "rough = 难受的 / 糟糕的"], blanks: ["rough"] },
        { who: "Ben", en: "Honestly, maybe she's just busy.", cn: "说真的，也许她只是忙。",
          notes: ["Honestly = 说真的 / 老实说", "just = 只是 / 仅仅"], blanks: ["busy"] },
        { who: "Coco", en: "Or maybe he texted something weird.", cn: "要么就是他发了什么奇怪的话。",
          notes: ["weird = 奇怪的 / 不对劲的", "something = 某样东西 / 某事"], blanks: ["weird"] },
        { who: "Sam", en: "Hey! I did not text anything weird.", cn: "喂！我可没发什么奇怪的。",
          notes: ["anything = 任何东西（否定句里用）", "not...anything = 什么都没"], blanks: ["anything"] },
        { who: "Leo", en: "Anyway, I'll give it a day. No big deal.", cn: "反正我再等一天，没什么大不了。",
          notes: ["give it a day = 再等等看（过一天再说）", "No big deal = 没什么大不了"], blanks: ["deal"] },
        { who: "Zoe", en: "Fine. But if she ghosts you, we're ordering pizza.", cn: "行吧。但要是她把你晾了，我们就点披萨。",
          notes: ["ghosts you = 玩消失 / 冷处理（ghost 作动词，社媒口语）", "ordering pizza = 点披萨"], blanks: ["ghosts"] }
      ]
    },
    {
      icon: "💔", title: "尴尬的相亲", who: "被朋友硬塞的 blind date",
      setting: "餐厅里，Mia 被朋友安排了一场相亲，对方是 Ben 的朋友 Ryan。",
      lines: [
        { who: "Mia", en: "So... you're Ben's friend from college?", cn: "所以……你是 Ben 大学时的朋友？",
          notes: ["from college = 大学时期的（同学/朋友）"], blanks: ["college"] },
        { who: "Ryan", en: "Yep. He says you're really into hiking.", cn: "对，他说你特别喜欢 hiking（徒步）。",
          notes: ["into = 特别喜欢 / 热衷（be into sth）", "hiking = 徒步 / 远足"], blanks: ["into"] },
        { who: "Mia", en: "I like walking, sure. 'Really into' is a stretch.", cn: "我挺喜欢散步的，说「特别喜欢」有点夸张了。",
          notes: ["a stretch = 夸张 / 言过其实（that's a stretch）", "sure = 当然 / 的确"], blanks: ["stretch"] },
        { who: "Ryan", en: "Fair enough. I'm more of a food guy myself.", cn: "说得也是。我自己更偏向吃货那一挂。",
          notes: ["Fair enough = 说得对 / 有道理", "more of a ... guy = 更偏向……的人"], blanks: ["food"] },
        { who: "Mia", en: "Oh, a food guy? Now we're talking.", cn: "哦，吃货？那我们聊得来了。",
          notes: ["Now we're talking = 这下有的聊了 / 正合我意"], blanks: ["talking"] },
        { who: "Ryan", en: "There's a great ramen place around the corner.", cn: "街角有家很棒的拉面店。",
          notes: ["around the corner = 在街角 / 很近", "place = 这里指「店」"], blanks: ["corner"] },
        { who: "Mia", en: "Perfect. Let's skip the small talk and go.", cn: "太好了，别寒暄了直接走吧。",
          notes: ["skip = 跳过 / 略过", "small talk = 寒暄 / 闲聊"], blanks: ["skip"] },
        { who: "Ryan", en: "Lead the way.", cn: "你带路。",
          notes: ["Lead the way = 你带路 / 请便（让别人先走）"], blanks: ["Lead"] }
      ]
    },
    {
      icon: "🎂", title: "生日派对的乌龙", who: "搞错日期的惊喜",
      setting: "大家以为今天是 Coco 的生日，冲进来喊 surprise，结果日期搞错了。",
      lines: [
        { who: "Ben", en: "Surprise! Happy birthday, Coco!", cn: "惊喜！生日快乐 Coco！",
          notes: ["Surprise! = 惊喜！（突然出现的庆祝）", "Happy birthday = 生日快乐"], blanks: ["birthday"] },
        { who: "Coco", en: "Um... my birthday is next month.", cn: "呃……我生日是下个月。",
          notes: ["next month = 下个月", "Um... = 呃……（迟疑）"], blanks: ["month"] },
        { who: "Mia", en: "Wait, are you serious?", cn: "等等，你说真的？",
          notes: ["Wait = 等等 / 慢着（口语）", "serious = 认真的 / 说真的"], blanks: ["serious"] },
        { who: "Leo", en: "Ben, you got the date wrong again.", cn: "Ben，你又把日期搞错了。",
          notes: ["got ... wrong = 把……搞错了（get 的过去式 got）"], blanks: ["wrong"] },
        { who: "Ben", en: "I'm so sorry! I could've sworn it was today.", cn: "太对不起了！我发誓记得是今天。",
          notes: ["could've sworn = 信誓旦旦地以为（swear 的过去完成）", "I'm so sorry = 太对不起了"], blanks: ["sworn"] },
        { who: "Zoe", en: "Well, free cake for everyone, right?", cn: "那也好啊，反正大家白吃蛋糕，不亏？",
          notes: ["free = 免费的", "for everyone = 给每个人的"], blanks: ["cake"] },
        { who: "Coco", en: "I'll take the cake. The day doesn't matter.", cn: "蛋糕我收了，日子不重要。",
          notes: ["take the cake = 收下蛋糕（原意常表「最离谱」）"], blanks: ["cake"] },
        { who: "Sam", en: "Best mistake you've made, Ben.", cn: "Ben，你这错犯得最美了。",
          notes: ["Best mistake = 最美的错误（反话夸）"], blanks: ["mistake"] }
      ]
    },
    {
      icon: "📦", title: "搬新家", who: "朋友们来帮忙",
      setting: "Leo 刚搬进新公寓，五个朋友来帮忙搬箱子。",
      lines: [
        { who: "Leo", en: "Thanks for helping me move. I owe you one.", cn: "谢谢你们帮我搬家，欠你们一个人情。",
          notes: ["owe you one = 欠你一个人情（I owe you）", "helping me move = 帮我搬家"], blanks: ["owe"] },
        { who: "Sam", en: "No problem. Where do these boxes go?", cn: "没事，这些箱子放哪儿？",
          notes: ["No problem = 没事 / 不客气", "boxes = 箱子（box 复数）"], blanks: ["boxes"] },
        { who: "Mia", en: "The kitchen, I think. Be careful, that one's heavy.", cn: "厨房吧，小心点，那个很重。",
          notes: ["Be careful = 小心点", "heavy = 重的"], blanks: ["heavy"] },
        { who: "Zoe", en: "Why do you own so many books?", cn: "你怎么会有这么多书？",
          notes: ["own = 拥有", "so many = 这么多（接复数）"], blanks: ["books"] },
        { who: "Ben", en: "That's not even half of them.", cn: "这还不到一半呢。",
          notes: ["not even = 连……都不", "half = 一半"], blanks: ["half"] },
        { who: "Coco", en: "Okay, last box. We're almost done.", cn: "好了，最后一个箱子，快弄完了。",
          notes: ["last = 最后一个", "almost done = 快弄完了"], blanks: ["almost"] },
        { who: "Leo", en: "Pizza's on me tonight. You all earned it.", cn: "今晚披萨我请，你们值得。",
          notes: ["on me = 我请客（It's on me）", "earned it = 应得的 / 挣来的"], blanks: ["earned"] },
        { who: "Sam", en: "Now that's the thanks we wanted.", cn: "这才是对味儿的感谢。",
          notes: ["Now that's... = 这才叫……", "thanks = 感谢"], blanks: ["thanks"] }
      ]
    },
    {
      icon: "🍝", title: "谁来做饭", who: "晚饭时间的推拉",
      setting: "晚饭时间，六个人互相推脱，谁都不想做饭。",
      lines: [
        { who: "Zoe", en: "Who's cooking tonight?", cn: "今晚谁做饭？",
          notes: ["cooking = 做饭（cook 的现在分词）", "tonight = 今晚"], blanks: ["cooking"] },
        { who: "Ben", en: "Not me. I cooked yesterday.", cn: "别找我，我昨天做了。",
          notes: ["yesterday = 昨天", "cooked 是 cook 的过去式"], blanks: ["yesterday"] },
        { who: "Mia", en: "And I ordered in the day before.", cn: "前天还是我点的外卖。",
          notes: ["ordered in = 点了外卖（order in）", "the day before = 前一天 / 前天"], blanks: ["ordered"] },
        { who: "Leo", en: "So nobody wants to cook. Typical.", cn: "所以没人想做，真典型。",
          notes: ["nobody = 没人", "Typical = 典型（这里表「又来了」）"], blanks: ["Typical"] },
        { who: "Coco", en: "How about we all chip in for takeout?", cn: "要不我们凑钱点外卖？",
          notes: ["chip in = 凑钱 / 分摊", "takeout = 外卖（外带）"], blanks: ["chip"] },
        { who: "Sam", en: "Deal. Thai or pizza?", cn: "成交，泰餐还是披萨？",
          notes: ["Deal = 成交 / 说定了", "or = 还是 / 或者"], blanks: ["Deal"] },
        { who: "Mia", en: "Thai. I'm starving.", cn: "泰餐，我快饿死了。",
          notes: ["starving = 饿坏了（starve 的现在分词）"], blanks: ["starving"] },
        { who: "Ryan", en: "I'll place the order. Extra spicy for me.", cn: "我来下单，我要特辣。",
          notes: ["place the order = 下单", "Extra spicy = 特辣 / 加辣"], blanks: ["spicy"] }
      ]
    }
  ];

  var K_SCENE = "el_sl_scene";
  var st = {
    scene: 0,
    mode: "read",        // "read" | "shadow" | "cloze"
    line: 0,             // 跟读/填空当前句
    noteOpen: {},        // {lineIdx: true} 哪些句的讲解展开了
    said: "",            // 跟读识别到的文本
    score: null,         // {pct, hit:[], miss:[]}
    listening: false,
    clozeChecked: false, // 当前填空句是否已判分
    _rootId: "",
    _play: null,         // 整段朗读的定时器集合
    _recog: null
  };

  /* ---------------- 存取 ---------------- */
  try { var _s = parseInt(localStorage.getItem(K_SCENE), 10); if (!isNaN(_s)) st.scene = _s; } catch (e) {}
  function persistScene() { try { localStorage.setItem(K_SCENE, String(st.scene)); } catch (e) {} }

  function scene() { return SCENES[st.scene] || SCENES[0]; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------------- 跟读打分 ---------------- */
  function normWords(s) {
    return String(s || "").toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
  }
  function scoreShadow(target, said) {
    var t = normWords(target), s = normWords(said);
    var set = {}; s.forEach(function (w) { set[w] = true; });
    var hit = t.filter(function (w) { return set[w]; });
    var miss = t.filter(function (w) { return !set[w]; });
    var pct = t.length ? Math.round(hit.length / t.length * 100) : 0;
    return { pct: pct, hit: hit, miss: miss };
  }

  /* ---------------- 语音输入（沿用 talk.js 的识别写法） ---------------- */
  function canListen() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
  function listen(onResult, onEnd, onErr) {
    if (!canListen()) { onErr && onErr("unsupported"); return false; }
    try {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      var r = new SR();
      r.lang = "en-US"; r.interimResults = true; r.continuous = false;
      var finalTxt = "";
      r.onresult = function (e) {
        var t = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalTxt += e.results[i][0].transcript;
          else t += e.results[i][0].transcript;
        }
        onResult && onResult(finalTxt + t, !!finalTxt);
      };
      r.onerror = function (e) { onErr && onErr(e.error || "error"); };
      r.onend = function () { st.listening = false; onEnd && onEnd(finalTxt); };
      r.start();
      st.listening = true; st._recog = r;
      return true;
    } catch (e) { onErr && onErr(String(e.message || e)); return false; }
  }
  function stopListen() { try { if (st._recog) st._recog.stop(); } catch (e) {} st.listening = false; }

  /* ---------------- 单词点击发音 ---------------- */
  function wordSpans(en) {
    return String(en).split(/(\s+)/).map(function (tok) {
      if (/^\s+$/.test(tok)) return tok;
      var w = tok.replace(/[^A-Za-z']/g, "");
      if (!w) return esc(tok);
      return '<span class="fw" data-w="' + esc(w) + '">' + esc(tok) + "</span>";
    }).join("");
  }

  /* ---------------- 整段朗读（read 模式） ---------------- */
  function stopPlay() { if (st._play) { st._play.forEach(clearTimeout); st._play = null; } }
  function playAll() {
    stopPlay();
    var lines = scene().lines;
    var timers = [];
    var t = 200;
    lines.forEach(function (ln) {
      timers.push(setTimeout(function () {
        if (typeof speak === "function") { try { speak(ln.en, true); } catch (e) {} }
        // 同步高亮当前句
        var root = document.getElementById(st._rootId);
        if (root) root.querySelectorAll(".sl-line").forEach(function (el, i) {
          el.classList.toggle("is-playing", i === lines.indexOf(ln));
        });
      }, t));
      t += 1600 + ln.en.split(/\s+/).length * 130;
    });
    timers.push(setTimeout(function () {
      var root = document.getElementById(st._rootId);
      if (root) root.querySelectorAll(".sl-line").forEach(function (el) { el.classList.remove("is-playing"); });
    }, t));
    st._play = timers;
  }

  /* ---------------- 渲染 ---------------- */
  function mount(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return;
    st._rootId = rootId;
    stopPlay();
    render();
  }

  function render() {
    var root = document.getElementById(st._rootId);
    if (!root) return;
    var sc = scene();

    var sceneChips = SCENES.map(function (s, i) {
      return '<button class="sl-chip' + (i === st.scene ? " on" : "") + '" data-slscene="' + i + '">' + s.icon + " " + esc(s.title) + "</button>";
    }).join("");

    var modeTabs = [
      { m: "read", t: "📖 精读讲解" },
      { m: "shadow", t: "🎤 跟读打分" },
      { m: "cloze", t: "✏️ 填空自测" }
    ].map(function (x) {
      return '<button class="sl-tab' + (x.m === st.mode ? " on" : "") + '" data-slmode="' + x.m + '">' + x.t + "</button>";
    }).join("");

    var body = "";
    if (st.mode === "read") body = renderRead(sc);
    else if (st.mode === "shadow") body = renderShadow(sc);
    else body = renderCloze(sc);

    root.innerHTML = `
      <div class="card sl-card">
        <div class="sl-scenes">${sceneChips}</div>
        <div class="sl-setting"><b>${esc(sc.icon)} ${esc(sc.title)}</b> · ${esc(sc.setting)}</div>
        <div class="sl-tabs">${modeTabs}</div>
        <div class="sl-body">${body}</div>
      </div>`;

    bind(root);
  }

  /* ---- 精读模式 ---- */
  function renderRead(sc) {
    var lines = sc.lines.map(function (ln, i) {
      var open = st.noteOpen[i];
      var notes = (ln.notes && ln.notes.length)
        ? '<div class="sl-notes' + (open ? " open" : "") + '" id="slNotes' + i + '">' +
            ln.notes.map(function (n) { return '<div class="sl-note">💡 ' + esc(n) + "</div>"; }).join("") +
          "</div>"
        : "";
      var noteBtn = (ln.notes && ln.notes.length)
        ? '<button class="sl-mini" data-slnote="' + i + '">' + (open ? "💡 收起讲解" : "💡 看讲解") + "</button>"
        : "";
      return `
        <div class="sl-line" data-slline="${i}">
          <div class="sl-who">👤 ${esc(ln.who)}</div>
          <div class="sl-en">${wordSpans(ln.en)}</div>
          <div class="sl-cn">${esc(ln.cn)}</div>
          <div class="sl-acts">
            <button class="sl-mini" data-slsay="${i}">🔊 听原句</button>
            ${noteBtn}
          </div>
          ${notes}
        </div>`;
    }).join("");

    return `
      <div class="sl-read-head">
        <button class="btn" data-slplayall>▶ 朗读整段</button>
        <span class="muted">点任意英文单词可真人慢速发音 · 点「💡 看讲解」学这个词为什么这么用</span>
      </div>
      <div class="sl-lines">${lines}</div>`;
  }

  /* ---- 跟读模式 ---- */
  function renderShadow(sc) {
    var n = sc.lines.length;
    var i = Math.max(0, Math.min(n - 1, st.line));
    st.line = i;
    var ln = sc.lines[i];

    var saidBlock = "";
    if (st.said || st.score) {
      var score = st.score;
      var cls = score.pct >= 80 ? "good" : score.pct >= 50 ? "mid" : "bad";
      var missed = (score.miss && score.miss.length)
        ? '<div class="sl-miss">漏掉的词：<b>' + score.miss.map(esc).join("</b> <b>") + "</b></div>"
        : '<div class="sl-miss ok">全部命中，漂亮！🎉</div>';
      saidBlock = `
        <div class="sl-said">
          <div class="sl-said-en">你说的是：<span>${esc(st.said)}</span></div>
          <div class="sl-score ${cls}">跟读命中率 ${score.pct}%</div>
          ${missed}
        </div>`;
    }

    var micBtn = canListen()
      ? '<button class="btn primary" data-slmic>' + (st.listening ? "🔴 听着呢…（点一下结束）" : "🎤 开始跟读") + "</button>"
      : "";
    var kbFallback = canListen() ? "" : `
      <div class="sl-kb">
        <p class="muted">本浏览器不支持语音输入，改用键盘跟读：在下面把刚听到的句子打出来，再点「评分」。</p>
        <textarea id="slKb" class="sl-kb-in" rows="2" placeholder="Type what you heard...">${esc(st.said)}</textarea>
        <button class="btn" data-slkb>评分</button>
      </div>`;

    return `
      <div class="sl-prog">第 ${i + 1} / ${n} 句</div>
      <div class="sl-flash">
        <div class="sl-flash-en">${wordSpans(ln.en)}</div>
        <div class="sl-flash-cn">${esc(ln.cn)}</div>
      </div>
      <div class="sl-shadow-acts">
        <button class="btn" data-slsayline>🔊 听原句</button>
        ${micBtn}
      </div>
      ${kbFallback}
      ${saidBlock}
      <div class="sl-nav">
        <button class="btn ghost" data-slprev>⏮ 上一句</button>
        <button class="btn ghost" data-slnext>下一句 ⏭</button>
      </div>
      <p class="muted sl-tip">小技巧：先点「听原句」跟读 2 遍找语感，再点麦克风跟读；命中率看的是关键词有没有说对，不必逐字一样。</p>`;
  }

  /* ---- 填空模式 ---- */
  function renderCloze(sc) {
    var n = sc.lines.length;
    var i = Math.max(0, Math.min(n - 1, st.line));
    st.line = i;
    var ln = sc.lines[i];
    var blankSet = {};
    (ln.blanks || []).forEach(function (b) { blankSet[b.toLowerCase()] = true; });

    var toks = String(ln.en).split(/(\s+)/);
    var html = "", bi = 0;
    var answers = [];                      // 按出现顺序记录每空的正确答案（同一词出现多次时各自对应）
    toks.forEach(function (tok) {
      if (/^\s+$/.test(tok)) { html += tok; return; }
      var w = tok.replace(/[^A-Za-z']/g, "");
      if (w && blankSet[w.toLowerCase()]) {
        var ans = w;                       // 原始大小写用于比对提示
        answers.push(ans);
        var checked = st.clozeChecked;
        var val = (st._clozeVals && st._clozeVals[bi]) || "";
        var ok = checked && val.trim().toLowerCase() === ans.toLowerCase();
        var wrong = checked && val.trim() && !ok;
        var cls = ok ? "ok" : wrong ? "wrong" : "";
        html += '<input class="sl-blank ' + cls + '" data-blank="' + bi + '" data-ans="' + esc(ans) + '" value="' + esc(val) + '" placeholder="___" ' + (checked ? "disabled" : "") + ">";
        bi++;
      } else {
        html += esc(tok);
      }
    });

    var fb = "";
    if (st.clozeChecked) {
      var total = bi;
      var right = 0;
      for (var k = 0; k < total; k++) {
        var v = (st._clozeVals && st._clozeVals[k]) || "";
        if (answers[k] && v.trim().toLowerCase() === answers[k].toLowerCase()) right++;
      }
      var allOk = right === total;
      fb = '<div class="sl-cloze-fb ' + (allOk ? "good" : "bad") + '">' +
           (allOk ? "✅ 全对！" : "❌ 对了 " + right + " / " + total + " 个") + "</div>";
    }

    return `
      <div class="sl-prog">第 ${i + 1} / ${n} 句</div>
      <div class="sl-cloze-en">${html}</div>
      <div class="sl-cn-hint">中文意思：${esc(ln.cn)}</div>
      <div class="sl-cloze-acts">
        ${st.clozeChecked ? "" : '<button class="btn primary" data-slcheck>检查</button>'}
        ${st.clozeChecked ? '<button class="btn" data-slretry>重做</button>' : ""}
      </div>
      ${fb}
      <div class="sl-nav">
        <button class="btn ghost" data-slprev>⏮ 上一句</button>
        <button class="btn ghost" data-slnext>下一句 ⏭</button>
      </div>
      <p class="muted sl-tip">把挖掉的词填进去，注意大小写和拼写；点「检查」逐空判对错，错了会显示正确答案。</p>`;
  }

  /* ---------------- 事件绑定 ---------------- */
  function bind(root) {
    // 返回首页按钮由 app 的 pageHead 统一提供（data-back="home"，全局 bind 已处理）

    root.querySelectorAll("[data-slscene]").forEach(function (b) {
      b.onclick = function () {
        st.scene = parseInt(b.getAttribute("data-slscene"), 10) || 0;
        st.line = 0; st.noteOpen = {}; st.said = ""; st.score = null; st.clozeChecked = false; st._clozeVals = {};
        persistScene(); stopPlay(); render();
      };
    });
    root.querySelectorAll("[data-slmode]").forEach(function (b) {
      b.onclick = function () {
        st.mode = b.getAttribute("data-slmode");
        st.line = 0; st.said = ""; st.score = null; st.clozeChecked = false; st._clozeVals = {};
        stopPlay(); render();
      };
    });

    // 精读：听原句 / 展开讲解
    root.querySelectorAll("[data-slsay]").forEach(function (b) {
      b.onclick = function () {
        var ln = scene().lines[+b.getAttribute("data-slsay")];
        if (typeof speak === "function") { try { speak(ln.en, true); } catch (e) {} }
      };
    });
    root.querySelectorAll("[data-slnote]").forEach(function (b) {
      b.onclick = function () {
        var idx = +b.getAttribute("data-slnote");
        st.noteOpen[idx] = !st.noteOpen[idx];
        var box = document.getElementById("slNotes" + idx);
        if (box) { box.classList.toggle("open", st.noteOpen[idx]); b.textContent = st.noteOpen[idx] ? "💡 收起讲解" : "💡 看讲解"; }
      };
    });
    var playAllBtn = root.querySelector("[data-slplayall]");
    if (playAllBtn) playAllBtn.onclick = function () { playAll(); };

    // 点词发音（精读 + 跟读闪烁句）
    root.querySelectorAll(".sl-lines, .sl-flash").forEach(function (zone) {
      zone.onclick = function (e) {
        var sp = e.target.closest(".fw");
        if (sp && typeof speak === "function") { try { speak(sp.getAttribute("data-w"), true); } catch (e2) {} }
      };
    });

    // 跟读：听原句 / 麦克风 / 键盘评分 / 上下句
    var sayLine = root.querySelector("[data-slsayline]");
    if (sayLine) sayLine.onclick = function () {
      var ln = scene().lines[st.line];
      if (typeof speak === "function") { try { speak(ln.en, true); } catch (e) {} }
    };
    var mic = root.querySelector("[data-slmic]");
    if (mic) mic.onclick = function () {
      if (st.listening) { stopListen(); return; }
      st.said = ""; st.score = null;
      listen(function () {}, function (txt) {
        st.said = txt.trim();
        st.score = scoreShadow(scene().lines[st.line].en, st.said);
        render();
      }, function (err) {
        st.listening = false;
        if (err !== "aborted" && err !== "no-speech") render();
      });
      // 立即把按钮变成「听着呢」
      mic.textContent = "🔴 听着呢…（点一下结束）";
    };
    var kb = root.querySelector("[data-slkb]");
    if (kb) kb.onclick = function () {
      var ta = document.getElementById("slKb");
      st.said = ta ? ta.value.trim() : "";
      st.score = scoreShadow(scene().lines[st.line].en, st.said);
      render();
    };

    // 填空：输入 / 检查 / 重做 / 上下句
    root.querySelectorAll("[data-blank]").forEach(function (inp) {
      inp.oninput = function () {
        if (!st._clozeVals) st._clozeVals = {};
        st._clozeVals[+inp.getAttribute("data-blank")] = inp.value;
      };
    });
    var checkBtn = root.querySelector("[data-slcheck]");
    if (checkBtn) checkBtn.onclick = function () {
      // 直接在「检查」时读取输入框当前值，不依赖 oninput 缓存，更稳
      st._clozeVals = {};
      root.querySelectorAll(".sl-blank").forEach(function (inp) {
        st._clozeVals[+inp.getAttribute("data-blank")] = inp.value;
      });
      st.clozeChecked = true; render();
    };
    var retryBtn = root.querySelector("[data-slretry]");
    if (retryBtn) retryBtn.onclick = function () { st.clozeChecked = false; st._clozeVals = {}; render(); };

    var prev = root.querySelector("[data-slprev]");
    var next = root.querySelector("[data-slnext]");
    if (prev) prev.onclick = function () { st.line = Math.max(0, st.line - 1); st.said = ""; st.score = null; st.clozeChecked = false; st._clozeVals = {}; render(); };
    if (next) next.onclick = function () { st.line = Math.min(scene().lines.length - 1, st.line + 1); st.said = ""; st.score = null; st.clozeChecked = false; st._clozeVals = {}; render(); };
  }

  window.ScriptLines = { mount: mount, state: st, SCENES: SCENES };
})();
