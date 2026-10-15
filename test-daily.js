/* 每日词引擎单元测试：纯函数 + 离线/在线两条路径（mock 云服务与词典） */
const path = require("path");

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log("✗ " + name + (extra ? "  → " + extra : "")); }
}
function section(t) { console.log("\n【" + t + "】"); }

// ---------- 准备浏览器式全局 ----------
function setupOffline() {
  const store = {};
  global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  global.window = { CLOUD_CONFIG: { endpoint: "x", publishableKey: "y" } /* 故意不挂 WorkBuddyCloud */ };
  global.render = () => {};
  global.WORDS = [];
  global.BASE_WORDS = [{ w: "base", cn: "基础", ph: "/b/", s: "base", sentCn: "基础", pos: "名词", sentWords: [] }];
  global.fetch = async () => ({ ok: true, json: async () => [] });
  delete require.cache[require.resolve("./js/daily.js")];
  return require("./js/daily.js");
}
function setupOnline() {
  const store = {};
  global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const full = JSON.stringify({
    cn: "测试", pos: "名词", senses: "其他", s: "This is a test.", sentCn: "这是一个测试。",
    sentWords: [["this", "这"], ["test", "测试"]], tip: "记忆", plural: "tests", root: "词源", why: "用法"
  });
  const mockCloud = {
    llm: {
      models: { list: async () => [{ id: "m1", disabled: false }] },
      chat: { completions: { create: async function* () {
        for (let i = 0; i < full.length; i += 7) {
          yield { choices: [{ delta: { content: full.slice(i, i + 7) } }] };
        }
      } } }
    }
  };
  global.window = {
    CLOUD_CONFIG: { endpoint: "x", publishableKey: "y" },
    WorkBuddyCloud: { createWorkBuddyCloud: () => mockCloud }
  };
  global.render = () => {};
  global.WORDS = [];
  global.BASE_WORDS = [];
  global.window.WORD_LIST = ["apple", "book", "test", "cat", "dog", "sun", "tree", "water", "love", "happy", "red", "blue"];
  global.fetch = async () => ({
    ok: true,
    json: async () => [{ phonetics: [{ text: "/tɛst/" }], meanings: [{ partOfSpeech: "noun", definitions: [{ definition: "a test" }] }] }]
  });
  delete require.cache[require.resolve("./js/daily.js")];
  return require("./js/daily.js");
}

(async () => {
  // ===== 纯函数 =====
  section("纯函数：pickDaily / extractJSON / assembleWord");
  const E = setupOffline();
  const list = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  const p1 = E.pickDaily(list, 8, "2026-10-14");
  const p2 = E.pickDaily(list, 8, "2026-10-14");
  check("pickDaily 数量正确", p1.length === 8, "len=" + p1.length);
  check("同一日期结果稳定（可复现）", JSON.stringify(p1) === JSON.stringify(p2));
  check("挑出的词都来自清单", p1.every(w => list.includes(w)));
  const p3 = E.pickDaily(list, 8, "2027-01-01");
  check("不同日期挑出不同组合", JSON.stringify(p1) !== JSON.stringify(p3));
  const wrap = E.pickDaily(list, 3, "x"); // 不依赖内容，仅验证不报错
  check("边界：pickDaily 不抛错", Array.isArray(wrap));

  check("extractJSON 能抠出裸 JSON", JSON.stringify(E.extractJSON('{"a":1}')) === '{"a":1}');
  check("extractJSON 能去掉 ```json 代码块", E.extractJSON('```json\n{"cn":"好"}\n```').cn === "好");
  check("extractJSON 能掐头去尾", E.extractJSON('前面废话 {"cn":"好"} 后面废话').cn === "好");
  check("extractJSON 非法输入返回空对象", Object.keys(E.extractJSON("不是json")).length === 0);

  const aw = E.assembleWord({ w: "test", ph: "/t/", pos: "noun", def: "a test" }, { cn: "测试", s: "This is a test.", sentCn: "测试。", sentWords: [["this", "这"]] });
  check("assembleWord 合并词典与模型字段", aw.w === "test" && aw.cn === "测试" && aw.s === "This is a test.");
  check("assembleWord 过滤坏 sentWords", aw.sentWords.length === 1);
  const aw2 = E.assembleWord({ w: "x" }, {});
  check("assembleWord 缺失字段有默认值（cn）", aw2.cn === "（暂未生成释义）" && Array.isArray(aw2.sentWords));

  // ===== 离线回落 =====
  section("离线路径：无云服务时回落内置词库");
  const off = global.window.DailyEngine; // 已在 setupOffline 中 require
  const r1 = await off.loadDailyWords();
  check("离线时状态为 offline", r1.info.status === "offline", r1.info.status);
  check("离线时 WORDS 回落到 BASE_WORDS", global.WORDS === global.BASE_WORDS || (global.WORDS && global.WORDS[0] && global.WORDS[0].w === "base"));

  // ===== 在线生成 =====
  section("在线路径：实时抓词典 + 大模型生成今日词");
  setupOnline();
  const On = global.window.DailyEngine;
  const r2 = await On.loadDailyWords();
  check("在线时状态为 ok", r2.info.status === "ok", r2.info.status);
  check("在线时生成了 8 个词", global.WORDS.length === 8, "len=" + global.WORDS.length);
  const sample = global.WORDS.find(w => w.w === "test");
  check("生成的词含中文释义", sample && sample.cn === "测试", sample && sample.cn);
  check("生成的词含例句中文", sample && sample.sentCn === "这是一个测试。");
  check("生成的词含逐词释义", sample && sample.sentWords.length === 2);
  check("生成的词含词性与复数", sample && sample.pos === "名词" && sample.plural === "tests");
  check("每个生成的词都打了今日标记", global.WORDS.every(w => w._today));
  const persisted = JSON.parse(global.localStorage.getItem("el_lib_v1") || "[]");
  check("词库已写入本地缓存", persisted.length === 8, "缓存=" + persisted.length);

  // 再跑一次（同日期）→ 应直接命中缓存，不再生成
  const r3 = await On.loadDailyWords();
  check("同日二次加载直接命中缓存（不重复生成）", r3.info.text.indexOf("已就绪") >= 0, r3.info.text);

  console.log("\n通过 " + pass + " 项，失败 " + fail + " 项");
  if (fail) process.exit(1);
  console.log("=== ✓ 每日词引擎测试全部通过 ===");
})();
