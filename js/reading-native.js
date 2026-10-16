/* 阅读语料口语化重写
   ------------------------------------------------------------------
   原来的阅读短文是「单词书英语」：句子极短、主谓宾刻板（I eat food. We are happy.），
   语法没错，但读起来不像人话，也学不到真实表达。
   这里按 title 一一对应，把每篇的英文/中文替换成 native 会那么说的版本：
   lv 低（1–5）保持句子短、词汇简单，但说话方式自然；
   lv 高（6+）加入对话感、缩读（gonna）、地道搭配（grab / check out / make up）。

   用「原地替换」而不是新增篇目：title、lv 都不变，
   所以「已读记录」「按等级解锁」完全不受影响，老用户进度零损失。
   想继续润色：改下面 UPDATES 里对应 title 的 en / cn 即可。
*/
(function () {
  var UPDATES = {
    /* ---------- 基础 12 篇（lv 1–5） ---------- */
    "My name is Tom": {
      en: "Hi! I'm Tom. I'm a student. I like my school a lot. My best friend is Li. We play together every day.",
      cn: "嗨！我是汤姆。我是学生。我特别喜欢我们学校。我最好的朋友是李。我们每天一起玩。" },
    "This is my mother": {
      en: "Morning! I'm Mary. This is my mom. She's a teacher, and she's really good at it. I'm lucky to have her.",
      cn: "早上好！我是玛丽。这是我妈妈。她是老师，而且教得特别好。有她当妈妈我很幸运。" },
    "My cat and dog": {
      en: "I have a cat and a dog. The cat is small and kind of lazy. The dog is big and super friendly. They get along well.",
      cn: "我养了一只猫和一只狗。猫小小懒懒的，狗很大只、特别亲人。它们相处得很好。" },
    "We go to school": {
      en: "It's a school day. Dad is still at home, and Mom's a teacher — she left early. I love my family. We always eat breakfast together.",
      cn: "今天要上学。爸爸还在家，妈妈是老师——她走得早。我爱我家，我们总是一起吃早餐。" },
    "Food and water": {
      en: "I'm hungry, so I'm making a sandwich. My friend just wants an apple and some water. Apples are our favorite. It's a nice day.",
      cn: "我饿了，正准备做个三明治。我的朋友只要了一个苹果和一杯水。苹果是我们俩的最爱。今天天气不错。" },
    "I want water": {
      en: "I'm thirsty — I really want some water. We grab some food at school too. My friend is coming over later. Good day so far!",
      cn: "我渴了，特别想喝水。我们还在学校买了点吃的。我的朋友等会儿要来。目前真是美好的一天！" },
    "My sister": {
      en: "My parents are at work, and I'm at school. My little sister stays home — she loves my books. It's a quiet day.",
      cn: "爸妈上班，我上学。小妹妹待在家里——她总爱翻我的书。今天是安静的一天。" },
    "He helps me": {
      en: "I ran into my friend today. He helped me with my homework, and we grabbed some food after. Even my dog came to say hi. What a day!",
      cn: "今天我碰到了朋友。他帮我补习了作业，之后我们一起吃了点东西。连我家狗都跑来打招呼。真是不错的一天！" },
    "A good day": {
      en: "What a nice day! My family and I went to the park. We saw a big dog and a tiny cat. Mom bought some snacks, and we ate together. We had a blast.",
      cn: "多好的一天！我和家人去了公园，看到一只大狗和一只小猫。妈妈买了零食，我们一起吃，玩得特别开心。" },
    "My teacher": {
      en: "I really like my school. My teacher is awesome — she always helps me out. My friends and I read together. We want to learn more. Thanks, teacher!",
      cn: "我特别喜欢我的学校。我的老师超棒——她总是帮我。我和朋友们一起读书。我们想学更多。谢谢老师！" },
    "Sunday with family": {
      en: "It's Sunday, so we're all home. We're having a big lunch together. My brother's reading, and my little sister's playing. Days like this are the best.",
      cn: "今天是周日，全家都在家。我们一起吃了顿丰盛的午餐。哥哥在看书，小妹在玩。这样的日子最幸福了。" },
    "My good friend": {
      en: "Li is my best friend. We go to school together and help each other out. He likes blue, and I like red — but that doesn't matter. Good friends don't have to be the same.",
      cn: "李是我最好的朋友。我们一起上学，互相帮忙。他喜欢蓝色，我喜欢红色——但这不重要。好朋友不需要一模一样。" },

    /* ---------- 扩展 13 篇（lv 2–14） ---------- */
    "A busy morning": {
      en: "I got up at seven, washed my face, and grabbed some toast. Then I ran for the bus — almost missed it! Busy morning, but a good one.",
      cn: "我七点起床，洗了脸，抓了片吐司就出门。然后狂奔赶公交——差点没赶上！忙碌但美好的一个早晨。" },
    "At the shop": {
      en: "We went to the shop. It's huge! I grabbed an apple and some milk. The apple was nice and red. Then we paid and headed home.",
      cn: "我们去了商店。店超大！我拿了一个苹果和一盒牛奶。苹果红红的很好。然后我们结账回家。" },
    "The weather today": {
      en: "It's sunny and warm today, but it's gonna be cold tomorrow — better grab a coat. I love warm days. How about you — do you like snow?",
      cn: "今天阳光很好很暖和，但明天会变冷——最好带上外套。我喜欢暖和的天。你呢，喜欢雪吗？" },
    "My favorite food": {
      en: "I love rice and fish. Fish is really good for you. Mom usually cooks dinner, and it's always delicious. We eat together every evening — no phones at the table!",
      cn: "我爱吃米饭和鱼。鱼很健康。通常妈妈做饭，味道总是很棒。我们每天晚上一起吃饭——饭桌上不许看手机！" },
    "A trip to the city": {
      en: "We took the train downtown. The city is huge — tall buildings everywhere. We checked out a museum, and honestly, it was pretty cool. Great day overall.",
      cn: "我们坐火车去了市中心。城市很大——到处是高楼。我们逛了一个博物馆，说实话挺有意思的。总之是美好的一天。" },
    "At the hospital": {
      en: "He came down with a fever, so we went to the hospital. The doctor was really kind. She gave him some medicine, and he felt way better the next day.",
      cn: "他发烧了，我们去了医院。医生人很好，给他开了药，第二天他就好多了。" },
    "My father's job": {
      en: "My dad's an engineer. He works in an office and spends all day on his computer. He's busy, but he seems happy — and he helps a lot of people. I look up to him.",
      cn: "我爸是工程师，在办公室工作，整天对着电脑。他很忙，但看起来挺开心——而且帮助了很多人。我很敬佩他。" },
    "Learning English": {
      en: "English is super useful. I practice a little every day — reading, speaking, making mistakes. That's how you learn! Just keep at it, and you'll get better. Never give up.",
      cn: "英语特别有用。我每天练一点——读一读、说一说、犯犯错。学习就是这样！坚持住，你就会进步。永不放弃。" },
    "A good friend": {
      en: "A good friend listens to you. A good friend shows up when you need them. We laugh, we talk, sometimes we argue — but we always make up. I'm lucky to have you.",
      cn: "好朋友会倾听你，在你需要时出现。我们笑、我们聊，偶尔也吵架——但总能和好。有你这个朋友我真是太幸运了。" },
    "Protect the earth": {
      en: "The earth is our only home. Turn off the lights, save water, don't waste food — small things add up. Plant a tree if you can. Every little bit helps.",
      cn: "地球是我们唯一的家。随手关灯、节约用水、不浪费食物——小事积累起来就是大事。有条件就种棵树。一点一滴都有用。" },
    "Phones in life": {
      en: "Phones are a huge part of life now. We call, read, and learn with them. But honestly, we spend way too much time staring at screens. Put it down sometimes — talk to people face to face.",
      cn: "手机现在是生活的重要部分。我们用它打电话、阅读、学习。但说实话，我们盯屏幕的时间太长了。偶尔放下手机——面对面和人聊聊。" },
    "My dream": {
      en: "I dream of traveling the world and learning new languages. It won't be easy — it takes time and hard work. But I'm gonna give it my best shot.",
      cn: "我梦想环游世界、学几门新语言。这不容易——需要时间和努力。但我会全力以赴。" },
    "What success means": {
      en: "Success isn't just about money. It's doing what you love and helping others along the way. A calm mind, good health, and people who care about you — that's the real win.",
      cn: "成功不只是钱。而是做你热爱的事，同时帮助别人。平静的心态、健康的身体、关心你的人——这才是真正的赢。" }
  };
  [typeof READING !== "undefined" ? READING : null,
   typeof READING_EXTRA !== "undefined" ? READING_EXTRA : null].forEach(function (list) {
    if (!list) return;
    list.forEach(function (p) {
      var u = UPDATES[p && p.title];
      if (u) { p.en = u.en; p.cn = u.cn; }
    });
  });
})();
