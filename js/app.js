const $ = (s) => document.querySelector(s);
const app = $("#app");

const VIEWS = {
  home: viewHome, cards: viewCards, etymon: viewEtymon, grammar: viewGrammar,
  phrases: viewPhrases, quiz: viewQuiz, spell: viewSpell, me: viewMe,
  today: viewToday, wrong: viewWrong, review: viewReview, calendar: viewCalendar, read: viewRead,
  phrasals: viewPhrasals, sent: viewSent
};

/* 每个功能页的「页面头」元信息：图标、标题、副标题。
   sub 用实时数据（词库/语法/口语条数都会随版本增长），不再写死。 */
const PAGE_META = {
  spell:   { icon: "⌨️", title: "拼写练习", sub: "看中文，一个字母一个字母敲出英文" },
  cards:   { icon: "🃏", title: "单词卡",   sub: "看中文、例句、词性与单复数" },
  etymon:  { icon: "📖", title: "词源词典", sub: "每个单词的故事 · 知道为什么是这个意思，才记得牢" },
  grammar: { icon: "📚", title: "语法课",   sub: GRAMMAR.length + " 节零基础语法，每节配自测" },
  phrases: { icon: "💬", title: "口语",     sub: PHRASES.length + " 句日常口语，每句讲清用法" },
  phrasals:{ icon: "🔗", title: "用法",     sub: (typeof PHRASALVERBS !== "undefined" ? PHRASALVERBS.length : 0) + " 个常用短语动词，每个配例句" },
  quiz:    { icon: "✍️", title: "测验",     sub: "每轮从词库随机抽取 10 题，不固定" },
  me:      { icon: "📈", title: "我的",     sub: "学习记录、星星、打卡与错词本" },
  today:   { icon: "📅", title: "今日任务", sub: "今天该学哪些词、哪些句子，哪些还没学" },
  wrong:   { icon: "📕", title: "错题本",   sub: "拼错/答错的词，逐条订正才算掌握" },
  review:  { icon: "🔁", title: "每日复习", sub: "复习你学会过的词，每天抽几个防遗忘" },
  calendar:{ icon: "📅", title: "学习日历", sub: "哪天学了、哪天没学，连续打卡一目了然" },
  read:    { icon: "📖", title: "阅读",     sub: "分级短文：整段翻译 / 填单词，按进度解锁" },
  sent:    { icon: "🧩", title: "拼句打字", sub: "看中文句子，逐词敲出英文，拼对的词变成彩色卡片" }
};

/* 功能页统一的页面头：标题 + 返回首页。让每个选项都像「独立的一页」 */
function pageHead(meta) {
  const accent = view === "today" ? "cards" : (view || "home");
  return `<div class="page-head ph-${accent}">
    <button class="back-home" data-back="home">← 返回首页</button>
    <div class="ph-title">
      <span class="ph-chip">${meta.icon}</span>
      <span class="ph-text"><b>${meta.title}</b><small>${meta.sub}</small></span>
    </div>
  </div>`;
}

/* 跳转到某个视图（离开拼写页时清掉作答状态，避免输入框锁死残留） */
function goView(next) {
  if (view === "spell" && next !== "spell" && spChecked) {
    spChecked = false; spResult = null; spInput = ""; spChars = []; spReveal = 0;
  }
  // 离开首页就收起吉祥物的话，回来是干净的（定时器也要一起清，否则会在别的页面上乱重绘）
  if (next !== "home") {
    mascotMsg = "";
    if (mascotTimer)      { clearTimeout(mascotTimer);      mascotTimer = null; }
    if (mascotLeaveTimer) { clearTimeout(mascotLeaveTimer); mascotLeaveTimer = null; }
  }
  view = next; flip = false; render();
  // 换页后回到顶部：每个功能页唯一的去路是页面头上的「← 返回首页」。
  // 如果沿用上一页的滚动位置（比如从首页下方的卡片点进来），用户会落在半中间、看不见返回按钮。
  try {
    const de = document.documentElement;
    const oldBehavior = de.style.scrollBehavior;
    de.style.scrollBehavior = "auto";       // 换页用瞬时定位，不做平滑滚动动画
    window.scrollTo(0, 0);
    de.style.scrollBehavior = oldBehavior;
  } catch (e) { /* 滚动不可用不影响功能 */ }
}

/* 把一个词记进「今天学会的词」清单（去重）。拼写对 / 看词卡点学会 都会触发。 */
function markTodayWord(word) {
  if (!Array.isArray(S.todayWords)) S.todayWords = [];
  if (!S.todayWords.includes(word)) S.todayWords.push(word);
}
function findWord(w) { return WORDS.find(x => x.w === w) || null; }

/* ---------- 错题本 ----------
   错词记录：wrongWords 是主清单（曾拼错过的词），wrongStats 记细节。
   拼错 → markWrongWord；之后哪次拼对了 → markFixedWord（标记"已订正"）。 */
function markWrongWord(word) {
  if (!word) return;
  if (!Array.isArray(S.wrongWords)) S.wrongWords = [];
  if (!S.wrongStats || typeof S.wrongStats !== "object") S.wrongStats = {};
  if (!S.wrongWords.includes(word)) S.wrongWords.push(word);
  const s = S.wrongStats[word] || { n: 0, last: "", fixed: "" };
  s.n = (s.n || 0) + 1;
  s.last = today();
  s.fixed = "";                 // 又错了 → 重新回到"还没搞懂"
  S.wrongStats[word] = s;
}
/* 拼对了一个原本在错题本里的词 → 标记为已订正（不删除，保留历史） */
function markFixedWord(word) {
  if (!word || !S.wrongStats || !S.wrongStats[word]) return false;
  if (S.wrongStats[word].fixed) return false;
  S.wrongStats[word].fixed = today();
  return true;
}
function wrongStat(word) {
  const s = (S.wrongStats || {})[word];
  return s || { n: 1, last: "", fixed: "" };
}
/* 还没订正的错词（"自己还没搞懂的"） */
function openWrongWords() {
  return (S.wrongWords || []).filter(w => !(S.wrongStats && S.wrongStats[w] && S.wrongStats[w].fixed));
}

/* ---------- 学习方案（内部）----------
   引擎读完你的实际进度后，决定"今天练多少、上哪节语法、练哪几句口语"。
   文案里不会出现"第 3 阶段 / 共 10 阶段"这类路线图 —— 用户只看到今天。 */
function grammarDoneFn() {
  return function (i) { return !!(gqState && gqState[i] && gqState[i].done); };
}
function todayPlan_raw() {
  if (typeof Curriculum === "undefined") {
    return { wpd: 10, grammar: [], phrases: [], goal: "", index: 0, stage: { icon: "🌱", name: "入门期" }, remaining: 0, stagePct: 0 };
  }
  return Curriculum.today(masteredCount(), grammarDoneFn());
}
/* 把每日目标交给方案引擎：阶段不同，每天的词数不同（6 → 8 → 10 → 12） */
function syncDailyGoal() {
  const t = todayPlan_raw();
  dailyGoal = t.wpd || 10;
}

/* =====================================================================
   自适应学习引擎
   ---------------------------------------------------------------------
   让网站"根据你的学习进度调整"，而不是一尘不变。核心是每个词的
   「掌握度」——由连续拼对次数决定。掌握度驱动三件事：
     ① 出题内容：越不熟越常出现，已掌握的最后才出现
     ② 难度建议：正确率够了就建议升难度，太差就建议退回去
     ③ 首页「今日计划」与学习阶段：每天按你的实时数据重新生成
   ===================================================================== */
const EMPTY_WSTAT = { seen: 0, right: 0, wrong: 0, streak: 0, lastSeen: "", assisted: 0 };
function wStat(word) {
  const s = (S.wordStats || {})[word];
  return s ? Object.assign({}, EMPTY_WSTAT, s) : Object.assign({}, EMPTY_WSTAT);
}
/* 记录一次练习结果。
   assisted=true 表示"看了答案才拼对的"——见过答案不算真会，连对清零。 */
function bumpWord(word, ok, assisted) {
  if (!word) return;
  if (!S.wordStats || typeof S.wordStats !== "object") S.wordStats = {};
  const s = Object.assign({}, EMPTY_WSTAT, S.wordStats[word] || {});
  s.seen++; s.lastSeen = today();
  if (ok && !assisted)      { s.right++; s.streak++; }
  else if (ok && assisted)  { s.assisted++; s.streak = 0; }
  else                      { s.wrong++; s.streak = 0; }
  S.wordStats[word] = s;
}
/* 掌握度 0~5：由"连续拼对次数"决定，0=没学过，5=已掌握 */
function mastery(word) {
  const s = wStat(word);
  if (s.streak >= 3) return 5;
  if (s.streak === 2) return 4;
  if (s.streak === 1) return 3;
  if (s.seen > 0) return 2;
  // 只在单词卡点过「学会了」、还没在拼写里练过的：算"刚见过"
  if ((S.learned || []).includes(word)) return 1;
  return 0;
}
const MASTERY_LABEL = ["没学过", "刚见过", "待巩固", "差一点", "快熟了", "已掌握"];

/* ---------- 「今日熟练掌握」的判定标准 ----------
   一个词要算「今天真正掌握了」，四条必须同时满足：
     ① 今天练过        —— lastSeen 是今天
     ② 连续拼对 3 次   —— streak >= 3
     ③ 全程没用提示    —— 没点过「提示一个字母」、没点过「看答案」
     ④ 不在错题本里    —— 没有还没订正的错词记录
   第 ③ 条不用单独判：bumpWord() 里只要 assisted（看了答案）就把 streak 清零，
   所以 streak >= 3 本身就意味着最后这 3 次都是自己拼出来的。
   只看「今天练过几个」不算掌握 —— 抄一遍答案也能凑数，这里卡的是连对次数。 */
function isTodayMastered(w) {
  const s = wStat(w);
  if (s.lastSeen !== today()) return false;   // ①
  if (s.streak < 3) return false;             // ② + ③
  return !openWrongWords().includes(w);       // ④
}
/* ---------- 今日达标清单 ----------
   一天之内固定不变。原因很实在：如果词单每次都「重新挑最该练的」，
   你刚把一个词练到连对 3 次，它就被踢出清单、换一个新词进来，
   于是「今天达标几个」永远停在 0 —— 看得见的目标才算目标。
   所以：每天第一次打开时按当前进度算一次（错题 → 没学过 → 待巩固 → 已掌握），
   当天就锁死这组词；达标了打勾留在原地，全部达标后可以先「再来一组」。 */
function ensureDayList() {
  const n = Math.max(1, dailyGoal);
  const old = Array.isArray(S.dayList) ? S.dayList.filter(w => typeof w === "string" && findWord(w)) : [];
  if (S.dayListDate !== today() || old.length === 0) {
    S.dayListDate = today();
    S.dayExtra = 0;
    S.dayList = todayFocusWords(n).map(w => w.w);
    save();
    return S.dayList.slice();
  }
  return old;
}
function dayListWords() {
  return ensureDayList().map(findWord).filter(Boolean);
}
/* 今天的达标账本：前面几组 + 当前这组 */
function dayMasteredInfo() {
  const list = dayListWords();
  const cur = list.filter(w => isTodayMastered(w.w)).length;
  const extra = (typeof S.dayExtra === "number" && S.dayExtra > 0) ? S.dayExtra : 0;
  return {
    list,
    cur, curTotal: list.length,
    done: extra + cur, total: extra + list.length,
    all: list.length > 0 && cur === list.length
  };
}
/* 今日达标清单里「已经熟练掌握」了几个（首页统计块 / 文案用） */
function todayMasteredCount() { return dayMasteredInfo().done; }
/* 当前这组全达标了 → 换下一组继续加练（前几组的成绩累加进 dayExtra） */
function moreDayWords() {
  const list = dayListWords();
  S.dayExtra = ((typeof S.dayExtra === "number" && S.dayExtra > 0) ? S.dayExtra : 0) + list.length;
  S.dayListDate = today();
  S.dayList = todayFocusWords(Math.max(1, dailyGoal)).map(w => w.w);
  save(); render();
}
/* 单个词的达标进度，给词单上的徽章用：返回 {ok, streak, need} */
function masteryProgress(w) {
  const s = wStat(w);
  return { ok: isTodayMastered(w), streak: Math.min(3, s.streak || 0), need: 3, seen: s.seen || 0 };
}

/* ---------- 打卡统计：连续天数 vs 累计天数 ----------
   S.days 里存的是「学过习的日期」，所以它的长度 = 累计学了几天；
   连续天数要从今天（今天还没打卡就从昨天）往回数，断一天就停。 */
function dayKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function streakDays() {
  const set = new Set(S.days || []);
  if (!set.size) return 0;
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);   // 今天还没开始，别一早就显示 0 打击人
  if (!set.has(dayKey(d))) return 0;                     // 昨天也没学 → 确实断了
  let n = 0;
  while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function totalDays() { return (S.days || []).length; }

/* 火花等级：连续天数越长，火花越「旺」（抖音式逐级变色）。
   等级只由连续天数决定，颜色由 CSS 的 .fire-lv-N 控制。 */
function fireLevel(n) {
  if (n <= 0)  return 0;   // 灰：还没点燃
  if (n < 3)   return 1;   // 橙：刚起步
  if (n < 7)   return 2;   // 橙红：快一周
  if (n < 14)  return 3;   // 红：满一周
  if (n < 30)  return 4;   // 紫：满两周
  if (n < 60)  return 5;   // 金：满一月
  return 6;                // 彩：传奇
}
function fireLevelName(n) {
  return ["还没点燃", "刚刚起步", "坚持中", "一周火花", "双周火花", "月度火花", "传奇火花"][fireLevel(n)];
}

/* 学习阶段：按"真正掌握的词数"（连对 3 次以上）划分。
   不用"已学比例"，因为词库每天在长大，比例会让目标一直往后跑。 */
function masteredCount() {
  return WORDS.filter(w => mastery(w.w) === 5).length;
}
function stageInfo() {
  const m = masteredCount();
  if (m < 5) return { id: "begin", icon: "🌱", name: "入门期",
    tip: "先把最常见的词练到脱口而出，别急着求多。" };
  if (m < 20) return { id: "grow", icon: "🌿", name: "成长期",
    tip: "试着加上「首字母」模式，让记忆从「看着认识」变成「能写出来」。" };
  return { id: "pro", icon: "🌳", name: "熟练期",
    tip: "重点放到订正错题和听写，追求「错题本清零」。" };
}

/* 某个模式的历史正确率（样本 < 5 不下结论） */
function modeAcc(mode) {
  try {
    const b = JSON.parse(store.get("spelling_score_" + mode)) || { r: 0, w: 0 };
    const t = b.r + b.w;
    return t >= 5 ? b.r / t : null;
  } catch (e) { return null; }
}
/* 难度建议：正确率够高就升级、太低就退回；返回 {to, why} 或 null */
function recommendMode(mode) {
  const cur = mode || spMode;
  const order = ["cn", "letter", "dict"];
  const i = order.indexOf(cur);
  if (i < 0) return null;
  const acc = modeAcc(cur);
  if (acc == null) return null;
  if (acc >= 0.9 && i < order.length - 1) {
    return { to: order[i + 1], why: `你在「${modeName(cur)}」的正确率有 ${Math.round(acc * 100)}%，可以挑战「${modeName(order[i + 1])}」了。` };
  }
  if (acc < 0.5 && i > 0) {
    return { to: order[i - 1], why: `「${modeName(cur)}」正确率只有 ${Math.round(acc * 100)}%，先退回「${modeName(order[i - 1])}」把基础打牢。` };
  }
  return null;
}

/* 自适应出题：按"该练程度"分桶挑选
   错题（还没订正）→ 见过但没熟 → 全新词 → 已掌握（只用来凑数）
   这样每个词出现的频率会随着你越来越熟而自动降低。 */
function adaptiveQueue(n) {
  const openSet = new Set(openWrongWords());
  const b = { wrong: [], weak: [], fresh: [], solid: [] };
  WORDS.forEach(w => {
    const m = mastery(w.w);
    if (openSet.has(w.w)) b.wrong.push(w);
    else if (m === 0) b.fresh.push(w);
    else if (m === 5) b.solid.push(w);
    else b.weak.push(w);
  });
  const pick = [];
  const take = (arr, k) => {
    const room = Math.max(0, Math.min(k, n - pick.length));
    shuffle(arr).slice(0, room).forEach(x => pick.push(x));
  };
  take(b.wrong, 4);      // 错题最多占 4 个，别一上来全是错题打击人
  take(b.weak, n);       // 待巩固的吃掉剩余名额
  take(b.fresh, n);      // 再补全新词
  take(b.solid, n);      // 最后才用已掌握的词凑数
  return shuffle(pick).slice(0, n);
}
/* ---------- 今日词单：今天该练哪几个词 ----------
   优先级：没订正的错题 → 没学过 → 待巩固 → 已掌握（复习）。
   同一天内结果稳定（用日期做种子排序），但你的掌握度一变，词单立刻跟着变 ——
   所以「今天学什么」是进度算出来的，不是写死的那几个。 */
function stableHash(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
  return h;
}
/* 当前阶段对应的「词带」：词库按难度排序（易→难），而课程各阶段的 need
   正是累计词数门槛，所以直接用 need 把词库切成和阶段对齐的几段。
   这样「每天练哪些词」也和语法/口语一样由阶段决定 —— 词库随进度实时解锁，
   而不是固定从整份词里乱挑。 */
function stageWordBand() {
  const tp = Curriculum.today(masteredCount(), grammarDoneFn());
  const i = tp.index;
  const from = i > 0 ? CURRICULUM[i - 1].need : 0;
  const to = CURRICULUM[i].need > 0 ? CURRICULUM[i].need : WORDS.length;
  return [from, to];
}
function todayFocusWords(n) {
  const [from, to] = stageWordBand();
  const inBand = w => { const idx = WORDS.indexOf(w); return idx >= from && idx < to; };
  const openSet = new Set(openWrongWords());
  const pri = w => {
    if (openSet.has(w.w)) return 0;
    const m = mastery(w.w);
    if (m === 0) return 1;
    if (m <= 4) return 2;
    return 3;
  };
  const seed = today();
  // 先在本阶段词带里挑（按掌握度优先），挑不够再补其它未掌握词，保证当天总有得练。
  const pool = WORDS.slice().sort((a, b) => {
    const da = inBand(a) ? 0 : 1, db = inBand(b) ? 0 : 1;
    if (da !== db) return da - db;
    const d = pri(a) - pri(b);
    if (d) return d;
    return stableHash(a.w + seed) - stableHash(b.w + seed);
  });
  return pool.slice(0, Math.max(1, n));
}
/* 离下一阶段还差几个「已掌握」的词。
   注意 tp.remaining 是「本阶段」剩余词数，词够了但本课测验没做完时它是 0 ——
   这时人还在本阶段，不能说「已是最后阶段」。所以：
     -1 = 已经是最后阶段； 0 = 词数够了，还差本课测验； >0 = 还差几个词 */
function toNextStage() {
  const tp = todayPlan_raw();
  const last = (Curriculum.stages || []).length - 1;
  if (tp.index >= last) return -1;
  return tp.remaining || 0;
}

/* 本轮题目的构成，用于在拼写页展示"这一轮练的是什么" */
function queueBreakdown(q) {
  const openSet = new Set(openWrongWords());
  const r = { wrong: 0, weak: 0, fresh: 0, solid: 0 };
  (q || []).forEach(w => {
    if (!w) return;
    if (openSet.has(w.w)) r.wrong++;
    else { const m = mastery(w.w); if (m === 0) r.fresh++; else if (m === 5) r.solid++; else r.weak++; }
  });
  return r;
}

/* 渲染。单个页面出错时只降级该页并提示，绝不让 bind() 中断
   —— bind() 一旦抛错，后面所有按钮都不会绑定，表现就是"点了没反应"。*/
function render() {
  // 每次渲染都刷新一次时段：页面开着跨过整点也会自己换配色
  try { document.documentElement.dataset.time = timeOfDay(); } catch (e) {}
  try {
    checkDay();
  } catch (e) {
    console.error("checkDay:", e);
  }
  try {
    syncDailyGoal();          // 每日目标由学习方案引擎决定（会随阶段变化）
  } catch (e) {
    console.error("syncDailyGoal:", e);
  }

  const labels = {
    home: "🏠 首页", review: "🔁 复习", spell: "⌨️ 拼写练习", cards: "🃏 单词卡", etymon: "📖 词源",
    grammar: "📚 语法课", phrases: "💬 口语", quiz: "✍️ 测验", wrong: "📕 错题本", me: "📈 我的", calendar: "📅 学习日历", read: "📖 阅读", phrasals: "🔗 用法", sent: "🧩 拼句打字"
  };

  let body;
  try {
    body = (VIEWS[view] || viewHome)();
  } catch (e) {
    console.error("渲染页面出错 view=" + view, e);
    body = `<div class="card">
      <h3>⚠️ 这个页面出了点问题</h3>
      <p class="muted">错误信息：${String(e && e.message || e)}</p>
      <p class="muted">其他页面不受影响，可以继续使用。如果这个页面一直有问题，请按 Ctrl+F5 强制刷新。</p>
    </div>`;
  }

  // 首页是「导航页」：用大卡片导航。
  // 功能页只保留一个页面头（含「← 返回首页」），不再显示顶部模块切换条 ——
  // 进入任何功能页后，唯一的去路就是返回首页，避免在页面之间横跳。
  const head = view === "home" ? "" : pageHead(PAGE_META[view] || { icon: "📄", title: labels[view] || "页面", sub: "" });
  // 顶部「今日」徽章用今日达标清单的进度（与页面里的清单同一个口径）
  const TC = dayMasteredInfo();

  // 顶部品牌栏只在首页显示：首页是门面，要有标题和进度徽章；
  // 功能页则留白，最上面就是「← 返回首页」，不再有第二条横栏。
  const top = view === "home" ? `
    <header class="top">
      <div class="brand-row">
        <div class="brand"><span class="logo" data-mascot="logo" title="点我聊两句">🦉</span><span class="brand-txt">英语从零学 <span class="sub">零基础 · 每天 15 分钟</span></span></div>
        ${libBadge()}
      </div>
      <div class="chips">
        <button class="chip chip-me" data-chip="me" title="查看我的学习记录">👤 ${curProfile().name} ›</button>
        <button class="chip chip-star" data-chip="me" title="⭐ 星星：每完成一轮「今日目标」（例如今天练满 ${dailyGoal} 个词、或做完一次语法自测）就 +1 颗，用来记录你的努力。点开看「我的」页了解详情">⭐ 星星 ${S.stars}</button>
        ${window.CloudSync && window.CloudSync.enabled ? `<button class="chip chip-cloud" data-chip="cloud" title="${window.CloudSync.user ? '已登录 ' + (window.CloudSync.user.email || '') + ' · 点开可退出/管理' : '点此登录或注册，进度存云端、换设备接着学'}">☁ ${window.CloudSync.user ? (window.CloudSync.user.email || '已同步') : '登录同步'}</button>` : ""}
        <button class="chip chip-fire fire-lv-${fireLevel(streakDays())}" data-chip="calendar" title="连续打卡天数 · 火花越久越亮（灰→橙→红→紫→金）。点开看「学习日历」：哪天学了、哪天没学一目了然">🔥 连续 ${streakDays()} 天</button>
        <button class="chip chip-today" data-chip="today" title="今天该学哪些词、哪些句子，哪些还没学">今日 ${TC.done}/${TC.total} ›</button>
      </div>
    </header>` : "";

  app.innerHTML = `
    ${top}
    ${head}
    ${dailyBanner()}
    <main>${body}</main>
    ${store.available ? "" : `<div class="nowarn">
      ⚠️ 当前环境无法保存进度（浏览器禁用了本地存储）。<br>
      本次使用完全正常，但关掉页面后进度不会保留。<br>
      <b>要正常记录进度，请双击电脑上的 index.html 文件打开，或运行「启动网站.bat」。</b>
    </div>`}
    <footer>今日单词由网络词典实时生成（经云服务），学习进度只保存在本机浏览器。</footer>
  `;

  // bind 单独兜底：即使某个绑定语句出错，也不影响已绑好的部分
  try {
    bind();
  } catch (e) {
    console.error("bind 出错", e);
  }
  // 动态词源：渲染后填充页面上所有 [data-etym] 占位（运行时从网络抓取，限并发）
  try {
    if (window.Etym) window.Etym.hydrate();
  } catch (e) {
    console.error("etym hydrate 出错", e);
  }
  // AI 自适应路线：仅在首页、且后端已配置时异步拉取（自带加载/连接守卫，不会重复请求）
  if (view === "home") {
    try { loadAiPlan(); } catch (e) { console.error("loadAiPlan 出错", e); }
  }
}

