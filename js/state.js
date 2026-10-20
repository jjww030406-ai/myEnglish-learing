/* ===== 存储层（必须放在最前面！）=====
   有些环境下 localStorage 完全不可用：
     · 沙箱 iframe（缺少 allow-same-origin）
     · 隐私/无痕模式
     · file:// 协议下某些浏览器设置
   访问 localStorage 这个"属性本身"就会抛异常，所以必须包在最内层 try 里。
   不可用时自动降级为「内存存储」：本次使用完全正常，只是关掉页面后不保留进度。

   ⚠️ 这段必须定义在所有"读取存储"的代码之前。const 是有暂时性死区的：
   如果 S = load() 写在 store 定义之前，store.get 会抛 ReferenceError，
   被 try/catch 吞掉后进度就会"永远读不出来"——表现为每次刷新进度清零。
=========================================== */
const store = (function () {
  const mem = {};
  let available = true;
  try {
    const probe = "__en_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch (e) {
    available = false;
  }
  return {
    available,
    get(k) {
      if (!available) return k in mem ? mem[k] : null;
      try { return window.localStorage.getItem(k); } catch (e) { return null; }
    },
    set(k, v) {
      if (!available) { mem[k] = v; return; }
      try { window.localStorage.setItem(k, v); }
      catch (e) { mem[k] = v; }              // 空间满/被拒 → 退回内存
    },
    del(k) {
      if (!available) { delete mem[k]; return; }
      try { window.localStorage.removeItem(k); } catch (e) {}
    }
  };
})();

/* =====================================================================
   用户档案（多用户）
   ---------------------------------------------------------------------
   同一台电脑可以给多个人用（一家人、共用电脑），每个人的学习进度
   完全独立保存，互不影响。
     · 档案清单存在 english_profiles_v1
     · 当前档案 id 存在 english_profile_current_v1
     · 进度键：默认档案沿用老的 english_learning_v1（保证老进度不丢），
       其他档案用 english_learning_v1__<id>
   ===================================================================== */
const PROFILE_LIST_KEY = "english_profiles_v1";
const PROFILE_CUR_KEY  = "english_profile_current_v1";
const PROG_PREFIX      = "english_learning_v1__";
const DEFAULT_PROFILE_ID = "default";

function _sub(key, dflt) {
  const v = store.get(key);
  return v === null || v === undefined ? (dflt === undefined ? null : dflt) : v;
}
function _put(key, val) { store.set(key, val); }
function newProfileId() {
  return "p" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}
/* 读出档案清单；第一次运行（或数据损坏）时自动建一个"我" */
function loadProfiles() {
  let list = null;
  try { list = JSON.parse(_sub(PROFILE_LIST_KEY)); } catch (e) { list = null; }
  if (!Array.isArray(list) || !list.length) {
    const def = [{ id: DEFAULT_PROFILE_ID, name: "我", goal: "日常交流", minutes: 15, createdAt: today() }];
    _put(PROFILE_LIST_KEY, JSON.stringify(def));
    _put(PROFILE_CUR_KEY, DEFAULT_PROFILE_ID);
    return def;
  }
  return sanitizeProfiles(list);
}
function saveProfiles() { _put(PROFILE_LIST_KEY, JSON.stringify(PROFILES)); }

let PROFILES = loadProfiles();
let profileId = _sub(PROFILE_CUR_KEY) || DEFAULT_PROFILE_ID;
if (!PROFILES.some(p => p.id === profileId)) profileId = PROFILES[0].id;
_put(PROFILE_CUR_KEY, profileId);

function curProfile() {
  return PROFILES.find(p => p.id === profileId) || PROFILES[0];
}
/* 某个档案用哪些存储键（第一个是"主键"）。默认档案优先用老的键，
   这样升级前已经存好的进度不会丢。 */
