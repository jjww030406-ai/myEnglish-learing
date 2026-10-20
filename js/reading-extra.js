/* 扩展阅读语料库（在 12 篇基础阅读之外，按 lv 分级的原创短文）。
   字段与 data.js 的 READING 一致：lv=难度等级 topic=主题 title=标题 en=英文 cn=中文。
   用途：viewRead 已按 lv 解锁，这里新增的短文按 lv 自动进入对应难度，库随扩充变大；
   新短文同时写进 Supabase 共享，所有用户都能读到。想继续扩充往这里加条目即可。 */
var READING_EXTRA = [
  { lv: 2, topic: "日常", title: "A busy morning",
    en: "I get up at seven. I wash my face. I eat bread and egg. Then I go to school. My day is busy but good.",
    cn: "我七点起床。我洗脸。我吃面包和鸡蛋。然后我去上学。我的一天忙碌但很好。" },
  { lv: 3, topic: "购物", title: "At the shop",
    en: "We go to the shop. The shop is big. I want an apple and milk. The apple is red. Milk is white. We pay and go home.",
    cn: "我们去商店。商店很大。我想要苹果和牛奶。苹果是红色的。牛奶是白色的。我们付钱回家。" },
  { lv: 4, topic: "天气", title: "The weather today",
    en: "Today is sunny. The sun is warm. But tomorrow is cold. We need a coat. I like warm days. Do you like snow?",
    cn: "今天是晴天。太阳很暖。但明天很冷。我们需要外套。我喜欢暖和的天气。你喜欢雪吗？" },
  { lv: 5, topic: "饮食", title: "My favorite food",
    en: "I like rice and fish. Fish is healthy. My mother cooks dinner. The food is delicious. We eat together every evening.",
    cn: "我喜欢米饭和鱼。鱼很健康。我妈妈做晚饭。食物很好吃。我们每天晚上一起吃。" },
  { lv: 6, topic: "旅行", title: "A trip to the city",
    en: "We take the train to the city. The city is large. We see tall buildings. We visit a museum. It is an interesting day.",
    cn: "我们坐火车去城市。城市很大。我们看见高楼。我们参观博物馆。这是有趣的一天。" },
  { lv: 7, topic: "健康", title: "At the hospital",
    en: "He has a fever. We go to the hospital. The doctor is kind. She gives him medicine. He feels better the next day.",
    cn: "他发烧了。我们去医院。医生很和善。她给他药。第二天他感觉好些了。" },
  { lv: 8, topic: "工作", title: "My father's job",
    en: "My father is an engineer. He works in an office. He uses a computer. He is busy but happy. He helps many people.",
    cn: "我父亲是工程师。他在办公室工作。他用电脑。他忙碌但快乐。他帮助很多人。" },
  { lv: 9, topic: "学习", title: "Learning English",
    en: "English is useful. I read and speak every day. I make mistakes, but I learn. Practice helps me improve. Never give up.",
    cn: "英语很有用。我每天读和说。我会犯错，但我学习。练习帮我进步。永不放弃。" },
  { lv: 10, topic: "友谊", title: "A good friend",
    en: "A friend listens to you. A friend helps you. We laugh and talk. Good friends are important. I am lucky to have you.",
    cn: "朋友倾听你。朋友帮助你。我们笑和聊。好朋友很重要。我很幸运有你。" },
  { lv: 11, topic: "环保", title: "Protect the earth",
    en: "The earth is our home. We should save water and power. Do not waste food. Plant more trees. A small act can help a lot.",
    cn: "地球是我们的家。我们应该节约水和电。不要浪费食物。种更多树。一个小行动能帮很多。" },
  { lv: 12, topic: "科技", title: "Phones in life",
    en: "Phones are part of life. We call, read, and learn with them. But do not use them too much. Talk to people face to face too.",
    cn: "手机是生活的一部分。我们用它们打电话、阅读、学习。但别用太多。也要和人面对面聊天。" },
  { lv: 13, topic: "梦想", title: "My dream",
    en: "I dream of traveling the world. I want to learn new languages. It takes time and work. I will try my best to make it true.",
    cn: "我梦想周游世界。我想学新语言。这需要时间和努力。我会尽力实现它。" },
  { lv: 14, topic: "观点", title: "What success means",
    en: "Success is not only money. It is doing what you love and helping others. A calm mind and good health matter more than fame.",
    cn: "成功不只是金钱。它是做你爱的事并帮助他人。平静的心态和健康的身体比名声更重要。" },
  { lv: 4, topic: "童话", title: "兔妈妈的警告（彼得兔）",
    en: "'Now my dears,' said old Mrs. Rabbit one morning, 'you may go into the fields or down the lane, but don't go into Mr. McGregor's garden: your Father had an accident there; he was put in a pie by Mrs. McGregor.'",
    cn: "一天早晨，兔妈妈对孩子们说：\"亲爱的们，你们可以去田里或小巷玩，但千万别进麦格雷戈先生的菜园——你们的爸爸就是在那儿出事的，他被麦格雷戈太太做成了馅饼。\"" },

  { lv: 4, topic: "童话", title: "彼得兔迷路了（彼得兔）",
    en: "Then he tried to find his way straight across the garden, but he became more and more puzzled. Presently, he came to a pond where Mr. McGregor filled his water-cans. A white cat was staring at some gold-fish, she sat very, very still, but now and then the tip of her tail twitched as if it were alive. Peter thought it best to go away without speaking to her; he had heard about cats from his cousin, little Benjamin Bunny.",
    cn: "接着他想直接穿过菜园找回去的路，却越走越糊涂。不久，他来到一个池塘边，那是麦格雷戈先生打水的地方。一只白猫正盯着几尾金鱼，她一动不动地坐着，只有尾巴尖偶尔抽动一下，仿佛有了生命。彼得觉得最好还是不声不响地走开——他从表弟小本杰明兔那儿听说过猫的事。" },

  { lv: 5, topic: "寓言", title: "狮子和老鼠（伊索寓言）",
    en: "A LION was awakened from sleep by a Mouse running over his face. Rising up angrily, he caught him and was about to kill him, when the Mouse piteously entreated, saying: \"If you would only spare my life, I would be sure to repay your kindness.\" The Lion laughed and let him go. It happened shortly after this that the Lion was caught by some hunters, who bound him by strong ropes to the ground. The Mouse, recognizing his roar, came and gnawed the rope with his teeth, and set him free, exclaiming: \"You ridiculed the idea of my ever being able to help you, not expecting to receive from me any repayment of your favour; now you know that it is possible for even a Mouse to confer benefits on a Lion.\"",
    cn: "一只狮子正在睡觉，被一只从他脸上跑过的小老鼠吵醒了。狮子怒气冲冲地站起来，一把抓住老鼠，正要弄死他，老鼠可怜巴巴地哀求道：\"只要你肯饶我一命，我一定报答你的恩情。\"狮子笑了笑，把他放了。不久之后，狮子被几个猎人抓住，用粗绳子绑在地上。老鼠听出了他的吼声，跑来用牙齿咬断绳子，把狮子救了出来，喊道：\"你曾嘲笑我绝不可能帮到你、没想到我会报恩；现在你该明白了，哪怕是一只老鼠，也能对狮子施以恩惠。\"" },

  { lv: 5, topic: "寓言", title: "狼和小羊（伊索寓言）",
    en: "WOLF, meeting with a Lamb astray from the fold, resolved not to lay violent hands on him, but to find some plea to justify to the Lamb the Wolf's right to eat him. He thus addressed him: \"Sirrah, last year you grossly insulted me.\" \"Indeed,\" bleated the Lamb in a mournful tone of voice, \"I was not then born.\" Then said the Wolf, \"You feed in my pasture.\" \"No, good sir,\" replied the Lamb, \"I have not yet tasted grass.\" Again said the Wolf, \"You drink of my well.\" \"No,\" exclaimed the Lamb, \"I never yet drank water, for as yet my mother's milk is both food and drink to me.\" Upon which the Wolf seized him and ate him up, saying, \"Well! I won't remain supperless, even though you refute every one of my imputations.\" The tyrant will always find a pretext for his tyranny.",
    cn: "一只狼遇见一只离群的小羊，本想直接下手，却找了个借口，好让吃羊显得理直气壮。他对小羊说：\"小子，去年你狠狠侮辱过我。\"\"真的吗，\"小羊哀怨地叫道，\"可那时我还没出生呢。\"狼又说：\"你在我的草场上吃草。\"\"没有，先生，\"小羊答道，\"我还没尝过草的滋味。\"狼再说道：\"你喝我家井里的水。\"\"没有，\"小羊喊道，\"我至今没喝过水，妈妈的奶既是我的饭也是我的水。\"于是狼扑上去把小羊吃掉，说：\"哼！哪怕你驳倒我每一条罪状，我也绝不吃空这顿晚饭。\"暴君总能给自己的暴行找到借口。" },

  { lv: 5, topic: "寓言", title: "一捆树枝（伊索寓言）",
    en: "A FATHER had a family of sons who were perpetually quarreling among themselves. When he failed to heal their disputes by his exhortations, he determined to give them a practical illustration of the evils of disunion; and for this purpose he one day told them to bring him a bundle of sticks. When they had done so, he placed the faggot into the hands of each of them in succession, and ordered them to break it in pieces. They tried with all their strength, and were not able to do it. He next opened the faggot, took the sticks separately, one by one, and again put them into his sons' hands, upon which they broke them easily. He then addressed them in these words: \"My sons, if you are of one mind, and unite to assist each other, you will be as this faggot, uninjured by all the attempts of your enemies; but if you are divided among yourselves, you will be broken as easily as these sticks.\"",
    cn: "一位父亲有几个儿子，成天吵个不休。劝说无效后，他决定用实际的一课让他们明白不团结的害处。一天，他让儿子们去拿来一捆树枝。等他们拿来，他把这捆柴依次交到每人手里，叫他们折断。儿子们用尽全力，谁也折不断。父亲于是打开那捆柴，把树枝一根根分开，再放到儿子们手里，这下他们轻轻松松就折断了。父亲对他们说：\"孩子们，只要你们一条心、互相扶持，就会像这捆柴一样，任凭敌人怎么折腾也伤不了你们；可要是各怀心思、四分五裂，你们就会像这些树枝一样，轻易被人折断。\"" },

  { lv: 7, topic: "童话", title: "金鸟（格林童话）",
    en: "A certain king had a beautiful garden, and in the garden stood a tree which bore golden apples. These apples were always counted, and about the time when they began to grow ripe it was found that every night one of them was gone. The king became very angry at this, and ordered the gardener to keep watch all night under the tree. The gardener set his eldest son to watch; but about twelve o'clock he fell asleep, and in the morning another of the apples was missing. Then the second son was ordered to watch; and at midnight he too fell asleep, and in the morning another apple was gone. Then the third son offered to keep watch; but the gardener at first would not let him, for fear some harm should come to him: however, at last he consented, and the young man laid himself under the tree to watch. As the clock struck twelve he heard a rustling noise in the air, and a bird came flying that was of pure gold; and as it was snapping at one of the apples with its beak, the gardener's son jumped up and shot an arrow at it. But the arrow did the bird no harm; only it dropped a golden feather from its tail, and then flew away. The golden feather was brought to the king in the morning, and all the council was called together. Everyone agreed that it was worth more than all the wealth of the kingdom: but the king said, 'One feather is of no use to me, I must have the whole bird.'",
    cn: "从前有位国王，他有一座美丽的花园，园里有一棵会结金苹果的金树。金苹果每天都要清点，可每到苹果快熟的时候，总会发现每晚少一个。国王大怒，命令园丁整夜守在树下。园丁派大儿子去守，可到了十二点他就睡着了，早上又少了一个苹果。二儿子接着去守，半夜也睡着了，早上再少一个。小儿子自告奋勇去守，园丁起初怕他出事不肯，最后还是答应了。小伙子躺在树下守着。钟敲十二下时，他听见空中一阵沙沙声，一只纯金做的鸟飞了过来，正要用喙啄苹果，园丁的儿子跳起来朝它射了一箭。箭没伤着鸟，只让它从尾巴上掉下一根金羽毛，便飞走了。早上金羽毛被献给国王，大臣们全都召来商议。大家都说这根羽毛比全国的财富还值钱，可国王说：\"一根羽毛对我没用，我要的是整只鸟。\"" },

  { lv: 8, topic: "经典", title: "掉进兔子洞（爱丽丝漫游奇境）",
    en: "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it. The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.",
    cn: "爱丽丝坐在河岸上，看着姐姐，开始觉得又累又无聊——她什么事也没有，只偶尔瞥一眼姐姐读的书，可那本书既没有图画，也没有对话。兔子洞先像隧道一样笔直向前，接着突然向下一沉，沉得那么突然，爱丽丝根本来不及想要停下，就发现自己正跌进一口很深的井里。" },

  { lv: 8, topic: "经典", title: "多萝西的家（绿野仙踪）",
    en: "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife. Their house was small, for the lumber to build it had to be carried by wagon many miles. There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds. Uncle Henry and Aunt Em had a big bed in one corner, and Dorothy a little bed in another corner. There was no garret at all, and no cellar—except a small hole dug in the ground, called a cyclone cellar, where the family could go in case one of those great whirlwinds arose, mighty enough to crush any building in its path.",
    cn: "多萝西住在大堪萨斯草原的中央，和叔叔亨利、婶婶艾姆一起生活。亨利叔叔是农夫，艾姆婶婶是农夫的妻子。他们的房子很小，因为盖房子的木材得用马车从老远运来。房子只有四面墙、一个地板和屋顶，合成一间屋；屋里有一只锈迹斑斑的炉子、一个放碗碟的橱柜、一张桌子、三四把椅子，还有床。亨利叔叔和艾姆婶婶睡屋角一张大床，多萝西睡另一角的小床。房子里没有阁楼，也没有地窖——只除了地上挖的一个小洞，叫\"旋风地窖\"，万一那种能把沿途一切建筑都碾碎的巨型旋风袭来，全家人就可以躲进去。" },

  { lv: 8, topic: "经典", title: "灰色的草原（绿野仙踪）",
    en: "When Dorothy stood in the doorway and looked around, she could see nothing but the great gray prairie on every side. Not a tree nor a house broke the broad sweep of flat country that reached to the edge of the sky in all directions. The sun had baked the plowed land into a gray mass, with little cracks running through it. Even the grass was not green, for the sun had burned the tops of the long blades until they were the same gray color to be seen everywhere. Once the house had been painted, but the sun blistered the paint and the rains washed it away, and now the house was as dull and gray as everything else.",
    cn: "多萝西站在门口四处张望，目之所及，四面八方都是茫茫的灰色草原。没有一棵树、也没有一栋房子，打破这片一直延伸到天边的平坦原野。太阳把耕过的土地烤成一片灰白，上面裂开一道道小缝。连草也不再翠绿，因为太阳把长草的尖儿都晒成了和到处一样的灰色。这房子曾经刷过漆，可太阳把油漆晒得起了泡，雨水又把它冲掉，如今房子和周围的一切一样，灰扑扑的。" },

  { lv: 10, topic: "经典", title: "波莉姨妈找汤姆（汤姆·索亚历险记）",
    en: "The old lady pulled her spectacles down and looked over them about the room; then she put them up and looked out under them. She seldom or never looked through them for so small a thing as a boy; they were her state pair, the pride of her heart, and were built for \"style,\" not service—she could have seen through a pair of stove-lids just as well. She looked perplexed for a moment, and then said, not fiercely, but still loud enough for the furniture to hear:",
    cn: "老太太把眼镜往鼻梁下一拉，从镜框上方扫视了一圈屋子；接着又把眼镜推上去，从镜框底下往外看。对于一个男孩子这么小的\"物件\"，她几乎从不用镜片去瞧——这副眼镜是她的体面家当、心头之宝，讲究的是\"派头\"而非实用，哪怕拿两块炉盖当眼镜，她照样看得清。她先是一脸困惑，停顿片刻，然后开口了，声音倒不凶，却大得连家具都听得见：" },

  { lv: 11, topic: "冒险", title: "在海上出生（珊瑚岛）",
    en: "It was a wild, black night of howling storm, the night in which I was born on the foaming bosom of the broad Atlantic Ocean. My father was a sea-captain; my grandfather was a sea-captain; my great-grandfather had been a marine. Nobody could tell positively what occupation his father had followed; but my dear mother used to assert that he had been a midshipman, whose grandfather, on the mother's side, had been an admiral in the royal navy. At any rate we knew that, as far back as our family could be traced, it had been intimately connected with the great watery waste. Indeed this was the case on both sides of the house; for my mother always went to sea with my father on his long voyages, and so spent the greater part of her life upon the water.",
    cn: "那是一个狂风怒号、漆黑一片的夜晚，我就出生在波涛汹涌的大西洋宽阔的怀抱里。我父亲是船长，祖父是船长，曾祖父是海军陆战队员。再往上，谁也说不清我曾祖父的父亲干过什么行当；不过我亲爱的母亲总说，他当过海军候补少尉，而那位少尉的外祖父，曾是皇家海军的一名上将。无论如何我们知道，自家族有记载起，就与那片汪洋密不可分。事实上，父母两边都是如此——母亲总随父亲远航，一生大半时光都在水上度过。" },

  { lv: 12, topic: "侦探", title: "华生的阿富汗岁月（福尔摩斯）",
    en: "In the year 1878 I took my degree of Doctor of Medicine of the University of London, and proceeded to Netley to go through the course prescribed for surgeons in the army. Having completed my studies there, I was duly attached to the Fifth Northumberland Fusiliers as Assistant Surgeon. The regiment was stationed in India at the time, and before I could join it, the second Afghan war had broken out. On landing at Bombay, I learned that my corps had advanced through the passes, and was already deep in the enemy's country. I followed, however, with many other officers who were in the same situation as myself, and succeeded in reaching Candahar in safety, where I found my regiment, and at once entered upon my new duties.",
    cn: "一八七八年，我在伦敦大学取得医学博士学位，随后前往内特利，修完陆军外科医生规定的课程。学业结束后，我被正式分配到第五诺森伯兰燧发枪团，担任助理军医。当时团队驻扎在印度，我还没赶上归队，第二次阿富汗战争就爆发了。在孟买一上岸，我便得知我所在的部队已经翻过山口，深入敌境。于是我和其他处境相同的军官一起追赶，终于安全抵达坎大哈，找到了自己的团队，立刻投入了新的工作。" },

  { lv: 13, topic: "侦探", title: "伦敦的独居（福尔摩斯）",
    en: "I had neither kith nor kin in England, and was therefore as free as air—or as free as an income of eleven shillings and sixpence a day will permit a man to be. Under such circumstances, I naturally gravitated to London, that great cesspool into which all the loungers and idlers of the Empire are irresistibly drained. There I stayed for some time at a private hotel in the Strand, leading a comfortless, meaningless existence, and spending such money as I had, considerably more freely than I ought. So alarming did the state of my finances become, that I soon realized that I must either leave the metropolis and rusticate somewhere in the country, or that I must make a complete alteration in my style of living.",
    cn: "我在英国既无亲也无故，因此自由得像空气——或者说，自由得像每天十一先令六便士的收入所能允许的那样。在这种情况下，我自然而然地被吸引到了伦敦，那座巨大的\"污水池\"，帝国里所有游手好闲之徒都身不由己地被吸纳进去。我在斯特兰德街的一家私人旅馆住了些时候，过着毫无乐趣、漫无目的的生活，手里的钱花得远比该花的随意。我的财务状况很快就糟到吓人的地步，我很快意识到：要么离开这座大都市，到乡间蛰居；要么彻底改变生活方式。" },

];
