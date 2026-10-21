/* 语法课：每节包含 讲解 / 规则 / 原因 / 多例句 / 常见错误 / 测验题
   quiz 字段：q=题干  opts=选项  a=正确下标  e=解析        */
var GRAMMAR = [
  {
    t: "第1课：be 动词 am / is / are",
    s: "英语的句子必须有一个动词撑在中间，中文的\"是\"在英文里就是 be 动词。",
    b: [
      "am 搭配 I：I am a student. 缩写成 I'm a student.",
      "is 搭配 he / she / it 和**单数名词**：She is my friend.",
      "are 搭配 you / we / they 和**复数名词**：They are happy.",
      "否定在 be 动词后加 not：is not = isn't，are not = aren't，I am not = I'm not.",
      "疑问把 be 动词提前：Are you happy? / Is she a teacher?"
    ],
    why: "中文说\"我是学生\"，英文必须有一个 be 动词撑在中间：I **am** a student。英语句子是\"主语 + 动词 + 内容\"，动词不能省。中文的\"是\"常常省略了动词，这就是中国人初学英语最常漏掉的东西。",
    ex: [
      ["I **am** happy today.", "我今天很开心。"],
      ["He **is** my teacher.", "他是我的老师。"],
      ["They **are** at home.", "他们在家。"],
      ["This **is** my book.", "这是我的书。"],
      ["We **are** students.", "我们是学生。"],
      ["My name **is** Li Ming.", "我的名字是李明。"],
      ["It **is** a nice day.", "今天天气不错。"],
      ["Are you OK?", "你还好吗？"]
    ],
    err: "✗ I **am** student.（漏了冠词 a）　✓ I am **a** student.\n✗ She **are** my friend.（第三人称单数用 are）　✓ She **is** my friend.\n✗ I **have** 20 years.（中文\"我有\"的\"有\"不是 have）　✓ I **am** 20 years old.",
    quiz: [
      { q: "My sister ___ a doctor.", opts: ["is", "are", "am", "be"], a: 0, cn: "我的姐姐（妹妹）是一名医生。",
        e: "My sister 是 she / 单数名词，所以用 is。口诀：is 连着他她它，单数名词用 is。" },
      { q: "I ___ very tired.", opts: ["am", "is", "are", "be"], a: 0, cn: "我非常累。",
        e: "I 后面永远用 am，缩写成 I'm。" },
      { q: "We ___ ready.", opts: ["is", "am", "are", "be"], a: 2, cn: "我们准备好了。",
        e: "we 是复数，用 are。" },
      { q: "这棵树 ___ 很高。", opts: ["is", "are", "am", "be"], a: 0, cn: "这棵树很高。",
        e: "This tree 是单数（树），用 is。" },
      { q: "正确的一句是？", opts: ["She are my friend.", "She is my friend.", "She am my friend.", "She be my friend."], a: 1, cn: "下面哪一句是正确的？",
        e: "第三人称单数用 is。" }
    ]
  },
  {
    t: "第2课：一般现在时（每天都做的事）",
    s: "表示习惯、每天都发生的事。主语是第三人称单数时，动词要加 -s。",
    b: [
      "肯定：第三人称单数动词加 -s。I work. → He work**s**.",
      "否定：加 don't / doesn't + 动词原形。She doesn't **like** it.",
      "疑问：Do / Does 开头。**Does** he like it?",
      "拼写变化：go→goes，have→has，watch→watches，study→studies",
      "常搭配时间词：always, usually, often, every day, sometimes"
    ],
    why: "为什么只有第三人称单数要加 -s？因为英语认为\"他/她/它\"是第三方，需要用动词形式标记\"这件事是他做的\"。中文没有这个变化，所以要当成肌肉记忆。另外注意：加了 -s 之后，后面的否定和疑问就要用 does + 动词原形，不能再给动词加 -s。",
    ex: [
      ["I **get up** at 7 every day.", "我每天 7 点起床。"],
      ["She **watches** TV at night.", "她晚上看电视。"],
      ["I **don't** eat breakfast.", "我不吃早饭。"],
      ["He **doesn't** go to work by bus.", "他不坐公交车上班。"],
      ["**Do** you **like** music?", "你喜欢音乐吗？"],
      ["**Does** he **have** a car?", "他有车吗？"],
      ["My father **watches** the news every evening.", "我爸爸每天晚上看新闻。"],
      ["They **play** football on Sundays.", "他们周日踢足球。"]
    ],
    err: "✗ She **don't** like it.（第三人称单数要用 doesn't）　✓ She **doesn't** like it.\n✗ **Does** he **likes** it?（does 后面用原形）　✓ Does he **like** it?\n✗ I **am** go to work.（go 是动词，不能跟 am 连用）　✓ I **go** to work.",
    quiz: [
      { q: "He ___ TV every night.", opts: ["watch", "watches", "watchs", "watchies"], a: 1, cn: "他每天晚上看电视。",
        e: "watch 以 ch 结尾，加 -es → watches。" },
      { q: "She ___ like coffee.", opts: ["don't", "doesn't", "not", "isn't"], a: 1, cn: "她不喜欢咖啡。",
        e: "第三人称单数否定用 doesn't + 动词原形。" },
      { q: "___ your father work here?", opts: ["Do", "Does", "Is", "Are"], a: 1, cn: "你父亲在这里工作吗？",
        e: "主语 your father 是第三人称单数，助动词用 Does。" },
      { q: "正确的一句是？", opts: ["I likes it.", "She likes it.", "He like it.", "They likes it."], a: 1, cn: "下面哪一句是正确的？",
        e: "只有第三人称单数 likes（以 s 结尾的动词直接加 s）。" },
      { q: "My brother ___ to school by bike.", opts: ["go", "goes", "going", "gone"], a: 1, cn: "我哥哥（弟弟）骑自行车上学。",
        e: "My brother 是第三人称单数，用一般现在时 goes。" }
    ]
  },
  {
    t: "第3课：名词单复数",
    s: "英语名词有单数和复数，复数一般加 -s，但有几类特殊情况。",
    b: [
      "大多数加 -s：book → book**s**",
      "s / x / ch / sh 结尾加 -es：box → box**es**，watch → watch**es**，dish → dish**es**",
      "辅音字母 + y 结尾：变 y 为 i 再加 -es：city → cit**ies**，baby → bab**ies**",
      "o 结尾有些加 es：potato → potato**es**，tomato → tomato**es**",
      "不规则：man → men，woman → women，child → chil**dren**，foot → feet，tooth → teeth，mouse → mice"
    ],
    why: "英语复数的 -s 其实是\"实物计数\"的痕迹 —— 一本书用 book，一堆书就用 books 表示\"多本\"。所以不只\"多个不同东西\"才加 s，\"同类成组\"也行：I have two books（我有两本书）。不规则复数来自古英语，没有道理可讲，只能优先记最常用的那十几个。",
    ex: [
      ["I have two **books**.", "我有两本书。"],
      ["There are three **boxes** here.", "这里有三个盒子。"],
      ["The **children** are playing.", "孩子们在玩。"],
      ["I want two **cities** to visit.", "我想去两个城市看看。"],
      ["She ate three **potatoes**.", "她吃了三个土豆。"],
      ["My **feet** are cold.", "我的脚很冷。"],
      ["There are many **babies** here.", "这里有很多婴儿。"],
      ["I need some **watches**.", "我需要一些手表。"]
    ],
    err: "✗ I have two **book**.　✓ I have two **books**.\n✗ many **childs**　✓ many **children**\n✗ three **citys**　✓ three **cities**\n✗ I have many **advices**.（advice 不可数）　✓ I have a lot of **advice**.",
    quiz: [
      { q: "There are five ___ in the box.", opts: ["box", "boxs", "boxes", "boxies"], a: 2, cn: "盒子里有五个……。",
        e: "以 x 结尾的名词复数加 -es → boxes。" },
      { q: "The ___ are playing in the park.", opts: ["child", "childs", "childes", "children"], a: 3, cn: "……正在公园里玩。",
        e: "child 的复数是不规则形式 children。" },
      { q: "I want to visit three ___.", opts: ["city", "citys", "cities", "cityes"], a: 2, cn: "我想去参观三个……。",
        e: "辅音字母 + y 结尾，变 y 为 i 再加 -es → cities。" },
      { q: "My ___ are cold.", opts: ["foots", "feet", "feets", "foot"], a: 1, cn: "我的……很冷。",
        e: "foot 的复数是 feet，不规则变化。" },
      { q: "She has three ___.", opts: ["baby", "babys", "babies", "babyes"], a: 2, cn: "她有三个……。",
        e: "baby 复数是 babies。" }
    ]
  },
  {
    t: "第4课：代词（I / me / my）",
    s: "英语代词分主格和宾格，位置不同用词也不同 —— 这是中国人最常错的地方。",
    b: [
      "主格（做主语）：I, you, he, she, it, we, they",
      "宾格（做动词的宾语）：me, you, him, her, it, us, them",
      "形容词性物主代词（放名词前）：my, your, his, her, our, their",
      "名词性物主代词（后面不接名词）：mine, yours, his, hers, ours, theirs",
      "指示代词：this（这个）, that（那个）, these（这些）, those（那些]",
      "反身代词：myself, yourself, himself, herself, itself, ourselves, yourselves, themselves"
    ],
    why: "为什么要分主格宾格？因为英语的动词后面要接\"被动作的对象\"，这个位置必须用宾格。中文\"我\"只有一个形式，所以中国人常把\"我说\"说成\"我 say\"—— 正确是 **I** say（主格），但\"说服我\"是 persuade **me**（宾格）。my 和 me 只差一个字母，意思完全不同。",
    ex: [
      ["**She** likes **me**.", "她喜欢我。"],
      ["This is **my** book.", "这是我的书。"],
      ["I like **these**.", "我喜欢这些。"],
      ["Please give it to **me**.", "请把它给我。"],
      ["This pen is **mine**.", "这支笔是我的。"],
      ["He taught **himself**.", "他自学了。"],
      ["We did it by **ourselves**.", "我们自己做完了。"],
      ["**Those** books are **yours**.", "那些书是你的。"]
    ],
    err: "✗ **Me** like music.　✓ **I** like music.\n✗ This book is **my**.　✓ This book is **mine**.\n✗ She likes **I**.　✓ She likes **me**.\n✔ her 和 hers 混用：her 后接名词，hers 单独用。",
    quiz: [
      { q: "She helps ___.", opts: ["I", "me", "my", "mine"], a: 1, cn: "她帮助……。",
        e: "helps 后面是宾语，要用宾格 me。" },
      { q: "This is ___ book.", opts: ["she", "her", "hers", "she's"], a: 1, cn: "这是……书。",
        e: "后面接名词 book，用形容词性物主代词 her。" },
      { q: "That bag is ___.", opts: ["my", "me", "mine", "I"], a: 2, cn: "那个包是……的。",
        e: "后面不接名词，要用名词性物主代词 mine。" },
      { q: "___ like English.", opts: ["Me", "I", "My", "Mine"], a: 1, cn: "……喜欢英语。",
        e: "做主语用主格 I。" },
      { q: "正确的一句是？", opts: ["He talked to I.", "He talked to me.", "He talked to my.", "He talked to mine."], a: 1, cn: "下面哪一句是正确的？",
        e: "talked to 后面跟宾语 me。" }
    ]
  },
  {
    t: "第5课：there be 句型（某处有某物）",
    s: "表示\"某地有某物\"。There 本身没有意思，只负责引出\"存在\"这件事。",
    b: [
      "There **is** + 单数 / 不可数：There is a book on the desk.",
      "There **are** + 复数：There are two books on the desk.",
      "就近原则：There **is** a pen and two books.（看最靠近的那个）",
      "否定：There **isn't** / There **aren't**",
      "过去式：There **was** / There **were**（was 对单数，were 对复数）",
      "疑问：Is there...? / Are there...?"
    ],
    why: "There be 要**倒过来理解**：There is a window in the room，实际意思是\"一个窗户在房间里存在\" —— 房间是地点，窗户是东西。所以中文的\"房间里有窗户\"，英文得说\"窗户在房间里存在\"。这就是为什么中文说\"里\"，英文说 in room —— 顺序是反的。",
    ex: [
      ["**There is** a window **in** the room.", "房间里有一扇窗户。"],
      ["**There are** three books on the desk.", "桌上有三本书。"],
      ["**There aren't** any people here.", "这里没有人。"],
      ["**Is there** a bank near here?", "这附近有银行吗？"],
      ["There **was** a big tree in front of my house.", "我家门口曾有一棵大树。"],
      ["There **were** many students in the classroom.", "教室里当时有很多学生。"],
      ["There **is** some milk in the glass.", "杯子里有一些牛奶。"],
      ["**How many** people are there in your family?", "你家有几口人？"]
    ],
    err: "✗ There **have** a book.（\"有\"不能用 have）　✓ There **is** a book.\n✗ There **is** two books.（复数要用 are）　✓ There **are** two books.\n✗ There **has** a window.　✓ There **is** a window.",
    quiz: [
      { q: "There ___ two apples on the table.", opts: ["is", "are", "have", "has"], a: 1, cn: "桌子上有两个苹果。",
        e: "two apples 是复数，用 are。" },
      { q: "There ___ some water in the bottle.", opts: ["are", "is", "have", "were"], a: 1, cn: "瓶子里有一些水。",
        e: "water 是不可数名词，用 is。" },
      { q: "___ there any students in the room?", opts: ["Is", "Are", "Do", "Have"], a: 1, cn: "房间里有一些学生吗？",
        e: "students 是复数，疑问句用 Are there。" },
      { q: "There ___ a big park near my home.", opts: ["are", "were", "is", "have"], a: 2, cn: "我家附近有一个大公园。",
        e: "a big park 是单数，用 is。" },
      { q: "正确的一句是？", opts: ["There have many books.", "There are many books.", "There is many books.", "There has many books."], a: 1, cn: "下面哪一句是正确的？",
        e: "\\\"有\\\"不用 have；many books 是复数，用 are。" }
    ]
  },
  {
    t: "第6课：常用介词 in / on / at",
    s: "这三个介词的核心差别是\"体积\"：in 是里面，on 是表面，at 是一个点。",
    b: [
      "**in** 在立体空间里面：in the box, in China, in the room",
      "**on** 贴着表面：on the table, on the wall, on the bus",
      "**at** 在某一点：at school, at 7 o'clock, at the bus stop",
      "**from** 来自：I'm **from** Beijing.",
      "**for** 为了：This gift is **for** you.",
      "**of** ……的：a cup **of** tea（不可数名词的量词）",
      "固定搭配：go **home** / go **there** 不加 to；go to **school** / go to **bed** 要加 to"
    ],
    why: "in / on / at 的区别其实是\"空间的三层\"：in 是立体（有厚度），on 是平面（只有表面），at 是一个点（没有体积）。所以 in China 在国家**里面**，on the table 在桌面**上**，at school 在一个**点**。用\"体积递减\"来记，比死背靠谱得多。还有一点：home / there / here 本身自带方向，所以 go home 不加 to，这是英语的例外。",
    ex: [
      ["The book is **on** the desk.", "书在桌子上。"],
      ["I come **from** China.", "我来自中国。"],
      ["This gift is **for** you.", "这份礼物是给你的。"],
      ["She lives **in** Shanghai.", "她住在上海。"],
      ["The meeting is **at** 3 o'clock.", "会议三点开始。"],
      ["I want a cup **of** tea.", "我想要一杯茶。"],
      ["He is **at** home now.", "他现在在家。"],
      ["The cat is **in** the box.", "猫在盒子里。"]
    ],
    err: "✗ I go **to** home.　✓ I go **home**.（home 自带方向）\n✗ I am **in** home.　✓ I am **at** home.\n✗ a cup **of** breads　✓ a cup **of** bread（bread 不可数）\n✗ He lives **in** Beijing. ✓ He lives **in** Beijing.（对，但 live in 是对的；arrive 要用 at）",
    quiz: [
      { q: "The keys are ___ the table.", opts: ["in", "on", "at", "to"], a: 1, cn: "钥匙在桌子……。",
        e: "在桌面上（表面）用 on。" },
      { q: "I am waiting ___ the bus stop.", opts: ["in", "on", "at", "to"], a: 2, cn: "我正在公交车站……等车。",
        e: "在一个具体的点用 at。" },
      { q: "Be careful ___ the hot soup!", opts: ["for", "with", "at", "on"], a: 1, cn: "小心热汤！",
        e: "be careful **with** sth 是固定搭配，意为「当心／小心某物」。for 表示「为了」，at 是具体的点，都不搭。" },
      { q: "I go ___ school by bus.", opts: ["to", "/", "at", "on the"], a: 1, cn: "我坐公交车去上学。",
        e: "go to school 是固定搭配，意为\\\"上学\\\"，强调过程；不加 to 语气更绝对。" },
      { q: "正确的一句是？", opts: ["She lives in Beijing.", "She lives at Beijing.", "She lives on Beijing.", "She lives to Beijing."], a: 0, cn: "下面哪一句是正确的？",
        e: "城市、国家用 in。" }
    ]
  },
  {
    t: "第7课：现在进行时（正在做）",
    s: "be 动词 + 动词 -ing，表示此刻正在发生的动作。",
    b: [
      "结构：am / is / are + 动词**-ing**",
      "肯定：I **am studying** English.",
      "否定：I'm **not** studying.（not 放在 be 后面）",
      "疑问：**Are** you studying?",
      "拼写变化：go→go**ing**，make→mak**ing**（去 e），lie→ly**ing**（去 ie）",
      "重读闭音节双写末尾字母：run→runn**ing**，sit→sitt**ing**，swim→swimm**ing**"
    ],
    why: "为什么进行时要加 be 动词？因为英语要告诉你\"现在正在做\"这件事，需要一个\"时态标记\"。be 动词就是那个标记。所以 -ing 不是\"动作\"的意思，而是\"这个动作正在进行中\"的意思。同一个动作：不加 -ing 是习惯（I study every day），加 -ing 是此刻（I am studying now.）。另外注意：双写规则是因为英语音节重音——重读闭音节加后缀时，末尾辅音要双写来保持音节结构。",
    ex: [
      ["I **am studying** English now.", "我正在学英语。"],
      ["She **is cooking** in the kitchen.", "她正在厨房做饭。"],
      ["They **are running** on the playground.", "他们正在操场上跑步。"],
      ["He **isn't sleeping** right now.", "他现在没在睡觉。"],
      ["**Are** you **listening** to me?", "你在听我说话吗？"],
      ["What **are** you **doing**?", "你在做什么？"],
      ["We **are having** dinner.", "我们正在吃晚饭。"],
      ["The baby **is crying**.", "宝宝在哭。"]
    ],
    err: "✗ I **am study** English.（进行时必须加 -ing）　✓ I am **studying** English.\n✗ I **am** work now.　✓ I **am working** now.\n✗ He **is runing**.　✓ He **is running**.（重读闭音节双写 n）\n✗ I am study, so I learn a lot. ✗（两个时态混用）",
    quiz: [
      { q: "Look! The baby ___.", opts: ["cry", "cries", "is crying", "crying"], a: 2, cn: "看！婴儿正在……。",
        e: "Look! 提示此刻正在发生，用现在进行时 is + crying。" },
      { q: "He ___ to music now.", opts: ["listen", "listens", "is listening", "listening"], a: 2, cn: "他现在正在听音乐。",
        e: "now 提示此刻，进行时 is + listening。" },
      { q: "They ___ football on Sundays.", opts: ["are playing", "play", "plays", "playing"], a: 1, cn: "他们周日踢足球。",
        e: "on Sundays 表示习惯，用一般现在时 play，不是进行时。" },
      { q: "She is ___ a book right now.", opts: ["read", "reads", "reading", "to reading"], a: 2, cn: "她此刻正在读一本书。",
        e: "be 动词后面必须跟动词 -ing 形式。" },
      { q: "正确的一句是？", opts: ["I am runing.", "I am running.", "I running.", "I is running."], a: 1, cn: "下面哪一句是正确的？",
        e: "run 是重读闭音节，双写 n 加 -ing；主语 I 用 am。" }
    ]
  },
  {
    t: "第8课：一般过去时（已经发生）",
    s: "表示过去某时发生的事。规则动词加 -ed，不规则动词要单独记。",
    b: [
      "规则动词 + -ed：work→work**ed**，play→play**ed**，watch→watch**ed**",
      "以 e 结尾加 -d：like→like**d**，live→live**d**",
      "辅音 + y：变 y 为 i 加 -ed：study→stud**ied**，cry→cr**ied**",
      "否定 / 疑问用 did：I **didn't** go.（did 后用原形）",
      "常搭配时间词：yesterday, last week, two days ago, in 2020",
      "常用不规则：go→went, eat→ate, see→saw, have→had, do→did, come→came, take→took, write→wrote"
    ],
    why: "为什么不规则动词不加 -ed？因为这些词的\"过去\"形式来自古英语，本身就不一样。比如 went 其实是古英语 wendan 的变体，不是\"go 加上什么\"。英语里有一百多个不规则动词，没有道理可讲 —— 但常用的只有三十个左右，优先记这些就够了。另一个坑：用 did 之后，后面的动词要变回**原形**（I didn't go，不是 I didn't went）。",
    ex: [
      ["I **went** to school yesterday.", "我昨天去上学了。"],
      ["She **didn't come**.", "她没来。"],
      ["We **had** a good time.", "我们玩得很开心。"],
      ["**Did** you **eat** breakfast?", "你吃早饭了吗？"],
      ["He **wrote** a letter last week.", "他上周写了封信。"],
      ["I **studied** English for two hours.", "我学了两小时英语。"],
      ["**Was** she **happy** yesterday?", "她昨天开心吗？"],
      ["They **took** many photos.", "他们拍了很多照片。"]
    ],
    err: "✗ I didn't **went**.（did 后面用原形）　✓ I didn't **go**.\n✗ I **go**ed home.　✓ I **went** home.\n✗ I have **went**.　✓ I **went**.\n✗ He **did** not **went**.　✓ He **did not go**.",
    quiz: [
      { q: "I ___ to Beijing last year.", opts: ["go", "goed", "went", "gone"], a: 2, cn: "我去年去了北京。",
        e: "go 的过去式是不规则形式 went。" },
      { q: "She ___ finish her homework.", opts: ["didn't", "doesn't", "wasn't", "isn't"], a: 0, cn: "她……做完了作业。",
        e: "last night 提示过去，否定用 didn't + 动词原形。" },
      { q: "They ___ many photos last night.", opts: ["take", "takes", "took", "taking"], a: 2, cn: "他们昨晚拍了很多照片。",
        e: "take 的过去式是 took。" },
      { q: "___ you see him yesterday?", opts: ["Do", "Does", "Did", "Are"], a: 2, cn: "你昨天见到他了吗？",
        e: "yesterday 提示过去，助动词用 Did。" },
      { q: "正确的一句是？", opts: ["I didn't went.", "I didn't go.", "I don't went.", "I didn't gone."], a: 1, cn: "下面哪一句是正确的？",
        e: "用了 did 之后，动词必须用原形。" }
    ]
  },
  {
    t: "第9课：情态动词 can / could",
    s: "can 表示能力和请求许可，could 更委婉。后面永远跟动词原形。",
    b: [
      "can 表示能力：I **can** swim.",
      "can 表示请求许可：**Can** you help me?",
      "cannot = can't（否定）",
      "can 后接**动词原形**：can go ✓ / can to go ✗ / can goes ✗",
      "could 是 can 的过去式，现代英语里主要用于**更委婉**的请求",
      "其他常用情态动词：must（必须）、should（应该）、may（可以）、might（可能）、have to（不得不）"
    ],
    why: "can 和 be 动词一样，是一个\"时态标记\"，但它不能单独用，必须配一个动词原形。所以永远是 can go、can swim，不能说 can to go —— 这是中文最容易出错的地方，因为中文\"能去\"没有这个结构。另外 could 是 can 的过去式，但现在主要用于客气：Could you...? 比 Can you...? 礼貌得多，中国人在服务行业听到的就是这个。",
    ex: [
      ["I **can** speak a little English.", "我会说一点英语。"],
      ["**Could** you repeat that, **please**?", "请你再说一遍好吗？"],
      ["She **can** swim very fast.", "她游泳很快。"],
      ["**Can** I use your pen?", "我可以用你的笔吗？"],
      ["You **should** see a doctor.", "你应该去看医生。"],
      ["You **must** be here before 9.", "你必须 9 点前到。"],
      ["It **might** rain this evening.", "今晚可能会下雨。"],
      ["I **can't** come tomorrow.", "我明天来不了。"]
    ],
    err: "✗ I can **to** go.　✓ I can **go**.\n✗ She can **swims**.　✓ She can **swim**.\n✗ Could you **helping** me?　✓ Could you **help** me?\n✗ I can **to** swim.　✓ I can **swim**.",
    quiz: [
      { q: "I can ___ very fast.", opts: ["to run", "run", "runs", "running"], a: 1, cn: "我能跑得很快。",
        e: "can 后面必须跟动词原形。" },
      { q: "___ you help me, please?", opts: ["Can", "Are", "Do", "Is"], a: 0, cn: "请问你能帮我一下吗？",
        e: "Can you...? 是最常用的请求许可句式。" },
      { q: "___ you say it again more slowly?", opts: ["Could", "Must", "Should", "May"], a: 0, cn: "你能再说慢一点吗？",
        e: "Could 比 Can 更委婉礼貌。" },
      { q: "She can't ___ the answer.", opts: ["to know", "know", "knows", "knowing"], a: 1, cn: "她想不出答案。",
        e: "情态动词后接动词原形。" },
      { q: "你 ___ see a doctor. 你应该去看医生。", opts: ["should", "should to", "shoulds", "are should"], a: 0, cn: "你应该去看医生。",
        e: "should 是情态动词，后面接动词原形 see。" }
    ]
  },
  {
    t: "第10课：疑问句（怎么问）",
    s: "英语提问时把最想知道的词放到最前面，这就是\"倒装\"的由来。",
    b: [
      "一般疑问句：把 be 动词或助动词提到句首 —— **Are** you happy? / **Do** you like it?",
      "特殊疑问句：疑问词 + 一般疑问句 —— **Where** are you from?",
      "常用疑问词：what, where, who, when, why, how, how much（价格）, how many（可数数量）, how old（年龄）",
      "答语要简短：Yes, I **am**. / No, I **don't**.",
      "不用助动词也能问：**How** is it **made**?（How + 主语 + 动词）",
      "疑问词决定用哪个助动词：How **many** books **do** you have?（do 跟着主语 you）"
    ],
    why: "疑问句为什么要倒装？因为英语习惯\"提问时把最想知道的词提到最前面\"。中文说\"你从哪儿来\"，先说人；英语说 Where are you from，先说 where。这就是为什么\"How much is it?\"（它多少钱）和\"How much do you want?\"（你要多少）助动词不一样 —— 助动词是跟着**主语**走的，不是跟着疑问词走的。",
    ex: [
      ["**Where** are you from?", "你来自哪里？"],
      ["**What** is this?", "这是什么？"],
      ["**How much** is it?", "多少钱？"],
      ["**How many** books do you have?", "你有多少本书？"],
      ["**How old** are you?", "你多大了？"],
      ["**Why** do you like it?", "你为什么喜欢它？"],
      ["**When** do you get up?", "你什么时候起床？"],
      ["**How** is it made?", "这个是怎么做的？"]
    ],
    err: "✗ **Where you are from?**　✓ **Where are you from?**\n✗ **How many books you have?**　✓ **How many books do you have?**\n✗ **What this is?**　✓ **What is this?**\n✗ **How much books?**（可数用 how many）　✓ **How many books?**",
    quiz: [
      { q: "___ you from China?", opts: ["Where", "What", "Who", "How"], a: 0, cn: "你来自中国吗？",
        e: "问地点用 Where。" },
      { q: "How many ___ do you have?", opts: ["book", "books", "a book", "the book"], a: 1, cn: "你有多少个……？",
        e: "how many 后接可数名词复数。" },
      { q: "___ is this book?", opts: ["How much", "How many", "How old", "How"], a: 0, cn: "这本书……？",
        e: "问价格用 how much。" },
      { q: "正确的一句是？", opts: ["Where are you from?", "Where you are from?", "Where is you from?", "Where you from?"], a: 0, cn: "下面哪一句是正确的？",
        e: "特殊疑问句结构：疑问词 + 一般疑问句。" },
      { q: "___ is your father? 你爸爸是做什么的？", opts: ["What", "What do", "What does", "How"], a: 0, cn: "你爸爸是做什么的？（问职业）",
        e: "问职业用 What is he / What does he do?，不能加助动词在 be 动词前。" }
    ]
  },
  {
    t: "第11课：冠词 a / an / the",
    s: "第一次提到某物用 a/an（不定），再次提到或特指用 the（定）。",
    b: [
      "a 用在辅音音素开头的词前：a book, a dog。",
      "an 用在元音音素开头的词前：an apple, an hour（hour 的 h 不发音，用 an）。",
      "the 表示「这个/那个、特指」：Open the door.（双方都知道是哪扇门）。",
      "复数或不可数名词表泛指时不加冠词：I like books. / I drink water.",
      "独一无二的事物用 the：the sun, the moon, the world。"
    ],
    why: "冠词看的是「音素」不是字母。hour 拼写以 h 开头，但 h 不发音，读作 /aʊər/，开头是元音，所以要用 an hour，不是 a hour。反过来 university 以 u 开头却读 /juː/，是辅音，要用 a university。",
    ex: [
      ["I see **a** cat.", "我看见一只猫。"],
      ["She eats **an** apple.", "她吃一个苹果。"],
      ["**The** sun is hot.", "太阳很晒。"],
      ["Close **the** window.", "关上那扇窗户。"],
      ["I like **books**.", "我喜欢书。"]
    ],
    err: "✗ I eat an banana.（banana 以辅音 /b/ 开头）　✓ a banana\n✗ She is teacher.（职业前漏 a）　✓ She is a teacher.\n✗ Open a door.（双方知道的门）　✓ Open the door.",
    quiz: [
      { q: "___ apple a day.", opts: ["A", "An", "The", "/"], a: 1, cn: "一天一个……。（谚语：一天一苹果，医生远离我）",
        e: "apple 以元音 /æ/ 开头，用 an。" },
      { q: "He is ___ teacher.", opts: ["a", "an", "the", "/"], a: 0, cn: "他是一位老师。",
        e: "职业前用 a/an，teacher 以辅音开头用 a。" },
      { q: "___ sun rises in the east.", opts: ["A", "An", "The", "/"], a: 2, cn: "……太阳从东方升起。",
        e: "独一无二的事物用 the。" },
      { q: "I have ___ orange.（橙子，元音开头）", opts: ["a", "an", "the", "/"], a: 1, cn: "我有一个橙子。",
        e: "orange 以元音开头用 an。" },
      { q: "正确的一句是？", opts: ["I like the books.", "I like a books.", "I like an books.", "I like books."], a: 3, cn: "下面哪一句是正确的？",
        e: "泛指复数不加冠词。" }
    ]
  },
  {
    t: "第12课：形容词与比较级",
    s: "形容词放在名词前或 be 动词后，本身不变化；比较谁更……用比较级。",
    b: [
      "原级：a big house / The house is big.",
      "比较级 + than：bigger than, taller than。短词加 -er，多音节前加 more。",
      "最高级：the biggest, the tallest，表示「最……」。",
      "不规则：good → better → best；bad → worse → worst。",
      "「越来越」用比较级叠用：better and better。"
    ],
    why: "中文说「他比我高」，英语必须加 than：He is taller than me。than 不能省，否则比较对象就没了。多音节词（如 beautiful）不能加 -er，要说 more beautiful，不是 beautifuller。",
    ex: [
      ["This book is **big**.", "这本书很大。"],
      ["He is **taller than** me.", "他比我高。"],
      ["She is **the best** student.", "她是最好的学生。"],
      ["English is **more useful** than Latin.", "英语比拉丁语更有用。"],
      ["It gets **better and better**.", "它越来越好。"]
    ],
    err: "✗ He is more tall than me.（短词用 -er）　✓ taller than\n✗ This is the more big.（最高级用 -est）　✓ the biggest\n✗ She is gooder.（不规则）　✓ better.",
    quiz: [
      { q: "He is ___ than me.", opts: ["tall", "taller", "tallest", "more tall"], a: 1, cn: "他比我……。（比较级）",
        e: "比较级用 taller + than。" },
      { q: "She is the ___ student.", opts: ["good", "better", "best", "well"], a: 2, cn: "她是最……的学生。",
        e: "最高级 good→best。" },
      { q: "This book is ___ than that one.", opts: ["interesting", "more interesting", "interestinger", "most interesting"], a: 1, cn: "这本书比那本……。",
        e: "多音节词用 more + 原级。" },
      { q: "正确的一句？", opts: ["He is taller that me.", "He is taller than me.", "He taller than me.", "He is tall than me."], a: 1, cn: "哪一句是正确的？",
        e: "比较级后接 than。" },
      { q: "The weather is getting ___ and ___.", opts: ["good, good", "better, better", "best, best", "well, well"], a: 1, cn: "天气变得越来越……。",
        e: "越来越好用 better and better。" }
    ]
  },
  {
    t: "第13课：频率副词",
    s: "always / often / sometimes / never 放在 be 动词后、实义动词前。",
    b: [
      "位置：be 后（He is always late）；实义动词前（I often read）。",
      "always 总是，often 经常，sometimes 有时，never 从不。",
      "提问频率用 How often：How often do you exercise?",
      "放在句首表强调：Sometimes I walk to school.",
      "never 本身是否定，不再加 not。"
    ],
    why: "频率副词的位置是中文没有的：中文「我常常读书」副词在动词前；英语也必须放动词前 I often read，但如果是 be 动词就要放后面 He is often late。never 已经含否定，别说 I don't never go。",
    ex: [
      ["I **often** read books.", "我经常读书。"],
      ["He is **always** late.", "他总是迟到。"],
      ["**Sometimes** I walk.", "有时我走路。"],
      ["She **never** smokes.", "她从不抽烟。"],
      ["**How often** do you call?", "你多久打一次电话？"]
    ],
    err: "✗ I am often go.（be 后放 often 但用了 go）　✓ I often go.\n✗ I don't never eat.（双重否定）　✓ I never eat.\n✗ Often I am busy.（强调可放句首，但常态放句中）　✓ I am often busy.",
    quiz: [
      { q: "He ___ late.", opts: ["is always", "always is", "is allways", "always are"], a: 0, cn: "他……迟到了。",
        e: "频率副词放 be 动词后。" },
      { q: "I ___ read books.", opts: ["often", "am often", "often am", "is often"], a: 0, cn: "我……读书。",
        e: "实义动词前放 often。" },
      { q: "___ do you exercise?", opts: ["How", "How often", "How long", "When"], a: 1, cn: "你……锻炼？（问频率）",
        e: "问频率用 How often。" },
      { q: "She ___ smokes.", opts: ["not never", "never", "doesn't never", "no never"], a: 1, cn: "她……抽烟。",
        e: "never 本身否定，不叠加 not。" },
      { q: "正确的一句？", opts: ["I always am happy.", "I am always happy.", "Always I am happy.", "I am happy always."], a: 1, cn: "哪一句是正确的？",
        e: "频率副词在 be 后。" }
    ]
  },
  {
    t: "第14课：将来时 will / be going to",
    s: "说没发生的事：will + 动词原形，或 be going to + 动词。",
    b: [
      "will + 原形：I will help you.（承诺、临时决定）。",
      "be going to + 原形：It is going to rain.（有迹象、已计划）。",
      "否定 will not = won't；疑问 Will you...?",
      "时间状语 tomorrow / next week 常一起出现。",
      "shall 用于 I/we 的建议（英式），口语多用 will。"
    ],
    why: "will 和 be going to 都表将来，但感觉不同：will 是「现在才决定」（电话响了：I'll get it），be going to 是「早有计划或已有迹象」（乌云密布：It's going to rain）。初学者记住：计划好的用 going to，临时起意用 will。",
    ex: [
      ["I **will** call you.", "我会打给你。"],
      ["It **is going to** rain.", "要下雨了。"],
      ["We **will** help.", "我们会帮忙。"],
      ["She **is going to** study.", "她打算学习。"],
      ["**Will** you come?", "你会来吗？"]
    ],
    err: "✗ I will to go.（will 后接原形）　✓ I will go.\n✗ He going to come.（缺 be）　✓ He is going to come.\n✗ I am go to sleep.（go 未变 going）　✓ I am going to sleep.",
    quiz: [
      { q: "I ___ help you.", opts: ["will", "will to", "am will", "going"], a: 0, cn: "我……帮你。",
        e: "will 后接动词原形。" },
      { q: "It ___ rain.", opts: ["is going to", "going to", "will going", "goes to"], a: 0, cn: "天……下雨。",
        e: "有迹象的将来用 be going to。" },
      { q: "___ you come tomorrow?", opts: ["Do", "Are", "Will", "Did"], a: 2, cn: "你明天会来吗？",
        e: "将来疑问用 Will you...?" },
      { q: "He is ___ study.", opts: ["going to", "will", "go to", "to"], a: 0, cn: "他……学习。（be going to 表打算）",
        e: "be going to + 原形。" },
      { q: "正确的一句？", opts: ["I will goes.", "I will go.", "I going to go.", "I am will go."], a: 1, cn: "哪一句是正确的？",
        e: "will + 动词原形。" }
    ]
  },
  {
    t: "第15课：现在完成时 have / has done",
    s: "强调「过去发生、和现在有关」：have/has + 过去分词。",
    b: [
      "构成：I/you/we/they have done；he/she/it has done。",
      "常搭配 already（已经）、yet（还）、ever（曾经）、never（从未）。",
      "和一般过去时的区别：过去时只说过去，完成时连到现在。",
      "不规则过去分词要记：go→gone, eat→eaten, see→seen, do→done。",
      "提问 Have you ever...?（你曾经……过吗？）"
    ],
    why: "现在完成时指的是「到现在为止的经历/结果」，不是某个具体过去时间点。中文「我吃过北京烤鸭」其实是完成时感觉，英语要说 I have eaten Peking duck。如果说 I ate 只是陈述昨天吃了，和现在无关。",
    ex: [
      ["I **have finished** my work.", "我已经做完工作了。"],
      ["She **has gone** home.", "她已经回家了。"],
      ["**Have** you **ever** been to Beijing?", "你去过北京吗？"],
      ["I **have never** seen it.", "我从没见过。"],
      ["He **has eaten** already.", "他已经吃了。"]
    ],
    err: "✗ I have went.（分词错）　✓ I have gone.\n✗ He have done.（三单用 has）　✓ He has done.\n✗ I did ever eat.（完成时不用 did）　✓ Have you ever eaten?",
    quiz: [
      { q: "I ___ finished my homework.", opts: ["has", "have", "am", "did"], a: 1, cn: "我……做完作业了。",
        e: "I 用 have + 过去分词。" },
      { q: "She ___ gone home.", opts: ["have", "has", "is", "did"], a: 1, cn: "她……回家了。",
        e: "三单用 has。" },
      { q: "___ you ever been to Shanghai?", opts: ["Do", "Did", "Have", "Are"], a: 2, cn: "你去过上海吗？",
        e: "经历提问用 Have you ever...?" },
      { q: "go 的过去分词是 ___？", opts: ["went", "gone", "goed", "going"], a: 1, cn: "go 的过去分词是什么？",
        e: "go 的过去分词是 gone。" },
      { q: "正确的一句？", opts: ["He has did it.", "He has done it.", "He have done it.", "He did done it."], a: 1, cn: "哪一句是正确的？",
        e: "has + 过去分词 done。" }
    ]
  },
  {
    t: "第16课：祈使句与建议",
    s: "直接叫人做/别做：动词原形开头；建议用 Let's / Please。",
    b: [
      "肯定祈使：Open the door. / Sit down.",
      "否定祈使：Don't open it. / No smoking.",
      "礼貌加 Please：Please wait. / Wait, please.",
      "提议一起做：Let's go. / Let's eat.",
      "提建议：Why not try? / How about a coffee?"
    ],
    why: "祈使句没有主语 you，直接动词开头，这是英语最「命令感」的句子。想客气就加 Please，或换成 Let's（咱们一起）、Why not（为什么不）。中文「请坐」英语是 Sit down, please，不能写成 Please sit down, please。",
    ex: [
      ["**Open** the window.", "打开窗户。"],
      ["**Don't** worry.", "别担心。"],
      ["**Let's** go home.", "咱们回家吧。"],
      ["**Please** wait.", "请等一下。"],
      ["**Why not** try again?", "为什么不再试一次？"]
    ],
    err: "✗ Don't to open it.（祈使否定不加 to）　✓ Don't open it.\n✗ Let's to go.（Let's 后接原形）　✓ Let's go.\n✗ Please you sit.（不要加 you）　✓ Please sit.",
    quiz: [
      { q: "___ the door, please.", opts: ["Open", "Opens", "Opening", "To open"], a: 0, cn: "请……门。",
        e: "祈使句动词原形开头。" },
      { q: "___ worry.", opts: ["Don't", "Not", "No", "Doesn't"], a: 0, cn: "别……。",
        e: "否定祈使用 Don't + 原形。" },
      { q: "___ go home.", opts: ["Let's", "Let's to", "Let", "Lets"], a: 0, cn: "我们……回家吧。",
        e: "Let's + 动词原形。" },
      { q: "___ not try?", opts: ["Why", "Why don't", "How", "What"], a: 1, cn: "为什么不……呢？",
        e: "建议用 Why don't you...? 或 Why not + 原形。" },
      { q: "正确的一句？", opts: ["Please you sit.", "Sit please you.", "Sit down, please.", "Please to sit."], a: 2, cn: "哪一句是正确的？",
        e: "祈使句礼貌加 please，无 you。" }
    ]
  },
  {
    t: "第17课：连词 and / but / because / so",
    s: "把两个句子连起来：并列、转折、原因、结果。",
    b: [
      "and 并列：I like tea and coffee.",
      "but 转折：I am tired but happy.",
      "because 原因：I stay because it rains.",
      "so 结果：It rains, so I stay.",
      "连词前后是两个完整句子（都有主谓）。"
    ],
    why: "because 和 so 不能同句出现：中文「因为下雨所以我留下」，英语只能选一个 —— Because it rains, I stay. 或 It rains, so I stay. 同时用 because...so 是典型中式错误。",
    ex: [
      ["Tea **and** coffee.", "茶和咖啡。"],
      ["I am tired **but** happy.", "我累了但开心。"],
      ["I stay **because** it rains.", "我留下因为下雨。"],
      ["It rains, **so** I stay.", "下雨了，所以我留下。"],
      ["He is poor **but** kind.", "他穷但善良。"]
    ],
    err: "✗ Because it rains, so I stay.（because/so 二选一）　✓ It rains, so I stay.\n✗ I like but he.（but 连接两句子）　✓ I like it but he doesn't.\n✗ He is poor and kind.（想转折却用 and）　✓ He is poor but kind.",
    quiz: [
      { q: "I am tired ___ happy.", opts: ["and", "but", "because", "so"], a: 1, cn: "我很累，……很开心。",
        e: "转折用 but。" },
      { q: "It rains, ___ I stay.", opts: ["because", "so", "but", "and"], a: 1, cn: "下雨了，……我留下。",
        e: "结果用 so。" },
      { q: "I stay ___ it rains.", opts: ["so", "because", "but", "and"], a: 1, cn: "我留下，……下雨了。",
        e: "原因用 because。" },
      { q: "哪句有错？", opts: ["Tea and coffee.", "I am tired but happy.", "Because it rains, so I stay.", "He is poor but kind."], a: 2, cn: "下面哪一句有错误？",
        e: "because 与 so 不能同句。" },
      { q: "He can't go ___ he is busy.", opts: ["so", "but", "because", "and"], a: 2, cn: "他去不了，……他很忙。",
        e: "说明原因用 because。" }
    ]
  },
  {
    t: "第18课：量词 some / any / much / many",
    s: "可数用 many / how many，不可数用 much / how much，Some 表一些。",
    b: [
      "肯定句用 some：I have some water / some apples.",
      "疑问句和否定句用 any：Do you have any money? / I don't have any.",
      "可数复数用 many / how many：how many books.",
      "不可数用 much / how much：how much water / how much is it.",
      "a lot of 可数不可数都行：a lot of books / a lot of time。"
    ],
    why: "中文「一些水/一些书」都是一个「一些」，英语却分 some water（不可数）和 some apples（可数），问句里还要换成 any。how much 问价格或不可数，how many 问可数数量 —— 这是英语和中文最大的分叉之一。",
    ex: [
      ["I have **some** apples.", "我有一些苹果。"],
      ["Do you have **any** money?", "你有钱吗？"],
      ["**How many** books do you have?", "你有多少本书？"],
      ["**How much** water do you need?", "你要多少水？"],
      ["I have **a lot of** time.", "我有很多时间。"]
    ],
    err: "✗ How much books?（可数）　✓ How many books?\n✗ I don't have some.（否定用 any）　✓ I don't have any.\n✗ Do you have some water?（疑问用 any）　✓ Do you have any water?",
    quiz: [
      { q: "___ books do you have?", opts: ["How much", "How many", "How", "What"], a: 1, cn: "你有……书？",
        e: "可数数量用 how many。" },
      { q: "___ is it?（问价格）", opts: ["How many", "How much", "How", "What"], a: 1, cn: "这个多少钱？",
        e: "价格用 how much。" },
      { q: "I don't have ___ money.", opts: ["some", "any", "many", "a"], a: 1, cn: "我没有……钱。",
        e: "否定句用 any。" },
      { q: "Would you like ___ water?", opts: ["any", "some", "many", "much"], a: 1, cn: "你想来点……水吗？",
        e: "邀请/期待肯定回答用 some。" },
      { q: "正确的一句？", opts: ["I have many water.", "I have much apples.", "I have a lot of books.", "I have some book."], a: 2, cn: "哪一句是正确的？",
        e: "a lot of 可数不可数通用。" }
    ]
  },
  {
    t: "第19课：被动语态入门",
    s: "强调「被做什么」而不是「谁做的」：be + 过去分词。",
    b: [
      "构成：am/is/are + 过去分词（现在时被动）。",
      "The book is written by him.（这本书是他写的。）",
      "不知道或不必说主语时用被动：English is spoken worldwide.",
      "by + 动作发出者：被……由……",
      "主动 The cat ate the fish → 被动 The fish was eaten."
    ],
    why: "中文常说「饭做好了」而不说「谁做的」，英语对应被动 The meal is cooked。被动把「承受动作的东西」放主语，动词变成 be + 过去分词。初学者先记住这个形状，写作和阅读里到处都是。",
    ex: [
      ["The book **is written** by him.", "这本书是他写的。"],
      ["English **is spoken** worldwide.", "英语在世界各地被说。"],
      ["The door **is opened**.", "门被打开了。"],
      ["The fish **was eaten**.", "鱼被吃了。"],
      ["Rice **is grown** in the south.", "水稻在南方种植。"]
    ],
    err: "✗ The book is write by him.（用过去分词）　✓ is written\n✗ The book writes by him.（被动需 be）　✓ is written\n✗ The fish eat.（主动误当被动）　✓ The fish was eaten.",
    quiz: [
      { q: "The book ___ by him.", opts: ["is write", "is written", "writes", "wrote"], a: 1, cn: "这本书被他……。",
        e: "被动用 be + 过去分词 written。" },
      { q: "English ___ worldwide.", opts: ["speaks", "is speak", "is spoken", "spoke"], a: 2, cn: "英语在全世界被……。",
        e: "被动 is spoken。" },
      { q: "The door ___ opened.", opts: ["is", "are", "be", "am"], a: 0, cn: "门被……打开了。",
        e: "单数主语用 is + 过去分词。" },
      { q: "主动 The cat ate the fish 的被动是？", opts: ["The fish eats.", "The fish is eaten.", "The fish was eaten.", "The fish ate."], a: 2, cn: "主动句“猫吃了鱼”的被动语态是什么？",
        e: "过去被动用 was + eaten。" },
      { q: "正确的一句？", opts: ["The meal is cook.", "The meal is cooked.", "The meal cooks.", "The meal cooking."], a: 1, cn: "哪一句是正确的？",
        e: "被动 be + 过去分词 cooked。" }
    ]
  },
  {
    t: "第20课：条件句 if（基础）",
    s: "「如果……就……」：if + 一般现在时，主句用将来时。",
    b: [
      "结构：If + 一般现在，主句 will/can + 原形。",
      "If it rains, I will stay.（如果下雨，我就留下。）",
      "if 从句用现在时表将来，不是 will。",
      "省略 if 可用主谓倒装：Should it rain, ...（进阶）。",
      "真实条件谈可能发生的事；虚拟谈假设，先不展开。"
    ],
    why: "条件句最容易错的是 if 从句里用 will：中文「如果明天下雨我就留下」，英语 if 后面必须用现在时 If it rains，主句才用 will I will stay。记住口诀：if 从句不将来，主句才将来。",
    ex: [
      ["**If** it rains, I **will** stay.", "如果下雨我就留下。"],
      ["**If** you study, you **can** pass.", "如果你学，就能过。"],
      ["**If** he comes, we **go**.", "如果他来，我们就走。"],
      ["**If** you are late, call me.", "如果你迟到，打电话给我。"],
      ["**If** I have time, I **will** help.", "如果我有时间，我会帮忙。"]
    ],
    err: "✗ If it will rain, I stay.（if 从句不用 will）　✓ If it rains, I will stay.\n✗ If you will come, we go.（同理）　✓ If you come, we will go.\n✗ If I am rich, I will buy.（正确，但注意主句才 will）　✓ 正确。",
    quiz: [
      { q: "If it rains, I ___ stay.", opts: ["will", "am", "was", "would"], a: 0, cn: "如果下雨，我就留下。",
        e: "主句用 will，if 从句用现在时。" },
      { q: "If you ___ hard, you will pass.", opts: ["will study", "study", "studied", "are study"], a: 1, cn: "如果你努力，就会通过。",
        e: "if 从句用一般现在时。" },
      { q: "___ he comes, we will go.", opts: ["If", "Will", "When", "Because"], a: 0, cn: "他一来，我们就走。",
        e: "条件用 If 引导。" },
      { q: "哪句有错？", opts: ["If you come, we will go.", "If it rains, I will stay.", "If you will call, I answer.", "If I have time, I will help."], a: 2, cn: "下面哪一句有错误？",
        e: "if 从句不用 will。" },
      { q: "If I have money, I ___ buy it.", opts: ["will", "am", "was", "do"], a: 0, cn: "如果我有钱，我就买它。",
        e: "主句将来用 will。" }
    ]
  }
];