function keysFor(id) {
  if (id === DEFAULT_PROFILE_ID) return ["english_learning_v1", PROG_PREFIX + id];
  return [PROG_PREFIX + id];
}
/* 切换档案：把当前进度存好，再读新档案的进度 */
function switchProfile(id) {
  if (!PROFILES.some(p => p.id === id)) return false;
  save();                                   // 存到旧档案的键
  profileId = id;
  _put(PROFILE_CUR_KEY, id);
  KEY = keysFor(profileId)[0];
  S = load();
  view = "home";
  return true;
}
function addProfile(name, goal, minutes) {
  const id = newProfileId();
  PROFILES.push({
    id,
    name: (name && String(name).trim()) || ("学习者" + (PROFILES.length + 1)),
    goal: (goal && String(goal).trim()) || "日常交流",
    minutes: (typeof minutes === "number" && minutes > 0) ? minutes : 15,
    createdAt: today()
  });
  saveProfiles();
  return id;
}
/* 删除档案（连同它的进度）。最后一个档案不允许删。 */
function removeProfile(id) {
  if (PROFILES.length <= 1) return false;
  keysFor(id).forEach(k => { try { window.localStorage.removeItem(k); } catch (e) {} });
  PROFILES = PROFILES.filter(p => p.id !== id);
  saveProfiles();
  if (profileId === id) {
    profileId = PROFILES[0].id;
    _put(PROFILE_CUR_KEY, profileId);
    KEY = keysFor(profileId)[0];
    S = load();
    view = "home";
  }
  return true;
}

/* 全局状态 */
let KEY = keysFor(profileId)[0];
let S = load();
let view = "home";
let flip = false;
let qi = 0;         // 当前题号
let qiList = [];    // 本轮题目
let answeredIdx = -1; // 已作答的题号，-1 = 当前题未作答（用题号而非布尔，避免切页后状态残留）
let answeredPick = -1; // 本题选中的选项下标
let roundRight = 0;
let dailyGoal = 10;

/* 拼写练习状态 */
let curCard = null;   // 当前单词卡显示的词（缓存，保证详情面板和卡片一致）
let spInputFocusWanted = true;  // 是否自动聚焦拼写输入框
let spMode = "cn";       // cn=看中文拼 | letter=看首字母拼 | dict=听写(无中文)
let spWord = null;       // 当前单词对象
let spInput = "";        // 用户已输入的字母
let spChecked = false;  // 是否已判定
let spResult = null;    // true/false/null
let spReveal = 0;       // 已揭示的字母数
let spShowAnswer = false; // 是否已"亮出答案"（判定后 / 直接看答案后都要显示正确单词）
let spRetry = false;      // 看答案后是否进入"照着抄一遍"的重拼阶段
let spCursor = 0;         // 当前光标在第几格（可点击格子自由定位）
let spChars = [];         // 逐格字符：spChars[i] 为第 i 格的字母，空格为 ""
let spLastWrong = "";     // 上一次拼错的字母串（清空输入后仍要显示给用户看）
let spJustFixed = false;  // 本次是否"拼对了一个错题本里的词"（用于反馈提示已订正）
let spAssisted = false;   // 本次是否"看了答案才拼出来的"（不计入掌握度）
let spReview = false;     // 本轮是否为「每日复习」队列（做完要标记今天已复习）
let spScore = { r: 0, w: 0 };
let spQueue = [];        // 本轮题目队列
let spPos = 0;          // 当前题序号
let spListDone = false;

/* 语法课状态 */
let lessonIdx = null;   // 打开第几课；null = 课程列表
let gqIdx = 0;          // 当前正在做测验的课
let gqState = {};       // { 课号: {picks:[], right:n, done:bool, pastPerfect:bool} }
const GQ_KEY = "grammar_quiz_v1";
try { gqState = JSON.parse(store.get(GQ_KEY)) || {}; } catch (e) { gqState = {}; }

/* 从存储读取进度，并补齐旧版本缺失的字段。
   任何一条脏数据都不允许让整页崩溃 —— 最坏情况只是丢进度，不能白屏。
   normalize() 同时被「本地读取」和「云端恢复」复用。 */
