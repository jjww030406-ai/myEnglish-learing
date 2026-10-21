/* 新概念英语第一册 · 原创分级内容（NEW CONCEPT ENGLISH Book 1）
   ================================================================
   版权说明：新概念第一册（L.G. Alexander, 1967；外研社引进）仍在版权期内，
   本文件**不复制任何课文原文**。下面提供两部分：
     1) NC1_OUTLINE —— 公开公认的「课程语法/主题梯度」事实大纲（课号、语法点、核心词汇），
        属于可自由整理的事实信息；
     2) NC1_SENTENCES / NC1_READING —— 依据上述语法梯度**原创生成**的句子与短文，
        场景、人名、物品均为自创，仅复用相同的语法结构与基础词汇，用于站点练习。

   接入方式：本文件在 sentences.js / data.js 之后加载，把下面的原创内容并入
   全局 SENTENCES（拼句打字）与 READING（阅读），用户刷新即见。 */

/* ---------- 1) 课程语法梯度大纲（事实） ----------
   按语法阶段分组，覆盖新概念1册 1–144 课的核心梯度。 */
var NC1_OUTLINE = [
  { stage: 1,  lessons: "1–12",  grammar: "be 动词 + 人称/指示代词；a/an；一般疑问句；所有格；whose", vocab: "excuse, me, yes, is, this, your, handbag, pardon, it, thank, pen, book, watch, coat, dress, skirt, shirt, car, house" },
  { stage: 2,  lessons: "13–24", grammar: "名词复数；复数所有格；国籍/职业；双宾语 give；宾格", vocab: "colour, red, green, blue, yellow, brown, white, black, orange, grey, umbrella, please, here, my, ticket, number, cloak, suit, school, son, daughter" },
  { stage: 3,  lessons: "25–34", grammar: "介词 in/on；there is/are；现在进行时（单、复）", vocab: "kitchen, refrigerator, electric, cooker, cup, bottle, table, plate, cupboard, living room, window, armchair, door, picture, wall, garden, near, under, tree" },
  { stage: 4,  lessons: "35–46", grammar: "地点介词；祈使句；must；be going to；some/any", vocab: "village, valley, along, bank, water, building, park, into, child, cry, wash, type, letter, basket, bone, cheese, bread, soap, chocolate, sugar, coffee, tea" },
  { stage: 5,  lessons: "47–60", grammar: "不可数名词；量词；健康 have a cold；时间表达", vocab: "want, fresh, egg, butter, pure, honey, banana, jam, mince, steak, lamb, chicken, tell, truth, either, tobacco, chemist, temperature, flu, measles, mumps" },
  { stage: 6,  lessons: "61–70", grammar: "反身代词；一般现在时；一般过去时 be (was/were)", vocab: "feel, look, must, doctor, telephone, remember, mouth, tongue, terrible, headache, aspirin, ear, dentist, tooth, play, match, town, theatre, crowd, race, news" },
  { stage: 7,  lessons: "71–82", grammar: "一般过去时（规则/不规则）；have got；had", vocab: "awful, yesterday, buy, sell, week, Monday, Tuesday, Friday, Saturday, Sunday, stay, absent, keep, spend, weekend, crash, ship, boat, swim, holiday, sail, train" },
  { stage: 8,  lessons: "83–96", grammar: "现在完成时 have been/have done；直接/间接引语基础", vocab: "already, yet, leave, garage, try, carry, be, find, describe, belong, belong to, missing, label, handle, address, pence, return, train, platform, station, plenty" },
  { stage: 9,  lessons: "97–112", grammar: "宾语从句；程度副词 too/very/enough；比较级；最高级", vocab: "leave, describe, zip, label, handle, belong, leave, pocket, case, drop, slip, fall, downstairs, hurt, back, stand up, help, sure, as well, sell, cheap, expensive, save, penny" },
  { stage: 10, lessons: "113–128", grammar: "间接引语；定语从句（who/that）；现在完成时延续", vocab: "conductor, fare, change, note, passenger, none, tramp, except, knock, everybody, quiet, impossible, invite, joke, however, serve, actress, least, mile, speed, limit, dream, age" },
  { stage: 11, lessons: "129–144", grammar: "比较级/最高级复习；间接引语复习；综合巩固", vocab: "wave, on, track, metal, pole, flight, explorer, lie, lie down, dream, have a rest, run away, wake up, come along, stop, once, true story, woods, cross, through, trip" }
];

/* ---------- 2) 原创句子（拼句打字，SENTENCES 兼容格式） ----------
   依据大纲前 7 个阶段的语法梯度自创，场景/人名/物品均为原创，不复制课文。 */
