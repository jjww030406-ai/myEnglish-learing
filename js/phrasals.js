// 用法 · 短语动词（phrasal verbs）种子库：动词 + 小品词组合表达的意思。
// 零基础最容易卡的一类——单个词都认识，组合在一起就不懂（look for / get up / turn on…）。
// 这些是离线兜底；运行时 daily.js 会从云端 __global_phrasals__ 拉取（可随时增删，不写死在代码里）。
// 字段：phrase=短语动词, cn=中文意思, ex=英文例句, exCn=例句翻译, level=难度(1~3), note=用法提示(可选)
var PHRASALVERBS = [
  { phrase: "get up",        cn: "起床",            ex: "I get up at seven every day.",            exCn: "我每天七点起床。",              level: 1 },
  { phrase: "wake up",       cn: "醒来",            ex: "The baby wakes up early.",                exCn: "宝宝醒得很早。",                level: 1 },
  { phrase: "go to bed",     cn: "去睡觉",          ex: "I go to bed at ten.",                     exCn: "我十点去睡觉。",                level: 1 },
  { phrase: "look for",      cn: "寻找",            ex: "He is looking for his book.",             exCn: "他在找他的书。",                level: 1, note: "进行时变 looking for；宾语放后面：look for sth" },
  { phrase: "look after",    cn: "照顾",            ex: "She looks after her sister.",             exCn: "她照顾她的妹妹。",              level: 1, note: "after 后面接被照顾的人/物" },
  { phrase: "turn on",       cn: "打开（电器等）",  ex: "Turn on the light, please.",              exCn: "请把灯打开。",                   level: 1 },
  { phrase: "turn off",      cn: "关掉",            ex: "Turn off the TV before bed.",             exCn: "睡前关掉电视。",                level: 1 },
  { phrase: "put on",        cn: "穿上",            ex: "Put on your coat. It is cold.",           exCn: "穿上你的外套，天冷了。",        level: 1 },
  { phrase: "take off",      cn: "脱下；起飞",      ex: "Take off your shoes at the door.",        exCn: "在门口脱下你的鞋。",            level: 1 },
  { phrase: "pick up",       cn: "捡起；接（人）",  ex: "Pick up the pen on the floor.",           exCn: "把地上的笔捡起来。",            level: 1 },
  { phrase: "sit down",      cn: "坐下",            ex: "Please sit down and relax.",              exCn: "请坐下休息一下。",              level: 1 },
  { phrase: "stand up",      cn: "起立",            ex: "Stand up when the teacher comes.",        exCn: "老师进来时请起立。",            level: 1 },
  { phrase: "come in",       cn: "进来",            ex: "Come in! The door is open.",              exCn: "进来！门开着呢。",              level: 1 },
  { phrase: "come back",     cn: "回来",            ex: "He comes back at six.",                   exCn: "他六点回来。",                  level: 1 },
  { phrase: "go out",        cn: "出去；外出",      ex: "They go out on weekends.",                exCn: "他们周末出去玩。",              level: 2 },
  { phrase: "find out",      cn: "查明；弄清",      ex: "I want to find out the truth.",           exCn: "我想弄清真相。",                level: 2, note: "out 后面接答案/真相类词" },
  { phrase: "give up",       cn: "放弃",            ex: "Don't give up! You can do it.",           exCn: "别放弃！你能做到的。",          level: 2, note: "up 后面可接 doing：give up smoking" },
  { phrase: "hurry up",      cn: "快点",            ex: "Hurry up, we are late.",                  exCn: "快点，我们迟到了。",            level: 1 },
  { phrase: "grow up",       cn: "长大",            ex: "I grew up in a small town.",              exCn: "我在一个小镇长大。",            level: 2 },
  { phrase: "eat out",       cn: "下馆子；在外吃",  ex: "We eat out on Sundays.",                   exCn: "我们周日下馆子。",              level: 2 },
  { phrase: "clean up",      cn: "收拾干净",        ex: "Clean up your room, please.",             exCn: "请把你的房间收拾干净。",        level: 2 },
  { phrase: "calm down",     cn: "冷静下来",        ex: "Calm down and tell me.",                  exCn: "冷静下来告诉我。",              level: 2 },
  { phrase: "put away",      cn: "收好；放好",      ex: "Put away your books after class.",        exCn: "课后把你的书收好。",            level: 2 },
  { phrase: "take care of",  cn: "照顾；保管",      ex: "Take care of yourself.",                  exCn: "照顾好自己。",                  level: 2 },
  { phrase: "look forward to", cn: "期待",          ex: "I look forward to your reply.",           exCn: "我期待你的回复。",              level: 3, note: "to 后面接名词或动名词：look forward to meeting you" },
  { phrase: "turn up",       cn: "调大；出现",      ex: "Turn up the radio a little.",             exCn: "把收音机调大一点。",            level: 3 },
  { phrase: "set up",        cn: "建立；组装",      ex: "We set up a tent by the lake.",           exCn: "我们在湖边搭起帐篷。",          level: 3 },
  { phrase: "run into",      cn: "偶遇",            ex: "I ran into my old friend.",               exCn: "我偶遇了我的老朋友。",          level: 3 },
  { phrase: "figure out",    cn: "弄明白；想出",    ex: "I can't figure it out.",                  exCn: "我弄不明白这件事。",            level: 3 },
  { phrase: "check in",      cn: "办理入住/登机",  ex: "We check in at the hotel at three.",       exCn: "我们三点在酒店办理入住。",      level: 3 }
];
