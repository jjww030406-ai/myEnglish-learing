/* 拼句打字句库（由 make_sentences.py 用 AI 生成，可重新跑脚本追加）
   结构：{id, en, cn, words:[{w, ipa, role, cn}]} */
const SENTENCES = [
 {
  "en": "Good morning.",
  "cn": "早上好。",
  "words": [
   {
    "w": "Good",
    "ipa": "/ɡʊd/",
    "role": "定语",
    "cn": "好的"
   },
   {
    "w": "morning",
    "ipa": "/ˈmɔːrnɪŋ/",
    "role": "主语",
    "cn": "早晨"
   }
  ],
  "id": "sent_1"
 },
 {
  "en": "I am a student.",
  "cn": "我是一名学生。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "am",
    "ipa": "/æm/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "a student",
    "ipa": "/ə/",
    "role": "补语",
    "cn": "一名学生"
   }
  ],
  "id": "sent_2"
 },
 {
  "en": "This is my family.",
  "cn": "这是我的家庭。",
  "words": [
   {
    "w": "This",
    "ipa": "/ðɪs/",
    "role": "主语",
    "cn": "这个"
   },
   {
    "w": "is",
    "ipa": "/ɪz/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "my family",
    "ipa": "/maɪ/",
    "role": "补语",
    "cn": "我的家庭"
   }
  ],
  "id": "sent_3"
 },
 {
  "en": "I like fresh apples.",
  "cn": "我喜欢吃新鲜的苹果。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "like",
    "ipa": "/laɪk/",
    "role": "谓语",
    "cn": "喜欢"
   },
   {
    "w": "fresh apples",
    "ipa": "/freʃ/",
    "role": "宾语",
    "cn": "新鲜的苹果"
   }
  ],
  "id": "sent_4"
 },
 {
  "en": "We go to school.",
  "cn": "我们去上学。",
  "words": [
   {
    "w": "We",
    "ipa": "/wiː/",
    "role": "主语",
    "cn": "我们"
   },
   {
    "w": "go",
    "ipa": "/ɡoʊ/",
    "role": "谓语",
    "cn": "去"
   },
   {
    "w": "to school",
    "ipa": "/tuː/",
    "role": "状语",
    "cn": "去学校"
   }
  ],
  "id": "sent_5"
 },
 {
  "en": "The weather is nice today.",
  "cn": "今天天气很好。",
  "words": [
   {
    "w": "The weather",
    "ipa": "/ðə/",
    "role": "主语",
    "cn": "天气"
   },
   {
    "w": "is",
    "ipa": "/ɪz/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "nice",
    "ipa": "/naɪs/",
    "role": "补语",
    "cn": "好的"
   },
   {
    "w": "today",
    "ipa": "/təˈdeɪ/",
    "role": "状语",
    "cn": "今天"
   }
  ],
  "id": "sent_6"
 },
 {
  "en": "My mother cooks dinner every evening.",
  "cn": "我妈妈每天傍晚做晚饭。",
  "words": [
   {
    "w": "My mother",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我的妈妈"
   },
   {
    "w": "cooks",
    "ipa": "/kʊks/",
    "role": "谓语",
    "cn": "做饭"
   },
   {
    "w": "dinner",
    "ipa": "/ˈdɪnər/",
    "role": "宾语",
    "cn": "晚饭"
   },
   {
    "w": "every evening",
    "ipa": "/ˈevri/",
    "role": "状语",
    "cn": "每天傍晚"
   }
  ],
  "id": "sent_7"
 },
 {
  "en": "I get up at six every morning.",
  "cn": "我每天早上六点起床。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "get up",
    "ipa": "/ɡet/",
    "role": "谓语",
    "cn": "起床"
   },
   {
    "w": "at six",
    "ipa": "/æt/",
    "role": "状语",
    "cn": "在六点"
   },
   {
    "w": "every morning",
    "ipa": "/ˈevri/",
    "role": "状语",
    "cn": "每天早上"
   }
  ],
  "id": "sent_8"
 },
 {
  "en": "My father works in a big hospital.",
  "cn": "我爸爸在一家大医院工作。",
  "words": [
   {
    "w": "My father",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我的爸爸"
   },
   {
    "w": "works",
    "ipa": "/wɜːrks/",
    "role": "谓语",
    "cn": "工作"
   },
   {
    "w": "in a big hospital",
    "ipa": "/ɪn/",
    "role": "状语",
    "cn": "在一家大医院"
   }
  ],
  "id": "sent_9"
 },
 {
  "en": "I often play basketball with my friends.",
  "cn": "我经常和我的朋友们打篮球。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "often",
    "ipa": "/ˈɔːfn/",
    "role": "状语",
    "cn": "经常"
   },
   {
    "w": "play",
    "ipa": "/pleɪ/",
    "role": "谓语",
    "cn": "打，玩"
   },
   {
    "w": "basketball",
    "ipa": "/ˈbæskɪtbɔːl/",
    "role": "宾语",
    "cn": "篮球"
   },
   {
    "w": "with my friends",
    "ipa": "/wɪð/",
    "role": "状语",
    "cn": "和我的朋友们"
   }
  ],
  "id": "sent_10"
 },
 {
  "en": "My sister likes listening to music after school.",
  "cn": "我妹妹喜欢放学后听音乐。",
  "words": [
   {
    "w": "My sister",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我的妹妹"
   },
   {
    "w": "likes",
    "ipa": "/laɪks/",
    "role": "谓语",
    "cn": "喜欢"
   },
   {
    "w": "listening to music",
    "ipa": "/ˈlɪsnɪŋ/",
    "role": "宾语",
    "cn": "听音乐"
   },
   {
    "w": "after school",
    "ipa": "/ˈæftər/",
    "role": "状语",
    "cn": "放学后"
   }
  ],
  "id": "sent_11"
 },
 {
  "en": "We have bread and eggs for breakfast every day.",
  "cn": "我们每天早饭吃面包和鸡蛋。",
  "words": [
   {
    "w": "We",
    "ipa": "/wiː/",
    "role": "主语",
    "cn": "我们"
   },
   {
    "w": "have",
    "ipa": "/hæv/",
    "role": "谓语",
    "cn": "吃，有"
   },
   {
    "w": "bread and eggs",
    "ipa": "/bred/",
    "role": "宾语",
    "cn": "面包和鸡蛋"
   },
   {
    "w": "for breakfast",
    "ipa": "/fɔːr/",
    "role": "状语",
    "cn": "作为早饭"
   },
   {
    "w": "every day",
    "ipa": "/ˈevri/",
    "role": "状语",
    "cn": "每天"
   }
  ],
  "id": "sent_12"
 },
 {
  "en": "Hello, how are you?",
  "cn": "你好，你好吗？",
  "words": [
   {
    "w": "Hello",
    "ipa": "/həˈloʊ/",
    "role": "补语",
    "cn": "你好"
   },
   {
    "w": "how",
    "ipa": "/haʊ/",
    "role": "状语",
    "cn": "怎样"
   },
   {
    "w": "are",
    "ipa": "/ɑːr/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "you",
    "ipa": "/juː/",
    "role": "主语",
    "cn": "你"
   }
  ],
  "id": "sent_13"
 },
 {
  "en": "This is my mother.",
  "cn": "这是我的妈妈。",
  "words": [
   {
    "w": "This",
    "ipa": "/ðɪs/",
    "role": "主语",
    "cn": "这个"
   },
   {
    "w": "is",
    "ipa": "/ɪz/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "my mother",
    "ipa": "/maɪ/",
    "role": "补语",
    "cn": "我的妈妈"
   }
  ],
  "id": "sent_14"
 },
 {
  "en": "I get up at seven every morning.",
  "cn": "我每天早上七点起床。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "get up",
    "ipa": "/ɡet/",
    "role": "谓语",
    "cn": "起床"
   },
   {
    "w": "at seven",
    "ipa": "/æt/",
    "role": "状语",
    "cn": "在七点"
   },
   {
    "w": "every morning",
    "ipa": "/ˈevri/",
    "role": "状语",
    "cn": "每天早上"
   }
  ],
  "id": "sent_15"
 },
 {
  "en": "My father cooks dinner for us.",
  "cn": "我爸爸给我们做晚饭。",
  "words": [
   {
    "w": "My father",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我的爸爸"
   },
   {
    "w": "cooks",
    "ipa": "/kʊks/",
    "role": "谓语",
    "cn": "烹饪"
   },
   {
    "w": "dinner",
    "ipa": "/ˈdɪnər/",
    "role": "宾语",
    "cn": "晚饭"
   },
   {
    "w": "for us",
    "ipa": "/fɔːr/",
    "role": "状语",
    "cn": "为我们"
   }
  ],
  "id": "sent_16"
 },
 {
  "en": "She likes listening to music after school.",
  "cn": "她喜欢放学后听音乐。",
  "words": [
   {
    "w": "She",
    "ipa": "/ʃiː/",
    "role": "主语",
    "cn": "她"
   },
   {
    "w": "likes",
    "ipa": "/laɪks/",
    "role": "谓语",
    "cn": "喜欢"
   },
   {
    "w": "listening to music",
    "ipa": "/ˈlɪsənɪŋ/",
    "role": "宾语",
    "cn": "听音乐"
   },
   {
    "w": "after school",
    "ipa": "/ˈæftər/",
    "role": "状语",
    "cn": "放学后"
   }
  ],
  "id": "sent_17"
 },
 {
  "en": "We eat rice and vegetables for lunch.",
  "cn": "我们午饭吃米饭和蔬菜。",
  "words": [
   {
    "w": "We",
    "ipa": "/wiː/",
    "role": "主语",
    "cn": "我们"
   },
   {
    "w": "eat",
    "ipa": "/iːt/",
    "role": "谓语",
    "cn": "吃"
   },
   {
    "w": "rice and vegetables",
    "ipa": "/raɪs/",
    "role": "宾语",
    "cn": "米饭和蔬菜"
   },
   {
    "w": "for lunch",
    "ipa": "/fɔːr/",
    "role": "状语",
    "cn": "作为午饭"
   }
  ],
  "id": "sent_18"
 },
 {
  "en": "My sister goes to bed at ten every night.",
  "cn": "我妹妹每天晚上十点睡觉。",
  "words": [
   {
    "w": "My sister",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我的妹妹"
   },
   {
    "w": "goes to bed",
    "ipa": "/ɡoʊz/",
    "role": "谓语",
    "cn": "上床睡觉"
   },
   {
    "w": "at ten",
    "ipa": "/æt/",
    "role": "状语",
    "cn": "在十点"
   },
   {
    "w": "every night",
    "ipa": "/ˈevri/",
    "role": "状语",
    "cn": "每天晚上"
   }
  ],
  "id": "sent_19"
 },
 {
  "en": "I usually play basketball with my friends on weekends.",
  "cn": "我通常周末和朋友们打篮球。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "usually",
    "ipa": "/ˈjuːʒuəli/",
    "role": "状语",
    "cn": "通常"
   },
   {
    "w": "play",
    "ipa": "/pleɪ/",
    "role": "谓语",
    "cn": "打（球）"
   },
   {
    "w": "basketball",
    "ipa": "/ˈbæskɪtbɔːl/",
    "role": "宾语",
    "cn": "篮球"
   },
   {
    "w": "with my friends",
    "ipa": "/wɪð/",
    "role": "状语",
    "cn": "和我的朋友们"
   },
   {
    "w": "on weekends",
    "ipa": "/ɑːn/",
    "role": "状语",
    "cn": "在周末"
   }
  ],
  "id": "sent_20"
 },
 {
  "en": "I am Tom.",
  "cn": "我是汤姆。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "am",
    "ipa": "/æm/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "Tom",
    "ipa": "/tɒm/",
    "role": "补语",
    "cn": "汤姆"
   }
  ],
  "id": "sent_21"
 },
 {
  "en": "Good morning, Miss Li.",
  "cn": "早上好，李老师。",
  "words": [
   {
    "w": "Good morning",
    "ipa": "/ɡʊd/",
    "role": "状语",
    "cn": "早上好"
   },
   {
    "w": "Miss Li",
    "ipa": "/mɪs/",
    "role": "主语",
    "cn": "李老师"
   }
  ],
  "id": "sent_22"
 },
 {
  "en": "I like rice and fish.",
  "cn": "我喜欢米饭和鱼。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "like",
    "ipa": "/laɪk/",
    "role": "谓语",
    "cn": "喜欢"
   },
   {
    "w": "rice and fish",
    "ipa": "/raɪs/",
    "role": "宾语",
    "cn": "米饭和鱼"
   }
  ],
  "id": "sent_23"
 },
 {
  "en": "It is a sunny day.",
  "cn": "今天是个晴天。",
  "words": [
   {
    "w": "It",
    "ipa": "/ɪt/",
    "role": "主语",
    "cn": "它（指天气）"
   },
   {
    "w": "is",
    "ipa": "/ɪz/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "a sunny day",
    "ipa": "/ə/",
    "role": "补语",
    "cn": "一个晴天"
   }
  ],
  "id": "sent_24"
 },
 {
  "en": "My father is a kind doctor.",
  "cn": "我爸爸是一位和蔼的医生。",
  "words": [
   {
    "w": "My father",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我爸爸"
   },
   {
    "w": "is",
    "ipa": "/ɪz/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "a kind doctor",
    "ipa": "/ə/",
    "role": "补语",
    "cn": "一位和蔼的医生"
   }
  ],
  "id": "sent_25"
 },
 {
  "en": "We have four classes in the morning.",
  "cn": "我们上午有四节课。",
  "words": [
   {
    "w": "We",
    "ipa": "/wiː/",
    "role": "主语",
    "cn": "我们"
   },
   {
    "w": "have",
    "ipa": "/hæv/",
    "role": "谓语",
    "cn": "有"
   },
   {
    "w": "four classes",
    "ipa": "/fɔː/",
    "role": "宾语",
    "cn": "四节课"
   },
   {
    "w": "in the morning",
    "ipa": "/ɪn/",
    "role": "状语",
    "cn": "在上午"
   }
  ],
  "id": "sent_26"
 },
 {
  "en": "My sister and I like reading books at home.",
  "cn": "我妹妹和我喜欢在家看书。",
  "words": [
   {
    "w": "My sister and I",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我妹妹和我"
   },
   {
    "w": "like",
    "ipa": "/laɪk/",
    "role": "谓语",
    "cn": "喜欢"
   },
   {
    "w": "reading books",
    "ipa": "/ˈriːdɪŋ/",
    "role": "宾语",
    "cn": "看书"
   },
   {
    "w": "at home",
    "ipa": "/æt/",
    "role": "状语",
    "cn": "在家"
   }
  ],
  "id": "sent_27"
 },
 {
  "en": "Hi, nice to meet you.",
  "cn": "你好，很高兴认识你。",
  "words": [
   {
    "w": "Hi",
    "ipa": "/haɪ/",
    "role": "补语",
    "cn": "你好"
   },
   {
    "w": "nice",
    "ipa": "/naɪs/",
    "role": "谓语",
    "cn": "高兴的"
   },
   {
    "w": "to meet",
    "ipa": "/tuː/",
    "role": "状语",
    "cn": "见到"
   },
   {
    "w": "you",
    "ipa": "/juː/",
    "role": "宾语",
    "cn": "你"
   }
  ],
  "id": "sent_28"
 },
 {
  "en": "We have four classes today.",
  "cn": "我们今天有四节课。",
  "words": [
   {
    "w": "We",
    "ipa": "/wiː/",
    "role": "主语",
    "cn": "我们"
   },
   {
    "w": "have",
    "ipa": "/hæv/",
    "role": "谓语",
    "cn": "有"
   },
   {
    "w": "four classes",
    "ipa": "/fɔːr/",
    "role": "宾语",
    "cn": "四节课"
   },
   {
    "w": "today",
    "ipa": "/təˈdeɪ/",
    "role": "状语",
    "cn": "今天"
   }
  ],
  "id": "sent_29"
 },
 {
  "en": "The weather is very nice today.",
  "cn": "今天天气非常好。",
  "words": [
   {
    "w": "The weather",
    "ipa": "/ðə/",
    "role": "主语",
    "cn": "天气"
   },
   {
    "w": "is",
    "ipa": "/ɪz/",
    "role": "谓语",
    "cn": "是"
   },
   {
    "w": "very nice",
    "ipa": "/ˈveri/",
    "role": "补语",
    "cn": "非常好的"
   },
   {
    "w": "today",
    "ipa": "/təˈdeɪ/",
    "role": "状语",
    "cn": "今天"
   }
  ],
  "id": "sent_30"
 },
 {
  "en": "I usually play basketball after school.",
  "cn": "我通常放学后打篮球。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "usually",
    "ipa": "/ˈjuːʒuəli/",
    "role": "状语",
    "cn": "通常"
   },
   {
    "w": "play",
    "ipa": "/pleɪ/",
    "role": "谓语",
    "cn": "打（球）"
   },
   {
    "w": "basketball",
    "ipa": "/ˈbɑːskɪtbɔːl/",
    "role": "宾语",
    "cn": "篮球"
   },
   {
    "w": "after school",
    "ipa": "/ˈæftər/",
    "role": "状语",
    "cn": "放学后"
   }
  ],
  "id": "sent_31"
 },
 {
  "en": "My sister and I go to school together.",
  "cn": "我和我的姐姐一起去上学。",
  "words": [
   {
    "w": "My sister",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我的姐姐"
   },
   {
    "w": "and I",
    "ipa": "/ænd/",
    "role": "主语",
    "cn": "和我"
   },
   {
    "w": "go",
    "ipa": "/ɡoʊ/",
    "role": "谓语",
    "cn": "去"
   },
   {
    "w": "to school",
    "ipa": "/tuː/",
    "role": "状语",
    "cn": "去学校"
   },
   {
    "w": "together",
    "ipa": "/təˈɡeðər/",
    "role": "状语",
    "cn": "一起"
   }
  ],
  "id": "sent_32"
 },
 {
  "en": "I often listen to music in my room.",
  "cn": "我经常在我的房间里听音乐。",
  "words": [
   {
    "w": "I",
    "ipa": "/aɪ/",
    "role": "主语",
    "cn": "我"
   },
   {
    "w": "often",
    "ipa": "/ˈɔːfn/",
    "role": "状语",
    "cn": "经常"
   },
   {
    "w": "listen to",
    "ipa": "/ˈlɪsn/",
    "role": "谓语",
    "cn": "听"
   },
   {
    "w": "music",
    "ipa": "/ˈmjuːzɪk/",
    "role": "宾语",
    "cn": "音乐"
   },
   {
    "w": "in my room",
    "ipa": "/ɪn/",
    "role": "状语",
    "cn": "在我的房间里"
   }
  ],
  "id": "sent_33"
 },
 {
  "en": "My family eats breakfast at seven every day.",
  "cn": "我的家人每天七点吃早饭。",
  "words": [
   {
    "w": "My family",
    "ipa": "/maɪ/",
    "role": "主语",
    "cn": "我的家人"
   },
   {
    "w": "eats",
    "ipa": "/iːts/",
    "role": "谓语",
    "cn": "吃"
   },
   {
    "w": "breakfast",
    "ipa": "/ˈbrekfəst/",
    "role": "宾语",
    "cn": "早饭"
   },
   {
    "w": "at seven",
    "ipa": "/æt/",
    "role": "状语",
    "cn": "在七点"
   },
   {
    "w": "every day",
    "ipa": "/ˈevri/",
    "role": "状语",
    "cn": "每天"
   }
  ],
  "id": "sent_34"
 }
];