/* 词库条数徽章：统一显示在顶栏「英语从零学」后面，其他位置不再重复显示这个词库信息。
   加载中/离线状态也在这里体现，所以去掉每日横幅也不会丢信息。 */
function libBadge() {
  const n = (typeof WORDS !== "undefined" ? WORDS.length : 0);
  const i = window.DAILY_INFO || {};
  let cls = "ok", tail = n + " 词", tip = "词库现在共 " + n + " 个单词，每天自动补充新词";
  if (i.status === "loading") {
    cls = "loading"; tail = "补充中…"; tip = "正在联网补充今日新词";
  } else if (i.status === "offline" || i.status === "local") {
    cls = "offline"; tail = n + " 词 · 本地"; tip = "当前离线，用的是本机内置词库；联网后会自动补充新词";
  }
  return `<span class="brand-lib lib-${cls}" title="${tip}">📚 词库 <b>${tail}</b></span>`;
}

/* 每日单词状态横幅：状态已并入顶栏的「词库」徽章，这里不再单独显示 */
/* ---------- 吉祥物互动 ----------
   点一下猫头鹰：蹦一下 + 弹出一句话。话不是写死的，按「当前时段 + 你的进度」挑，
   所以早中晚、有没有错题、今天练没练够，说的内容都不一样。 */
var mascotMsg = "";      // 气泡文案（离开首页时清掉）
var mascotFace = "🦉";   // 气泡里的小图标
var mascotTap = 0;       // 点了几次：换动画用
var mascotTimer = null;      // 说完自动收（6 秒）
var mascotLeaveTimer = null; // 鼠标移开后收（0.4 秒）

/* 收起气泡。三种情况下都会走到这里：
   鼠标移开猫头鹰 / 自己去点别的地方 / 说完 6 秒自动收。
   两个定时器分开：鼠标停在猫头鹰上可以慢慢看完那句话（取消"移开"的收起），
   但"说完 6 秒"这条不受影响 —— 否则鼠标不小心压在上面，气泡就一直挂着不走了。 */
function mascotInner() {
  return `<span class="mc">🦉</span>` +
    (mascotMsg ? `<span class="mc-bubble" role="status"><b>${mascotFace}</b>${mascotMsg}</span>` : "");
}
function refreshMascot() {
  // 只更新 Hero 里那只吉祥物的内部，不重绘整页（否则点一下会让所有卡片入场动画重播、整页闪一下）
  // 顶栏那只小 🦉 也能点（data-mascot="logo"），但话由 Hero 那只来说，避免气泡把顶栏撑变形。
  document.querySelectorAll('[data-mascot="1"]').forEach(m => m.innerHTML = mascotInner());
}
function hideMascot() {
  if (mascotTimer)      { clearTimeout(mascotTimer);      mascotTimer = null; }
  if (mascotLeaveTimer) { clearTimeout(mascotLeaveTimer); mascotLeaveTimer = null; }
  if (!mascotMsg) return;
  mascotMsg = "";
  refreshMascot();
}
function armMascotTimer(ms) {
  if (mascotTimer) clearTimeout(mascotTimer);
  mascotTimer = setTimeout(hideMascot, ms);
}
function armMascotLeave(ms) {
  if (mascotLeaveTimer) clearTimeout(mascotLeaveTimer);
  mascotLeaveTimer = setTimeout(hideMascot, ms);
}
function cancelMascotLeave() {
  if (mascotLeaveTimer) { clearTimeout(mascotLeaveTimer); mascotLeaveTimer = null; }
}

function tapMascot() {
  const t = timeOfDay();
  const wrong = openWrongWords().length;
  const todayN = (S.todayWords || []).length;
  const pool = [];
  if (t === "night")   pool.push(["😴", "这么晚了，再学 15 分钟就去睡，别熬。"]);
  if (t === "morning") pool.push(["🌅", "早上记性最好，趁现在练几个词。"]);
  if (t === "dusk")    pool.push(["🌇", "晚上适合复习，把今天的词再过一遍。"],);
  if (wrong > 0)       pool.push(["📕", `错题本里还有 ${wrong} 个词等你收拾。`]);
  if (todayN >= dailyGoal) pool.push(["🎉", `今天的 ${dailyGoal} 个词练完了，漂亮！`]);
  else pool.push(["⌨️", `今天还有 ${Math.max(0, dailyGoal - todayN)} 个词就达标了。`]);
  pool.push(["💪", "每天 15 分钟，比一次猛学两小时管用。"]);
  pool.push(["🦉", "我是你的学习搭档，随时点我聊两句。"]);
  pool.push(["⭐", `你已经收集 ${S.stars} 颗星星了，继续。`]);
  pool.push(["📈", `连续打卡 ${S.days.length} 天了，别断。`]);
  const p = pool[Math.floor(Math.random() * pool.length)];
  mascotFace = p[0]; mascotMsg = p[1]; mascotTap++;
  refreshMascot();
  // 点哪只猫头鹰都蹦一下（Hero 那只和顶栏那只都带上动画）
  document.querySelectorAll("[data-mascot]").forEach(el => {
    el.classList.remove("tapped"); void el.offsetWidth; el.classList.add("tapped");
  });
  armMascotTimer(6000);   // 说完 6 秒自动收，不靠用户记得关
}

/* ---------- 每日一句（谚语 / 励志短句）----------
   每次打开网站（登录）随机换一句，而不是「今天固定同一句」。
   这样用户每次进来都能读到不一样的句子，保持新鲜感。
   同一次会话内保持稳定（_provIdx 只在加载时取一次），不会在页面里跳来跳去。
   中文意思一起显示 —— 零基础看不懂英文，等于白给一句。 */
var _provIdx = -1;
function todayProverb() {
  const list = (typeof PROVERBS !== "undefined" && PROVERBS.length) ? PROVERBS : [{ en: "Practice makes perfect.", cn: "熟能生巧。" }];
  if (_provIdx < 0 || _provIdx >= list.length) _provIdx = Math.floor(Math.random() * list.length);
  return list[_provIdx];
}
function proverbHtml() {
  const pv = todayProverb();
  const safe = String(pv.en).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `<span class="hero-prov">
    <span class="hp-lab">📜 每日一句</span>
    <b class="hp-en">“${pv.en}”</b>
    <span class="hp-cn">${pv.cn}</span>
    <button class="mini hp-say" onclick="speak('${safe}')" title="听一遍">🔊</button>
  </span>`;
}

/* 一天里的时段：决定首页 Hero 与整页背景的配色（见 css 里的 [data-time]） */
function timeOfDay(h) {
  const hr = (typeof h === "number") ? h : new Date().getHours();
  // 注意要写成区间而不是「小于」：凌晨 0-4 点如果只判断 hr < 17，会被误判成白天
  if (hr >= 5  && hr < 11) return "morning";   // 清晨 5-10
  if (hr >= 11 && hr < 17) return "day";       // 白天 11-16
  if (hr >= 17 && hr < 20) return "dusk";      // 傍晚 17-19
  return "night";                              // 夜里 20-23 与凌晨 0-4
}

function dailyBanner() {
  return "";   // 词库状态统一放顶栏徽章（libBadge），不再占用一条横幅
}

/* 有内容才渲染小节，避免大模型偶尔漏字段时屏幕上出现「undefined」 */
function fbBlock(title, text, cls) {
  if (!text) return "";
  return `<h4>${title}</h4><p class="${cls || "why"}">${text}</p>`;
}

// 词源块：有缓存的故事就直接显示；没有就放一个占位节点，由动态词源引擎(etym.js)运行时抓取后填入。
function etymBlockFor(w) {
  if (w && w.root) return fbBlock("📖 这个意思是怎么来的", w.root, "root");
  var word = (w && w.w) || "";
  return `<span class="etym-dyn" data-etym="${word}">📖 <span class="muted">正在从网络抓取这个词源故事…</span></span>`;
}