var NC1_SENTENCES = [
  // 阶段1：be 动词 + 代词 + 所有格
  { id: "nc1_1", en: "I am a boy.", cn: "我是一个男孩。", words: [
    { w: "I", ipa: "/aɪ/", role: "主语", cn: "我" },
    { w: "am", ipa: "/æm/", role: "谓语", cn: "是" },
    { w: "a boy", ipa: "/ə/", role: "补语", cn: "一个男孩" } ] },
  { id: "nc1_2", en: "This is my book.", cn: "这是我的书。", words: [
    { w: "This", ipa: "/ðɪs/", role: "主语", cn: "这" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "my book", ipa: "/maɪ/", role: "宾语", cn: "我的书" } ] },
  { id: "nc1_3", en: "She is a nurse.", cn: "她是一名护士。", words: [
    { w: "She", ipa: "/ʃiː/", role: "主语", cn: "她" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "a nurse", ipa: "/ə/", role: "补语", cn: "一名护士" } ] },
  { id: "nc1_4", en: "He is my friend.", cn: "他是我的朋友。", words: [
    { w: "He", ipa: "/hiː/", role: "主语", cn: "他" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "my friend", ipa: "/maɪ/", role: "补语", cn: "我的朋友" } ] },
  { id: "nc1_5", en: "We are students.", cn: "我们是学生。", words: [
    { w: "We", ipa: "/wiː/", role: "主语", cn: "我们" },
    { w: "are", ipa: "/ɑː(r)/", role: "谓语", cn: "是" },
    { w: "students", ipa: "/ˈstjuːdənts/", role: "补语", cn: "学生" } ] },
  { id: "nc1_6", en: "They are teachers.", cn: "他们是老师。", words: [
    { w: "They", ipa: "/ðeɪ/", role: "主语", cn: "他们" },
    { w: "are", ipa: "/ɑː(r)/", role: "谓语", cn: "是" },
    { w: "teachers", ipa: "/ˈtiːtʃəz/", role: "补语", cn: "老师" } ] },
  { id: "nc1_7", en: "It is a cat.", cn: "它是一只猫。", words: [
    { w: "It", ipa: "/ɪt/", role: "主语", cn: "它" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "a cat", ipa: "/ə/", role: "补语", cn: "一只猫" } ] },
  { id: "nc1_8", en: "Whose pen is this?", cn: "这是谁的钢笔？", words: [
    { w: "Whose", ipa: "/huːz/", role: "定语", cn: "谁的" },
    { w: "pen", ipa: "/pen/", role: "主语", cn: "钢笔" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "this", ipa: "/ðɪs/", role: "补语", cn: "这" } ] },
  { id: "nc1_9", en: "These are my shoes.", cn: "这些是我的鞋。", words: [
    { w: "These", ipa: "/ðiːz/", role: "主语", cn: "这些" },
    { w: "are", ipa: "/ɑː(r)/", role: "谓语", cn: "是" },
    { w: "my shoes", ipa: "/maɪ/", role: "补语", cn: "我的鞋" } ] },

  // 阶段2：名词复数 / there be / 所有格
  { id: "nc1_10", en: "There is a book on the desk.", cn: "桌子上有一本书。", words: [
    { w: "There", ipa: "/ðeə(r)/", role: "主语", cn: "那里" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "有" },
    { w: "a book", ipa: "/ə/", role: "宾语", cn: "一本书" },
    { w: "on the desk", ipa: "/ɒn/", role: "状语", cn: "在桌子上" } ] },
  { id: "nc1_11", en: "There are two cups on the table.", cn: "桌上有两只杯子。", words: [
    { w: "There", ipa: "/ðeə(r)/", role: "主语", cn: "那里" },
    { w: "are", ipa: "/ɑː(r)/", role: "谓语", cn: "有" },
    { w: "two cups", ipa: "/tuː/", role: "宾语", cn: "两只杯子" },
    { w: "on the table", ipa: "/ɒn/", role: "状语", cn: "在桌上" } ] },
  { id: "nc1_12", en: "The cat's name is Mimi.", cn: "这只猫的名字叫咪咪。", words: [
    { w: "The cat's", ipa: "/kæts/", role: "定语", cn: "猫的" },
    { w: "name", ipa: "/neɪm/", role: "主语", cn: "名字" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "Mimi", ipa: "/ˈmiːmiː/", role: "补语", cn: "咪咪" } ] },
  { id: "nc1_13", en: "The children are in the park.", cn: "孩子们在公园里。", words: [
    { w: "The children", ipa: "/ˈtʃɪldrən/", role: "主语", cn: "孩子们" },
    { w: "are", ipa: "/ɑː(r)/", role: "谓语", cn: "在" },
    { w: "in the park", ipa: "/ɪn/", role: "状语", cn: "在公园里" } ] },
  { id: "nc1_14", en: "Her dress is red.", cn: "她的裙子是红色的。", words: [
    { w: "Her dress", ipa: "/hɜː(r)/", role: "主语", cn: "她的裙子" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "red", ipa: "/red/", role: "补语", cn: "红色的" } ] },
  { id: "nc1_15", en: "Where is the milk?", cn: "牛奶在哪里？", words: [
    { w: "Where", ipa: "/weə(r)/", role: "状语", cn: "在哪里" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "the milk", ipa: "/mɪlk/", role: "主语", cn: "牛奶" } ] },

  // 阶段3：现在进行时
  { id: "nc1_16", en: "I am reading a book.", cn: "我正在读一本书。", words: [
    { w: "I", ipa: "/aɪ/", role: "主语", cn: "我" },
    { w: "am reading", ipa: "/ˈriːdɪŋ/", role: "谓语", cn: "正在读" },
    { w: "a book", ipa: "/ə/", role: "宾语", cn: "一本书" } ] },
  { id: "nc1_17", en: "He is drinking water.", cn: "他正在喝水。", words: [
    { w: "He", ipa: "/hiː/", role: "主语", cn: "他" },
    { w: "is drinking", ipa: "/ˈdrɪŋkɪŋ/", role: "谓语", cn: "正在喝" },
    { w: "water", ipa: "/ˈwɔːtə(r)/", role: "宾语", cn: "水" } ] },
  { id: "nc1_18", en: "She is eating an apple.", cn: "她正在吃一个苹果。", words: [
    { w: "She", ipa: "/ʃiː/", role: "主语", cn: "她" },
    { w: "is eating", ipa: "/ˈiːtɪŋ/", role: "谓语", cn: "正在吃" },
    { w: "an apple", ipa: "/ˈæp(ə)l/", role: "宾语", cn: "一个苹果" } ] },
  { id: "nc1_19", en: "They are playing football.", cn: "他们正在踢足球。", words: [
    { w: "They", ipa: "/ðeɪ/", role: "主语", cn: "他们" },
    { w: "are playing", ipa: "/ˈpleɪɪŋ/", role: "谓语", cn: "正在踢" },
    { w: "football", ipa: "/ˈfʊtbɔːl/", role: "宾语", cn: "足球" } ] },
  { id: "nc1_20", en: "What are you doing?", cn: "你正在做什么？", words: [
    { w: "What", ipa: "/wɒt/", role: "宾语", cn: "什么" },
    { w: "are", ipa: "/ɑː(r)/", role: "谓语", cn: "在" },
    { w: "you", ipa: "/juː/", role: "主语", cn: "你" },
    { w: "doing", ipa: "/ˈduːɪŋ/", role: "补语", cn: "做" } ] },
  { id: "nc1_21", en: "The boy is sleeping.", cn: "那个男孩正在睡觉。", words: [
    { w: "The boy", ipa: "/bɔɪ/", role: "主语", cn: "那个男孩" },
    { w: "is sleeping", ipa: "/ˈsliːpɪŋ/", role: "谓语", cn: "正在睡觉" } ] },

  // 阶段4：情态动词 / 祈使句
  { id: "nc1_22", en: "I can swim.", cn: "我会游泳。", words: [
    { w: "I", ipa: "/aɪ/", role: "主语", cn: "我" },
    { w: "can swim", ipa: "/kæn/", role: "谓语", cn: "会游泳" } ] },
  { id: "nc1_23", en: "Can you help me?", cn: "你能帮我吗？", words: [
    { w: "Can", ipa: "/kæn/", role: "谓语", cn: "能" },
    { w: "you", ipa: "/juː/", role: "主语", cn: "你" },
    { w: "help", ipa: "/help/", role: "谓语", cn: "帮助" },
    { w: "me", ipa: "/miː/", role: "宾语", cn: "我" } ] },
  { id: "nc1_24", en: "You must go home.", cn: "你必须回家。", words: [
    { w: "You", ipa: "/juː/", role: "主语", cn: "你" },
    { w: "must go", ipa: "/mʌst/", role: "谓语", cn: "必须去" },
    { w: "home", ipa: "/həʊm/", role: "状语", cn: "回家" } ] },
  { id: "nc1_25", en: "Please open the window.", cn: "请打开窗户。", words: [
    { w: "Please", ipa: "/pliːz/", role: "状语", cn: "请" },
    { w: "open", ipa: "/ˈəʊpən/", role: "谓语", cn: "打开" },
    { w: "the window", ipa: "/ˈwɪndəʊ/", role: "宾语", cn: "窗户" } ] },
  { id: "nc1_26", en: "Don't close the door.", cn: "不要关上门。", words: [
    { w: "Don't", ipa: "/dəʊnt/", role: "状语", cn: "不要" },
    { w: "close", ipa: "/kləʊz/", role: "谓语", cn: "关闭" },
    { w: "the door", ipa: "/dɔː(r)/", role: "宾语", cn: "门" } ] },

  // 阶段5：一般现在时（三单）
  { id: "nc1_27", en: "He likes coffee.", cn: "他喜欢咖啡。", words: [
    { w: "He", ipa: "/hiː/", role: "主语", cn: "他" },
    { w: "likes", ipa: "/laɪks/", role: "谓语", cn: "喜欢" },
    { w: "coffee", ipa: "/ˈkɒfi/", role: "宾语", cn: "咖啡" } ] },
  { id: "nc1_28", en: "She goes to school every day.", cn: "她每天去上学。", words: [
    { w: "She", ipa: "/ʃiː/", role: "主语", cn: "她" },
    { w: "goes", ipa: "/ɡəʊz/", role: "谓语", cn: "去" },
    { w: "to school", ipa: "/skuːl/", role: "状语", cn: "上学" },
    { w: "every day", ipa: "/ˈevri/", role: "状语", cn: "每天" } ] },
  { id: "nc1_29", en: "They watch TV at night.", cn: "他们晚上看电视。", words: [
    { w: "They", ipa: "/ðeɪ/", role: "主语", cn: "他们" },
    { w: "watch", ipa: "/wɒtʃ/", role: "谓语", cn: "看" },
    { w: "TV", ipa: "/ˌtiː ˈviː/", role: "宾语", cn: "电视" },
    { w: "at night", ipa: "/naɪt/", role: "状语", cn: "在晚上" } ] },
  { id: "nc1_30", en: "I often read books.", cn: "我经常读书。", words: [
    { w: "I", ipa: "/aɪ/", role: "主语", cn: "我" },
    { w: "often read", ipa: "/ˈɒf(ə)n/", role: "谓语", cn: "经常读" },
    { w: "books", ipa: "/bʊks/", role: "宾语", cn: "书" } ] },
  { id: "nc1_31", en: "My mother cooks dinner.", cn: "我妈妈做晚饭。", words: [
    { w: "My mother", ipa: "/ˈmʌðə(r)/", role: "主语", cn: "我妈妈" },
    { w: "cooks", ipa: "/kʊks/", role: "谓语", cn: "做" },
    { w: "dinner", ipa: "/ˈdɪnə(r)/", role: "宾语", cn: "晚饭" } ] },

  // 阶段6：一般过去时 be / 规则动词
  { id: "nc1_32", en: "I was at home yesterday.", cn: "我昨天在家。", words: [
    { w: "I", ipa: "/aɪ/", role: "主语", cn: "我" },
    { w: "was", ipa: "/wɒz/", role: "谓语", cn: "在" },
    { w: "at home", ipa: "/æt/", role: "状语", cn: "在家" },
    { w: "yesterday", ipa: "/ˈjestədeɪ/", role: "状语", cn: "昨天" } ] },
  { id: "nc1_33", en: "They were happy.", cn: "他们很开心。", words: [
    { w: "They", ipa: "/ðeɪ/", role: "主语", cn: "他们" },
    { w: "were", ipa: "/wɜː(r)/", role: "谓语", cn: "是" },
    { w: "happy", ipa: "/ˈhæpi/", role: "补语", cn: "开心的" } ] },
  { id: "nc1_34", en: "He walked to school.", cn: "他走路去了学校。", words: [
    { w: "He", ipa: "/hiː/", role: "主语", cn: "他" },
    { w: "walked", ipa: "/wɔːkt/", role: "谓语", cn: "走路去" },
    { w: "to school", ipa: "/skuːl/", role: "状语", cn: "去学校" } ] },
  { id: "nc1_35", en: "We watched a film.", cn: "我们看了一部电影。", words: [
    { w: "We", ipa: "/wiː/", role: "主语", cn: "我们" },
    { w: "watched", ipa: "/wɒtʃt/", role: "谓语", cn: "看了" },
    { w: "a film", ipa: "/fɪlm/", role: "宾语", cn: "一部电影" } ] },

  // 阶段7：have / 比较级 / 现在完成时
  { id: "nc1_36", en: "I have a cold.", cn: "我感冒了。", words: [
    { w: "I", ipa: "/aɪ/", role: "主语", cn: "我" },
    { w: "have", ipa: "/hæv/", role: "谓语", cn: "有" },
    { w: "a cold", ipa: "/kəʊld/", role: "宾语", cn: "感冒" } ] },
  { id: "nc1_37", en: "He has a fever.", cn: "他发烧了。", words: [
    { w: "He", ipa: "/hiː/", role: "主语", cn: "他" },
    { w: "has", ipa: "/hæz/", role: "谓语", cn: "有" },
    { w: "a fever", ipa: "/ˈfiːvə(r)/", role: "宾语", cn: "发烧" } ] },
  { id: "nc1_38", en: "He is taller than me.", cn: "他比我高。", words: [
    { w: "He", ipa: "/hiː/", role: "主语", cn: "他" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "taller", ipa: "/ˈtɔːlə(r)/", role: "补语", cn: "更高" },
    { w: "than me", ipa: "/ðæn/", role: "状语", cn: "比我" } ] },
  { id: "nc1_39", en: "I have been to Beijing.", cn: "我去过北京。", words: [
    { w: "I", ipa: "/aɪ/", role: "主语", cn: "我" },
    { w: "have been", ipa: "/biːn/", role: "谓语", cn: "去过" },
    { w: "to Beijing", ipa: "/ˌbeɪˈdʒɪŋ/", role: "状语", cn: "去北京" } ] },
  { id: "nc1_40", en: "This book is the best.", cn: "这本书是最好的。", words: [
    { w: "This book", ipa: "/bʊk/", role: "主语", cn: "这本书" },
    { w: "is", ipa: "/ɪz/", role: "谓语", cn: "是" },
    { w: "the best", ipa: "/best/", role: "补语", cn: "最好的" } ] }
];

