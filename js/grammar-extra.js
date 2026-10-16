/* 扩展语法课（在 20 节基础课之外，按 level 1–14 分级的进阶课）。
   字段与 grammar.js 一致：level=所需阶段 t=标题 s=讲解 b=规则 why=原因 ex=例句 quiz=测验。
   用途：viewGrammar 按用户阶段 level 解锁，这里新增的课自动进入对应阶段；
   新课文同时写进 Supabase 共享，所有用户都能学。想继续扩充往这里加条目即可。 */
var GRAMMAR_EXTRA = [
  { level: 2, t: "第21课：名词所有格 's",
    s: "表示「谁的」，在人或动物名字后加 's。",
    b: [
      "Tom's book = 汤姆的书（在 Tom 后加 's）",
      "复数以 s 结尾加 '：the teachers' room 老师们的房间",
      "无生命的东西常用 of：the door of the room 房间的门"
    ],
    why: "中文说「我的书」，英文用 's 把所属关系挂在名词上，这是英语表达「所属」最常用的方式。",
    ex: [["This is Mary's cat.", "这是玛丽的猫。"], ["The dog's name is Max.", "狗的名字叫马克斯。"]] },
  { level: 3, t: "第22课：一般过去时（规则动词）",
    s: "表示过去发生的动作，规则动词加 -ed。",
    b: [
      "work → worked，play → played，like → liked",
      "以 e 结尾加 -d：live → lived",
      "辅音+y 结尾变 i 加 -ed：study → studied",
      "否定用 didn't + 动词原形：I didn't watch TV."
    ],
    why: "中文用「昨天/了」表示过去，英文靠动词变形（-ed）或 did 来标记时间，这是英语时态的核心。",
    ex: [["We walked to school yesterday.", "我们昨天走路去学校。"], ["She cleaned her room.", "她打扫了房间。"]] },
  { level: 4, t: "第23课：常见不规则过去式",
    s: "高频动词过去式不按规则，需单独记。",
    b: [
      "go → went，come → came，see → saw",
      "eat → ate，drink → drank，write → wrote",
      "get → got，have → had，is/am → was，are → were"
    ],
    why: "这些是最常用的动词，变形不规则但必须记住，否则过去时句子说不出来。",
    ex: [["He went home at nine.", "他九点回家了。"], ["I saw a dog in the park.", "我在公园看见一只狗。"]] },
  { level: 6, t: "第24课：一般将来时 will / be going to",
    s: "表示将来，will + 动词原形，或 be going to + 动词。",
    b: [
      "I will call you tomorrow. 我明天给你打电话。",
      "It is going to rain. 要下雨了（有迹象）。",
      "will 表打算/预测，be going to 表已有计划或迹象"
    ],
    why: "中文用「将/要」表将来，英文用 will 或 be going to 标记，是开口聊计划必备。",
    ex: [["We will visit Beijing next year.", "我们明年参观北京。"], ["She is going to buy a book.", "她打算买本书。"]] },
  { level: 7, t: "第25课：情态动词 can / must / should",
    s: "情态动词后接动词原形，表能力、必须、建议。",
    b: [
      "can = 能：I can swim. 我会游泳。",
      "must = 必须：You must wear a coat. 你必须穿外套。",
      "should = 应该：You should read more. 你应该多读。"
    ],
    why: "情态动词让句子表达「能不能/该不该」，是提建议、请求的关键，且永远跟原形。",
    ex: [["Can you help me?", "你能帮我吗？"], ["We should save water.", "我们应该节约水。"]] },
  { level: 9, t: "第26课：现在完成时 have/has + done",
    s: "表示过去发生、和现在有关的事，have/has + 过去分词。",
    b: [
      "I have finished my work. 我做完工作了。",
      "He has been to Paris. 他去过巴黎。",
      "强调「经历/结果」，不强调具体时间"
    ],
    why: "中文「我去过」对应英文完成时，它连接过去和现在，是聊经历最常用的时态。",
    ex: [["I have read this book.", "我读过这本书。"], ["She has lost her key.", "她丢了钥匙（现在还没找到）。"]] },
  { level: 11, t: "第27课：比较级与最高级",
    s: "比较两者用 -er/more，三者以上用 -est/most。",
    b: [
      "tall → taller → tallest 高/更高/最高",
      "多音节用 more/most：more beautiful 更美",
      "不规则：good→better→best，bad→worse→worst"
    ],
    why: "聊事物差异时必用比较级，英文靠词尾变化或 more/most，是描述世界的核心工具。",
    ex: [["This book is better than that one.", "这本书比那本好。"], ["He is the tallest in class.", "他是班里最高的。"]] },
  { level: 13, t: "第28课：if 条件句（真实条件）",
    s: "表「如果…就…」，if + 现在时，主句用将来时。",
    b: [
      "If it rains, we will stay home. 如果下雨我们就待在家。",
      "主句可用祈使：If you are tired, rest. 累了就休息。",
      "if 从句用现在时表将来"
    ],
    why: "真实条件句让你表达假设和后果，是逻辑交流的基础句式。",
    ex: [["If you study, you will pass.", "如果你学，就会通过。"], ["If we are late, call me.", "如果我们迟到，打电话给我。"]] },
  { level: 14, t: "第29课：被动语态 be + done",
    s: "强调动作承受者，be + 过去分词。",
    b: [
      "主动：They build the house. 他们建房子。",
      "被动：The house is built by them. 房子被他们建。",
      "时态随 be 变化：was/were built, will be built"
    ],
    why: "当你不知道或不必说「谁做的」，被动语态让句子更客观，新闻和说明文常用。",
    ex: [["English is spoken worldwide.", "英语被全世界使用。"], ["The letter was written yesterday.", "信是昨天写的。"]] }
];