function bind() {
  // 首页导航卡片：点卡片进入对应模块
  document.querySelectorAll(".nav-card").forEach(b =>
    b.onclick = () => goView(b.dataset.v));

  // 点吉祥物：蹦一下 + 说一句话
  // 鼠标移开就收起气泡（移回来则取消收起）；手机没有鼠标，靠 6 秒自动收兜底。
  document.querySelectorAll("[data-mascot]").forEach(b => {
    b.onclick = () => tapMascot();
    b.onmouseenter = () => cancelMascotLeave();
    b.onmouseleave = () => armMascotLeave(400);
  });
  // 点页面其他地方（除了猫头鹰本身）也收起气泡 —— 只绑一次，别每次 render 都叠加
  if (!document.__mascotOutside) {
    document.__mascotOutside = true;
    document.addEventListener("click", e => {
      const el = e.target && e.target.closest ? e.target.closest("[data-mascot]") : null;
      if (!el) hideMascot();
    });
  }

  // 顶部品牌栏里的「👤 我」：点进去看自己的学习记录（天数 / 单词 / 口语句子 …）
  document.querySelectorAll("[data-chip]").forEach(b =>
    b.onclick = () => { if (b.dataset.chip === "cloud") openCloudModal(); else goView(b.dataset.chip); });

  // 首页「今日词单」：点某个词 → 单词卡直接翻到它
  document.querySelectorAll("[data-word]").forEach(b =>
    b.onclick = () => { cardWord = b.dataset.word; goView("cards"); });

  // 今日达标清单整组都打勾了 → 「再来一组」换下一批词继续加练
  document.querySelectorAll("[data-act='morewords']").forEach(b =>
    b.onclick = () => moreDayWords());

  // 今日任务清单里每个板块的「去做」按钮
  document.querySelectorAll(".td-go").forEach(b =>
    b.onclick = () => goView(b.dataset.v));

  // 首页「今日计划」里每条建议的按钮（带 data-lesson 的直接跳到那一课）
  document.querySelectorAll(".pi-go").forEach(b =>
    b.onclick = () => {
      const lz = b.dataset.lesson;
      if (lz !== undefined && lz !== null && lz !== "") {
        lessonIdx = parseInt(lz, 10);
        gqIdx = lessonIdx;
        initGQuiz(lessonIdx);
      }
      goView(b.dataset.v);
    });

  // 首页「今日已学单词」/「错题待订正」统计块：点开对应清单
  document.querySelectorAll(".hs-today").forEach(b =>
    b.onclick = () => goView(b.dataset.v));
  document.querySelectorAll(".hs-wrong").forEach(b =>
    b.onclick = () => goView(b.dataset.v));

  // 错题本「去拼写练习」：只把还没订正的错词排进队列，不混入其他词
  const pw = $("#practiceWrong");
  if (pw) pw.onclick = () => {
    const list = openWrongWords().map(findWord).filter(Boolean).slice(0, 10);
    if (!list.length) return;
    spQueue = list;
    spPos = 0; spScore = { r: 0, w: 0 }; spListDone = false; spReview = false;
    spMode = "cn"; spLoad();
    view = "spell"; render();
  };

  // 错题本里每个词的「再拼一遍这个词」：直接在拼写页只练这一个词
  document.querySelectorAll(".wr-practice").forEach(b =>
    b.onclick = () => practiceOneWord(b.dataset.practice));

  // 「我的」页：跳转错题本 / 开始今日复习
  const gw = $("#goWrong"); if (gw) gw.onclick = () => goView("wrong");
  const gr = $("#goReview"); if (gr) gr.onclick = () => goView("review");

  // 「我的」页：学习档案（切换 / 新建 / 删除）
  document.querySelectorAll(".prof-item").forEach(b =>
    b.onclick = () => {
      if (b.dataset.prof === profileId) return;
      if (switchProfile(b.dataset.prof)) render();
    });
  const ap = $("#addProf");
  if (ap) ap.onclick = () => {
    const inp = $("#newProfName");
    const name = inp ? String(inp.value || "").trim() : "";
    const id = addProfile(name);
    if (switchProfile(id)) render();
  };
  const dp = $("#delProf");
  if (dp) dp.onclick = () => {
    if (PROFILES.length <= 1) return;
    if (!confirm(`确定删除档案「${curProfile().name}」吗？它的全部学习进度都会被删除，且无法恢复。`)) return;
    if (removeProfile(profileId)) render();
  };

  // 复习页：开始今天的复习
  document.querySelectorAll("#startReview").forEach(b =>
    b.onclick = () => startReview());

  // 阅读页：列表 → 进入某篇；返回列表；切换模式；逐段/整段翻译；填词核对
  document.querySelectorAll("[data-read]").forEach(b =>
    b.onclick = () => { readId = b.dataset.read; readMode = "trans"; readShowCn = false; render(); });
  document.querySelectorAll("[data-readback]").forEach(b =>
    b.onclick = () => { readId = ""; render(); });
  document.querySelectorAll("[data-readmode]").forEach(b =>
    b.onclick = () => { readMode = b.dataset.readmode; render(); });
  document.querySelectorAll("[data-rdt]").forEach(b =>
    b.onclick = () => {
      const p = b.closest(".rd-para");
      const cn = p && p.querySelector(".rd-cn");
      if (!cn) return;
      const show = cn.style.display === "none";
      cn.style.display = show ? "" : "none";
      b.textContent = show ? "隐藏中文" : "显示中文";
    });
  document.querySelectorAll('[data-act="rdallcn"]').forEach(b =>
    b.onclick = () => { readShowCn = !readShowCn; render(); });
  document.querySelectorAll('[data-act="rdcheck"]').forEach(b =>
    b.onclick = () => checkReadFill());
  document.querySelectorAll('[data-act="rdnext"]').forEach(b =>
    b.onclick = () => gotoNextReading());
  document.querySelectorAll('[data-act="phtest-start"]').forEach(b =>
    b.onclick = () => startPhrasalTest());
  document.querySelectorAll("[data-pht]").forEach(b =>
    b.onclick = () => phTestPick(parseInt(b.dataset.pht)));
  const phtNext = $("#phtNext");
  if (phtNext) phtNext.onclick = () => phTestNext();
  document.querySelectorAll('[data-act="rdspeak"]').forEach(b =>
    b.onclick = () => startReadSpeech());
  document.querySelectorAll(".review-start").forEach(b =>
    b.onclick = () => startReview());
  // 复习页·没错题时的空状态按钮
  const rgs = $("#revGoSpell");
  if (rgs) rgs.onclick = () => goView("spell");
  const rgh = $("#revGoHome");
  if (rgh) rgh.onclick = () => goView("home");
  const sr = $("#skipReview");
  if (sr) sr.onclick = () => { S.lastReview = today(); save(); goView("home"); };

  // 功能页的「返回首页」按钮
  document.querySelectorAll(".back-home").forEach(b =>
    b.onclick = () => goView(b.dataset.back || "home"));

  const c = $("#flipCard");
  if (c) {
    c.onclick = () => { flip = !flip; c.classList.toggle("flipped", flip); };
  }
  const l = $("#learnBtn");
  if (l) l.onclick = () => {
    // 用屏幕上正在显示的这张卡（curCard）。不能重新调 currentWordIndex()——
    // cardWord 为空时它会再随机一次，导致「点学会了、记下的却是另一个词」。
    const w = curCard || WORDS[currentWordIndex()];
    if (!S.learned.includes(w.w)) {
      S.learned.push(w.w);
      S.todayCount++;
      if (S.todayCount % dailyGoal === 0) S.stars++;
      save();
    }
    markTodayWord(w.w);
    nextCard();
  };
  const p = $("#prevBtn"), n = $("#nextBtn");
  if (p) p.onclick = prevCard;
  if (n) n.onclick = nextCard;
  const ts = $("#toSpell");
  if (ts) ts.onclick = () => {
    const w = curCard || WORDS[currentWordIndex()];
    spQueue = [w, ...shuffle(WORDS.filter(x => x.w !== w.w)).slice(0, 9)];
    spPos = 0; spScore = { r: 0, w: 0 }; spListDone = false; spReview = false;
    spMode = "cn"; spLoad();
    view = "spell"; render();
  };
  const cl = $("#clearBtn");
  if (cl) cl.onclick = () => {
    if (confirm("确定要清空全部学习记录吗？此操作不可恢复。")) {
      store.del(KEY); S = load(); view = "home"; render();
    }
  };
  const cw = $("#clearWrong");
  if (cw) cw.onclick = () => { S.wrongWords = []; save(); render(); };
  // 口语：每句的「我会了 / ✅ 已会」，点了就记进进度（可再点取消）
  document.querySelectorAll("[data-phrase]").forEach(b =>
    b.onclick = () => togglePhrase(parseInt(b.dataset.phrase, 10)));
  // 口语：🎤「说给我听」—— 语音识别，听用户读并对比找错
  document.querySelectorAll("[data-mic]").forEach(b =>
    b.onclick = () => startSpeech(parseInt(b.dataset.mic, 10)));
  document.querySelectorAll("[data-grammar]").forEach(el =>
    el.onclick = () => {
      lessonIdx = parseInt(el.dataset.grammar);
      gqIdx = lessonIdx;
      initGQuiz(lessonIdx);      // 首次进入要先初始化作答记录
      view = "grammar"; render();
    });
  // 语法课顶部「今天学这节」的直达按钮（与课程卡分开，避免和课程列表混在一起）
  document.querySelectorAll("[data-goto]").forEach(el =>
    el.onclick = () => {
      lessonIdx = parseInt(el.dataset.goto);
      gqIdx = lessonIdx;
      initGQuiz(lessonIdx);
      view = "grammar"; render();
    });

  /* 语法课 */
  const bl = $("#backLessons"); if (bl) bl.onclick = () => { lessonIdx = null; render(); };
  const pl = $("#prevLesson");
  if (pl) pl.onclick = () => {
    if (lessonIdx > 0) { lessonIdx--; gqIdx = lessonIdx; initGQuiz(lessonIdx); render(); }
  };
  const nl = $("#nextLesson");
  if (nl) nl.onclick = () => {
    if (lessonIdx < GRAMMAR.length - 1) { lessonIdx++; gqIdx = lessonIdx; initGQuiz(lessonIdx); render(); }
  };
  document.querySelectorAll("[data-gq]").forEach(b =>
    b.onclick = () => pickGQuiz(b.dataset.gq.split(":")[0], b.dataset.gq.split(":")[1]));
  const gqs = $("#gqSubmit"); if (gqs) gqs.onclick = submitGQuiz;
  const gqr = $("#gqRedo");
  if (gqr) gqr.onclick = () => startGQuiz(lessonIdx);
  const gqb = $("#gqBackRead");
  if (gqb) gqb.onclick = () => {
    const b = document.querySelector(".lesson-page");
    if (b) b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const gqh = $("#gqHide");
  if (gqh) gqh.onclick = () => {
    const box = $("#gquizBox");
    if (box) box.classList.toggle("blind");
    gqh.textContent = gqh.textContent === "先遮住答案自测" ? "显示选项" : "先遮住答案自测";
  };

  /* 拼写练习事件 —— 每个都单独 try，任何一个失败都不影响其他按钮 */
  const safe = (id, fn, label) => {
    const el = $(id);
    if (!el) return;
    el.onclick = (ev) => {
      try { if (ev && ev.preventDefault) ev.preventDefault(); fn(); }
      catch (e) {
        console.error(label + " 出错", e);
        alert("「" + label + "」执行出错：" + (e && e.message || e));
      }
    };
  };
  document.querySelectorAll("[data-mode]").forEach(el => {
    el.onclick = () => { spMode = el.dataset.mode; spQueue = []; render(); };
  });
  const si = $("#spInput");
  if (si) {
    /* 完全自行接管按键。
       为什么不能依赖浏览器默认的插入行为？因为格子是定长的，
       在第 1 格打字会把后面的字母整体挤右移一位 —— 对拼写是错的。
       这里统一拦截字母键，直接写入 spChars[spCursor]，绝不移动其他格。 */
    si.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (spChecked) safe2(spNext, "下一题");
        else if (spRetry) safe2(spRetryCheck, "我拼好了");
        else safe2(spCheck, "检查");
        return;
      }
      const len = spWord ? spWord.w.length : 0;
      if (e.key === "Backspace") {
        e.preventDefault();
        if (spCursor > 0) { spChars[spCursor - 1] = ""; spCursor -= 1; }
        else spChars[0] = "";
        syncSlots(); syncCapture();
        return;
      }
      if (e.key === "Delete") {
        e.preventDefault();
        spChars[spCursor] = "";
        syncSlots(); syncCapture();
        return;
      }
      if (e.key === "ArrowLeft")  { e.preventDefault(); spCursor = Math.max(0, spCursor - 1); syncSlots(); syncCapture(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); spCursor = Math.min(len, spCursor + 1); syncSlots(); syncCapture(); return; }
      if (e.key === "Home") { e.preventDefault(); spCursor = 0; syncSlots(); syncCapture(); return; }
      if (e.key === "End")  { e.preventDefault(); spCursor = len; syncSlots(); syncCapture(); return; }
      // 字母：写入当前格，光标右移，不影响其他格
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        if (spCursor < len) {
          spChars[spCursor] = e.key.toLowerCase();
          spCursor += 1;
        }
        syncSlots(); syncCapture();
      }
    };
    /* 粘贴：把字母依次填入从光标开始的格子 */
    si.onpaste = (e) => {
      e.preventDefault();
      const txt = (e.clipboardData && e.clipboardData.getData("text") || "")
        .toLowerCase().replace(/[^a-z]/g, "");
      const len = spWord ? spWord.w.length : 0;
      for (let i = 0; i < txt.length && spCursor + i < len; i++) {
        spChars[spCursor + i] = txt[i];
      }
      spCursor = Math.min(len, spCursor + txt.length);
      syncSlots(); syncCapture();
    };
    // 其他方式改变 value（如输入法、拖拽）时，按缓冲重建
    si.oninput = () => { syncSlots(); syncCapture(); };
  }
  // 点击格子区域也能聚焦，鼠标用户同样方便
  /* 点任意格子定位光标。
     隐藏输入层设了 pointer-events:none，所以点击能真正落到格子上。 */
  document.querySelectorAll("[data-slot]").forEach(el => {
    el.onclick = (e) => {
      if (spChecked) return;
      const inp = $("#spInput");
      if (!inp || inp.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const n = parseInt(el.getAttribute("data-slot"));
      if (isNaN(n)) return;
      setSpCursor(n);
      inp.focus({ preventScroll: true });
      syncCapture();
    };
  });
  // 点格子之间的空隙也要能聚焦输入
  const sw = $("#slotsWrap");
  if (sw) {
    sw.onclick = (e) => {
      if (spChecked) return;
      const inp = $("#spInput");
      if (!inp || inp.disabled) return;
      const slot = e.target && e.target.closest && e.target.closest("[data-slot]");
      if (slot) {
        const n = parseInt(slot.getAttribute("data-slot"));
        if (!isNaN(n)) { e.preventDefault(); setSpCursor(n); }
      }
      inp.focus({ preventScroll: true });
      syncCapture();
    };
  }
  // 听写模式：例句里的下划线就是输入区，点哪条填哪条
  const mk = $("#spMask");
  if (mk) {
    mk.onclick = (e) => {
      if (spChecked) return;
      const inp = $("#spInput");
      if (!inp || inp.disabled) return;
      const t = e.target;
      const slot = t && t.closest && t.closest("[data-slot]");
      if (slot) {
        const n = parseInt(slot.getAttribute("data-slot"));
        if (!isNaN(n)) { e.preventDefault(); setSpCursor(n); }
      }
      inp.focus({ preventScroll: true });
      syncCapture();
    };
  }
  function safe2(fn, label) {
    try { fn(); }
    catch (e) {
      console.error(label + " 出错", e);
      alert("「" + label + "」执行出错：" + (e && e.message || e));
    }
  }
  safe("#spCheck", spCheck, "检查");
  safe("#spReveal", spRevealOne, "提示一个字母");
  safe("#spGive", spGiveUp, "直接看答案");
  safe("#spNext", spNext, "下一题");
  safe("#spRetry", spRetryCheck, "我拼好了");
  safe("#spAgain", () => { spQueue = []; spListDone = false; render(); }, "再来一轮");
  safe("#spSwitch", () => { spQueue = []; spListDone = false; view = "spell"; render(); }, "换个模式");
  safe("#spTakeAdvice", () => {
    const rec = recommendMode(spMode);
    if (!rec) return;
    spMode = rec.to; spQueue = []; spListDone = false; spReview = false;
    if (view !== "spell") view = "spell";
    render();
  }, "切换难度");

  // 进拼写页/切到下一题时自动聚焦输入框，省掉一次鼠标点击
  if (view === "spell" && spWord && !spChecked && spInputFocusWanted !== false) {
    const inp = $("#spInput");
    if (inp) { try { inp.focus({ preventScroll: true }); } catch (e) {} }
  }
  spInputFocusWanted = true;

  /* 全局快捷键：拼写页用空格/回车进下一题，测验页用空格/回车进下一题，
     数字键 1-4 直接选选项 —— 全程不用碰鼠标 */
  document.onkeydown = (e) => {
    if (e.key === "F5") return;
    // 拼句打字：Ctrl+1 朗读 / Ctrl+; 显示答案 / Ctrl+R 重打本句（要先于"Ctrl 直接 return"的判断）
    if (view === "sent" && stList.length && e.ctrlKey) {
      if (e.key === "1" || e.code === "Digit1") {
        e.preventDefault(); safe2(() => speak(stList[stIdx].en), "朗读句子"); return;
      }
      if (e.key === ";" || e.code === "Semicolon") {
        e.preventDefault(); safe2(showSentAnswer, "显示答案"); return;
      }
      if (e.key === "r" || e.key === "R" || e.code === "KeyR") {
        e.preventDefault(); safe2(() => { stDone = []; stFinished = false; stErrThis = 0; render(); }, "重打本句"); return;
      }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    const inInput = tag === "input" || tag === "textarea";

    if (view === "spell" && !spListDone && spWord) {
      // 已判定：空格 / 回车 → 下一题
      if ((e.key === " " || e.key === "Spacebar" || e.key === "Enter")
          && !inInput && spChecked) {
        e.preventDefault(); safe2(spNext, "下一题"); return;
      }
      if (inInput && e.key === " " && spChecked) {
        e.preventDefault(); safe2(spNext, "下一题"); return;
      }
    }
    if (view === "sent" && stList.length) {
      // 整句拼完：空格 / 回车 → 下一句
      if (stFinished && (e.key === " " || e.key === "Spacebar" || e.key === "Enter")) {
        e.preventDefault(); safe2(sentNext, "下一句"); return;
      }
    }
    if (view === "quiz" && qiList.length) {
      // 已作答：空格 / 回车 → 下一题
      if ((e.key === " " || e.key === "Spacebar" || e.key === "Enter")
          && answeredIdx === qi) {
        e.preventDefault(); safe2(quizNext, "下一题"); return;
      }
      // 未作答：数字键 1-4 直接选
      if (!inInput && /^[1-4]$/.test(e.key)) {
        const opts = document.querySelectorAll("[data-quizopt]");
        const opt = opts[parseInt(e.key) - 1];
        if (opt) { e.preventDefault(); opt.onclick(); }
      }
    }
  };

  // 拼句打字：开始按钮 / 下一句
  document.querySelectorAll("[data-act='stStart']").forEach(b =>
    b.onclick = () => startSentRound());
  document.querySelectorAll("[data-act='stNext']").forEach(b =>
    b.onclick = () => sentNext());
  document.querySelectorAll("[data-act='stAgain']").forEach(b =>
    b.onclick = () => { stDone = []; stFinished = false; stErrThis = 0; render(); });
  document.querySelectorAll("[data-act='stSay']").forEach(b =>
    b.onclick = () => { if (stList.length) speak(stList[stIdx].en); });
  document.querySelectorAll("[data-act='stHint']").forEach(b =>
    b.onclick = () => showSentAnswer());
  document.querySelectorAll("[data-act='stSubmit']").forEach(b =>
    b.onclick = () => {
      const inp = $("#stInput");
      if (inp && stList.length && !stFinished) { submitSentWord(inp); try { inp.focus({ preventScroll: true }); } catch (e) {} }
    });

  // 拼句打字：输入框实时判定（不重渲染，保持焦点）
  const stInp = $("#stInput");
  if (stInp) stInp.oninput = () => onSentType(stInp);
  if (stInp) stInp.onkeydown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitSentWord(stInp); }
  };

  // 进拼句页自动聚焦输入框
  if (view === "sent" && stList.length && !stFinished) {
    const si = $("#stInput");
    if (si) { try { si.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* 测验 */
  document.querySelectorAll("[data-quizopt]").forEach(el => {
    el.onclick = (ev) => {
      try { if (ev && ev.preventDefault) ev.preventDefault(); pickOption(el.dataset.quizopt); }
      catch (e) {
        console.error("选项点击出错", e);
        alert("选项点击出错：" + (e && e.message || e));
      }
    };
  });
  safe("#nextQ", quizNext, "下一题");
}

/* ---------- 光标与输入缓冲区 ----------
   关键设计：隐藏 input 里存的是【定长缓冲】，每个格子占一个字符位，
   未填的位置用下划线占位。这样光标可以停在任意位置，
   从中间开始打字、只改某一位、删掉某一位都能正常工作。

   例：单词 bad，点第 2 格后打 "x" → 缓冲 "_x_" → 光标在第 3 位
   真实 input 若存空串，光标会被浏览器强制钳到 0，就永远只能从头打。   */
const BLANK = "_";

/* 保证 spChars 长度恒等于单词长度，避免越界读写 */
function spCharsFit() {
  const len = spWord ? spWord.w.length : 0;
  while (spChars.length < len) spChars.push("");
  if (spChars.length > len) spChars.length = len;
  return spChars;
}

/* 从隐藏 input 的 value 反推出已填字母数组（过滤掉占位下划线） */
function readCapture(raw) {
  const len = spWord ? spWord.w.length : 0;
  const chars = [];
  const s = String(raw || "").toLowerCase();
  for (let i = 0; i < Math.max(len, s.length); i++) {
    const c = s[i];
    chars.push(c && c !== BLANK && /[a-z]/.test(c) ? c : "");
  }
  return chars;
}

/* 生成隐藏 input 的 value：已填字母 + 下划线占位，总长恒等于单词长度 */
function buildCapture() {
  const len = spWord ? spWord.w.length : 0;
  let out = "";
  for (let i = 0; i < len; i++) out += spChars[i] || BLANK;
  return out;
}

/* 把光标移到第 n 格。后面已填的字母保留，允许从中间继续填。 */
function setSpCursor(n) {
  const len = spWord ? spWord.w.length : 0;
  spCursor = Math.max(0, Math.min(n, len));
  syncSlots();
}

/* 同步到隐藏 input，并把光标放到 spCursor 处 */
function syncCapture() {
  const inp = $("#spInput");
  if (!inp) return;
  const v = buildCapture();
  if (inp.value !== v) inp.value = v;
  if (inp.setSelectionRange) {
    try { inp.setSelectionRange(spCursor, spCursor); } catch (e) {}
  }
}

/* 打字时只刷新字母格和例句下划线，不整页重绘 —— 保证输入框不闪、光标不丢 */
function syncSlots() {
  /* spInput 供判定/显示使用。
     ★ 必须用空格占位而不是空串：Array.join 会跳过空元素，
       ["z","","x"].join("") 得到 "zx"，位置信息全丢。 */
  spInput = spCharsFit().map(c => c || " ").join("");
  // 去掉尾部/首部的空格只用于"是否全部为空"的判断，不影响按位取字符
  const box = $(".slots");
  if (box) box.innerHTML = spWordCells();
  // 例句里的下划线跟着一起变（听写模式下它就是输入区，必须实时刷新）
  if (spWord && spMode !== "letter") {
    const mk2 = $("#spMask");
    if (mk2) mk2.innerHTML = maskSentence(spWord.s, spWord.w);
  }
  const tip = $("#spLiveTip");
  if (tip && spWord) {
    const n = spWord.w.length;
    const got = spCharsFit().filter(c => c).length;
    tip.textContent = spRetry
      ? `照着答案拼一遍　（${got} / ${n}）`
      : (got === 0 ? `点任意格子定位，直接拼出 ${n} 个字母` : `已填 ${got} / ${n} 个格子`);
  }
}

/* cardWord：从「今日词单」点某个词进来时，单词卡直接翻到它；翻页后失效。 */
var cardWord = "";
function currentWordIndex() {
  if (cardWord) {
    const i = WORDS.findIndex(w => w.w === cardWord);
    if (i >= 0) return i;
  }
  const un = WORDS.map((w, i) => i).filter(i => !S.learned.includes(WORDS[i].w));
  const list = un.length ? un : WORDS.map((w, i) => i);
  return list[Math.floor(Math.random() * list.length)];
}
function nextCard() { cardWord = ""; flip = false; render(); }
function prevCard() { cardWord = ""; flip = false; render(); }

/* ---------- 首页 ---------- */
function viewHome() {
  // 首页 = 导航页：用大卡片进入各个功能，每个选项都是独立的一页
  const wrongCount = openWrongWords().length;
  const MINF = dayMasteredInfo();
  const st = stageInfo();
  const tp = Curriculum.today(masteredCount(), grammarDoneFn());
  const back = (S.learned || []).length > 0;
  // Hero 也随进度变化，而不是一尘不变的欢迎语
  const heroTitle = back ? `欢迎回来，第 ${Math.max(1, S.days.length)} 天 👋` : "你好，欢迎开始学英语 👋";
  // Hero 副标题：老用户给「阶段建议 + 错题数」，新用户和老用户都附一句「今日谚语」
  const heroSub = (back
    ? `${st.icon} 你在「${st.name}」：${st.tip}` +
      (wrongCount ? ` 今天有 <b>${wrongCount}</b> 个错题等着订正。` : " 错题本是空的，保持住！")
    : "先选一个模块开始，每天 15 分钟，慢慢来 —— 看不懂不要紧，照着念就有语感。")
    + proverbHtml();
  const cards = [
    // 「每日复习」原本只靠顶部切换条进入；切换条移除后必须在这里留一个入口，否则该页会成为孤儿。
    { v: "review",  c: "review",  icon: "🔁", t: "每日复习", d: `复习你学会过的旧词（现在 ${S.learned.length} 个），每天抽几个出来防遗忘；拼错的会收进「错题本」。` },
    { v: "spell",   c: "spell",   icon: "⌨️", t: "拼写练习", d: "看中文，把英文一个字母一个字母敲出来。最核心的一步。" },
    { v: "cards",   c: "cards",   icon: "🃏", t: "单词卡",   d: "看中文、例句，点开看词性、单复数和词源详解。" },
    { v: "wrong",   c: "wrong",   icon: "📕", t: "错题本",   d: wrongCount ? `你有 ${wrongCount} 个还没订正的错词，点进来逐个攻克。` : "拼错/答错的词会收在这里，逐条订正才算掌握。" },
    { v: "etymon",  c: "etymon",  icon: "📖", t: "词源词典", d: "每个单词的故事 · 知道为什么是这个意思，才忘不掉。" },
    { v: "grammar", c: "grammar", icon: "📚", t: "语法课",   d: GRAMMAR.length + " 节零基础语法课，每节配自测小测验。" },
    { v: "phrases", c: "phrases", icon: "💬", t: "口语",     d: PHRASES.length + " 句日常口语，每句解释为什么这么用。" },
    { v: "phrasals", c: "phrasals", icon: "🔗", t: "用法",   d: (typeof PHRASALVERBS !== "undefined" ? PHRASALVERBS.length : 0) + " 个常用短语动词（look for / get up / turn on…），每个配中文意思 + 例句 + 翻译。" },
    { v: "read",    c: "read",    icon: "📖", t: "阅读",     d: "按你的进度给分级短文：整段翻译 / 填单词任选。" },
    { v: "sent",    c: "sent",    icon: "🧩", t: "拼句打字", d: (typeof SENTENCES !== "undefined" ? SENTENCES.length : 0) + " 个日常句子：看中文，逐词敲出英文，拼对的词变成彩色卡片，越连越上瘾。" },
    { v: "quiz",    c: "quiz",    icon: "✍️", t: "测验",     d: "每轮从你当前的词库随机抽 10 题（中→英 / 英→中随机），做完自动换一批，不固定。" },
    { v: "me",      c: "me",      icon: "📈", t: "我的",     d: "学习记录、星星、连续打卡天数和错词本。" }
  ];
  return `
  <section class="hero">
    <div class="hero-glow"></div>
    <div class="hero-spark s1"></div>
    <div class="hero-spark s2"></div>
    <div class="hero-inner">
      <span class="hero-pill">${st.icon} ${st.name}${S.days.length ? ` · 第 ${S.days.length} 天` : " · 零基础友好"}</span>
      <span class="hero-goal">🎯 本阶段目标：${tp.goal}　<span class="muted">（学到这一步，你就能${tp.goal.replace(/^能/, "")}）</span></span>
      <h1>${heroTitle}</h1>
      <p>${heroSub}</p>
    </div>
    <button class="hero-mascot" data-mascot="1"
            aria-label="点一下吉祥物" title="点我聊两句">
      ${mascotInner()}
    </button>
  </section>

  <section class="home-stats">
    <button class="hs hs-today" data-v="today">
      <span class="hs-ico">📅</span>
      <span class="hs-text"><span class="big">${S.todayWords.length}<span class="unit">/${dailyGoal}</span></span><span class="muted">今日已学单词 ›</span></span>
    </button>
    <button class="hs hs-mastered" data-v="today">
      <span class="hs-ico">🎯</span>
      <span class="hs-text"><span class="big">${MINF.done}<span class="unit">/${MINF.total}</span></span><span class="muted">今日熟练掌握 ›</span></span>
    </button>
    <div class="hs hs-learned"><span class="hs-ico">📚</span><span class="hs-text"><span class="big">${S.learned.length}</span><span class="muted">累计掌握</span></span></div>
    <div class="hs hs-days"><span class="hs-ico">🔥</span><span class="hs-text"><span class="big">${streakDays()}</span><span class="muted">连续打卡(天)</span></span></div>
    <div class="hs hs-stars"><span class="hs-ico">⭐</span><span class="hs-text"><span class="big">${S.stars}</span><span class="muted">收集星星</span></span></div>
    <button class="hs hs-wrong${wrongCount ? "" : " is-empty"}" data-v="wrong">
      <span class="hs-ico">${wrongCount ? "📕" : "✅"}</span>
      <span class="hs-text"><span class="big">${wrongCount}</span><span class="muted">${wrongCount ? "错题待订正 ›" : "错题已清空 ›"}</span></span>
    </button>
  </section>

  <h2>选择一个模块开始</h2>
  <div class="nav-grid">
    ${cards.map(c => `
      <button class="nav-card nc-${c.c}" data-v="${c.v}">
        <span class="nc-chip">${c.icon}</span>
        <span class="nc-title">${c.t}</span>
        <span class="nc-desc">${c.d}</span>
        <span class="nc-go">进入 →</span>
      </button>`).join("")}
  </div>

  ${todayPlan()}
  ${aiPlanBlock()}`;
}

/* ---------- AI 自适应学习路线 ----------
   把用户真实学习画像发给后端 /api/plan，让 AI 给出"今天该重点练什么"。
   不配后端（CLOUD_CONFIG.backend 为空）时回落规则提示；AI 不可用也有规则兜底。
   与今日计划(todayPlan)的关系：todayPlan 是"规则自适应"（基于掌握度/错题/阶段），
   这里叠加一层"AI 定制路线"，由 DeepSeek 根据薄弱点给出具体建议。 */
var AI_PLAN = null;          // null=未加载；"no_backend"=未连接；否则为后端返回的对象
var AI_PLAN_LOADING = false;

function buildProfile() {
  var ma = {};
  ["cn", "letter", "dict"].forEach(function (m) {
    var a = modeAcc(m); ma[m] = (a == null ? null : Math.round(a * 100));
  });
  var gd = 0, gt = (typeof GRAMMAR !== "undefined" ? GRAMMAR.length : 29);
  if (typeof gqState !== "undefined" && gqState) {
    for (var i = 0; i < gt; i++) { if (gqState[i] && gqState[i].done) gd++; }
  }
  return {
    mastered: masteredCount(),
    learned: (S.learned || []).length,
    total_words: (typeof WORDS !== "undefined" ? WORDS.length : 0),
    open_wrong: openWrongWords().length,
    streak_days: streakDays(),
    mode_acc: ma,
    grammar_done: gd,
    grammar_total: gt,
    reading_done: (S.readingDone || []).length,
    phrasal_done: (S.phrasalQuiz || []).length,
    stage_id: (stageInfo() || {}).id || ""
  };
}

function loadAiPlan() {
  if (AI_PLAN || AI_PLAN_LOADING) return;                       // 已加载或在加载中
  if (!backendBase || !backendBase()) { AI_PLAN = "no_backend"; render(); return; }
  AI_PLAN_LOADING = true;
  fetchPlan(buildProfile()).then(function (p) {
    AI_PLAN_LOADING = false;
    AI_PLAN = p || { ai_error: "empty" };
    render();
  }).catch(function () {
    AI_PLAN_LOADING = false;
    AI_PLAN = { ai_error: "net" };
    render();
  });
}

function aiPlanBlock() {
  var cls = "card ai-plan";
  if (AI_PLAN === null) {
    return `<div class="${cls}" id="aiPlanCard"><h3>🤖 AI 学习计划</h3><p class="muted">正在分析你的学习情况…</p></div>`;
  }
  if (AI_PLAN === "no_backend") {
    return `<div class="${cls}" id="aiPlanCard"><h3>🤖 AI 学习计划</h3><p class="muted">未连接 AI 后端。在 <code>CLOUD_CONFIG.backend</code> 填入你的 Python 后端地址后，AI 会根据你的真实进度定制每日学习路线。当前按规则自适应练习。</p></div>`;
  }
  var p = AI_PLAN;
  var FICON = { word: "📘", grammar: "📐", reading: "📖", phrasal: "🔗", review: "🔁", speaking: "🗣️" };
  var focus = (p.today_focus || []).map(function (f) {
    var ic = FICON[f.type] || "✅";
    return `<li><span class="fp-ic">${ic}</span><div><b>${esc(f.title || "")}</b><span class="muted">${esc(f.why || "")} → ${esc(f.action || "")}</span></div></li>`;
  }).join("");
  var weak = (p.weak_points || []).map(function (w) { return `<span class="tag">${esc(w)}</span>`; }).join("");
  var badge = p.ai_error ? `<span class="plan-fallback">规则兜底</span>` : `<span class="plan-ai">AI 定制</span>`;
  return `<div class="${cls}" id="aiPlanCard">
    <h3>🤖 AI 今日学习重点 ${badge}</h3>
    ${p.stage ? `<p class="ai-stage">${esc(p.stage)}</p>` : ""}
    ${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
    ${focus ? `<ul class="ai-focus">${focus}</ul>` : ""}
    ${weak ? `<p class="muted ai-weak">薄弱点：${weak}</p>` : ""}
    ${p.next_milestone ? `<p class="muted ai-ms">🎯 ${esc(p.next_milestone)}</p>` : ""}
  </div>`;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* ---------- 今日计划（自适应） ----------
   文案不是写死的，而是根据你当前的：错题数 / 今日已学 / 各模式正确率 / 学习阶段
   实时生成。所以每天打开看到的内容都不一样。 */
function todayPlan() {
  const st = stageInfo();
  const wrongCount = openWrongWords().length;
  const todayN = (S.todayWords || []).length;
  const mi = dayMasteredInfo();
  const rec = recommendMode("cn") || recommendMode(spMode);
  const tp = todayPlan_raw();
  const gdone = grammarDoneFn();
  const items = [];

  if (wrongCount > 0) {
    items.push({ p: "high", icon: "📕", t: `先订正 ${wrongCount} 个错题`,
      d: "这些是你拼错 / 答错过的词。每个词都能就地重拼，拼对后自动移出。",
      v: "wrong", btn: "去订正 →" });
  }
  if (todayN === 0) {
    items.push({ p: "high", icon: "⌨️", t: "今天还没开始拼写",
      d: `今天练 ${dailyGoal} 个词。出题会优先给你"该练的"：错题 → 待巩固 → 新词。`,
      v: "spell", btn: "开始拼写 →" });
  } else if (todayN < dailyGoal) {
    items.push({ p: "mid", icon: "⌨️", t: `今天已练 ${todayN} / ${dailyGoal} 个词`,
      d: `再练 ${dailyGoal - todayN} 个就完成今天的量了（注意：「练过」不等于「掌握」，掌握要连对 3 次）。`,
      v: "spell", btn: "继续拼写 →" });
  } else {
    items.push({ p: "done", icon: "✅", t: `今天的拼写量已完成（${todayN} 个）`,
      d: `其中 <b>${mi.done}</b> / ${mi.total} 个已达到「熟练掌握」（连对 3 次），剩下的再巩固几遍。`,
      v: "quiz", btn: "去做测验 →" });
  }
  if (rec) {
    items.push({ p: "mid", icon: "🎚", t: `难度建议：试试「${modeName(rec.to)}」`,
      d: rec.why, v: "spell", btn: "去练 →" });
  }
  // —— 学习方案引擎安排的"今天的课"（用户只看到今天，看不到整条路线）——
  const gIdx = (tp.grammar || []).filter(g => !gdone(g))[0];
  if (gIdx != null && typeof GRAMMAR !== "undefined" && GRAMMAR[gIdx]) {
    items.push({ p: "mid", icon: "📚", t: `今天的语法课：${String(GRAMMAR[gIdx].t || "").replace(/^第\d+课：/, "")}`,
      d: "这一课正好配你现在学的词，上完再做里面那 5 道小测验。",
      v: "grammar", lesson: gIdx, btn: "去上课 →" });
  }
  if (tp.phrases && tp.phrases.length) {
    items.push({ p: "low", icon: "💬", t: `今天练 ${tp.phrases.length} 句口语`,
      d: "这几句配你现在的阶段正合适：先跟读两遍，再自己说一遍。",
      v: "phrases", btn: "去练口语 →" });
  }
  const weakN = WORDS.filter(w => { const m = mastery(w.w); return m >= 1 && m <= 4; }).length;
  const freshN = WORDS.filter(w => mastery(w.w) === 0).length;
  items.push({ p: "low", icon: st.icon, t: `你正处在「${st.name}」`,
    d: `${st.tip} 目前：已掌握 ${masteredCount()} 个、待巩固 ${weakN} 个、未学过 ${freshN} 个。`,
    v: "me", btn: "看进度 →" });

  // 词都学完了就换个重点，别再让「练新词」占着位置 —— 内容要跟着进度走
  if (freshN === 0 && wrongCount === 0) {
    items.push({ p: "mid", icon: "🎧", t: "词都过了一遍了，今天练「听写」",
      d: "没有新词也没错题时，最值钱的是听写：只听发音就把词写出来，才叫真记住。",
      v: "spell", btn: "去听写 →" });
  }

  // 今天真正要练的几个词：由掌握度 + 日期算出来，不是写死的清单
  const focus = mi.list;
  const remaining = toNextStage();
  return `<div class="card home-plan">
    <h3>🎯 今日计划 <span class="plan-stage">${st.icon} ${st.name}</span></h3>
    <p class="muted">下面每一条都是<b>根据你的学习记录自动生成的</b>，会随你的练习情况而变化。</p>
    <div class="plan-goal">🏁 本阶段目标：<b>${tp.goal}</b>　·　${remaining > 0 ? `再掌握 <b>${remaining}</b> 个词进入下一阶段`
      : remaining === 0 ? "词数已经够了，做完本课测验就能进入下一阶段"
      : "已是最后阶段，把学过的词和句型自由组合着说"}</div>
    <div class="today-words">
      <div class="tw-head">今日达标清单 <span class="muted">（今天就盯这几个词，达标一个打一个勾；点一下看详解）</span></div>
      <div class="tw-list">
        ${focus.map(w => {
          const mp = masteryProgress(w.w);
          const badge = mp.ok
            ? `<span class="tw-ok">✓ 已掌握</span>`
            : `<span class="tw-need">连对 ${mp.streak}/${mp.need}</span>`;
          return `
          <button class="tw${mp.ok ? " done" : ""}" data-word="${w.w}">
            <b>${w.w}</b><span class="tw-cn">${(w.cn || "").slice(0, 12)}</span>${badge}
          </button>`;
        }).join("")}
      </div>
      ${mi.all ? `<div class="tw-all">🎉 这一组已经全部熟练掌握（${mi.done}/${mi.total}）。<button class="btn tw-more" data-act="morewords">再来一组 →</button></div>` : ""}
    </div>
    <div class="mastery-rule">
      <b>怎样才算「熟练掌握」？</b>
      <span>今天练过　·　<b>连续拼对 3 次</b>　·　全程没点提示 / 没看答案　·　不在错题本里。</span>
      <span class="muted">只看「练过几个」不算数 —— 抄一遍答案也能凑数，这里卡的是连对次数；中途点了提示或拼错一次就清零重来。</span>
      <span class="mr-now">今天已熟练掌握 <b>${mi.done}</b> / ${mi.total} 个</span>
    </div>
    <div class="plan-list">
      ${items.map(it => `
        <div class="plan-item ${it.p}">
          <span class="pi-ico">${it.icon}</span>
          <div class="pi-body"><b>${it.t}</b><p class="muted">${it.d}</p></div>
          <button class="btn pi-go" data-v="${it.v}"${it.lesson != null ? ` data-lesson="${it.lesson}"` : ""}>${it.btn}</button>
        </div>`).join("")}
    </div>
  </div>`;
}

/* ---------- 今日已学单词 ---------- */
/* 今天该练哪几句口语（进度驱动）：本阶段安排的句子里还没会的；
   都学会了就往后补几句还没会的。口语页和今日任务页共用同一套算法。 */
function curStageLevel() {
  var mc = (typeof masteredCount === "function") ? masteredCount() : 0;
  var lvl = 1;
  if (typeof CURRICULUM !== "undefined") {
    for (var i = 0; i < CURRICULUM.length; i++) { if (mc >= (CURRICULUM[i].need || 0)) lvl = i + 1; }
  }
  return lvl;
}
function todayPhrases() {
  const doneSet = new Set(S.phraseDone || []);
  const lvl = curStageLevel();
  // 按用户当前阶段 level 选句：已掌握词越多，可练的口语 level 越高、库越大（动态，不固定 72 句）
  let list = PHRASES.map((_, i) => i).filter(i => (PHRASES[i].level || 1) <= lvl && !doneSet.has(i));
  if (!list.length) list = PHRASES.map((_, i) => i).filter(i => !doneSet.has(i)).slice(0, 3);
  return list;
}

/* ---------- 今日任务清单 ----------
   顶部「今日 x/y」点进来看到的就是这一页：今天该学哪些词、哪几句口语、
   哪一节语法课，每一样都标出「已经搞定 / 还没学」，没学的直接给入口。 */
function viewToday() {
  const mi = dayMasteredInfo();
  const tp = todayPlan_raw();
  const gdone = grammarDoneFn();
  const gList = (tp.grammar || []);
  const gTodo = gList.filter(g => !gdone(g))[0];
  const phTodo = todayPhrases();
  const phDoneN = phTodo.filter(i => phraseDone(i)).length;
  const todayN = (S.todayWords || []).length;
  const wordAll = mi.all;
  const phAll = phTodo.length > 0 && phDoneN === phTodo.length;

  // ① 总览：一眼看清今天还剩什么
  const over = `
    <div class="card today-overview">
      <h3>📋 今天要做到的事 <span class="muted">（全打勾 = 今天达标）</span></h3>
      <div class="to-grid">
        <div class="to-item${wordAll ? " ok" : ""}">
          <span class="to-ico">📝</span>
          <div class="to-main"><b>单词</b><span class="to-sub">${mi.done} / ${mi.total} 已熟练掌握</span></div>
          <span class="to-tag">${wordAll ? "✅ 完成" : `还差 ${mi.total - mi.done} 个`}</span>
        </div>
        <div class="to-item${phAll ? " ok" : ""}">
          <span class="to-ico">💬</span>
          <div class="to-main"><b>口语句子</b><span class="to-sub">${phDoneN} / ${phTodo.length || 0} 已会</span></div>
          <span class="to-tag">${phTodo.length === 0 ? "✅ 全部会了" : (phAll ? "✅ 完成" : `还差 ${phTodo.length - phDoneN} 句`)}</span>
        </div>
        <div class="to-item${gTodo == null ? " ok" : ""}">
          <span class="to-ico">📚</span>
          <div class="to-main"><b>语法课</b><span class="to-sub">${gTodo == null ? "今天的课已上完" : `今天这节还没上`}</span></div>
          <span class="to-tag">${gTodo == null ? "✅ 完成" : "待上"}</span>
        </div>
        <div class="to-item${todayN >= dailyGoal ? " ok" : ""}">
          <span class="to-ico">⌨️</span>
          <div class="to-main"><b>拼写量</b><span class="to-sub">${todayN} / ${dailyGoal} 个词</span></div>
          <span class="to-tag">${todayN >= dailyGoal ? "✅ 完成" : `还差 ${Math.max(0, dailyGoal - todayN)} 个`}</span>
        </div>
      </div>
    </div>`;

  // ② 今日单词：达标清单，逐词标出「已掌握 / 连对几次 / 还没练」
  const wordBlock = `
    <div class="card">
      <h3>📝 今日单词 <span class="muted">（${mi.done}/${mi.total} 已掌握 · 连对 3 次算掌握）</span></h3>
      <div class="td-list">
        ${mi.list.map(w => {
          const mp = masteryProgress(w.w);
          return `<div class="td-row${mp.ok ? " done" : ""}">
            <span class="td-ico">${mp.ok ? "✅" : "⬜"}</span>
            <div class="td-main"><b>${w.w}</b><span class="td-cn">${(w.cn || "").slice(0, 12)}</span></div>
            <span class="td-st ${mp.ok ? "ok" : "need"}">${mp.ok ? "已掌握" : (mp.seen ? `连对 ${mp.streak}/3` : "还没练")}</span>
            <button class="mini" data-word="${w.w}">看详解</button>
          </div>`;
        }).join("")}
      </div>
      <button class="btn td-go" data-v="spell">去拼写练习 →</button>
      ${mi.all ? `<div class="tw-all">🎉 这一组全部熟练掌握（${mi.done}/${mi.total}）。<button class="btn tw-more" data-act="morewords">再来一组 →</button></div>` : ""}
    </div>`;

  // ③ 今日口语：今天该练的几句，点了「我会了」就打勾
  const phBlock = phTodo.length ? `
    <div class="card">
      <h3>💬 今日口语 <span class="muted">（${phDoneN}/${phTodo.length} 已会 · 跟着 🔊 大声读三遍）</span></h3>
      <div class="td-list">
        ${phTodo.map(i => {
          const p = PHRASES[i];
          const done = phraseDone(i);
          return `<div class="td-row${done ? " done" : ""}">
            <span class="td-ico">${done ? "✅" : "⬜"}</span>
            <div class="td-main"><b>${p.en}</b><span class="td-cn">${p.cn}</span></div>
            <span class="td-st ${done ? "ok" : "need"}">${done ? "已会" : "还没会"}</span>
            <button class="mini" onclick="speak('${p.en.replace(/'/g, "\\'")}')">🔊</button>
            <button class="mini${done ? " ph-done" : ""}" data-phrase="${i}">${done ? "取消" : "我会了"}</button>
          </div>`;
        }).join("")}
      </div>
      <button class="btn td-go" data-v="phrases">去练口语 →</button>
    </div>` : `
    <div class="card">
      <h3>💬 今日口语 <span class="muted">（${PHRASES.length} 句全部都会了）</span></h3>
      <p class="muted">每一句都标记过「我会了」。想继续就点 🔊 再跟读几遍，保持语感。</p>
      <button class="btn td-go" data-v="phrases">去复习口语 →</button>
    </div>`;

  // ④ 今日语法课
  const gBlock = `
    <div class="card">
      <h3>📚 今日语法课</h3>
      <p class="muted">${gTodo != null
        ? `今天这节：<b>${String((GRAMMAR[gTodo] && GRAMMAR[gTodo].t) || "").replace(/^第\d+课：/, "")}</b> —— 上完再做里面那 5 道小测验，做完才算学完。`
        : "今天安排的语法课都上完了，可以去做「✍️ 测验」检验一下。"}</p>
      ${gTodo != null
        ? `<button class="btn" data-goto="${gTodo}">去上这一课 →</button>`
        : `<button class="btn td-go" data-v="quiz">去做测验 →</button>`}
    </div>`;

  // ⑤ 今天学会的词（详细讲解）
  const list = (S.todayWords || []).map(findWord).filter(Boolean);
  const detail = list.length ? `
    <h2>📖 今天学会的词 <span class="muted">（${list.length} 个 · 含词性与单复数）</span></h2>
    <div class="today-list">
      ${list.map(w => todayWordCard(w)).join("")}
    </div>` :
    `<h2>📖 今天学会的词</h2>
    <div class="card">
      <h3>今天还没记录到具体单词</h3>
      <p class="muted">你今天学的词会从现在开始累计到这里。去「⌨️ 拼写练习」或「🃏 单词卡」学几个词，回来就能看到清单。</p>
      <p class="muted">更早之前学会的词在「📈 我的 → 已学会的词」里查看。</p>
    </div>`;

  // 页面头由 render() 统一插入，这里只返回正文（早期这里重复插了一次，导致标题出现两遍）
  return over + wordBlock + phBlock + gBlock + detail;
}

/* 单个「今日单词」卡片：词 + 中文 + 词性/其他用法/复数/可数性 + 例句 */
function todayWordCard(w) {
  return `<div class="card tw-card">
    <div class="tw-top">
      <div class="tw-badge">${(w.w[0] || "?").toUpperCase()}</div>
      <div class="tw-word">${w.w}</div>
      <div class="tw-cn">${w.cn || ""}</div>
    </div>
    ${w.pos ? `
    <div class="wc-grammar">
      <div class="wc-row"><span class="wc-k">词性</span><span class="wc-v">${w.pos}</span></div>
      ${w.senses ? `<div class="wc-row"><span class="wc-k">其他用法</span><span class="wc-v">${w.senses}</span></div>` : ""}
      ${w.plural ? `<div class="wc-row"><span class="wc-k">复数</span><span class="wc-v">${w.plural}</span></div>` : ""}
      ${w.countNote ? `<div class="wc-row"><span class="wc-k">可数性</span><span class="wc-v">${w.countNote}</span></div>` : ""}
    </div>` : ""}
    ${w.s ? `<div class="tw-ex">
      <div class="wc-ex-en">${highlightWord(w.s, w.w)}</div>
      <div class="wc-ex-cn">${w.sentCn || ""}</div>
    </div>` : ""}
  </div>`;
}

/* ---------- 错题本 ----------
   列出所有拼错/答错过的词。分成两组：
     · 还没订正（fixed 为空）—— 这就是"自己还没搞懂的"，排在最上面
     · 已订正 —— 后来拼对过的，留作记录
   每个词都带词性/单复数，方便对照着记。 */
function viewWrong() {
  const all = (S.wrongWords || []).slice().reverse();   // 最近错的排前面
  const open  = all.filter(w => !(wrongStat(w).fixed));
  const fixed = all.filter(w => wrongStat(w).fixed);
  const openList  = open.map(findWord).filter(Boolean);
  const fixedList = fixed.map(findWord).filter(Boolean);

  if (!all.length) {
    return `
    <div class="card wrong-empty">
      <div class="we-ico">🎉</div>
      <h3>错题本是空的</h3>
      <p class="muted">你还没有拼错或答错过任何单词。继续保持！</p>
      <p class="muted">以后在「⌨️ 拼写练习」拼错、或在「✍️ 测验」答错的词，都会自动收进这里，方便你针对性复习。</p>
    </div>`;
  }

  const head = `
    <div class="wrong-sum">
      <div class="ws-item ws-open"><span class="ws-n">${openList.length}</span><span class="ws-l">还没搞懂</span></div>
      <div class="ws-item ws-fixed"><span class="ws-n">${fixedList.length}</span><span class="ws-l">已订正</span></div>
      <div class="ws-item ws-total"><span class="ws-n">${openList.length + fixedList.length}</span><span class="ws-l">累计错词</span></div>
    </div>
    <p class="muted">这些是你拼错或答错过的词。<b>每个词下面都有「⌨️ 再拼一遍这个词」，点一下就能就地重拼，拼对后自动标为「已订正」。</b></p>
    ${openList.length ? `<button class="btn primary" id="practiceWrong">⌨️ 一次练完这些错词（${openList.length} 个）</button>` : ""}`;

  const openSection = openList.length ? `
    <h2>📕 还没搞懂的（${openList.length}）</h2>
    <div class="today-list">${openList.map(w => wrongWordCard(w, false)).join("")}</div>` : "";

  const fixedSection = fixedList.length ? `
    <h2>✅ 已订正的（${fixedList.length}）</h2>
    <p class="muted">这些词你后来已经重新拼对过了，恭喜！留在这里供你回顾。</p>
    <div class="today-list">${fixedList.map(w => wrongWordCard(w, true)).join("")}</div>` : "";

  return head + openSection + fixedSection + `
    <div class="card">
      <button class="btn danger" id="clearWrong">🗑 清空错题本</button>
    </div>`;
}

/* 单个错词卡片：词 + 中文 + 错误次数/最后错误日期 + 词性/单复数 + 例句 */
function wrongWordCard(w, isFixed) {
  const st = wrongStat(w.w);
  const meta = [];
  if (st.n > 1) meta.push(`错了 ${st.n} 次`);
  if (st.last)  meta.push(`最后错于 ${st.last}`);
  if (isFixed && st.fixed) meta.push(`✅ ${st.fixed} 订正`);
  return `<div class="card tw-card wr-card ${isFixed ? "wr-fixed" : "wr-open"}">
    <div class="tw-top">
      <div class="tw-badge ${isFixed ? "wr-badge-fixed" : ""}">${(w.w[0] || "?").toUpperCase()}</div>
      <div class="tw-word">${w.w}</div>
      <div class="tw-cn">${w.cn || ""}</div>
    </div>
    ${meta.length ? `<div class="wr-meta">${meta.map(m => `<span class="wr-tag">${m}</span>`).join("")}</div>` : ""}
    ${w.pos ? `
    <div class="wc-grammar">
      <div class="wc-row"><span class="wc-k">词性</span><span class="wc-v">${w.pos}</span></div>
      ${w.senses ? `<div class="wc-row"><span class="wc-k">其他用法</span><span class="wc-v">${w.senses}</span></div>` : ""}
      ${w.plural ? `<div class="wc-row"><span class="wc-k">复数</span><span class="wc-v">${w.plural}</span></div>` : ""}
      ${w.countNote ? `<div class="wc-row"><span class="wc-k">可数性</span><span class="wc-v">${w.countNote}</span></div>` : ""}
    </div>` : ""}
    ${w.s ? `<div class="tw-ex">
      <div class="wc-ex-en">${highlightWord(w.s, w.w)}</div>
      <div class="wc-ex-cn">${w.sentCn || ""}</div>
    </div>` : ""}
    <!-- 就地重拼：不用跳去拼写练习、再自己把词找出来 -->
    <div class="wr-act">
      <button class="btn primary wr-practice" data-practice="${w.w}">⌨️ 再拼一遍这个词</button>
      <span class="muted wr-hint">拼对后自动标为「已订正」</span>
    </div>
  </div>`;
}

/* ---------- 每日复习 ----------
   每日复习 = 你「学会了」的词（S.learned）：单词卡点过「学会了」、或拼写练习拼对过的词。
   用途：间隔复习，防止学了就忘。
   错词【不进复习】——它们属于「错题本」，在拼写练习里专门练、拼对才订正。
   所以：复习队列只从「已学会」里抽；仍在错题本里「还没订正」的词先不进来（它还没真学会）。 */
const REVIEW_SIZE = 8;
function reviewQueue() {
  // 已学会的词，排除掉「错题本里还没订正」的（那些不算真学会，留在错题本练）
  const openWrong = new Set(openWrongWords());
  const learned = shuffle((S.learned || [])
    .map(findWord).filter(Boolean)
    .filter(w => !openWrong.has(w.w)));
  return learned.slice(0, REVIEW_SIZE);
}
function startReview() {
  const q = reviewQueue();
  if (!q.length) return;                    // 没有错题就不开复习
  spQueue = q;
  spPos = 0; spScore = { r: 0, w: 0 }; spListDone = false;
  spMode = "cn"; spReview = true; spLoad();
  view = "spell"; render();
}
/* 错题本里点某个词的「再拼一遍」：只练这一个词，拼对后自动订正 */
function practiceOneWord(word) {
  const w = findWord(word);
  if (!w) { goView("wrong"); return; }
  spQueue = [w];
  spPos = 0; spScore = { r: 0, w: 0 }; spListDone = false;
  spMode = "cn"; spReview = false; spLoad();
  view = "spell"; render();
}
function viewReview() {
  const openN = openWrongWords().length;
  const learnedN = (S.learned || []).length;
  const q = reviewQueue();
  const done = S.lastReview === today();

  if (!learnedN) {
    return `
    <div class="card wrong-empty">
      <div class="we-ico">🎉</div>
      <h3>先学会第一个词，再来复习</h3>
      <p class="muted">复习页里出现的<b>全是你学过的词</b>——你在单词卡点过「我学会了」、或在拼写练习里拼对过的词都会进来。还没拼对的错词归「📕 错题本」专门练，不在这里。</p>
      <p class="muted">现在你还没学会任何词，先去「⌨️ 拼写练习」或「🃏 单词卡」学几个吧。</p>
      <div class="rev-actions">
        <button class="btn primary" data-v="spell" id="revGoSpell">⌨️ 去拼写练习学新词</button>
        <button class="btn" data-back="home" id="revGoHome">返回首页</button>
      </div>
    </div>`;
  }
  return `
  <div class="card rev-card">
    <div class="rev-hero">
      <span class="rev-emoji">🔁</span>
      <div>
        <h3>${done ? "今天的复习已完成 ✅" : "今天的复习还没做"}</h3>
        <p class="muted">复习的全是<b>你已经学会的词</b>——单词卡点过「我学会了」、或拼写练习拼对过的词。每天抽几个出来再过一遍，防止学了就忘。<b>还没订正的错词不在这里，它们去「📕 错题本」练。</b></p>
      </div>
    </div>
    <div class="rev-grid">
      <div class="rev-cell"><b>${q.length}</b><span>本轮复习词数</span></div>
      <div class="rev-cell"><b>${openN}</b><span>错题本待订正</span></div>
      <div class="rev-cell"><b>${learnedN}</b><span>累计学会的词</span></div>
    </div>
    <p class="muted">队列规则：<b>只从「已学会的词」里抽</b>（最多 ${REVIEW_SIZE} 个），<b>不含新词、也不含还没订正的错词</b>。复习时若拼错，那个词会自动收进「错题本」去专门练。</p>
    <div class="rev-actions">
      <button class="btn primary" id="startReview" ${q.length ? "" : "disabled"}>▶ 开始复习（${q.length} 个词）</button>
      <button class="btn" id="skipReview">今天先跳过</button>
    </div>
  </div>
  <div class="card">
    <h3>为什么每天先复习？</h3>
    <ul class="tips">
      <li><b>复习比学新词更重要。</b>学过的词隔天还能默写出来，才算真的记住。</li>
      <li>点过「我学会了」的词在<b>新词里出现得更少</b>，把位置留给没学过的；但它们会<b>定期回到这里</b>让你再过一遍。</li>
      <li>复习最多 ${REVIEW_SIZE} 个词，两三分钟，不占时间，但效果最大。</li>
    </ul>
  </div>`;
}

/* ---------- 单词卡 ---------- */
function viewCards() {
  curCard = WORDS[currentWordIndex()];
  const w = curCard;
  return `
  <h2>单词卡</h2>
  <p class="muted">意思、例句、句意、词源全部直接显示，不用点任何按钮。</p>

  <!-- 单词主体 + 词性 + 意思 + 单复数 + 例句，全在同一个块里 -->
  <div class="card wordcard">
    <div class="wc-top">
      <div class="wc-word">${w.w}</div>
      ${(w._today && w._today === window.TODAY_STR) ? '<span class="today-badge">🌐 今日新词</span>' : ""}
      <div class="wc-side">
        <div class="wc-ph">${w.ph}</div>
        <div class="wc-cn">${w.cn}</div>
      </div>
    </div>

    ${w.pos ? `
    <div class="wc-grammar">
      <div class="wc-row">
        <span class="wc-k">词性</span>
        <span class="wc-v">${w.pos}</span>
      </div>
      ${w.senses ? `
      <div class="wc-row">
        <span class="wc-k">其他用法</span>
        <span class="wc-v">${w.senses}</span>
      </div>` : ""}
      ${w.plural ? `
      <div class="wc-row">
        <span class="wc-k">复数</span>
        <span class="wc-v">${w.plural}</span>
      </div>` : ""}
      ${w.countNote ? `
      <div class="wc-row">
        <span class="wc-k">可数性</span>
        <span class="wc-v">${w.countNote}</span>
      </div>` : ""}
    </div>` : ""}

    <div class="wc-ex">
      <div class="wc-ex-en">${highlightWord(w.s, w.w)}</div>
      <div class="wc-ex-cn">${w.sentCn || ""}</div>
      <button class="mini" onclick="speak('${w.s.replace(/'/g, "\\'")}')">🔊 朗读例句</button>
    </div>

    ${w.sentWords && w.sentWords.length ? `
    <div class="wc-words">
      <span class="wc-k">逐词释义</span>
      <div>${w.sentWords.map(([e, c]) => `<span class="witem"><b>${e}</b> ${c}</span>`).join("")}</div>
    </div>` : ""}

    ${w.tip ? `<div class="wc-tip">💡 ${w.tip}</div>` : ""}
  </div>

  <div class="ctrls">
    <button id="prevBtn" class="btn">← 换一个</button>
    <button id="learnBtn" class="btn primary">我学会了 +1 ⭐</button>
    <button id="nextBtn" class="btn">换一个 →</button>
    <button id="toSpell" class="btn">⌨️ 去拼写这个词</button>
  </div>

  <!-- 为什么是这个意思 / 为什么这么写 -->
  ${viewWordDetail(w)}

  <div class="card">
    <h3>已学会的词（${S.learned.length}）</h3>
    <div class="tags">${S.learned.length
      ? S.learned.map(x => `<span class="tag">${x}</span>`).join("")
      : `<span class="muted">还没有记录，从上面开始吧。</span>`}</div>
  </div>`;
}

/* ---------- 拼写练习 ---------- */
const SPELL_MODES = [
  { id: "cn", name: "中→英", desc: "看中文意思，拼出英文单词" },
  { id: "letter", name: "首字母", desc: "只给首字母和长度，拼出完整单词" },
  { id: "dict", name: "听写", desc: "只看音标和例句，凭记忆拼写（最难）" }
];

function spNewRound() {
  // 自适应出题：错题 → 待巩固 → 新词 → 已掌握（凑数），越熟的词越少出现
  spQueue = adaptiveQueue(10);
  spPos = 0; spScore = { r: 0, w: 0 }; spListDone = false; spReview = false;
  spLoad();
}
function spLoad() {
  spWord = spQueue[spPos];
  spInput = ""; spChars = []; spChecked = false; spResult = null; spReveal = 0;
  spShowAnswer = false; spRetry = false; spCursor = 0; spLastWrong = ""; spJustFixed = false;
  spAssisted = false;
}
function spKey() { return "spelling_score_" + spMode; }
function spLoadBest() {
  try { return JSON.parse(store.get(spKey())) || { r: 0, w: 0 }; }
  catch (e) { return { r: 0, w: 0 }; }
}
function spSaveBest() {
  const b = spLoadBest();
  if (spScore.r > b.r) store.set(spKey(), JSON.stringify(spScore));
}

/* 当前显示的答案串：已揭示的字母用真字母，其余用 _ */
function spMask() {
  const w = spWord.w;
  let out = "";
  for (let i = 0; i < w.length; i++) {
    if (i < spReveal) out += w[i];
    else if (spChecked && spInput[i] === w[i]) out += w[i];
    else out += "_";
  }
  return out;
}
function spTarget() {
  const w = spWord.w;
  return (spInput + w.slice(spInput.length)).slice(0, w.length);
}
/* ---------- 拼写核心 ----------
   1. 可点击任意格子定位光标，不必总从第 1 个开始
   2. 打字过程中【不】上对错色，避免剧透答案
   3. 判定后错的地方要一眼看清，整词结论明确写出
   4. 拼错后不给「下一题」，必须重拼一遍才算过              */
/* 单个「下划线填空格」的渲染。所有模式（中→英 / 首字母 / 听写）共用这一种样式，
   点哪格填哪格，和听写例句里的下划线是同一套视觉。 */
function spCell(ch, i) {
  const typed = spChars[i] || "";
  const interactive = !spShowAnswer && !spChecked;
  let cls = "blanksq";
  let txt = "";
  if (spShowAnswer) {
    // 已判定：一律显示正确字母，用颜色表达"这个字母你写对没"
    txt = ch;
    if (typed && typed !== ch) cls += " bad";
    else if (typed === ch) cls += " ok";
    else cls += " ans";
  } else if (typed) {
    cls += (i < spReveal) ? " filled shown" : " filled";
    txt = typed;
  } else if (i < spReveal) {
    cls += " shown"; txt = ch;       // 提示揭示的字母
  } else {
    cls += " blank"; txt = "";
  }
  if (interactive) {
    cls += " fillable";
    if (i === spCursor) cls += " caret-b";   // 下一个待填位置
  }
  return `<span class="${cls}" data-slot="${i}">${txt === "" ? "&nbsp;" : txt}</span>`;
}
/* 居中、醒目的「下划线填字区」—— 所有模式的统一输入区，不再用独立方框。 */
function spWordCells() {
  return spWord.w.split("").map((ch, i) => spCell(ch, i)).join("");
}

/* 整词判定：每一格都必须填对，且一个不多一个不少 */
function spIsCorrect() {
  const w = spWord.w;
  if (spChars.length < w.length) return false;
  for (let i = 0; i < w.length; i++) {
    if (spChars[i] !== w[i]) return false;
  }
  return true;
}
/* 第几个字母错了（1 起）；全对返回 0 */
function spWrongAt() {
  const w = spWord.w;
  for (let i = 0; i < w.length; i++) {
    if (spChars[i] !== w[i]) return i + 1;
  }
  return 0;
}
/* 用"你写下的字符串"比对，找出第几个字母错（1 起），全对返回 0。
   不依赖 spChars（拼错后会被清空），所以拼写错误反馈里用它最可靠。 */
function firstWrong(userStr, correct) {
  for (let i = 0; i < correct.length; i++) {
    if (userStr[i] !== correct[i]) return i + 1;
  }
  return 0;
}
/* 玩家实际填的字母串（跳过空格），用于展示"你写的：xxx" */
function spTypedStr() {
  return spCharsFit().filter(c => c).join("");
}

/* 把例句里的目标词挖空。
   ★ 听写模式下这些下划线就是【输入区本身】—— 点哪条就往哪填，
     不需要另找一个输入框。
   ★ 判定前不显示任何未填位置的字母（否则等于剧透答案）。 */
function maskSentence(sentence, word) {
  const safe = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blanks = word.split("").map((ch, i) => spCell(ch, i)).join("");
  return sentence.replace(new RegExp("(" + safe + ")", "gi"), blanks);
}

function viewSpell() {
  if (!spQueue.length) spNewRound();
  if (spListDone) return spResultScreen();

  const w = spWord;
  const mode = SPELL_MODES.find(m => m.id === spMode);
  const len = w.w.length;

  // 提示区：按模式决定给多少信息
  let prompt = "";
  if (spMode === "cn") {
    prompt = `<div class="sp-cn">${w.cn}</div>
      <p class="ex" id="spMask">${maskSentence(w.s, w.w)}</p>`;
  } else if (spMode === "letter") {
    prompt = `<div class="sp-cn">中文意思：${w.cn}</div>
      <p class="ex">共 <b>${len}</b> 个字母，首字母是 <b class="big-first">${w.w[0]}</b></p>`;
  } else {
    prompt = `<div class="sp-ph">${w.ph}</div>
      <p class="ex" id="spMask">${maskSentence(w.s, w.w)}</p>
      <button class="mini" onclick="speak('${w.s.replace(/'/g, "\\'")}')">🔊 听例句</button>
      <button class="mini" onclick="startSpeechText('${w.s.replace(/'/g, "\\'")}', 'sp')">🎤 跟读</button>
      ${srIdx === "sp" && srCompare ? phraseCmpHtml() : ""}`;
  }
  // 听写模式零基础最需要：句子的中文 + 每个词的意思
  if (spMode === "dict") prompt += sentenceHelp(w);

  let fb = "";
  if (spRetry && !spChecked) {
    // 拼错后：明确指出错在哪，并要求重拼（输入框已清空，从头再打）
    const youWrote = (spLastWrong || spTypedStr()).replace(/\s+/g, "");
    let where;
    if (youWrote.length !== len) {
      where = `你写了 <b>${youWrote.length}</b> 个字母，这个词有 <b>${len}</b> 个`;
    } else {
      const at = firstWrong(youWrote, w.w);
      if (at > 0) {
        where = `第 <b>${at}</b> 个字母不对（你写的是 <b>${youWrote[at - 1]}</b>，应该是 <b>${w.w[at - 1]}</b>）`;
      } else {
        where = "有字母顺序不对";
      }
    }
    fb = `<div class="sp-fb bad">❌ <b>拼错了</b> —— ${where}</div>
      <div class="sp-ans">正确拼写：<b class="ans-word">${w.w}</b>　<span class="muted">你写的：${youWrote || "（空）"}</span></div>
      <div class="sp-fb retry">💡 输入框已清空 —— 现在<b>照着答案重新拼一遍</b>，拼好才会进入下一题。</div>`;
  } else if (spChecked) {
    fb = `<div class="sp-fb good">✅ <b>完全正确！</b>+1 ⭐</div>
      <div class="sp-ans"><b class="ans-word">${w.w}</b> <span class="muted">${w.cn}</span></div>`;
    if (spJustFixed) fb += `<div class="sp-fb fixed-note">📕 <b>这个词之前在错题本里，现在拼对了 —— 已标记「已订正」！</b></div>`;
    fb += `<div class="fb-why">
      ${etymBlockFor(w)}
      ${fbBlock("🧩 " + w.s + " 为什么这样说", w.why, "why")}
    </div>`;
  }
  const revBanner = spReview ? `<div class="rev-banner">🔁 <b>每日复习</b> —— 全是你学会过的词，每天抽几个出来防遗忘；拼错会自动收进「错题本」。</div>` : "";
  const bd = queueBreakdown(spQueue);
  const bdText = spReview
    ? "🔁 复习队列：全部来自错题本"
    : "🎯 本轮出题（按你该练的程度自动安排）：" +
      [bd.wrong ? `错题 ${bd.wrong}` : "", bd.weak ? `待巩固 ${bd.weak}` : "",
       bd.fresh ? `新词 ${bd.fresh}` : "", bd.solid ? `已掌握 ${bd.solid}` : ""]
        .filter(Boolean).join(" · ");
  const recCur = recommendMode(spMode);
  const recLine = recCur
    ? `<div class="sp-advice">🎚 ${recCur.why} <button class="mini" id="spTakeAdvice">切换难度</button></div>` : "";
  return `
  ${revBanner}
  <h2>⌨️ 拼写练习</h2>
  <div class="modebar">
    ${SPELL_MODES.map(m => `<button class="mode ${spMode === m.id ? "on" : ""}" data-mode="${m.id}">
      <b>${m.name}</b><span>${m.desc}</span></button>`).join("")}
  </div>

  <div class="card sp">
    <p class="muted">第 ${spPos + 1} / ${spQueue.length} 题　·　本轮对 ${spScore.r} 错 ${spScore.w}　·　${mode.desc}</p>
    <div class="bar"><i style="width:${(spPos / spQueue.length) * 100}%"></i></div>
    <p class="sp-compose muted">${bdText}</p>
    ${recLine}

    ${prompt}

    <!-- 统一的「下划线填字区」：所有模式都用它，居中、醒目，不用滚动去找。
         隐藏输入框 #spInput 包在 slots-wrap 内，聚焦时不会再跳回页面顶部。 -->
    <div class="slots-wrap${spChecked ? " locked" : ""}" id="slotsWrap">
      <div class="slots word-cells">${spWordCells()}</div>
      <input id="spInput" class="sp-capture" type="text"
        autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
        aria-label="在这里拼写英文单词"
        value="${buildCapture().replace(/"/g, "&quot;")}" ${spChecked ? "disabled" : ""}>
    </div>
    ${spMode === "dict" && !spShowAnswer ? `
      <p class="dict-tip">👆 例句里的下划线会同步显示你填的字母 —— 在上方居中区域直接填，或点例句里的词填都行</p>` : ""}

    <p class="muted center sp-tip" id="spLiveTip">${spRetry
      ? `照着答案拼一遍　（${spCharsFit().filter(c => c).length} / ${len}）`
      : spCharsFit().filter(c => c).length === 0
        ? `点任意下划线定位，直接拼出 ${len} 个字母`
        : `已填 ${spCharsFit().filter(c => c).length} / ${len} 个格子`}</p>

    ${fb}
  </div>

  <div class="card">
    <h3>为什么必须自己拼出来？</h3>
    <p class="muted">只看不写，大脑不会真正记住。你现在敲的每一遍，都在建立"中文→英文"的直接反应，这个反应能力决定你以后听不懂句子还是听懂了。</p>
    <p class="muted">提示不够用时点「💡 提示一个字母」，实在想不起来再看答案——但先自己想一想，效果最好。</p>
  </div>

  <!-- 常驻底部操作栏：永远不用滚动就能点按钮 -->
  <div class="actionbar">
    <div class="ab-info">
      <b>第 ${spPos + 1} / ${spQueue.length} 题</b>
      <span>${spRetry ? "✍️ 照着答案再拼一次" : spChecked ? (spResult ? "✅ 答对了" : "❌ 拼错了") : "直接在格子里拼写"}</span>
    </div>
    <div class="ab-btns">
      ${spChecked
        ? `<button class="btn primary" id="spNext">${spPos + 1 < spQueue.length ? "下一题 →" : "看本轮结果"}</button>`
        : spRetry
          ? `<button class="btn primary" id="spRetry">我拼好了 ✓</button>`
          : `<button class="btn primary" id="spCheck">检查 ✓</button>
             <button class="btn" id="spReveal">💡 提示一个字母</button>
             <button class="btn" id="spGive">直接看答案</button>`}
    </div>
    <div class="ab-keys">
      <kbd>空格</kbd>${spChecked ? "下一题" : spRetry ? "提交重拼" : "提交"}
    </div>
  </div>
  <div class="ab-space"></div>`;
}

function spResultScreen() {
  const b = spLoadBest();
  const total = spScore.r + spScore.w;
  const pct = total ? Math.round(spScore.r / total * 100) : 0;
  const rec = recommendMode(spMode);
  const bd = queueBreakdown(spQueue);
  const misN = spQueue.filter(w => w && wStat(w.w).streak === 0 && wStat(w.w).seen > 0).length;
  return `
  <h2>本轮结果</h2>
  <div class="card center">
    <p class="big">${spScore.r} / ${total}</p>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <p class="muted">正确率 ${pct}%　·　${modeName(spMode)} 模式最高分：${b.r}/${b.r + b.w}</p>
    <p class="muted">${pct >= 90 ? "非常棒！这个模式可以升到更难的级别了。"
      : pct >= 60 ? "不错，错的那几个回到「单词卡」再看一遍。"
      : "别急，这个模式本来就难。建议先用「中→英」模式练熟，再回来挑战。"}</p>
    <div class="ctrls">
      <button class="btn primary" id="spAgain">再来一轮</button>
      <button class="btn" id="spSwitch">换个模式</button>
    </div>
  </div>
  <div class="card">
    <h3>接下来建议</h3>
    <ul class="tips">
      ${rec ? `<li><b>${rec.why}</b>（点上面「换个模式」即可切换）</li>` : ""}
      <li>本轮有 ${bd.wrong} 个错题、${misN} 个还没拼对——它们会被自动安排进你接下来的练习。</li>
      <li>同一个词要<b>连续拼对 3 次</b>才会被判定为"已掌握"，之后出现的次数会自动变少。</li>
      <li>「中→英」正确率稳定 90% 以上，就可以转「首字母」模式；熟练后再挑战「听写」。</li>
    </ul>
  </div>
  <div class="card">
    <h3>你的掌握度分布</h3>
    ${masteryBars()}
  </div>`;
}
/* 掌握度分布条：把 0~5 级的词数可视化，让"进度"看得见 */
function masteryBars() {
  const W = WORDS.length || 1;
  const cnt = [0, 0, 0, 0, 0, 0];
  WORDS.forEach(w => cnt[mastery(w.w)]++);
  return `<div class="mast-list">
    ${cnt.map((n, lv) => `
      <div class="mast-row lv-${lv}">
        <span class="mast-k">${MASTERY_LABEL[lv]}</span>
        <span class="mast-bar"><i style="width:${Math.round(n / W * 100)}%"></i></span>
        <span class="mast-n">${n}</span>
      </div>`).join("")}
  </div>`;
}
function modeName(id) { const m = SPELL_MODES.find(x => x.id === id); return m ? m.name : id; }

function spCheck() {
  if (spChecked || !spWord) return;
  const wrongAt = spWrongAt();               // 必须在清空 spChars 之前算，否则位置会算错
  const ok = wrongAt === 0;
  // 只有拼对才亮出答案；拼错保持空白，让用户自己重拼（不直接把正确字母填进格子）
  if (ok) spShowAnswer = true;
  if (ok) {
    spChecked = true; spResult = true; spRetry = false;
    spScore.r++; S.stars++;
    if (!S.learned.includes(spWord.w)) S.learned.push(spWord.w);
    markTodayWord(spWord.w);
    spJustFixed = markFixedWord(spWord.w);   // 拼对了原本错的词 → 标记订正
    bumpWord(spWord.w, true, spAssisted);    // 计入掌握度（看答案后拼对的不算真会）
  } else {
    // 拼错：不给「下一题」，进入重拼阶段，必须自己再拼一遍
    spChecked = false; spResult = false; spRetry = true;
    spScore.w++;
    markWrongWord(spWord.w);                 // 记入错题本（累计次数 + 最后错误日期）
    bumpWord(spWord.w, false);               // 掌握度连对清零 → 明天还会再来找你
    spJustFixed = false;
  }
  S.todayCount++;
  spSaveBest(); save();

  // 记住"你原来写错了什么"（用原始输入字符串，不依赖已清空的 spChars），反馈里要用
  spLastWrong = spInput;
  if (!ok) { spInput = ""; spChars = []; spCursor = 0; }
  render();
  if (!spChecked) {                       // 重拼阶段保持可输入并聚焦
    const inp = $("#spInput");
    if (inp && !inp.disabled) {
      try { inp.focus({ preventScroll: true }); } catch (e) {}
      syncCapture();
    }
  }
}
function spNext() {
  // 未通过时不允许跳过：必须先重拼成功（或点"直接看答案"后再拼）
  if (!spChecked && !spRetry) return;
  if (spPos + 1 < spQueue.length) { spPos++; spLoad(); }
  else {
    spListDone = true; spSaveBest();
    if (spReview) { S.lastReview = today(); save(); }   // 复习做完了 → 今天不再提示
  }
  render();
}
function spRevealOne() {
  if (spChecked || spReveal >= spWord.w.length) return;
  spReveal++; spAssisted = true;   // 用了提示 → 这题不算"纯凭记忆写对"
  render();
  const el = $("#spInput"); if (el) el.focus({ preventScroll: true });
}
/* 「直接看答案」：显示完整单词，但【不直接跳过】——
   进入"照着抄一遍"的重拼阶段，自己再打一次才放过这一题。
   这一步很关键：只是看一遍记忆很浅，亲手写一遍才记得住。      */
function spGiveUp() {
  if (spChecked) return;
  const ok = spIsCorrect();
  if (ok) {                      // 已经拼对了 → 正常走判定流程
    spCheck();
    return;
  }
  spShowAnswer = true;           // 亮出完整答案（"直接看答案"本就是要展示正确答案）
  spChecked = false;             // 但还没结束，允许继续拼
  spRetry = true;                // 标记为重拼阶段
  spAssisted = true;             // 看了答案 → 之后拼对也不算真会（掌握度不加）
  spLastWrong = spInput;
  spInput = ""; spChars = [];
  render();
  const inp = $("#spInput");
  if (inp && !inp.disabled) { try { inp.focus({ preventScroll: true }); } catch (e) {} }
}

/* 重拼阶段提交：拼对了算过，拼错了继续练（不计入错题，避免打击） */
function spRetryCheck() {
  const ok = spIsCorrect();
  if (ok) {
    spScore.r++; S.stars++;
    if (!S.learned.includes(spWord.w)) S.learned.push(spWord.w);
    markTodayWord(spWord.w);
    spJustFixed = markFixedWord(spWord.w);
    bumpWord(spWord.w, true, spAssisted);    // 抄对的（assisted）不算掌握
    spChecked = true; spResult = true; spRetry = false;
    spSaveBest(); save(); render();
  } else {
    spLastWrong = spInput;
    spInput = ""; spChars = [];
    spChecked = false;
    save();
    render();
    const inp = $("#spInput");
    if (inp && !inp.disabled) { try { inp.focus({ preventScroll: true }); } catch (e) {} }
  }
}
/* ---------- 词源详解 ---------- */
function viewWordDetail(w) {
  return `
  <div class="card detail">
    <div class="detail-head">
      <span class="detail-w">${w.w}</span>
      <span class="detail-ph">${w.ph}</span>
      <span class="detail-cn">${w.cn}</span>
    </div>
    ${w.pos ? `<p class="detail-meta"><b>词性</b>${w.pos}${w.plural ? `　<b>复数</b>${w.plural}` : ""}</p>` : ""}

    ${fbBlock("🧩 这句话为什么这样说", w.why, "why")}

    ${etymBlockFor(w)}

    <div class="detail-foot">
      <button class="btn" onclick="speak('${w.w.replace(/'/g, "\\'")}')">🔊 朗读单词</button>
      <button class="btn" onclick="speak('${w.s.replace(/'/g, "\\'")}')">🔊 朗读例句</button>
    </div>
  </div>`;
}

/* 例句中文 + 逐词释义 + 用法说明。
   ★ 听写模式下【判定前一律不显示英文原文和用法】，
     否则直接把答案摆在眼前，听写就失去意义了。
     只在判定后（spShowAnswer=true）才揭示。 */
function sentenceHelp(w) {
  const revealed = spShowAnswer;
  if (!revealed) {
    // 听写中：只给中文意思，英文原文和讲解全部藏着
    return `
    <div class="sent-help">
      <div class="sh-row"><span class="sh-k">句子意思</span><span class="sh-v">${w.sentCn || "—"}</span></div>
      <div class="sh-row sh-block">
        <span class="sh-k">听写中</span>
        <span class="sh-v">先根据中文把单词拼出来，填完才能看到英文原文和讲解。</span>
      </div>
    </div>`;
  }
  return `
  <div class="sent-help">
    <div class="sh-row"><span class="sh-k">句子意思</span><span class="sh-v">${w.sentCn || "—"}</span></div>
    <div class="sh-row sh-block">
      <span class="sh-k">英文原句</span>
      <span class="sh-v"><b>${w.s}</b></span>
    </div>
    ${w.sentWords && w.sentWords.length ? `
      <div class="sh-row sh-block">
        <span class="sh-k">逐词释义</span>
        <span class="sh-v">
          ${w.sentWords.map(([e, c]) => `<span class="witem"><b>${e}</b> ${c}</span>`).join("")}
        </span>
      </div>` : ""}
    <div class="sh-row sh-block">
      <span class="sh-k">本句用法</span>
      <span class="sh-v">${w.why || "（暂无讲解）"}</span>
    </div>
  </div>`;
}

/* 在例句里把这个单词标出来，让你看到它在句中的位置 */
function highlightWord(sentence, word) {
  const safe = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sentence.replace(new RegExp("(" + safe + ")", "gi"), '<b class="hl">$1</b>');
}
/* 例句的中文大意：优先用数据里写好的，没有就退回"结构说明" */
function sentenceCn(w) {
  if (w.sentCn) return w.sentCn;
  return `句中的 ${w.w} 就是「${w.cn}」的意思`;
}

/* ---------- 词源词典 ---------- */
function viewEtymon() {
  return `
  <h2>📖 词源词典 · 为什么是这个意思</h2>
  <p class="muted">每个词都有一个故事。知道词根和来历，记单词会容易十倍——因为你在记逻辑，而不是记字母组合。</p>
  <div class="card">
    <h3>怎么读这些解释</h3>
    <ul class="tips">
      <li><b>词根</b>：单词最早的含义，往往和现在的意思看起来毫不相关。</li>
      <li><b>同根词</b>：标注出来的属于同一家族，一起记效率最高（如 water → watermelon）。</li>
      <li><b>读音</b>：词源有时能解释读音规律（如 school 读 /skuːl/，不读 /skool/）。</li>
      <li>解释里出现的拉丁语、希腊语字根，完全看不懂也没关系，直接记住结论就行。</li>
    </ul>
  </div>
  ${WORDS.map(w => `
    <details class="card ety">
      <summary>
        <span class="et-w">${w.w}</span>
        <span class="et-cn">${w.cn}</span>
        <span class="et-ph">${w.ph}</span>
        ${w.pos ? `<span class="et-pos">${w.pos}</span>` : ""}
      </summary>
      ${w.senses ? `<h4>💬 其他常见用法</h4><p class="why">${w.senses}</p>` : ""}
      ${w.plural ? `<h4>🔢 复数形式</h4><p class="why">${w.plural}</p>` : ""}
      ${etymBlockFor(w)}
      <h4>🧩 例句为什么这样说</h4>
      <p class="ex">${w.s}</p>
      ${w.why ? `<p class="why">${w.why}</p>` : ""}
      ${w.tip ? `<h4>💡 记忆技巧</h4><p class="why">${w.tip}</p>` : ""}
    </details>`).join("")}`;
}

/* ---------- 语法课 ---------- */
function viewGrammar() {
  if (lessonIdx !== null) return lessonPage(lessonIdx);
  // 今天该学哪节：本阶段安排里第一节还没过的过；本阶段都过了就往后取一节没过的。
  // 所以「今天学这节」这个标记会随你的进度往前挪，不会永远停在第 1 课。
  const gdone = grammarDoneFn();
  const tp = todayPlan_raw();
  let todayLesson = (tp.grammar || []).filter(g => !gdone(g) && GRAMMAR[g])[0];
  if (todayLesson == null) {
    todayLesson = (Curriculum.pendingLessons(gdone) || []).filter(g => GRAMMAR[g])[0];
  }
  if (todayLesson == null) todayLesson = null;
  return `
  <h2>📚 语法课 · 零基础 ${GRAMMAR.length} 讲</h2>
  <p class="muted">按顺序学，每节包含：讲解 → 规则 → 为什么 → ${(GRAMMAR[0] && GRAMMAR[0].ex || []).length} 个例句 → 常见错误 → ${(GRAMMAR[0] && GRAMMAR[0].quiz || []).length} 道测验。<b>看完一定要做测验</b>，会用才算学会。</p>
  <p class="muted">🌐 语法内容由<b>云端动态提供</b>（当前 ${GRAMMAR.length} 节，会持续补充更新，不写死在代码里）。</p>
  ${todayLesson != null ? `<div class="card tipbox grammar-today">
    <b>🎯 今天学这节：${String(GRAMMAR[todayLesson].t || "").replace(/^第\d+课：/, "")}</b>
    <p class="muted">${GRAMMAR[todayLesson].s || ""}　配你现在的阶段：${tp.goal}</p>
    <button class="btn" data-goto="${todayLesson}">去上这一课 →</button>
  </div>` : `<div class="card tipbox grammar-today">
    <b>🏆 ${GRAMMAR.length} 节语法课全部通过</b>
    <p class="muted">每节测验都过了。想巩固可以重开任意一课再看一遍。</p>
  </div>`}
  <div class="grid2">
  ${GRAMMAR.map((g, i) => {
    const lvl = curStageLevel();
    const locked = (g.level || 1) > lvl;
    const done = gqState[i] && gqState[i].done;
    const score = gqState[i] ? gqState[i].right : null;
    if (locked) return `
    <div class="card lesson locked">
      <div class="lesson-top"><span class="lesson-no">${i + 1}</span><span class="lesson-lock">🔒 学到第 ${g.level || 1} 阶段解锁</span></div>
      <h3>${g.t.replace(/^第\d+课：/, "")}</h3>
      <p class="muted">${g.s}</p>
    </div>`;
    return `
    <div class="card lesson${i === todayLesson ? " is-today" : ""}" data-grammar="${i}">
      <div class="lesson-top">
        <span class="lesson-no">${i + 1}</span>
        ${i === todayLesson ? `<span class="lesson-today">今天学这节</span>` : ""}
        ${done ? `<span class="lesson-done">${score} / ${(g.quiz||[]).length} ✓</span>` : ""}
      </div>
      <h3>${g.t.replace(/^第\d+课：/, "")}</h3>
      <p class="muted">${g.s}</p>
      <div class="lesson-meta">
        <span>📖 ${g.ex.length} 个例句</span>
        <span>✍️ ${(g.quiz||[]).length} 道测验</span>
      </div>
      <span class="more">点开学习 →</span>
    </div>`;
  }).join("")}
  </div>
  <div class="card">
    <h3>⚠️ 为什么语法不能只背规则</h3>
    <p class="muted">每条规则背后都有一个原因。搞清楚为什么要加 -s、为什么要倒装，你才不用死记，也能自己造出从没见过的句子。每节课都有「🧩 这条规则为什么这样」的讲解。</p>
    <p class="muted">更重要的是：每节课最后都有测验。<b>看懂 ≠ 会用</b>，做错的地方才是真正没懂的地方。</p>
  </div>`;
}

/* ---------- 单课详情页（点开就是完整一页） ---------- */
function lessonPage(i) {
  const g = GRAMMAR[i];
  const st = gqState[i];
  if (!g) return `<div class="card"><p class="muted">这节课暂时打不开（内容缺失）。</p><button class="btn back-btn" id="backLessons">← 返回课程列表</button></div>`;
  return `
  <button class="btn back-btn" id="backLessons">← 返回课程列表</button>

  <div class="card lesson-page">
    <h2>${g.t || ""}</h2>
    <p class="lead">${g.s || ""}</p>

    <h4>📐 规则</h4>
    <ul class="rules">${(g.b || []).map(x => `<li>${bold(x)}</li>`).join("")}</ul>

    <h4>🧩 这条规则为什么这样</h4>
    <p class="root">${g.why || ""}</p>

    <h4>💬 例句（${(g.ex || []).length} 条）</h4>
    <p class="muted">左边是英文（重点词加粗），右边是中文。大声读出来效果最好。</p>
    <div class="ex-list">
      ${(g.ex || []).map((x, n) => `<div class="ex-row">
        <span class="ex-no">${n + 1}</span>
        <span class="ex-en">${bold(x[0])}</span>
        <span class="ex-cn">${x[1]}</span>
        <button class="mini" onclick="speak('${String(x[0] || "").replace(/\*\*/g, "").replace(/'/g, "\\'")}')">🔊</button>
      </div>`).join("")}
    </div>

    <h4>⚠️ 中国人最容易犯的错</h4>
    <div class="err-box">${(g.err || "").split("\n").map(l => `<p>${l.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</p>`).join("")}</div>
  </div>

  ${quizBlock(i)}

  <div class="lesson-foot">
    <button class="btn" id="prevLesson" ${i === 0 ? "disabled" : ""}>← 上一课</button>
    <button class="btn primary" id="nextLesson" ${i === GRAMMAR.length - 1 ? "disabled" : ""}>
      ${i === GRAMMAR.length - 1 ? "已是最后一课" : "下一课 →"}</button>
  </div>`;
}

/* ---------- 课末测验 ---------- */
/* 确保某课的作答记录已存在（首次进入时调用） */
/* 有效测验题：把「用户已答对过的原题」换成云端换题库里的题（按课标题取），实现不重复 */
function buildEffQuiz(i) {
  const g = GRAMMAR[i];
  if (!g) return [];
  const base = g.quiz || [];
  const st = gqState[i];
  const rightSet = (st && st.rightSet) || {};
  const bank = (window.GQUIZ_BANK && window.GQUIZ_BANK[g.t]) || [];
  let bi = 0;
  return base.map(function (q, n) {
    if (rightSet[n] && bank.length) { const rep = bank[bi % bank.length]; bi++; return rep; }
    return q;
  });
}
function initGQuiz(i) {
  if (!GRAMMAR[i]) return null;
  if (!gqState[i]) {
    gqState[i] = { picks: new Array((GRAMMAR[i].quiz || []).length).fill(-1), right: 0, done: false, pastPerfect: false, rightSet: {} };
  }
  gqState[i].eff = buildEffQuiz(i);   // 每次都重建（应用「答对题→换题」）
  return gqState[i];
}

function quizBlock(i) {
  const g = GRAMMAR[i];
  if (!g) return "";
  const st = gqState[i] || initGQuiz(i) || {};
  const quiz = (st.eff && st.eff.length) ? st.eff : (g.quiz || []);
  const total = quiz.length;
  const done = st && st.done;
  const allRight = done && st.right === total;

  return `
  <div class="card gquiz" id="gquizBox">
    <h3>✍️ 课堂测验 · ${total} 题</h3>
    <p class="muted">${done
      ? (allRight ? "全对！这节语法你掌握了。" : `你答对 ${st.right} / ${total} 题，把错题的解析看一遍再重做。`)
      : "看完讲解来做题。做错不丢人，那正好告诉你哪里没懂。"}</p>

    ${done ? `
      <div class="gq-result ${allRight ? "good" : "mid"}">
        <span class="big">${st.right} / ${total}</span>
        <span>${allRight ? "完全正确" : "还差一点，把错题看仔细"}</span>
      </div>
      <div class="gq-review">
        ${quiz.map((q, n) => {
          const ok = st.picks[n] === q.a;
          return `<div class="gq-item ${ok ? "ok" : "bad"}">
            <div class="gq-q">${n + 1}. ${q.q}</div>
            ${!ok ? `<div class="gq-your">你的答案：<s>${q.opts[st.picks[n]] ?? "未作答"}</s></div>` : ""}
            <div class="gq-right">正确答案：<b>${q.opts[q.a]}</b></div>
            <div class="gq-e">${q.e}</div>
          </div>`;
        }).join("")}
      </div>
      <div class="ctrls">
        <button class="btn primary" id="gqRedo">再练一次</button>
        ${!allRight ? `<button class="btn" id="gqBackRead">回去看讲解</button>` : ""}
      </div>
    ` : `
      ${quiz.map((q, n) => {
        const picked = st.picks[n];
        const judged = picked >= 0;
        const ok = judged && picked === q.a;
        return `
      <div class="gq-item ${judged ? (ok ? "ok" : "bad") : "pending"}" id="gqItm${n}">
        <div class="gq-q">${n + 1}. ${q.q}</div>
        <div class="gq-opts">
          ${q.opts.map((o, k) => {
            let cls = "opt";
            if (judged) {
              if (k === q.a) cls += " right";
              else if (k === picked) cls += " wrong";
            }
            return `<button class="${cls}" data-gq="${n}:${k}" ${judged ? "disabled" : ""}>${o}</button>`;
          }).join("")}
        </div>
        ${judged ? `<div class="gq-fb">
          <div class="gq-verdict ${ok ? "good" : "bad"}">${ok ? "✅ 答对了" : "❌ 答错了"}</div>
          ${!ok ? `<div class="gq-your">你选：<s>${q.opts[picked]}</s>　正确：<b>${q.opts[q.a]}</b></div>` : ""}
          <div class="gq-e">${q.e}</div>
        </div>` : ""}
      </div>`;
      }).join("")}
      <div class="gq-bar">
        <span>已答 <b>${st.picks.filter(p => p >= 0).length}</b> / ${total} 题　·　答对 <b>${st.right}</b> 题</span>
        <button class="btn primary" id="gqSubmit" ${st.picks.every(p => p >= 0) ? "" : "disabled"}>
          ${st.picks.every(p => p >= 0) ? "查看成绩 →" : "全部答完后自动出成绩"}</button>
      </div>
      <div class="ctrls">
        <button class="btn" id="gqHide">先遮住答案自测</button>
      </div>
    `}
  </div>`;
}

function startGQuiz(i) {
  if (!GRAMMAR[i]) return;
  const old = gqState[i];
  gqState[i] = { picks: new Array((GRAMMAR[i].quiz || []).length).fill(-1), done: false, right: 0,
                 pastPerfect: old ? old.pastPerfect : false,
                 rightSet: (old && old.rightSet) || {} };
  gqState[i].eff = buildEffQuiz(i);              // 重做时应用「已答对题→换题」
  render();
}
/* 点选项 → 立刻判定并显示解析，不用滚到底部点提交 */
function pickGQuiz(n, k) {
  const st = initGQuiz(gqIdx);
  if (st.done) return;
  const qz = (st.eff && st.eff.length) ? st.eff : ((GRAMMAR[gqIdx] && GRAMMAR[gqIdx].quiz) || []);
  const pick = parseInt(k);
  if (isNaN(pick)) return;
  if (st.picks[n] === pick) return;              // 重复点同一个不重复计分
  const q = qz[n];
  if (!q) return;

  st.picks[n] = pick;
  if (pick === q.a) { st.right++; st.rightSet[n] = 1; }   // 答对 → 标这个槽位，下次换题

  store.set(GQ_KEY, JSON.stringify(gqState));
  save();

  // 全部答完 → 自动出成绩
  if (st.picks.every(p => p >= 0)) {
    st.done = true;
    if (!st.pastPerfect && st.right === qz.length) {
      S.stars++; st.pastPerfect = true;
    }
    S.todayCount++;
    save();
  }
  render();                                       // 重绘显示该题判定 + 解析

  // 没答完时滚到下一题，省得用户自己找
  if (!st.done) {
    const nextQ = qz.findIndex((_, i) => st.picks[i] < 0);
    const box = document.getElementById("gqItm" + nextQ);
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    const b = $("#gquizBox");
    if (b && b.scrollIntoView) b.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
function submitGQuiz() {
  const g = GRAMMAR[gqIdx];
  if (!g) return;
  const st = initGQuiz(gqIdx);
  if (st.done) return;
  const quiz = (st.eff && st.eff.length) ? st.eff : (g.quiz || []);
  const left = st.picks.filter(p => p < 0).length;
  if (left > 0) { alert("还有 " + left + " 题没选，答完会自动出成绩。"); return; }
  st.done = true;
  if (!st.pastPerfect && st.right === (quiz || []).length) { S.stars++; st.pastPerfect = true; }
  S.todayCount++;
  store.set(GQ_KEY, JSON.stringify(gqState));
  save();
  render();
}

function bold(s) { return String(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }


/* ---------- 口语 ---------- */
/* 每条结构：英文（主行）→ 音标 + 中文 + 用法提示（副行）→ 朗读按钮 */
/* ---------- 口语进度：哪几句已经「我会了」 ----------
   存在 S.phraseDone（存句子下标），「我的」页据此统计学会了多少句。 */
function phraseDone(i) {
  return Array.isArray(S.phraseDone) && S.phraseDone.indexOf(i) >= 0;
}
function phraseDoneCount() {
  return Array.isArray(S.phraseDone) ? S.phraseDone.length : 0;
}
function togglePhrase(i) {
  if (!Array.isArray(S.phraseDone)) S.phraseDone = [];
  const k = S.phraseDone.indexOf(i);
  if (k >= 0) S.phraseDone.splice(k, 1); else S.phraseDone.push(i);
  save(); render();
}

/* ---------- 口语语音识别（听用户读，对比找错） ----------
   用浏览器自带 Web Speech API（Chrome / Edge 支持）。不支持的浏览器自动隐藏麦克风按钮。 */
var srIdx = -1, srHeard = "", srActive = false, srCompare = null;
var srRecording = false, srCloudUp = false, srMediaRec = null, srStream = null, srRecTimer = null;
/* 免费云端语音转文字（无需 key，CORS 开放）：录音上传 → 返回文字。
   用于 iOS / 微信等不支持 Web Speech API 的环境兜底；限额较低，仅作兜底。 */
var ASR_URL = "https://notetakers.vipresearch.ca/stt/v1/transcribe";
function canRecord() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
function cloudTranscribe(blob, text, onDone) {
  var fd = new FormData();
  fd.append("file", blob, "rec.webm");
  fd.append("engine", "whisper");
  fd.append("language", "en");
  fetch(ASR_URL, { method: "POST", body: fd })
    .then(function (r) { return r.json(); })
    .then(function (j) { onDone(j && j.success && j.text ? j.text : null); })
    .catch(function () { onDone(null); });
}
function hasSpeech() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function _esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function _norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ").trim(); }
function comparePhrase(target, heard) {
  const t = _norm(target).split(" ");
  const h = _norm(heard).split(" ");
  const hset = new Set(h);
  const words = t.map(w => ({ w, ok: hset.has(w) }));
  const allOk = words.every(x => x.ok) && Math.abs(t.length - h.length) <= 1;
  return { words, allOk, heard };
}
function startSpeech(idx) { startSpeechText(PHRASES[idx] ? PHRASES[idx].en : "", idx); }
function startSpeechText(text, idx) {
  if (srRecording) { stopCloudRec(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    if (srActive) return;
    srActive = true; srIdx = idx; srHeard = ""; srCompare = null; srRecording = false; srCloudUp = false; render();
    let rec;
    try { rec = new SR(); } catch (e) { srActive = false; return cloudFallback(text, idx); }
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = e => {
      try { srHeard = e.results[0][0].transcript; } catch (_) { srHeard = ""; }
      srCompare = comparePhrase(text, srHeard);
    };
    rec.onerror = e => {
      const err = e && e.error ? e.error : "";
      if (err === "not-allowed" || err === "service-not-allowed") { srActive = false; return cloudFallback(text, idx); }
      srHeard = "（没听清：" + err + "）";
    };
    rec.onend = () => { srActive = false; render(); };
    try { rec.start(); } catch (e) { srActive = false; cloudFallback(text, idx); }
    return;
  }
  cloudFallback(text, idx);
}
function cloudFallback(text, idx) {
  if (canRecord()) startCloudRec(text, function (tr) {
    srIdx = idx; srHeard = tr || "（没听清，请再试一次）"; srCompare = comparePhrase(text, srHeard);
    srRecording = false; srCloudUp = false; render();
  });
  else speechBlockedGuide();
}
function stopCloudRec() {
  if (srRecTimer) { clearTimeout(srRecTimer); srRecTimer = null; }
  if (srMediaRec && srMediaRec.state !== "inactive") { try { srMediaRec.stop(); } catch (_) {} }
}
function startCloudRec(text, onDone) {
  if (!canRecord()) { speechBlockedGuide(); return; }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    srStream = stream;
    let rec;
    try { rec = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); speechBlockedGuide(); return; }
    srMediaRec = rec;
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      srRecording = false; srCloudUp = true; render();
      if (srStream) srStream.getTracks().forEach(t => t.stop());
      cloudTranscribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" }), text, onDone);
    };
    rec.start();
    srRecording = true; srCloudUp = false; render();
    srRecTimer = setTimeout(function () { if (srMediaRec && srMediaRec.state !== "inactive") srMediaRec.stop(); }, 9000);
  }).catch(function () { srRecording = false; srCloudUp = false; speechBlockedGuide(); render(); });
}
function speechBlockedGuide() {
  const ua = navigator.userAgent;
  const isWX = /micromessenger/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isHttps = location.protocol === "https:";
  let reason, fix;
  if (isWX) {
    reason = "你是用微信内置浏览器打开的";
    fix = "点微信右上角 ⋯ →「在浏览器打开」→ 用手机 Chrome / Edge 打开 https://jjww.new.tg。";
  } else if (!isHttps) {
    reason = "当前还是 http:// 不安全链接";
    fix = "浏览器在 http 下会禁用语音识别。等地址变成 https://（证书正在签发中）后，语音功能会自动出现。";
  } else if (isIOS) {
    reason = "苹果手机在 http:// 下无法用语音（系统要求安全链接 https）";
    fix = "等地址变成 https://jjww.new.tg 后，用 iPhone 自带 Safari 打开就能直接说；若从微信打开，点右上角「⋯ → 在浏览器打开」也能用录音识别。";
  } else {
    reason = "当前浏览器不支持语音识别";
    fix = "请用 Chrome / Edge（电脑或安卓手机）打开本网站。";
  }
  const html = '<div class="modal-mask" id="sgMask"><div class="modal">' +
    '<h3>🎤 语音功能暂时用不了</h3>' +
    '<p>' + reason + '。</p>' +
    '<p class="muted">' + fix + '</p>' +
    '<p class="muted">👉 iOS / 微信里用语音：先把链接升级成 <b>https://jjww.new.tg</b>（证书正在处理），然后用 iPhone 自带 Safari 打开，或微信里点「⋯ → 在浏览器打开」。安卓手机用自带 Chrome 打开 https 链接也能直接用。</p>' +
    '<button class="modal-btn" onclick="var m=document.getElementById(\'sgMask\');if(m)m.remove()">知道了</button>' +
    '</div></div>';
  const old = document.getElementById("sgMask"); if (old) old.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}
function phraseCmpHtml() {
  if (!srCompare) return "";
  return `
    <div class="ph-cmp">
      <div class="ph-heard">你刚才说：<b>${_esc(srHeard)}</b></div>
      <div class="ph-words">${srCompare.words.map(x => `<span class="cmp ${x.ok ? "ok" : "bad"}">${_esc(x.w)}</span>`).join(" ")}</div>
      <div class="ph-cmp-tip ${srCompare.allOk ? "ok" : "bad"}">${srCompare.allOk ? "✅ 读得很准，跟原句一致！" : "⚠️ 有词不太对（红色），听原句跟读几遍再试。"}</div>
    </div>`;
}

function viewPhrases() {
  // 今天练哪几句：取本阶段安排的句子里还没会的；都学会了就补后面没会的几句。
  // 所以每次进来看到的「今天这几句」会随你的进度往前推。
  const tp = todayPlan_raw();
  const todaySet = todayPhrases();
  const todayBlock = todaySet.length ? `
  <div class="card tipbox phrase-today">
    <h3>🎯 今天练这几句 <span class="muted">（配你现在的阶段：${tp.goal}）</span></h3>
    <div class="pt-list">
      ${todaySet.map(i => {
        const p = PHRASES[i];
        return `<div class="pt-row">
          <span class="pt-en">${p.en}</span>
          <span class="pt-ipa">${p.ph || ""}</span>
          <span class="pt-cn">${p.cn}</span>
          <button class="mini" onclick="speak('${p.en.replace(/'/g, "\\'")}')">🔊</button>
          <button class="mini" data-mic="${i}" title="点我，然后大声读出这句，我来听对错">${srRecording && srIdx === i ? "🎤 停止" : "🎤 说"}</button>
          <button class="mini" data-phrase="${i}">我会了</button>
          ${srIdx === i ? (srActive ? `<div class="ph-listening">🎤 正在听…</div>` : srRecording ? `<div class="ph-listening">🎤 录音中，点「停止」结束</div>` : srCloudUp ? `<div class="ph-listening">☁️ 上传识别中…</div>` : "") : ""}
          ${srIdx === i && srCompare ? phraseCmpHtml(p, i) : ""}
        </div>`;
      }).join("")}
    </div>
  </div>` : `
  <div class="card tipbox phrase-today">
    <h3>🏆 ${PHRASES.length} 句口语全部练完了</h3>
    <p class="muted">每一句都标记过「我会了」。想继续就点 🔊 再跟读几遍，保持语感。</p>
  </div>`;
  return `
  ${todayBlock}
  <h2>💬 日常口语 ${PHRASES.length} 句　<span class="ph-count">已会 ${phraseDoneCount()} / ${PHRASES.length}</span></h2>
  <p class="muted">每句都标了<b>音标</b>，照着念就能读准。点 🔊 可以听发音，然后大声跟读三遍；<b>觉得自己会说这句了，就点「我会了」</b>，进度会记在「我的」里。 点每句的 🎤 说给我听：你读出这句，我逐词标红哪些读错了。手机上若点了没反应，会弹出提示告诉你怎么解决。</p>
  <div class="tipbox">
    <b>怎么练最有效</b>
    <ol class="tips">
      <li>先看音标确认每个词怎么读，不确定就点 🔊 听一遍</li>
      <li>出声读三遍，不要默读 —— 听力是靠嘴巴建立的</li>
      <li>想象你在跟一个外国人对话，把这句完整说出来</li>
    </ol>
  </div>
  <div class="ph-list">
  ${PHRASES.map((p, i) => `
    <div class="card phrase">
      <div class="ph-idx">${String(i + 1).padStart(2, "0")}</div>
      <div class="ph-body">
        <div class="ph-en">${p.en}</div>
        <div class="ph-second">
          <span class="ph-ipa">${p.ph || ""}</span>
          <span class="ph-cn">${p.cn}</span>
        </div>
        ${p.tip ? `<div class="ph-tip">💡 ${p.tip}</div>` : ""}
      </div>
      <button class="mini" onclick="speak('${p.en.replace(/'/g, "\\'")}')">🔊 朗读</button>
      <button class="mini" data-mic="${i}" title="点我，然后大声读出这句，我来听对错">${srRecording && srIdx === i ? "🎤 停止" : "🎤 说给我听"}</button>
      <button class="mini ${phraseDone(i) ? "ph-done" : ""}" data-phrase="${i}">${phraseDone(i) ? "✅ 已会" : "我会了"}</button>
      ${srIdx === i ? (srActive ? `<div class="ph-listening">🎤 正在听，请大声读出这句…</div>` : srRecording ? `<div class="ph-listening">🎤 录音中，点「停止」结束</div>` : srCloudUp ? `<div class="ph-listening">☁️ 上传识别中…</div>` : "") : ""}
      ${srIdx === i && srCompare ? phraseCmpHtml() : ""}
    </div>`).join("")}
  </div>
  <div class="card">
      <h3>⚠️ 为什么音标很重要</h3>
      <p class="muted">不标音标的话，你只能按字母猜读法，会读错很多。比如 work 里的 or 读 /ɜːr/ 不读 /ɔːr/，th 读 /θ/ 不读 /t/。照着音标念，一开始就练的是正确发音，这比事后纠正省力得多。</p>
    </div>`;
}
/* ---------- 用法 · 短语动词 ---------- */
/* ---------- 用法测验（不重复：测过的句子换新的） ---------- */
var phTest = { active: false, list: [], qi: 0, picked: -1, right: 0 };
/* 固定搭配专练：句子里短语保留，挖空后面的小品词/介词，从选项里选（像「We are looking forward __ your visit.」选 to） */
var PH_PARTICLES = ["to","for","on","up","out","at","with","about","after","into","over","from","off","down","back","in","of","by","through","around"];
function buildPhrasalTest() {
  const all = [];
  (typeof PHRASALVERBS !== "undefined" ? PHRASALVERBS : []).forEach(function (p, pi) {
    const words = (p.phrase || "").trim().split(/\s+/);
    const last = (words[words.length - 1] || "").toLowerCase();
    if (PH_PARTICLES.indexOf(last) < 0) return;              // 末词不是小品词（如 go to bed）→ 不出这题
    const re = new RegExp("\\b" + last + "\\b", "i");
    const ex = p.ex || "";
    if (!re.test(ex)) return;
    const s = ex.replace(re, "＿＿");                          // 挖掉小品词（第一个匹配即短语后的那个）
    if (s === ex) return;
    all.push({ id: pi + ":p", s: s, cn: p.exCn || "", a: last, phrase: p.phrase });
  });
  const tested = S.phrasalQuiz || [];
  let pool = all.filter(function (x) { return tested.indexOf(x.id) < 0; });
  if (pool.length < 6) { S.phrasalQuiz = []; pool = all; }   // 全测过则重置，重新轮一遍
  return shuffle(pool).slice(0, Math.min(8, pool.length));
}
function phTestQuestion(it) {
  const pool = PH_PARTICLES.filter(function (x) { return x !== it.a; });
  shuffle(pool);
  return shuffle([it.a].concat(pool.slice(0, 2)));   // 正确小品词 + 2 个干扰项（A/B/C 三选一）
}
function startPhrasalTest() {
  const list = buildPhrasalTest();
  if (!list.length) { alert("暂无可测内容"); return; }
  phTest = { active: true, list: list, qi: 0, picked: -1, right: 0 };
  render();
}
function phTestPick(k) {
  if (phTest.picked >= 0) return;
  const it = phTest.list[phTest.qi];
  const opts = phTestQuestion(it);
  phTest.picked = k;
  if (k === opts.indexOf(it.a)) phTest.right++;
  S.phrasalQuiz = S.phrasalQuiz || [];
  if (S.phrasalQuiz.indexOf(it.id) < 0) S.phrasalQuiz.push(it.id);   // 标记已测，下次换别的句子
  save();
  render();
}
function phTestNext() {
  if (phTest.qi >= phTest.list.length - 1) {
    alert("本轮用法测验：答对 " + phTest.right + " / " + phTest.list.length +
      (phTest.right === phTest.list.length ? "\n🎉 全对！" : "\n已测过的句子下次会自动换成新的。"));
    phTest.active = false; phTest.list = []; render();
    return;
  }
  phTest.qi++; phTest.picked = -1; render();
}
function phrasalTestBlock() {
  const it = phTest.list[phTest.qi];
  if (!it) return "";
  const opts = phTestQuestion(it);
  const done = phTest.picked >= 0;
  const ok = done && phTest.picked === opts.indexOf(it.a);
  return `
  <div class="card ph-test">
    <div class="pht-head">🧪 固定搭配专练 · 第 ${phTest.qi + 1} / ${phTest.list.length} 题　已对 ${phTest.right}</div>
    <p class="pht-q">${it.s.replace(/＿＿+|___+/, '<span class="pht-blank">＿＿</span>')}</p>
    ${it.cn ? `<p class="muted" style="margin:-6px 0 12px;">${it.cn}</p>` : ""}
    <div class="pht-opts">
      ${opts.map(function (o, k) {
        let cls = "btn";
        if (done) { if (k === opts.indexOf(it.a)) cls += " good"; else if (k === phTest.picked) cls += " bad"; }
        return `<button class="${cls}" data-pht="${k}" ${done ? "disabled" : ""}>${"ABC"[k] || k + 1}. ${o}</button>`;
      }).join("")}
    </div>
    ${done ? `<p class="${ok ? "sp-fb good" : "sp-fb bad"}">${ok ? "✅ 答对了！" : "❌ 正确答案：" + it.a}</p>` : ""}
    ${done ? `<button class="btn primary" id="phtNext">${phTest.qi >= phTest.list.length - 1 ? "看结果 →" : "下一题 →"}</button>` : ""}
  </div>`;
}
/* 按 pat 生成「后面接什么」的说明（和 note 一样的 💡 橙色样式，不用小标签） */
function phPatNote(p) {
  const map = {
    "sth":         "宾语放后面：" + p.phrase + " sth（后面接事物）",
    "sb":          "宾语放后面：" + p.phrase + " sb（后面接人）",
    "sb/sth":      "宾语放后面：" + p.phrase + " sb / sth（后面接人或事物）",
    "doing":       p.phrase + " 后面接 doing（动词 -ing 形式）",
    "sth / doing": p.phrase + " 后面接 sth（事物）或 doing（动词-ing）",
    "不接宾语":     p.phrase + " 不接宾语，后面直接跟时间、地点等成分"
  };
  return map[p.pat] || "";
}
function viewPhrasals() {
  const list = (typeof PHRASALVERBS !== "undefined") ? PHRASALVERBS : [];
  if (!list.length) {
    return `<h2>🔗 用法 · 短语动词</h2>
      <div class="card"><p class="muted">用法内容正在从云端加载，稍等片刻或刷新一下。</p></div>`;
  }
  if (phTest.active) return phrasalTestBlock();
  return `
  <h2>🔗 用法 · 短语动词 ${list.length} 个</h2>
  <p class="muted">英语里很多意思不是靠单个单词，而是「动词 + 小品词」组合表达的——比如 <b>look for</b>（寻找）、<b>get up</b>（起床）、<b>turn on</b>（打开）。这里把最常用的短语动词逐个讲清：中文意思 + 例句 + 翻译，点 🔊 听发音，照着念几遍就记住了。<b>橙色提示</b>告诉你后面接什么、怎么变位。</p>
  <div class="card tipbox">
    <button class="btn primary" data-act="phtest-start">🧪 固定搭配专练</button>
  </div>
  <div class="phrasal-list">
  ${list.map(function (p) {
    const sp = (p.phrase || "").replace(/'/g, "\\'");
    const tip = p.note || phPatNote(p);
    return `<div class="card phrasal-card">
      <div class="pc-head">
        <span class="pc-phrase">${p.phrase}</span>
        <span class="pc-cn">${p.cn}</span>
        <button class="mini" onclick="speak('${sp}')">🔊</button>
      </div>
      ${p.ex ? `<div class="pc-ex">
        <span class="pc-ex-en">${p.ex}</span>
        <button class="mini" onclick="speak('${p.ex.replace(/'/g, "\\'")}')">🔊</button>
        <span class="pc-ex-cn">${p.exCn || ""}</span>
      </div>` : ""}
      ${tip ? `<p class="muted pc-note">💡 ${tip}</p>` : ""}
    </div>`;
  }).join("")}
  </div>`;
}
function speak(t) {
  if (!("speechSynthesis" in window)) return alert("当前浏览器不支持朗读");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "en-US"; u.rate = 0.85;
  speechSynthesis.speak(u);
}