function normalize(d) {
  const base = { learned: [], stars: 0, quizBest: 0, days: [], todayCount: 0,
                 todayWords: [], date: today(), wrongWords: [], wrongStats: {},
                 lastReview: "", reviewSeen: "", wordStats: {}, phraseDone: [],
                 dayList: [], dayListDate: "", dayExtra: 0, practiceLog: [] };
  if (!d || typeof d !== "object") return base;

  const arr = v => Array.isArray(v) ? v : [];
  const num = (v, dflt) => (typeof v === "number" && isFinite(v)) ? v : dflt;
  const str = (v, dflt) => (typeof v === "string" && v) ? v : dflt;

  const learnedArr = arr(d.learned).filter(x => typeof x === "string");
  // 今天具体学了哪些词：新字段。只对「从来没有过 todayWords 字段」的老数据做一次性迁移
  // —— 用已学会的词顶上，避免老用户清单空着。
  // ⚠️ 关键：字段存在但为空数组 [] 时（说明今天确实还没学），绝不能回填，否则
  // 「今日已学单词」会显示成累计数，造成「一打开网站就学了 N 个词」的错觉。
  let todayWords = arr(d.todayWords).filter(x => typeof x === "string");
  if (todayWords.length === 0 && d.todayWords === undefined && str(d.date, today()) === today() && learnedArr.length > 0) {
    todayWords = learnedArr.slice();
  }

  // 错词本：wrongWords 只存"曾经拼错过的词"（主清单）；
  // wrongStats 记录每个词的细节 —— 错了几次(n)、最后错于哪一天(last)、哪一天订正成功(fixed)。
  const wrongWords = arr(d.wrongWords).filter(x => typeof x === "string");
  let wrongStats = (d.wrongStats && typeof d.wrongStats === "object" && !Array.isArray(d.wrongStats)) ? d.wrongStats : {};
  const cleanStats = {};
  wrongWords.forEach(w => {
    const s = wrongStats[w];
    cleanStats[w] = {
      n:     (s && num(s.n, 1)) || 1,
      last:  (s && str(s.last, "")) || "",
      fixed: (s && str(s.fixed, "")) || ""
    };
  });
  // 老数据兼容：有错词但没细节 → 补一条默认记录，保证错题本页面能正常显示
  wrongWords.forEach(w => {
    if (!cleanStats[w]) cleanStats[w] = { n: 1, last: "", fixed: "" };
  });

  // 每词练习统计：seen(练过几次) / right(对) / wrong(错) / streak(连续对)
  //   / lastSeen(最后练习日期) / assisted(看答案后才拼对的次数)
  // 这是"自适应出题"的依据：连对越多越熟，越熟越少出现。
  const rawWS = (d.wordStats && typeof d.wordStats === "object" && !Array.isArray(d.wordStats)) ? d.wordStats : {};
  const wordStats = {};
  Object.keys(rawWS).forEach(k => {
    const s = rawWS[k];
    if (!s || typeof s !== "object") return;
    wordStats[k] = {
      seen:     num(s.seen, 0),
      right:    num(s.right, 0),
      wrong:    num(s.wrong, 0),
      streak:   num(s.streak, 0),
      lastSeen: str(s.lastSeen, ""),
      assisted: num(s.assisted, 0)
    };
  });

  /* 练习流水：最近 N 次作答的明细（日期 / 词 / 对错 / 是否看了答案 / 模式）。
     这是「自适应难度」判断你学得顺不顺的唯一依据 ——
     只看累计掌握词数是不够的：有人练得多但一直错，难度就不该往上走。 */
  const log = arr(d.practiceLog).filter(function (x) {
    return x && typeof x === "object" && typeof x.w === "string";
  }).map(function (x) {
    return {
      d: str(x.d, ""), w: x.w,
      ok: x.ok === true, as: x.as === true,
      m: str(x.m, "cn")
    };
  }).slice(-120);

  return {
    practiceLog: log,
    learned:   learnedArr,
    stars:     num(d.stars, 0),
    quizBest:  num(d.quizBest, 0),
    days:      arr(d.days).filter(x => typeof x === "string"),
    todayCount:num(d.todayCount, 0),
    todayWords,
    date:      str(d.date, today()),
    wrongWords,
    wrongStats: cleanStats,
    lastReview:str(d.lastReview, ""),
    reviewSeen:str(d.reviewSeen, ""),
    wordStats,
    // 口语：哪些句子已经标记「我会了」。存下标（数字），脏数据直接丢掉。
    phraseDone: arr(d.phraseDone).filter(x => typeof x === "number" && x >= 0 && x % 1 === 0),
    // 今日达标清单：当天开工时算一次，之后当天固定不变（见 app.js ensureDayList）
    dayList:     arr(d.dayList).filter(x => typeof x === "string"),
    dayListDate: str(d.dayListDate, ""),
    // 当天已经全部达标、又加练了几组 —— 记下前面几组的词数，达标数才不会归零
    dayExtra:    num(d.dayExtra, 0)
  };
}
/* 本地读取：从当前档案键反序列化并规范化 */
function load() {
  let d = null;
  try { d = JSON.parse(store.get(KEY)); } catch (e) { d = null; }
  return normalize(d);
}

