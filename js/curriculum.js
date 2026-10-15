/* =====================================================================
   学习方案引擎（内部使用，不向用户展示整条路线）
   ---------------------------------------------------------------------
   把"从零基础 → 能开口和外国人交流"拆成一条有顺序的路径：每个阶段
   规定了**每天练几个词**、**练哪几节语法**、**练哪几句口语**，以及
   **进入下一阶段需要的已掌握词数**。

   为什么要藏起来：一上来就告诉零基础的人"你要学 10 个阶段、几百个词"，
   只会吓退人。所以引擎只在后台决定"今天学什么"，用户看到的永远只是
   当天的一小步。
   ===================================================================== */

var CURRICULUM = [
  { id: "s1",  wpd: 6,  grammar: [0],          phrases: [0, 1, 2],           need: 6,
    goal: "能打招呼、说出我是谁" },
  { id: "s2",  wpd: 6,  grammar: [1, 2],       phrases: [3, 4, 5, 6],       need: 16,
    goal: "能介绍自己：名字、国籍、来自哪里" },
  { id: "s3",  wpd: 6,  grammar: [3],          phrases: [7, 8, 9, 10],      need: 28,
    goal: "能说年龄和职业，能说每天做什么" },
  { id: "s4",  wpd: 8,  grammar: [4],          phrases: [11, 12],           need: 44,
    goal: "能说出「这里有什么」，能道别和祝福" },
  { id: "s5",  wpd: 8,  grammar: [5],          phrases: [13, 14, 15],       need: 62,
    goal: "能说东西在哪、什么时候做，能开口求助" },
  { id: "s6",  wpd: 8,  grammar: [6],          phrases: [16, 17, 18],       need: 82,
    goal: "能说「正在做」，能买东西、问价格、付款" },
  { id: "s7",  wpd: 8,  grammar: [7],          phrases: [19, 20],           need: 104,
    goal: "能讲昨天发生的事" },
  { id: "s8",  wpd: 10, grammar: [8],          phrases: [21, 22, 23],       need: 128,
    goal: "能表达「能不能 / 可不可以」" },
  { id: "s9",  wpd: 10, grammar: [9],          phrases: [24, 25],           need: 152,
    goal: "会提问，能和对方一问一答聊下去" },
  { id: "s10", wpd: 10, grammar: [10, 11],     phrases: [26, 27, 28],       need: 178,
    goal: "会用冠词和比较级，把事物说得更清楚" },
  { id: "s11", wpd: 10, grammar: [12, 13],     phrases: [29, 30, 31],       need: 206,
    goal: "能聊频率、能说将来的打算" },
  { id: "s12", wpd: 12, grammar: [14, 15],     phrases: [32, 33, 34],       need: 238,
    goal: "能用完成时聊经历，能提建议" },
  { id: "s13", wpd: 12, grammar: [16, 17],     phrases: [35, 36, 37],       need: 240,
    goal: "能用连词把句子连起来，能说数量多少" },
  { id: "s14", wpd: 12, grammar: [18, 19],     phrases: [38, 39, 40],       need: 0,
    goal: "自由交流：把学过的词和句型组合起来聊任何话题，并开始读短文" }
];

var Curriculum = {
  stages: CURRICULUM,

  /* 当前处在第几阶段。
     mastered    已掌握（连对 3 次）的词数
     grammarDone 函数：lessonIdx -> 是否已通过该课测验
     规则：词数够了、且本阶段语法过关 → 进入下一阶段；
           词数远超门槛（1.5 倍）时，即使语法没做也放行，避免卡死。 */
  stageIndex: function (mastered, grammarDone) {
    const m = Math.max(0, mastered | 0);
    const done = typeof grammarDone === "function" ? grammarDone : function () { return false; };
    for (let i = 0; i < CURRICULUM.length - 1; i++) {
      const st = CURRICULUM[i];
      if (m < st.need) return i;
      const gOK = st.grammar.every(function (g) { return done(g); });
      if (!gOK && m < Math.round(st.need * 1.5)) return i;
    }
    return CURRICULUM.length - 1;
  },

  /* 今天的安排：练多少词、上哪几节语法、练哪几句口语 */
  today: function (mastered, grammarDone) {
    const i = this.stageIndex(mastered, grammarDone);
    const st = CURRICULUM[i];
    const prev = i > 0 ? CURRICULUM[i - 1] : null;
    const from = prev ? prev.need : 0;
    const span = Math.max(1, st.need - from);
    const pct = st.need > 0 ? Math.max(0, Math.min(100, Math.round((mastered - from) / span * 100))) : 100;
    return {
      index: i,
      stage: st,
      wpd: st.wpd,                 // 每天练几个词 → 直接驱动每日目标
      grammar: st.grammar.slice(),
      phrases: st.phrases.slice(),
      goal: st.goal,
      stagePct: pct,               // 本阶段完成度（仅内部用）
      remaining: st.need > 0 ? Math.max(0, st.need - mastered) : 0
    };
  },

  /* 还没安排过的语法课 / 口语（供"今天建议"用） */
  pendingLessons: function (grammarDone) {
    const done = typeof grammarDone === "function" ? grammarDone : function () { return false; };
    const out = [];
    CURRICULUM.forEach(function (st) {
      st.grammar.forEach(function (g) { if (!done(g) && out.indexOf(g) < 0) out.push(g); });
    });
    return out;
  }
};