/* ---------- 测验 ---------- */
function viewQuiz() {
  if (!qiList.length) newQuiz();
  const q = qiList[qi];
  const isLast = qi === qiList.length - 1;
  // 本题是否已作答：判断依据是"作答记录属于当前题号"，而不是一个布尔标志。
  // 这样即使中途切到别的页面再回来，状态也不会残留导致点选项没反应。
  const done = answeredIdx === qi;

  return `
  <h2>✍️ 测验 · 第 ${qi + 1} / ${qiList.length} 题</h2>
  <p class="muted">本轮已答对 ${roundRight} 题 · 历史最高 ${S.quizBest} / ${qiList.length}　｜　答对一题 +1 ⭐</p>
  <div class="bar"><i style="width:${(qi / qiList.length) * 100}%"></i></div>

  <div class="card quizq">
    <p class="q">${q.q}</p>
    <div class="opts">
      ${q.opts.map((o, i) => {
        let cls = "opt";
        if (done) {
          if (i === q.ans) cls += " right";
          else if (i === answeredPick) cls += " wrong";
        }
        return `<button class="${cls}" data-quizopt="${i}" ${done ? "disabled" : ""}>${o}</button>`;
      }).join("")}
    </div>

    ${done ? quizFeedback(q, isLast) : ""}
  </div>

  <!-- 常驻底部操作栏 -->
  <div class="actionbar">
    <div class="ab-info">
      <b>第 ${qi + 1} / ${qiList.length} 题</b>
      <span>${done ? (answeredPick === q.ans ? "✅ 答对了" : "❌ 答错了") : "选择一个答案"}</span>
    </div>
    <div class="ab-btns">
      ${done
        ? `<button class="btn primary" id="nextQ">${isLast ? "看本轮结果 →" : "下一题 →"}</button>`
        : `<span class="ab-tip">点选项，或按数字键 1-4</span>`}
    </div>
    <div class="ab-keys">
      ${done ? "<kbd>空格</kbd>下一题" : ""}
    </div>
  </div>
  <div class="ab-space"></div>`;
}