/* 从云端恢复：env = { profiles, current, S }。成功返回 true。
   这样登录用户能把「多个档案 + 当前档案 + 进度」整体搬回另一台设备。 */
function adoptCloud(env) {
  if (!env || typeof env !== "object") return false;
  try {
    if (Array.isArray(env.profiles) && env.profiles.length) {
      PROFILES = sanitizeProfiles(env.profiles);
      profileId = (env.current && PROFILES.some(p => p.id === env.current))
        ? env.current : PROFILES[0].id;
      _put(PROFILE_LIST_KEY, JSON.stringify(PROFILES));
      _put(PROFILE_CUR_KEY, profileId);
    }
    S = normalize(env.S);
    KEY = keysFor(profileId)[0];
    checkDay();
    return true;
  } catch (e) { return false; }
}

/* 把档案数组清洗成合法结构（本地读取与云端恢复共用） */
function sanitizeProfiles(list) {
  let arr = null;
  try { arr = JSON.parse(typeof list === "string" ? list : JSON.stringify(list)); } catch (e) { arr = null; }
  if (!Array.isArray(arr) || !arr.length) {
    arr = [{ id: DEFAULT_PROFILE_ID, name: "我", goal: "日常交流", minutes: 15, createdAt: today() }];
  }
  arr = arr.filter(p => p && typeof p.id === "string").map(p => ({
    id: p.id,
    name: (typeof p.name === "string" && p.name) ? p.name : "学习者",
    goal: (typeof p.goal === "string" && p.goal) ? p.goal : "日常交流",
    minutes: (typeof p.minutes === "number" && isFinite(p.minutes)) ? p.minutes : 15,
    createdAt: (typeof p.createdAt === "string" && p.createdAt) ? p.createdAt : today()
  }));
  if (!arr.length) arr = [{ id: DEFAULT_PROFILE_ID, name: "我", goal: "日常交流", minutes: 15, createdAt: today() }];
  return arr;
}

function save() {
  store.set(KEY, JSON.stringify(S));
  // 云端同步（可选层）：配置了才推，且失败不影响本地保存。
  // 登录后按云端用户 id 存整包（档案清单 + 当前档案 + 进度），换设备接着学。
  try {
    if (window.CloudSync && window.CloudSync.enabled) {
      const key = (window.CloudSync.user && window.CloudSync.user.id) ? window.CloudSync.user.id : profileId;
      window.CloudSync.saveProgress(key, { profiles: PROFILES, current: profileId, S: S });
    }
  } catch (e) { /* 同步失败不阻断本地 */ }
}
function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function checkDay() {
  if (S.date !== today()) { S.date = today(); S.todayCount = 0; S.todayWords = []; }
  if (!Array.isArray(S.todayWords)) S.todayWords = [];
  if (!Array.isArray(S.wrongWords)) S.wrongWords = [];
  if (!S.wrongStats || typeof S.wrongStats !== "object" || Array.isArray(S.wrongStats)) S.wrongStats = {};
  if (!S.wordStats  || typeof S.wordStats  !== "object" || Array.isArray(S.wordStats))  S.wordStats  = {};
  if (!Array.isArray(S.days)) S.days = [];
  if (!S.days.includes(today())) S.days.push(today());
  if (S.days.length > 400) S.days = S.days.slice(-400);
}
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}