/* ---------- 3) 原创阅读短文（READING 兼容格式） ----------
   分级 lv1–lv6，语法对应新概念第一册早期梯度，场景均为自创。 */
var NC1_READING = [
  { lv: 1, topic: "新概念L1·问候", title: "Hello, I am Tom",
    en: "Hello. I am Tom. This is my dog. He is small. We are good friends. I like my dog.",
    cn: "你好。我是汤姆。这是我的狗。它很小。我们是好朋友。我喜欢我的狗。" },
  { lv: 2, topic: "新概念L1·家庭", title: "My family",
    en: "I have a family. My father is tall. My mother is kind. They are teachers. We are happy at home.",
    cn: "我有一个家。我的爸爸很高。我的妈妈很和善。他们是老师。我们在家里很开心。" },
  { lv: 3, topic: "新概念L1·房间", title: "My room",
    en: "This is my room. There is a bed. There is a desk. There are books on the desk. The room is small but clean.",
    cn: "这是我的房间。有一张床。有一张书桌。书桌上有一些书。房间很小但很干净。" },
  { lv: 4, topic: "新概念L1·进行时", title: "In the park",
    en: "Look at the park. The boy is running. The girl is reading. They are playing. Everyone is happy today.",
    cn: "看那个公园。男孩在跑步。女孩在读书。他们在玩耍。今天每个人都很开心。" },
  { lv: 5, topic: "新概念L1·日常", title: "A busy morning",
    en: "I can swim. My sister can sing. We must go to school. Please close the door. Don't open the window.",
    cn: "我会游泳。我的妹妹会唱歌。我们必须去上学。请关上门。不要打开窗户。" },
  { lv: 6, topic: "新概念L1·作息", title: "Our day",
    en: "My father gets up early. He goes to work by bus. My mother cooks dinner. She likes tea. We eat together every evening.",
    cn: "我爸爸早起。他坐公交去上班。我妈妈做晚饭。她喜欢茶。我们每天晚上一起吃。" }
];

/* ---------- 4) 接入全局：并入 SENTENCES 与 READING ---------- */
(function () {
  try {
    if (typeof SENTENCES !== "undefined" && Array.isArray(SENTENCES)) {
      SENTENCES.push.apply(SENTENCES, NC1_SENTENCES);
    }
    if (typeof READING !== "undefined" && Array.isArray(READING)) {
      READING.push.apply(READING, NC1_READING);
    }
  } catch (e) { /* 静默：极端加载顺序问题不影响核心功能 */ }
})();