function quizFeedback(q, isLast) {
  const ok = answeredPick === q.ans;
  // 解析：每题都带「例句 + 中文意思」，详细词再附「为什么这么说」（词源/用法）。
  // 词库扩充后大部分是精简词，没有词源故事，所以解析要能优雅降级，不能只测 34 个详细词。
  const explain = `
    <div class="qz-ex">
      <div class="qz-ex-en">${highlightWord(q.key.s || "", q.key.w)}</div>
      <div class="qz-ex-cn">${q.key.sentCn || ""}</div>
      ${q.key.why ? `<p class="muted">💡 ${q.key.why}</p>` : ""}
    </div>`;
  return `
    ${ok
      ? `<div class="sp-fb good">✅ 答对了！+1 ⭐</div>
         <div class="sp-ans">${q.key.w} <span class="muted">${q.key.ph} ${q.key.cn}</span></div>`
      : `<div class="sp-fb bad">❌ 答错了，正确答案是 <b>${q.key.w}</b>（${q.key.cn}）</div>`}
    ${explain}`;
}

function newQuiz() {
  // 优先考没掌握的词
  const un = WORDS.filter(w => !S.learned.includes(w.w));
  const pool = un.length >= 10 ? un : WORDS;
  qiList = shuffle(pool).slice(0, 10).map(w => {
    const askCn = Math.random() < 0.5;   // true: 给中文让选英文
    const wrong = shuffle(WORDS.filter(x => x.w !== w.w)).slice(0, 3);
    const opts = shuffle([w, ...wrong]);
    return {
      q: askCn ? `「${w.cn}」用英语怎么说？` : `单词 “${w.w}” 是什么意思？`,
      opts: askCn ? opts.map(o => o.w) : opts.map(o => o.cn),
      ans: opts.indexOf(w),
      key: w
    };
  });
  qi = 0; answeredIdx = -1; answeredPick = -1; roundRight = 0;
}

