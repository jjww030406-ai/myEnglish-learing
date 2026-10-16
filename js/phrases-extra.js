/* 扩展口语语料库（在 72 句基础口语之外，按 level 1–14 分级的真实常用句）。
   字段与 data.js 的 PHRASES 一致：en=英文句 cn=中文 ph=整句音标 level=所需阶段(1最易,14最难)。
   用途：网站按用户学习阶段（已掌握词数）自动把对应 level 的句子注入 PHRASES，
   永不固定 72 句；新句同时写进 Supabase 共享，库随所有用户的学习不断长大。
   想继续扩充：往这里加 {en,cn,ph,level} 即可，或以后从后端 content_phrases 表拉取。 */
var PHRASES_EXTRA = [
  // ===== level 1–2 问候 / 介绍（零基础起步） =====
  { en: "Hello, my name is Tom.", cn: "你好，我叫汤姆。", ph: "/həˈloʊ maɪ neɪm ɪz tɒm/", level: 1 },
  { en: "Nice to meet you.", cn: "很高兴认识你。", ph: "/naɪs tə miːt juː/", level: 1 },
  { en: "How are you today?", cn: "你今天好吗？", ph: "/haʊ ɑːr juː təˈdeɪ/", level: 1 },
  { en: "I am fine, thank you.", cn: "我很好，谢谢。", ph: "/aɪ æm faɪn θæŋk juː/", level: 1 },
  { en: "Good morning, everyone.", cn: "大家早上好。", ph: "/ɡʊd ˈmɔːrnɪŋ ˈevriwʌn/", level: 1 },
  { en: "See you later.", cn: "回头见。", ph: "/siː juː ˈleɪtər/", level: 1 },
  { en: "What is your name?", cn: "你叫什么名字？", ph: "/wɒt ɪz jɔːr neɪm/", level: 2 },
  { en: "I come from China.", cn: "我来自中国。", ph: "/aɪ kʌm frɒm ˈtʃaɪnə/", level: 2 },
  { en: "I am a student.", cn: "我是一名学生。", ph: "/aɪ æm ə ˈstjuːdnt/", level: 2 },
  { en: "This is my friend.", cn: "这是我的朋友。", ph: "/ðɪs ɪz maɪ frend/", level: 2 },
  { en: "Where are you from?", cn: "你来自哪里？", ph: "/wer ɑːr juː frɒm/", level: 2 },

  // ===== level 3–4 日常需求 / 礼貌 =====
  { en: "I would like a cup of coffee.", cn: "我想要一杯咖啡。", ph: "/aɪ wʊd laɪk ə kʌp əv ˈkɒfi/", level: 3 },
  { en: "Could you help me, please?", cn: "你能帮我一下吗？", ph: "/kʊd juː help miː pliːz/", level: 3 },
  { en: "I do not understand.", cn: "我不明白。", ph: "/aɪ duː nɒt ˌʌndərˈstænd/", level: 3 },
  { en: "Can you speak slowly?", cn: "你能说慢一点吗？", ph: "/kæn juː spiːk ˈsləʊli/", level: 3 },
  { en: "Please say it again.", cn: "请再说一遍。", ph: "/pliːz seɪ ɪt əˈɡen/", level: 3 },
  { en: "I am sorry to hear that.", cn: "听到这个我很遗憾。", ph: "/aɪ æm ˈsɒri tə hɪr ðæt/", level: 4 },
  { en: "Excuse me, where is the bank?", cn: "打扰一下，银行在哪？", ph: "/ɪkˈskjuːz miː wer ɪz ðə bæŋk/", level: 4 },
  { en: "How much does this cost?", cn: "这个多少钱？", ph: "/haʊ mʌtʃ dʌz ðɪs kɒst/", level: 4 },
  { en: "I want to buy some water.", cn: "我想买些水。", ph: "/aɪ wɒnt tə baɪ sʌm ˈwɔːtər/", level: 4 },

  // ===== level 5–6 购物 / 餐厅 =====
  { en: "Can I have the menu, please?", cn: "请给我菜单好吗？", ph: "/kæn aɪ hæv ðə ˈmenjuː pliːz/", level: 5 },
  { en: "I would like to order now.", cn: "我现在想点餐。", ph: "/aɪ wʊd laɪk tə ˈɔːrdər naʊ/", level: 5 },
  { en: "The food is delicious.", cn: "这食物很好吃。", ph: "/ðə fuːd ɪz dɪˈlɪʃəs/", level: 5 },
  { en: "Can I pay by card?", cn: "我能刷卡支付吗？", ph: "/kæn aɪ peɪ baɪ kɑːrd/", level: 5 },
  { en: "Do you have this in a larger size?", cn: "这个有更大号的吗？", ph: "/duː juː hæv ðɪs ɪn ə ˈlɑːrdʒər saɪz/", level: 6 },
  { en: "I am just looking, thanks.", cn: "我只是看看，谢谢。", ph: "/aɪ æm dʒʌst ˈlʊkɪŋ θæŋks/", level: 6 },
  { en: "Is there a discount today?", cn: "今天有折扣吗？", ph: "/ɪz ðer ə ˈdɪskaʊnt təˈdeɪ/", level: 6 },
  { en: "Could you wrap it as a gift?", cn: "能把它包成礼物吗？", ph: "/kʊd juː ræp ɪt æz ə ɡɪft/", level: 6 },

  // ===== level 7–8 出行 / 问路 =====
  { en: "How do I get to the station?", cn: "我怎么去车站？", ph: "/haʊ duː aɪ ɡet tə ðə ˈsteɪʃn/", level: 7 },
  { en: "Which bus goes to the airport?", cn: "哪路公交去机场？", ph: "/wɪtʃ bʌs ɡoʊz tə ði ˈerpɔːrt/", level: 7 },
  { en: "The train leaves at nine.", cn: "火车九点开。", ph: "/ðə treɪn liːvz æt naɪn/", level: 7 },
  { en: "I need to change trains.", cn: "我需要换乘火车。", ph: "/aɪ niːd tə tʃeɪndʒ treɪnz/", level: 8 },
  { en: "Is this seat taken?", cn: "这个座位有人吗？", ph: "/ɪz ðɪs siːt ˈteɪkən/", level: 8 },
  { en: "How long is the flight?", cn: "飞行要多久？", ph: "/haʊ lɒŋ ɪz ðə flaɪt/", level: 8 },
  { en: "I would like a window seat.", cn: "我想要靠窗的座位。", ph: "/aɪ wʊd laɪk ə ˈwɪndoʊ siːt/", level: 8 },

  // ===== level 9–10 工作 / 时间 / 请求 =====
  { en: "I have a meeting at three.", cn: "我三点有个会。", ph: "/aɪ hæv ə ˈmiːtɪŋ æt θriː/", level: 9 },
  { en: "Can we reschedule the call?", cn: "我们能重新安排通话吗？", ph: "/kæn wiː riːˈskedʒuːl ðə kɔːl/", level: 9 },
  { en: "Please send me the file.", cn: "请把文件发给我。", ph: "/pliːz send miː ðə faɪl/", level: 9 },
  { en: "I will finish it by Friday.", cn: "我会在周五前完成。", ph: "/aɪ wɪl ˈfɪnɪʃ ɪt baɪ ˈfraɪdeɪ/", level: 10 },
  { en: "Could you explain that again?", cn: "你能再解释一遍吗？", ph: "/kʊd juː ɪkˈspleɪn ðæt əˈɡen/", level: 10 },
  { en: "Let us discuss this tomorrow.", cn: "我们明天讨论这个吧。", ph: "/let ʌs dɪˈskʌs ðɪs təˈmɒroʊ/", level: 10 },

  // ===== level 11–12 健康 / 社交 / 建议 =====
  { en: "I have a bit of a headache.", cn: "我有点头痛。", ph: "/aɪ hæv ə bɪt əv ə ˈhedeɪk/", level: 11 },
  { en: "You should see a doctor.", cn: "你应该去看医生。", ph: "/juː ʃʊd siː ə ˈdɒktər/", level: 11 },
  { en: "I recommend this restaurant.", cn: "我推荐这家餐厅。", ph: "/aɪ ˌrekəˈmend ðɪs ˈrestrɒnt/", level: 11 },
  { en: "What do you think about it?", cn: "你觉得这个怎么样？", ph: "/wɒt duː juː θɪŋk əˈbaʊt ɪt/", level: 12 },
  { en: "We should keep in touch.", cn: "我们应该保持联系。", ph: "/wiː ʃʊd kiːp ɪn tʌtʃ/", level: 12 },
  { en: "I am looking forward to it.", cn: "我很期待这件事。", ph: "/aɪ æm ˈlʊkɪŋ ˈfɔːrwərd tuː ɪt/", level: 12 },

  // ===== level 13–14 自由交流 / 复杂表达 =====
  { en: "To be honest, I disagree with you.", cn: "说实话，我不同意你的看法。", ph: "/tə biː ˈɒnɪst aɪ ˌdɪsəˈɡriː wɪð juː/", level: 13 },
  { en: "I was wondering if you could help.", cn: "我想知道你能否帮忙。", ph: "/aɪ wəz ˈwʌndərɪŋ ɪf juː kʊd help/", level: 13 },
  { en: "It depends on the situation.", cn: "这要看具体情况。", ph: "/ɪt dɪˈpendz ɒn ðə ˌsɪtʃuˈeɪʃn/", level: 13 },
  { en: "Let me know if you need anything.", cn: "需要什么随时告诉我。", ph: "/let miː noʊ ɪf juː niːd ˈeniθɪŋ/", level: 14 },
  { en: "I appreciate your taking the time.", cn: "我很感激你抽出时间。", ph: "/aɪ əˈpriːʃieɪt jɔːr ˈteɪkɪŋ ðə taɪm/", level: 14 },
  { en: "We can work something out together.", cn: "我们可以一起想办法解决。", ph: "/wiː kæn wɜːk ˈsʌmθɪŋ aʊt təˈɡeðər/", level: 14 }
];
