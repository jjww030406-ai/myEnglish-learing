// 常用英语词清单（零基础优先，A1–A2 高频 + 部分实用词）。
// 这不是完整词库——真正的内容（音标/释义/例句/词源）由「每日词引擎」实时从网络词典抓取 + 大模型生成。
// 每天按日期自动从中挑选一组，所以词库会一天天变大。
const WORD_LIST = [
  // 日常问候 / 基础动词
  "hello", "hi", "thank", "please", "sorry", "goodbye", "yes", "no",
  "love", "like", "want", "need", "help", "call", "come", "go", "see", "look",
  "eat", "drink", "sleep", "wake", "walk", "run", "sit", "stand", "open", "close",
  "read", "write", "speak", "listen", "learn", "teach", "study", "work", "play", "rest",
  "buy", "sell", "pay", "give", "take", "make", "find", "lose", "keep", "hold",
  "know", "think", "feel", "happy", "sad", "tired", "angry", "hungry", "thirsty", "sick",
  // 人称 / 家庭
  "i", "you", "he", "she", "we", "they", "me", "my", "your", "our",
  "father", "mother", "parent", "brother", "sister", "family", "friend", "child", "baby", "people",
  "man", "woman", "boy", "girl", "teacher", "student", "doctor", "nurse", "worker", "boss",
  // 时间 / 数字
  "today", "tomorrow", "yesterday", "now", "morning", "evening", "night", "week", "month", "year",
  "time", "hour", "minute", "day", "monday", "sunday", "birthday", "holiday", "season", "spring",
  "one", "two", "three", "four", "five", "ten", "hundred", "first", "last", "many",
  "much", "few", "some", "all", "every", "number", "half", "next", "past", "late",
  // 食物 / 饮品
  "food", "water", "milk", "tea", "coffee", "bread", "rice", "egg", "meat", "fish",
  "fruit", "apple", "banana", "orange", "vegetable", "soup", "sugar", "salt", "cake", "cookie",
  "meal", "breakfast", "lunch", "dinner", "restaurant", "kitchen", "knife", "fork", "plate", "cup",
  // 家居 / 物品
  "house", "home", "room", "door", "window", "table", "chair", "bed", "light", "phone",
  "book", "pen", "paper", "bag", "box", "key", "clock", "mirror", "wall", "floor",
  "computer", "internet", "money", "wallet", "clothes", "shirt", "shoe", "hat", "umbrella", "watch",
  // 自然 / 地点
  "sun", "moon", "star", "sky", "rain", "snow", "wind", "tree", "flower", "grass",
  "river", "sea", "mountain", "city", "town", "street", "park", "school", "office", "shop",
  "country", "world", "earth", "nature", "animal", "bird", "dog", "cat", "horse", "farm",
  // 颜色 / 形状 / 描述
  "red", "blue", "green", "yellow", "black", "white", "color", "big", "small", "long",
  "short", "new", "old", "young", "hot", "cold", "warm", "clean", "dirty", "fast",
  "slow", "easy", "hard", "good", "bad", "right", "wrong", "beautiful", "strong", "weak",
  // 交通 / 出行
  "car", "bus", "train", "bike", "boat", "plane", "road", "station", "airport", "travel",
  "map", "ticket", "journey", "arrive", "leave", "drive", "fly", "ride", "walk", "far",
  // 身体 / 健康
  "head", "face", "eye", "ear", "hand", "foot", "heart", "body", "health", "medicine",
  "tooth", "hair", "mouth", "back", "leg", "arm", "skin", "blood", "breath", "pain",
  // 天气 / 季节
  "weather", "cloud", "storm", "summer", "winter", "autumn", "dry", "wet", "cool", "freeze",
  // 学习 / 工作
  "word", "language", "letter", "name", "idea", "question", "answer", "problem", "reason", "truth",
  "meeting", "project", "email", "letter", "message", "news", "story", "dream", "plan", "goal",
  // 情感 / 社交
  "friend", "neighbor", "guest", "stranger", "team", "group", "party", "gift", "smile", "hug",
  "hope", "fear", "trust", "respect", "kind", "polite", "quiet", "loud", "fun", "free",
  // 抽象 / 常用
  "life", "death", "money", "time", "space", "music", "song", "art", "game", "sport",
  "win", "lose", "start", "stop", "change", "grow", "build", "break", "fix", "save"
];