/* 选答案：只改状态，然后整页重绘。UI 完全由状态推导，不可能出现按钮丢失 */
function pickOption(i) {
  if (answeredIdx === qi) return;         // 本题已答过，忽略重复点击
  const q = qiList[qi];
  answeredPick = parseInt(i);
  answeredIdx = qi;

  if (answeredPick === q.ans) { roundRight++; S.stars++; bumpWord(q.key.w, true); }
  else {
    S.todayCount++;
    markWrongWord(q.key.w);       // 答错 → 记入错题本
    bumpWord(q.key.w, false);     // 掌握度清零 → 之后拼写练习会重点出它
  }
  save();
  render();
}

function quizNext() {
  if (qi >= qiList.length - 1) return quizResult();
  qi++;
  render();
}

function quizResult() {
  const score = roundRight, total = qiList.length;
  const isBest = score > S.quizBest;
  if (isBest) S.quizBest = score;
  save();
  const wrongs = WORDS.filter(w => (S.wrongWords || []).includes(w.w));
  let msg = `本轮得分：${score} / ${total}\n`;
  if (isBest && score > 0) msg += `🎉 新纪录！\n`;
  msg += `\n获得 ${score} ⭐`;
  if (score === total) msg += "\n\n全对！可以去挑战拼写练习的听写模式了。";
  else msg += "\n\n错过的单词已记入错词本，建议回「拼写练习」默写一遍。";
  if (wrongs.length) {
    msg += `\n\n【错词本 · 共 ${wrongs.length} 个】\n` +
      wrongs.slice(0, 12).map(w => `${w.w} = ${w.cn}`).join("\n");
  }
  alert(msg);
  newQuiz(); view = "me"; render();
}

/* ---------- 我的 ---------- */
function viewMe() {
  const learned = S.learned;
  const total = WORDS.length;
  const mins = S.days.length * 15;
  const st = stageInfo();
  const mastered = WORDS.filter(w => mastery(w.w) === 5).length;
  const rec = recommendMode("cn") || recommendMode("letter") || recommendMode("dict");
  // 下一步建议：按你的真实数据挑，不再是一堆写死的条目
  const advice = [];
  if (openWrongWords().length) advice.push(`错题本还有 <b>${openWrongWords().length}</b> 个没订正，今天先解决它们。`);
  if (rec) advice.push(rec.why);
  if (mastered < total) advice.push(`还有 <b>${WORDS.filter(w => mastery(w.w) === 0).length}</b> 个词完全没练过，去「拼写练习」继续。`);
  else advice.push("所有词都已掌握！可以专心练「听写」模式和口语了。");
  if (S.days.length < 3) advice.push("才刚开始，先保证连续 3 天都来练 15 分钟。");
  // 「学了多少」：天数 / 单词 / 口语 / 语法课 —— 全部来自真实进度，不是写死的文案
  const gd = grammarDoneFn();
  const gDone = GRAMMAR.map((_, i) => i).filter(gd).length;
  const pDone = phraseDoneCount();
  return `
  <h2>我的学习记录</h2>
  <div class="card">
    <h3>📈 学了多少</h3>
    <div class="home-stats me-stats">
      <div class="hs ms-days">
        <span class="hs-ico">🔥</span>
        <span class="hs-text"><span class="big">${streakDays()}<span class="unit"> 天</span></span>
          <span class="muted">连续打卡（约 ${mins} 分钟）</span></span>
      </div>
      <div class="hs ms-words">
        <span class="hs-ico">📝</span>
        <span class="hs-text"><span class="big">${S.learned.length}<span class="unit"> / ${total}</span></span>
          <span class="muted">已学单词</span></span>
      </div>
      <div class="hs ms-phrase">
        <span class="hs-ico">💬</span>
        <span class="hs-text"><span class="big">${pDone}<span class="unit"> / ${PHRASES.length}</span></span>
          <span class="muted">口语句子（点「我会了」记一句）</span></span>
      </div>
      <div class="hs ms-grammar">
        <span class="hs-ico">📚</span>
        <span class="hs-text"><span class="big">${gDone}<span class="unit"> / ${GRAMMAR.length}</span></span>
          <span class="muted">语法课（自测做完即算学完）</span></span>
      </div>
      <div class="hs ms-stars">
        <span class="hs-ico">⭐</span>
        <span class="hs-text"><span class="big">${S.stars}</span>
          <span class="muted">收集到的星星（每完成一轮今日目标 +1）</span></span>
      </div>
      <div class="hs ms-quiz">
        <span class="hs-ico">🏆</span>
        <span class="hs-text"><span class="big">${S.quizBest}<span class="unit"> / 10</span></span>
          <span class="muted">测验历史最高分（每轮 10 题）</span></span>
      </div>
    </div>
  </div>
  <div class="card grid2">
    <div><h3>${st.icon} 学习阶段</h3><p class="big">${st.name}</p>
      <p class="muted">${st.tip}</p></div>
    <div><h3>🎯 已掌握单词</h3><p class="big">${mastered} / ${total}</p>
      <p class="muted">连对 3 次算「已掌握」</p></div>
  </div>
  <div class="card">
    <h3>📊 逐级掌握度（共 ${total} 个词）</h3>
    <p class="muted">连对 3 次算「已掌握」。级别越高，之后出现的次数会自动越少。</p>
    ${masteryBars()}
  </div>
  <div class="card">
    <h3>下一步建议</h3>
    <ul class="tips">${advice.map(a => `<li>${a}</li>`).join("")}</ul>
    <button id="clearBtn" class="btn danger">清空学习记录</button>
  </div>
  ${wrongSummary()}${reviewSummary()}${profileCard()}`;
}

/* ---------- 学习日历 ----------
   把「连续 / 累计」两个抽象数字变成一张看得见的图：
   哪天学了（亮）、哪天没学（暗）、今天（框）。
   顶部点「🔥 连续 N 天」就是进这个页面。 */
function parseDay(k) { const p = k.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function dayDiff(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
function longestStreak() {
  const arr = [...new Set(S.days || [])].sort();
  let best = 0, cur = 0, prev = null;
  for (const k of arr) {
    cur = (prev && dayDiff(prev, k) === 1) ? cur + 1 : 1;
    if (cur > best) best = cur;
    prev = k;
  }
  return best;
}
function viewCalendar() {
  const set = new Set(S.days || []);
  const st = streakDays();
  const total = totalDays();
  const longest = longestStreak();
  const lv = fireLevel(st);
  const WEEKS = 6, days = WEEKS * 7;
  const todayK = today();
  // 从今天往前推 (days-1) 天， oldest -> newest
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    cells.push({ k, dom: d.getDate(), studied: set.has(k), isToday: k === todayK,
      label: (d.getMonth() + 1) + "月" + d.getDate() + "日" + (k === todayK ? "（今天）" : "") });
  }
  const grid = cells.map(c => `
    <div class="cal-cell ${c.studied ? "studied" : "miss"} ${c.isToday ? "today" : ""}"
         title="${c.label} · ${c.studied ? "学了 ✓" : "没学"}">
      <span class="cal-dom">${c.dom}</span>
      <span class="cal-ico">${c.studied ? "🔥" : (c.isToday ? "📍" : "")}</span>
    </div>`).join("");
  const weekHead = ["一", "二", "三", "四", "五", "六", "日"].map(w => `<div class="cal-wh">${w}</div>`).join("");
  return `
  <h2>📅 学习日历</h2>
  <div class="card cal-summary">
    <div class="cal-stat"><span class="hs-ico fire-lv-${lv}">🔥</span><span class="hs-text"><span class="big">${st}<span class="unit"> 天</span></span><span class="muted">连续打卡 · ${fireLevelName(st)}</span></span></div>
    <div class="cal-stat"><span class="hs-ico">📆</span><span class="hs-text"><span class="big">${total}<span class="unit"> 天</span></span><span class="muted">累计学习</span></span></div>
    <div class="cal-stat"><span class="hs-ico">🏆</span><span class="hs-text"><span class="big">${longest}<span class="unit"> 天</span></span><span class="muted">最长连续</span></span></div>
  </div>
  <div class="card">
    <p class="muted">最近 ${WEEKS} 周：亮的是学了的那天，暗的是没学的。断一天连续就归零，所以尽量别断～</p>
    <div class="cal-grid">
      ${weekHead}
      ${grid}
    </div>
    <div class="cal-legend">
      <span><i class="lg studied"></i> 学了</span>
      <span><i class="lg miss"></i> 没学</span>
      <span><i class="lg today"></i> 今天</span>
    </div>
  </div>
  <div class="card">
    <h3>🔥 火花等级</h3>
    <p class="muted">连续天数越长，火花越旺（颜色越亮）。断一天就从头算起。</p>
    <div class="fire-legend">
      ${[0,1,2,3,4,5,6].map(l => `<span class="fire-lv-${l} fl"><b>${["灰","橙","橙红","红","紫","金","彩"][l]}</b><small>${["0 天","1-2 天","3-6 天","7-13 天","14-29 天","30-59 天","60+ 天"][l]}</small></span>`).join("")}
    </div>
  </div>
  <div class="card">
    <h3>⭐ 关于星星</h3>
    <p class="muted">每完成一轮「今日目标」就 +1 颗星星：比如今天练满 ${dailyGoal} 个词、做完一次语法自测、或测验满分。星星只是记录你的努力，不会过期、也不会被扣。</p>
    <p class="muted">想看全部记录，去 <button class="linkbtn" data-chip="me">「我的」页 →</button></p>
  </div>`;
}

/* ---------- 阅读页 ----------
   分级短文：列表（按进度解锁）→ 点开读。两种模式：
   ① 整段翻译：英文在上，每段可单独「显示/隐藏中文」；
   ② 填单词：把文中你学过的词挖空，填对变绿。 */
var readId = "";        // 当前在读的短文下标（"" = 列表）
var readMode = "trans"; // trans | fill
var readShowCn = false; // 整段翻译：是否显示全部中文

function readingUnlocked(lv) {
  // 已掌握词数达到 (lv-1)*20 才解锁对应难度（学到一定程度才出现更难的）
  return masteredCount() >= (lv - 1) * 20;
}
function readBlanks(text) {
  const learned = new Set(S.learned || []);
  const known = new Set(WORDS.map(w => w.w));
  // 词 → 释义 / 音标 查表：挖空处给用户看中文意思，可点 🔊 听发音
  const wmap = {};
  WORDS.forEach(w => { wmap[w.w.toLowerCase()] = w; });
  const tokens = text.split(/(\s+)/);
  let bi = 0;
  return tokens.map(tok => {
    const m = tok.match(/^([A-Za-z']+)([^A-Za-z']*)$/);
    if (!m) return tok;
    const word = m[1], trail = m[2];
    const low = word.toLowerCase();
    let blank = learned.has(low);
    if (!blank && bi < 6 && known.has(low)) blank = true; // 学过的词不够时，用词库里见过的词补几个
    if (!blank || bi >= 8) return tok;
    bi++;
    const w = wmap[low] || {};
    const cn = w.cn || "";
    const ph = w.ph || "";
    const safe = low.replace(/'/g, "\\'");
    return `<span class="rd-blk">
        <input class="rd-blank" data-ans="${low}" data-ph="${ph}" placeholder="" maxlength="20" aria-label="填单词">
        ${ph ? `<button type="button" class="rd-blk-spk" onclick="speak('${safe}')" title="听这个词的发音">🔊</button>` : ""}
      </span>${trail}`;
  }).join("");
}
function viewRead() {
  if (readId === "") return readList();
  const art = READING[readId];
  if (!art) { readId = ""; return readList(); }
  const paras = art.en.split(/\n+/).filter(Boolean);
  const parasCn = art.cn.split(/\n+/).filter(Boolean);
  const body = readMode === "trans"
    ? paras.map((p, i) => `
        <div class="rd-para">
          <p class="rd-en">${p}</p>
          <p class="rd-cn" ${readShowCn ? "" : 'style="display:none"'}>${parasCn[i] || ""}</p>
          <button class="mini rd-toggle" data-rdt="${i}">${readShowCn ? "隐藏中文" : "显示中文"}</button>
        </div>`).join("")
    : `<div class="rd-fill">${readBlanks(art.en)}</div>
       <div class="rd-cn-block">📖 中文意思（先读熟，再对照填词）：<br>${art.cn}</div>
       <div class="rd-actions">
         <button class="btn primary" data-act="rdcheck">核对答案</button>
         ${nextReadingBtn()}
         <span class="rd-result" id="rdResult"></span>
       </div>
       <p class="muted">照着下面的中文意思，把英文里挖空的下划线处填上对应单词，填对变绿、填错变红。填完点「核对答案」，全对会有小惊喜 🎉；想直接看下一篇翻译就点「下一篇 →」。</p>`;
  return `
  <h2>📖 阅读 · ${art.title}</h2>
  <div class="card">
    <div class="rd-bar">
      <span class="rd-lv">难度 L${art.lv}</span>
      <span class="rd-topic">${art.topic}</span>
      <span class="rd-modes">
        <button class="chip ${readMode === "trans" ? "on" : ""}" data-readmode="trans">整段翻译</button>
        <button class="chip ${readMode === "fill" ? "on" : ""}" data-readmode="fill">填单词</button>
      </span>
      <button class="mini" onclick="speak('${String(art.en).replace(/'/g, "\\'")}')">🔊 朗读</button>
      <button class="mini" data-act="rdspeak" title="点我，然后大声朗读整段，我来听你读得对不对">${rdSr.recording ? "🎤 停止" : "🎤 跟读"}</button>
    </div>
    ${readMode === "trans"
      ? `<button class="mini rd-allcn" data-act="rdallcn">${readShowCn ? "隐藏全部中文" : "显示全部中文"}</button>`
      : ""}
    ${body}
    ${rdSr.active ? `<div class="ph-listening">🎤 正在听你朗读…</div>` : rdSr.recording ? `<div class="ph-listening">🎤 录音中，点「停止」结束</div>` : rdSr.uploading ? `<div class="ph-listening">☁️ 上传识别中…</div>` : ""}
    ${readCmpHtml()}
  </div>
  <div class="card">
    <button class="btn" data-readback="1">← 返回短文列表</button>
  </div>`;
}
function readList() {
  const items = READING.map((a, i) => {
    const ok = readingUnlocked(a.lv);
    const need = (a.lv - 1) * 20;
    return `<button class="rd-item ${ok ? "" : "locked"}" ${ok ? `data-read="${i}"` : 'disabled'}>
      <span class="rd-ico">📖</span>
      <span class="rd-meta">
        <b>${a.title}</b>
        <small>${a.topic} · 难度 L${a.lv}</small>
        ${ok ? "" : `<small class="rd-lock">再掌握 ${Math.max(0, need - masteredCount())} 个词解锁</small>`}
      </span>
      <span class="rd-go">${ok ? "读 →" : "🔒"}</span>
    </button>`;
  }).join("");
  return `
  <h2>📖 阅读</h2>
  <div class="card">
    <p class="muted">短文按你的进度逐步解锁：掌握的词越多，越难的短文才会出现。点开可选「整段翻译」或「填单词」两种模式。</p>
    <div class="rd-list">${items}</div>
  </div>`;
}
function checkReadFill() {
  let right = 0, total = 0;
  document.querySelectorAll(".rd-blank").forEach(inp => {
    total++;
    const ans = inp.dataset.ans;
    const val = (inp.value || "").trim().toLowerCase();
    inp.classList.remove("ok", "bad");
    if (val === ans) { inp.classList.add("ok"); right++; }
    else if (val) inp.classList.add("bad");
  });
  const el = document.getElementById("rdResult");
  if (el) el.textContent = total ? `填对 ${right} / ${total}` : "";
  // 全对 → 撒花庆祝
  if (total > 0 && right === total) showReadCelebrate();
}
/* 下一篇：向前找下一篇「已解锁」的短文，循环查找；找不到返回 -1 */
function nextReadingId() {
  const n = (READING || []).length;
  if (n === 0 || readId === "") return -1;
  for (let step = 1; step <= n; step++) {
    const i = (readId + step) % n;
    if (i === readId) break;
    if (readingUnlocked(READING[i].lv)) return i;
  }
  return -1;
}
function nextReadingBtn() {
  const nxt = nextReadingId();
  if (nxt < 0) return `<span class="muted">🎉 已是最新可读的短文，多掌握单词解锁更多 →</span>`;
  return `<button class="btn ghost" data-act="rdnext">下一篇 →</button>`;
}
function gotoNextReading() {
  const nxt = nextReadingId();
  if (nxt < 0) { goView("read"); return; }
  readId = nxt;
  readMode = "trans";   // 直接进「整段翻译」模式
  readShowCn = true;    // 默认把中文也显示出来，对照着看
  render();
}
/* 全对庆祝：撒花 + 横幅，自动消失 */
function showReadCelebrate() {
  let box = document.getElementById("rdCelebrate");
  if (!box) {
    box = document.createElement("div");
    box.id = "rdCelebrate";
    box.className = "rd-celebrate";
    box.innerHTML = `<div class="rd-confetti"></div>
      <div class="rd-praise">
        <div class="rd-praise-emoji">🎉</div>
        <div class="rd-praise-txt">太棒了！全部填对！<br><small>点「下一篇 →」继续读下一篇 💪</small></div>
      </div>`;
    box.onclick = () => box.classList.remove("show");
    document.body.appendChild(box);
  }
  box.classList.add("show");
  const cf = box.querySelector(".rd-confetti");
  if (cf) {
    cf.innerHTML = "";
    const emojis = ["🎉", "⭐", "✨", "💪", "🌟", "🏆", "👍", "🎊", "💡", "🌈"];
    for (let i = 0; i < 30; i++) {
      const s = document.createElement("span");
      s.textContent = emojis[i % emojis.length];
      s.style.left = (Math.random() * 100) + "vw";
      s.style.animationDelay = (Math.random() * 0.5) + "s";
      s.style.fontSize = (15 + Math.random() * 18) + "px";
      cf.appendChild(s);
    }
  }
  clearTimeout(showReadCelebrate._t);
  showReadCelebrate._t = setTimeout(() => box.classList.remove("show"), 2800);
}

/* ---------- 阅读·语音跟读（听用户读整段，逐词标对错） ----------
   复用口语页的 comparePhrase：把用户读到的词和原文逐词比对。
   全对给表扬；有错则把读错的词列出来，每个都能 🔊 听正确读法 + 看音标。 */
var rdSr = { active: false, heard: "", cmp: null, recording: false, uploading: false, stream: null, rec: null, timer: null };
function startReadSpeech() {
  if (rdSr.recording) { stopReadCloud(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const text = READING[readId] ? READING[readId].en : "";
  if (SR) {
    if (rdSr.active) return;
    rdSr.active = true; rdSr.heard = ""; rdSr.cmp = null; rdSr.recording = false; rdSr.uploading = false; render();
    let rec;
    try { rec = new SR(); } catch (e) { rdSr.active = false; return readCloudFallback(text); }
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = e => {
      try { rdSr.heard = e.results[0][0].transcript; } catch (_) { rdSr.heard = ""; }
      rdSr.cmp = text ? comparePhrase(text, rdSr.heard) : null;
    };
    rec.onerror = e => {
      const err = e && e.error ? e.error : "";
      if (err === "not-allowed" || err === "service-not-allowed") { rdSr.active = false; return readCloudFallback(text); }
      rdSr.heard = "（没听清：" + err + "）";
    };
    rec.onend = () => { rdSr.active = false; render(); };
    try { rec.start(); } catch (e) { rdSr.active = false; readCloudFallback(text); }
    return;
  }
  readCloudFallback(text);
}
function readCloudFallback(text) {
  if (canRecord()) startReadCloud(text); else speechBlockedGuide();
}
function startReadCloud(text) {
  if (!canRecord()) { speechBlockedGuide(); return; }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    rdSr.stream = stream;
    let rec;
    try { rec = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); speechBlockedGuide(); return; }
    rdSr.rec = rec;
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      rdSr.recording = false; rdSr.uploading = true; render();
      stream.getTracks().forEach(t => t.stop());
      cloudTranscribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" }), text, function (tr) {
        rdSr.heard = tr || "（没听清，请再试一次）";
        rdSr.cmp = text ? comparePhrase(text, rdSr.heard) : null;
        rdSr.uploading = false; render();
      });
    };
    rec.start();
    rdSr.recording = true; rdSr.uploading = false; render();
    rdSr.timer = setTimeout(function () { if (rec.state !== "inactive") rec.stop(); }, 12000);
  }).catch(function () { rdSr.recording = false; rdSr.uploading = false; speechBlockedGuide(); render(); });
}
function stopReadCloud() {
  if (rdSr.timer) { clearTimeout(rdSr.timer); rdSr.timer = null; }
  if (rdSr.rec && rdSr.rec.state !== "inactive") { try { rdSr.rec.stop(); } catch (_) {} }
}
function readCmpHtml() {
  if (!rdSr.cmp) return "";
  const cmp = rdSr.cmp;
  const wrong = cmp.words.filter(x => !x.ok);
  const wmap = {}; WORDS.forEach(w => { wmap[w.w.toLowerCase()] = w; });
  return `
    <div class="rd-cmp ph-cmp">
      <div class="ph-heard">你刚才读：<b>${_esc(rdSr.heard)}</b></div>
      <div class="ph-words">${cmp.words.map(x => `<span class="cmp ${x.ok ? "ok" : "bad"}">${_esc(x.w)}</span>`).join(" ")}</div>
      ${cmp.allOk
        ? `<div class="ph-cmp-tip ok">✅ 太棒了！整段都读对了，发音很准，继续保持！</div>`
        : `<div class="ph-cmp-tip bad">⚠️ 有 ${wrong.length} 个词没读准（上面红色划掉的就是）。下面逐个听正确读法、看音标，跟着读几遍再试：</div>
           <div class="rd-wrong-list">${wrong.map(x => {
              const w = wmap[x.w.toLowerCase()] || {};
              return `<div class="rd-wrong-item">
                <b>${_esc(x.w)}</b>
                ${w.ph ? `<span class="rd-wrong-ph">${w.ph}</span>` : ""}
                <button type="button" class="mini" onclick="speak('${_esc(x.w)}')">🔊 听正确读法</button>
              </div>`;
           }).join("")}</div>`}
    </div>`;
}

/* ---------- 学习档案（多用户）----------
   同一台电脑可以给多个人用，进度各自独立。 */
function profileCard() {
  const me = curProfile();
  return `
  <div class="card profile-card">
    <h3>👤 学习档案</h3>
    <p class="muted">当前档案：<b>${me.name}</b>　（目标：${me.goal}　·　计划每天 ${me.minutes} 分钟　·　加入于 ${me.createdAt}）</p>
    <p class="muted">每个档案的<b>学习进度、错题本、星星完全独立</b>。家里几个人共用一台电脑时，各用各的档案，互不影响。</p>
    <div class="prof-list">
      ${PROFILES.map(p => `
        <button class="prof-item ${p.id === profileId ? "on" : ""}" data-prof="${p.id}">
          <span class="prof-name">${p.name}${p.id === profileId ? "（当前）" : ""}</span>
          <span class="prof-meta">目标：${p.goal} · 每天 ${p.minutes} 分钟 · 加入于 ${p.createdAt}</span>
        </button>`).join("")}
    </div>
    <div class="prof-actions">
      <input id="newProfName" class="prof-input" type="text" placeholder="新档案名字（如：小明）" maxlength="12">
      <button class="btn primary" id="addProf">＋ 新建档案</button>
      ${PROFILES.length > 1 ? `<button class="btn danger" id="delProf">删除当前档案</button>` : ""}
    </div>
  </div>`;
}

/* 「我的」页里的错题本入口：给个概览 + 按钮跳到独立错题本页面 */
function wrongSummary() {
  const all = (S.wrongWords || []).length;
  const open = openWrongWords().length;
  if (!all) return `
  <div class="card">
    <h3>📕 错题本</h3>
    <p class="muted">还没有错词。测验和拼写做错的词会自动收集到错题本，方便你针对性复习。</p>
  </div>`;
  return `
  <div class="card">
    <h3>📕 错题本 · 共 ${all} 个</h3>
    <p class="muted">${open ? `其中 <b>${open}</b> 个还没订正（还没搞懂的）。` : "全部都订正过啦，很棒！"}点进错题本可以逐条查看词性和单复数，并直接发起针对性默写。</p>
    <button class="btn primary" id="goWrong">打开错题本 →</button>
  </div>`;
}

/* 「我的」页里的今日复习入口 */
function reviewSummary() {
  const hasWrong = (S.wrongWords || []).length > 0;
  const done = S.lastReview === today();
  if (!hasWrong) return `
  <div class="card">
    <h3>🔁 每日复习</h3>
    <p class="muted">复习<b>只出错题</b>。现在错题本是空的，今天没有需要复习的词 ✅</p>
  </div>`;
  return `
  <div class="card">
    <h3>🔁 每日复习</h3>
    <p class="muted">${done ? "今天的复习已完成 ✅，明天再来。" : "今天的复习还没做。复习出的是你学会过的词：先还没订正的错词，再抽学会的旧词，不会出新词。"}</p>
    <button class="btn" id="goReview">${done ? "再复习一遍" : "开始今天的复习 →"}</button>
  </div>`;
}

/* 每天第一次进来 → 先落在「每日复习」页。
   只在【错题本里有词】时才拦一下（复习只出错题，没错题就不打扰）。
   reviewSeen 记"今天已经展示过复习页"，避免刷新后又强制弹回；
   lastReview 记"今天复习真的做完了"（用于页面上的完成状态）。 */
try {
  const hasWrong = (S.wrongWords || []).length > 0;
  if (hasWrong && S.reviewSeen !== today()) {
    view = "review";
    S.reviewSeen = today(); save();
  }
} catch (e) { console.error("复习着陆判断失败", e); }

render();

/* 云端内容（口语/阅读/语法）：若后端有 content_* 表，拉取并覆盖本地对应数组，
   让这部分内容也能从后端扩充；表不存在/出错则继续用本地。
   单词由 daily.js 独占装配（基础+种子+本地+云端共享，自动按词频扩充），此处不处理单词。 */
if (window.CloudSync && window.CloudSync.enabled && window.CloudSync.loadContent) {
  bootstrapContent();
}

/* 云端会话恢复：若之前登录过，自动拉取云端进度（失败则继续用本地） */
if (window.CloudSync && window.CloudSync.enabled && window.CloudSync.restore()) {
  bootstrapCloud();
}

/* 启动：先立即渲染（用内置基础词库 + 「生成中」横幅），
   再异步去联网抓取/生成今日单词，完成后会自动再渲染一次。
   本地直接打开（file://）或离线时，云服务会因域名不匹配而失败，
   此时 daily.js 会自动回落到内置词库——网站照常可用。 */
if (window.DailyEngine && window.DailyEngine.loadDailyWords) {
  window.DailyEngine.loadDailyWords().catch(function (e) {
    console.error("每日单词加载失败：", e);
  });
}
/* 口语同样动态装配：基础 72 + 分级语料(phrases-extra.js) + 云端共享，
   今日练哪几句由 todayPhrases() 按学习阶段 level 过滤，库随进度长大不再固定 72 句 */
if (window.DailyEngine && window.DailyEngine.loadDailyPhrases) {
  window.DailyEngine.loadDailyPhrases().then(function () { render(); }).catch(function (e) {
    console.error("口语动态加载失败：", e);
  });
}
/* 阅读 / 语法同样动态装配：基础内容 + 分级语料 + 云端共享，按阶段 level 解锁，库随进度长大 */
if (window.DailyEngine && window.DailyEngine.loadDailyReading) {
  window.DailyEngine.loadDailyReading().then(function () { render(); }).catch(function (e) {
    console.error("阅读动态加载失败：", e);
  });
}
if (window.DailyEngine && window.DailyEngine.loadDailyGrammar) {
  window.DailyEngine.loadDailyGrammar().then(function () { render(); }).catch(function (e) {
    console.error("语法动态加载失败：", e);
  });
}
/* 用法（短语动词）同样动态装配：基础种子 + 云端共享 __global_phrasals__，可随时增删、不写死 */
if (window.DailyEngine && window.DailyEngine.loadDailyPhrasals) {
  window.DailyEngine.loadDailyPhrasals().then(function () { render(); }).catch(function (e) {
    console.error("用法动态加载失败：", e);
  });
}
/* 语法测验换题库：云端 __global_gquiz__，用于「答对过的原题→换题」，保证不复重 */
if (window.DailyEngine && window.DailyEngine.loadDailyGQuiz) {
  window.DailyEngine.loadDailyGQuiz().then(function () { render(); }).catch(function (e) {
    console.error("语法换题库加载失败：", e);
  });
}
/* 词源同样动态：预载全站共享词源缓存（其他用户抓过的直接复用），
   页面打开后再按需从 Wiktionary 实时抓取新词词源 —— 不再固定 253 个 */
if (window.Etym && window.Etym.loadShared) {
  window.Etym.loadShared().then(function () { render(); }).catch(function (e) {
    console.error("共享词源预载失败：", e);
  });
}

/* =====================================================================
   云端账号：登录 / 注册 / 退出（进度存 Supabase，换设备接着学）
   ===================================================================== */
/* 登录后拉取该用户整包进度（档案清单 + 当前档案 + 学习数据）并应用 */
async function bootstrapCloud() {
  if (!window.CloudSync || !window.CloudSync.user) return;
  try {
    const data = await window.CloudSync.loadProgress(window.CloudSync.user.id);
    if (data && adoptCloud(data)) render();
  } catch (e) { console.error("云端恢复失败：", e); }
}

/* 从后端拉取内容并覆盖本地数组（单词/口语/阅读/语法）。
   后端表不存在或出错时 loadContent 返回 null，这里直接跳过，继续用本地内容。 */
async function bootstrapContent() {
  try {
    const c = await window.CloudSync.loadContent();
    if (!c) return;
    // 注意：单词不在此处覆盖，由 daily.js 统一装配（避免被覆盖）
    if (c.content_phrases && c.content_phrases.length) PHRASES = c.content_phrases;
    if (c.content_reading && c.content_reading.length) READING = c.content_reading;
    if (c.content_grammar && c.content_grammar.length) GRAMMAR = c.content_grammar;
    render();
  } catch (e) { console.error("内容加载失败：", e); }
}

/* 打开登录/注册弹窗；已登录则打开账号卡片 */
function openCloudModal() {
  if (!(window.CloudSync && window.CloudSync.enabled)) {
    alert("云端同步尚未启用（需要在 cloud-config.js 配置 Supabase 后才会生效）。");
    return;
  }
  if (window.CloudSync.user) { showCloudAccount(); return; }

  const mask = document.createElement("div");
  mask.className = "modal-mask";
  mask.innerHTML =
    '<div class="modal cloud-modal">' +
      '<button class="modal-x" data-close="1">×</button>' +
      '<h3>☁ 云端同步</h3>' +
      '<p class="muted">注册一个账号，学习进度就会存到云端，换手机 / 电脑登录同一账号即可接着学。</p>' +
      '<div class="seg">' +
        '<button class="seg-btn active" data-tab="login">登录</button>' +
        '<button class="seg-btn" data-tab="signup">注册</button>' +
      '</div>' +
      '<input id="cemail" class="modal-input" type="email" placeholder="邮箱" autocomplete="email">' +
      '<input id="cpwd" class="modal-input" type="password" placeholder="密码（至少 6 位）" autocomplete="current-password">' +
      '<button id="csubmit" class="modal-btn">登录</button>' +
      '<div id="cmsg" class="modal-msg"></div>' +
    '</div>';
  document.body.appendChild(mask);
  const close = function () { mask.remove(); };
  mask.addEventListener("click", function (e) {
    if (e.target === mask || e.target.dataset.close) close();
  });
  let tab = "login";
  mask.querySelectorAll(".seg-btn").forEach(function (b) {
    b.onclick = function () {
      tab = b.dataset.tab;
      mask.querySelectorAll(".seg-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
      document.getElementById("csubmit").textContent = tab === "login" ? "登录" : "注册";
      document.getElementById("cmsg").textContent = "";
    };
  });
  function switchTab(t) {
    tab = t;
    mask.querySelectorAll(".seg-btn").forEach(function (x) { x.classList.toggle("active", x.dataset.tab === t); });
    document.getElementById("csubmit").textContent = t === "login" ? "登录" : "注册";
    document.getElementById("cmsg").textContent = "";
  }
  document.getElementById("csubmit").onclick = async function () {
    const email = (document.getElementById("cemail").value || "").trim();
    const pwd = document.getElementById("cpwd").value || "";
    const msg = document.getElementById("cmsg");
    if (!email || !pwd) { msg.textContent = "请填写邮箱和密码"; return; }
    msg.textContent = "处理中…";
    if (tab === "signup") {
      const sr = await window.CloudSync.signup(email, pwd);
      if (!sr.ok) { msg.textContent = sr.msg || "注册失败"; return; }
      if (sr.needConfirm) {
        msg.textContent = "注册成功！请先到邮箱点击验证链接，再回来登录。";
        switchTab("login");
        return;
      }
      // 注册成功且无需验证 → 自动登录，免去二次操作
      const lr = await window.CloudSync.login(email, pwd);
      if (lr.ok) { close(); await bootstrapCloud(); render(); return; }
      msg.textContent = lr.msg || "注册成功，请直接登录";
      switchTab("login");
      return;
    }
    const r = await window.CloudSync.login(email, pwd);
    if (r.ok) { close(); await bootstrapCloud(); render(); }
    else { msg.textContent = r.msg || "操作失败，请重试"; }
  };
}

/* 已登录：账号卡片 + 退出 */
function showCloudAccount() {
  const mask = document.createElement("div");
  mask.className = "modal-mask";
  mask.innerHTML =
    '<div class="modal cloud-modal">' +
      '<button class="modal-x" data-close="1">×</button>' +
      '<h3>☁ 已同步到云端</h3>' +
      '<p>当前账号：<b>' + (window.CloudSync.user.email || "已登录") + '</b></p>' +
      '<p class="muted">学习进度会自动存到云端；换设备登录同一账号即可接着学。本地进度也会同时保留。</p>' +
      '<button id="clogout" class="modal-btn">退出登录</button>' +
    '</div>';
  document.body.appendChild(mask);
  const close = function () { mask.remove(); };
  mask.addEventListener("click", function (e) {
    if (e.target === mask || e.target.dataset.close) close();
  });
  document.getElementById("clogout").onclick = function () {
    window.CloudSync.logout();
    close();
    render();
  };
}
/* ==================== 拼句打字 ====================
   玩法（参考句乐部）：显示中文句子 → 逐词敲出英文 →
   拼对的词变成带成分标签/音标/释义的彩色卡片 → 整句拼完 Perfect + ⭐。
   句库来自 js/sentences.js（make_sentences.py 用 AI 生成）。 */
var stList = [];     // 本轮句子队列
var stIdx = 0;       // 当前第几句
var stDone = [];     // 本句已拼对的卡片下标
var stCombo = 0;     // 当前连对（跨句累计，出错清零）
var stPerfect = 0;   // 本轮 Perfect 次数
var stRoundScore = 0;// 本轮得分
var stFinished = false;  // 当前句是否拼完
var stErrThis = 0;   // 本句错误次数

function stRoleClass(role) {
  return { "主语": "st-subj", "谓语": "st-pred", "宾语": "st-obj",
           "定语": "st-attr", "状语": "st-adv", "补语": "st-comp" }[role] || "st-other";
}

function startSentRound() {
  if (typeof SENTENCES === "undefined" || !SENTENCES.length) {
    alert("句库还没加载出来，请刷新页面重试"); return;
  }
  stList = SENTENCES.slice().sort(() => Math.random() - .5).slice(0, 8);
  stIdx = 0; stCombo = 0; stPerfect = 0; stRoundScore = 0;
  stDone = []; stFinished = false; stErrThis = 0;
  render();
}

/* 显示答案：把当前词直接填成卡片（看过答案不算连对、也没有 Perfect 加成） */
function showSentAnswer() {
  if (!stList.length || stFinished) return;
  const s = stList[stIdx];
  const cur = s.words[stDone.length];
  if (!cur) return;
  stDone.push(stDone.length);
  stCombo = 0; stErrThis++;
  if (stDone.length >= s.words.length) {
    stFinished = true;
    S.stars++;
    try {
      if (!Array.isArray(S.sentDone)) S.sentDone = [];
      if (S.sentDone.indexOf(s.id) < 0) S.sentDone.push(s.id);
    } catch (e) {}
    save();
  }
  render();
}

function sentNext() {
  if (!stList.length) return;
  if (stIdx >= stList.length - 1) { stIdx = stList.length; render(); return; }  // 本轮结束
  stIdx++;
  stDone = []; stFinished = false; stErrThis = 0;
  render();
}

/* 实时输入：前缀对 → 正常；不对 → 红色提示（不重渲染，避免失焦） */
function onSentType(inp) {
  const cur = stList[stIdx] && stList[stIdx].words[stDone.length];
  if (!cur) return;
  const v = inp.value.trimStart();
  const ok = cur.w.toLowerCase().startsWith(v.toLowerCase());
  inp.classList.toggle("st-bad", v.length > 0 && !ok);
  inp.classList.toggle("st-good", ok && v.length > 0);
}

/* 回车提交当前词卡 */
function submitSentWord(inp) {
  if (!stList.length || stFinished) return;
  const s = stList[stIdx];
  const cur = s.words[stDone.length];
  if (!cur) return;
  const v = (inp.value || "").trim();
  if (!v) return;
  if (v.toLowerCase() === cur.w.toLowerCase()) {
    stDone.push(stDone.length);
    stCombo++;
    stRoundScore += 10 + Math.min(stCombo, 10) * 2;
    if (stDone.length >= s.words.length) {
      // 整句拼完：Perfect（零失误额外加分）+ ⭐ + 记录
      stFinished = true;
      if (stErrThis === 0) { stPerfect++; stRoundScore += 50; }
      S.stars++;
      try {
        if (!Array.isArray(S.sentDone)) S.sentDone = [];
        if (S.sentDone.indexOf(s.id) < 0) S.sentDone.push(s.id);
      } catch (e) {}
      save();
    }
    render();
  } else {
    stCombo = 0; stErrThis++;
    inp.classList.remove("st-good");
    inp.classList.add("st-shake");
    setTimeout(() => inp && inp.classList && inp.classList.remove("st-shake"), 450);
    inp.value = ""; onSentType(inp);
  }
}

function viewSent() {
  if (!stList.length) {
    const doneCnt = Array.isArray(S.sentDone) ? S.sentDone.length : 0;
    const total = typeof SENTENCES !== "undefined" ? SENTENCES.length : 0;
    return `
    <div class="card sent-intro">
      <h3>🧩 拼句打字</h3>
      <p>看<b>中文句子</b>和<b>音标提示</b>，把英文<b>一个词一个词敲出来</b>。每敲对一个词，它就变成一张彩色卡片，
      上面标着这个词的<b>句子成分</b>（主语/谓语/宾语…）、<b>音标</b>和<b>意思</b> ——
      一句话拼完，语法结构自然就看懂了。</p>
      <p class="muted"><b>想不到的词不用怕</b>：随时点下面的「显示答案」先过，看多了自然会。
      连着不出错有 Perfect 加成；整句拼完 +1 ⭐。已解锁 ${doneCnt}/${total} 句。</p>
      <button class="btn primary" data-act="stStart">开始本轮（8 句）→</button>
    </div>`;
  }
  if (stIdx >= stList.length) {
    return `
    <div class="card sent-intro sent-done-card">
      <h3>🎉 本轮完成！</h3>
      <p class="st-big-score">${stRoundScore} <span>分</span></p>
      <p>Perfect ×${stPerfect} · 一共 +${stList.length} ⭐</p>
      <button class="btn primary" data-act="stStart">再来一轮 →</button>
    </div>`;
  }

  const s = stList[stIdx];
  const words = s.words;
  const cur = words[stDone.length];
  const pct = ((stIdx + (stFinished ? 1 : 0)) / stList.length) * 100;

  // 已拼好的卡片流
  const chipsHtml = words.map((w, i) => {
    if (i < stDone.length || stFinished) {
      return `<span class="st-chip ${stRoleClass(w.role)}">
        <b class="st-role">${w.role}</b>
        <i class="st-ipa">${w.ipa || ""}</i>
        <span class="st-w">${esc(w.w)}</span>
        <span class="st-wcn">${esc(w.cn)}</span>
      </span>`;
    }
    if (i === stDone.length && !stFinished) {
      return `<span class="st-chip st-cur">
        <b class="st-role">${w.role}</b>
        <i class="st-ipa">${w.ipa || ""}</i>
        <input id="stInput" class="st-input" autocomplete="off" autocapitalize="off"
               spellcheck="false" placeholder="输入英文" data-act="stinput">
        <span class="st-wcn">${esc(w.cn)}</span>
      </span>`;
    }
    return "";
  }).join("");

  // 底部按钮栏（句乐部同款：可鼠标点，也可用快捷键）
  const btnBar = `
    <div class="st-keys">
      <button class="st-key" data-act="stSay"><kbd>Ctrl 1</kbd> 播放发音</button>
      <button class="st-key" data-act="stSubmit"><kbd>Enter</kbd> 提交</button>
      <button class="st-key" data-act="stHint"><kbd>Ctrl ;</kbd> 显示答案</button>
      <button class="st-key" data-act="stAgain"><kbd>Ctrl R</kbd> 重打本句</button>
    </div>`;

  return `
  <div class="st-head">
    <div class="bar st-bar"><i style="width:${pct}%"></i></div>
    <span class="st-count">第 ${stIdx + 1}/${stList.length} 句</span>
    <span class="st-score">⭐ ${stRoundScore}</span>
  </div>

  <div class="card st-stage">
    <div class="st-combo">${stCombo >= 2 ? `🔥 连对 ×${stCombo}` : "&nbsp;"}</div>
    <div class="st-chips ${stFinished ? "st-all-done" : ""}">${chipsHtml}</div>
    ${stFinished ? `
      <div class="st-perfect">${stErrThis === 0 ? (stCombo >= 3 ? `Perfect ×${stCombo}` : "Perfect!") : "拼完啦！"}</div>
      <p class="st-cn-final">${esc(s.cn)}</p>
      <div class="ctrls">
        <button class="btn primary" data-act="stNext">${stIdx >= stList.length - 1 ? "看本轮结果 →" : "下一句 →"}</button>
      </div>
    ` : `
      <p class="st-cn">📝 ${esc(s.cn)}</p>
      <p class="muted st-hint">照着中文和音标敲当前词，<b>想不到就点「显示答案」</b>，先看几遍自然就会了</p>
    `}
    ${btnBar}
  </div>`;
}
