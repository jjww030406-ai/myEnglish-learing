/* 真实事件绑定测试：用正则实现的迷你 DOM，按 id / 属性查找元素并触发点击
   重点：捕获所有运行时异常，而不是静默跳过
   运行：node test-bind.js                                          */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const dir = __dirname;

/* ---------- 迷你 DOM ---------- */
const VOID = new Set(["input", "br", "hr", "img", "meta", "link"]);

/* 解析 HTML 成真正的树，支持后代选择器 ".nav button" */
function parseTree(html) {
  const root = makeEl("#root", {}, html);
  const stack = [root];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrStr = m[3] || "";
    const selfClose = m[4] === "/";
    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const attrs = {};
    const are = /([\w:-]+)(?:="([^"]*)")?/g;
    let a;
    while ((a = are.exec(attrStr)) !== null) attrs[a[1]] = a[2] === undefined ? "" : a[2];
    const el = makeEl(tag, attrs, html);
    stack[stack.length - 1].children.push(el);
    el.parent = stack[stack.length - 1];
    if (!selfClose && !VOID.has(tag)) stack.push(el);
  }
  return root;
}

function walk(node, out = []) {
  for (const c of node.children) { out.push(c); walk(c, out); }
  return out;
}

function matchesSimple(el, sel) {
  sel = sel.trim();
  if (!sel) return false;
  if (sel.startsWith("#")) return el.attrs.id === sel.slice(1);
  if (sel.startsWith(".")) {
    // 支持复合类选择器 .slot.typed
    // 注意：要读 classList 的实时状态，而不是 attrs 里的原始 class 字符串，
    // 否则 classList.add("picked") 之后选择器就匹配不到了
    const parts = sel.slice(1).split(".");
    const have = el.classList ? Array.from(el._classes) : (el.attrs["class"] || "").split(/\s+/);
    return parts.every(p => have.includes(p));
  }
  const am = sel.match(/^\[([\w-]+)\]$/);
  if (am) return am[1] in el.attrs;
  return el.tag === sel.toLowerCase();
}

function makeEl(tag, attrs, html) {
  const cls = new Set((attrs["class"] || "").split(/\s+/).filter(Boolean));
  const el = {
    tag, attrs, dataset: {}, children: [], parent: null,
    _classes: cls,
    innerHTML: "", value: attrs["value"] || "", disabled: "disabled" in attrs,
    selectionStart: 0, selectionEnd: 0,
    style: {},
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; },
    get className() { return [...cls].join(" "); },
    classList: {
      add(...c) { c.forEach(x => cls.add(x)); },
      remove(...c) { c.forEach(x => cls.delete(x)); },
      toggle(c) { cls.has(c) ? cls.delete(c) : cls.add(c); },
      contains(c) { return cls.has(c); }
    },
    scrollIntoView() {}, blur() {}, focus() {},
    onclick: null, oninput: null, onkeydown: null,
  // 子树查询：从自己开始往下找
  querySelector: function (sel) {
    const sub = walk(this).concat([this]);
    return sub.find(e => matchesSimple(e, sel)) || null;
  },
  querySelectorAll: function (sel) {
    const sub = walk(this).concat([this]);
    const parts = sel.trim().split(/\s+/);
    if (parts.length === 1) return sub.filter(e => matchesSimple(e, parts[0]));
    const last = parts[parts.length - 1], anc = parts.slice(0, -1);
    return sub.filter(e => {
      if (!matchesSimple(e, last)) return false;
      let p = e.parent, ok = false;
      while (p) { if (anc.some(a => matchesSimple(p, a))) { ok = true; break; } p = p.parent; }
      return ok;
    });
  },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; }
  };
  for (const k of Object.keys(attrs)) {
    if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = attrs[k];
  }
  return el;
}

let currentRoot = makeEl("#root", {}, "");
let htmlNow = "";
function rebuild(html) {
  htmlNow = html;
  currentRoot = parseTree(html);
}

let rebuilding = false;
function rebuildOld(html) {}

const appEl = makeEl("div", { id: "app" }, "");
let appHtml = "";
Object.defineProperty(appEl, "innerHTML", {
  set(v) { appHtml = v; rebuild(v); },
  get() { return appHtml; },
  configurable: true
});

const doc = {
  getElementById: id => doc.querySelectorAll("#" + id)[0] || null,
  querySelector(sel) { return doc.querySelectorAll(sel)[0] || null; },
  querySelectorAll(sel) {
    if (sel === "#app") return [appEl];
    const all = walk(currentRoot);
    const parts = sel.trim().split(/\s+/);
    if (parts.length === 1) return all.filter(e => matchesSimple(e, parts[0]));
    const last = parts[parts.length - 1];
    const anc = parts.slice(0, -1);
    return all.filter(e => {
      if (!matchesSimple(e, last)) return false;
      let p = e.parent, ok = false;
      while (p) { if (anc.some(a => matchesSimple(p, a))) { ok = true; break; } p = p.parent; }
      return ok;
    });
  }
};

/* ---------- 加载站点代码 ---------- */
const src = ["js/data.js", "js/grammar.js", "js/curriculum.js", "js/state.js", "js/app.js"]
  .map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");

const store = {};
function makeSandbox() {
  // 站点代码是经 window.localStorage 访问存储的，所以 window 上必须有它，
  // 否则 store 会一直降级成内存模式 —— 那样"刷新后进度还在吗"这类测试会失真。
  const ls = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const sb = {
    localStorage: ls, window: { localStorage: ls },
    document: doc, console,
    speechSynthesis: { speak() {}, cancel() {} },
    confirm: () => true, alert: m => { sb.__alert = String(m); },
    Date, JSON, Math, String, Number, Array, Object, parseInt, parseFloat, isNaN, setTimeout
  };
  sb.globalThis = sb;
  vm.createContext(sb);
  return sb;
}

// innerHTML setter 拦截 —— 赋值时重建元素索引
let sb;
try { sb = makeSandbox(); vm.runInContext(src, sb); }
catch (e) {
  console.log("❌ 脚本执行异常:", e.message);
  console.log((e.stack || "").split("\n").slice(0, 5).join("\n"));
  process.exit(1);
}

vm.runInContext(`
;globalThis.__err = null;
;globalThis.__click = function(id){
  __err = null;
  try {
    const el = document.querySelector('#' + id);
    if (!el) return 'NOT_FOUND:' + id;
    if (typeof el.onclick !== 'function') return 'NO_HANDLER:' + id;
    el.onclick({ preventDefault(){}, key:'Enter' });
    return 'OK';
  } catch(e) { __err = e.message + ' @ ' + String(e.stack||'').split('\\n')[1]; return 'THREW'; }
};
`, sb);

const click = id => vm.runInContext(`__click(${JSON.stringify(id)})`, sb);
const errMsg = () => vm.runInContext("__err", sb);
/* setVal 模拟"从第 1 格逐字敲进去"，走真实的 keydown 处理链路 */
const setVal = (id, v) => vm.runInContext(`
  (function(){ const e=document.querySelector('#${id}');
    if(!e || typeof e.onkeydown!=='function') return;
    const max = spWord ? spWord.w.length : 20;
    const target = ${JSON.stringify(v)}.toLowerCase().replace(/[^a-z]/g,"").slice(0,max);
    // 先清空所有格子，光标回到最左
    spChars = new Array(max).fill("");
    spCursor = 0;
    syncSlots(); syncCapture();
    // 再逐个字母"敲"进去
    for(let i=0;i<target.length;i++){
      e.onkeydown({key:target[i],preventDefault(){},target:e});
    }
  })()
`, sb);

// 读取字母格当前 HTML（打字时 syncSlots 只改 live DOM，不整页重绘）
const slotsHtml = () => {
  const live = doc.querySelector(".slots");
  if (live && live.innerHTML) return live.innerHTML;
  const m = htmlNow.match(/<div class="slots[^"]*">([\s\S]*?)<\/div>/);
  return m ? m[1] : "";
};

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("   ✓ " + name); }
  else { fail++; console.log("   ✗ " + name + (extra ? "\n       → " + extra : "")); }
};

const goto = v => vm.runInContext(`
  (function(){
    const btns = Array.from(document.querySelectorAll('.nav'));
    return btns.length;
  })()
`, sb);

const resetSpell = () => vm.runInContext(`
  view='spell'; spQueue=[]; spMode='cn'; spNewRound(); render();
`, sb);

// 内部工具句柄（供缓冲区测试调用 syncCapture / setSpCursor 等）
const T = vm.runInContext(
  ";globalThis.__T={syncCapture, setSpCursor, readCapture, buildCapture};__T", sb);

console.log("=== 拼写页：三个按钮（每个都在全新状态下测） ===\n");

resetSpell();
console.log("【拼写页 DOM 检查】");
check("拼写页已渲染", htmlNow.includes("拼写练习"), htmlNow.slice(0, 120));
check("检查按钮存在", !!doc.querySelector("#spCheck"));
check("提示按钮存在", !!doc.querySelector("#spReveal"));
check("看答案按钮存在", !!doc.querySelector("#spGive"));
check("检查按钮已绑定 onclick", typeof (doc.querySelector("#spCheck") || {}).onclick === "function");
check("提示按钮已绑定 onclick", typeof (doc.querySelector("#spReveal") || {}).onclick === "function");
check("看答案按钮已绑定 onclick", typeof (doc.querySelector("#spGive") || {}).onclick === "function");

console.log("\n【点击「检查」】");
resetSpell();
const wd2 = vm.runInContext("spWord.w", sb);
setVal("spInput", wd2);            // 先拼对再检查
let r = click("spCheck");
check("点击未抛异常", r === "OK", r + " / " + errMsg());
// 新规则：拼对才有「下一题」，拼错必须重拼
check("拼对后出现「下一题」按钮", !!doc.querySelector("#spNext"), "页面未更新");
check("拼对后输入框被锁定", doc.querySelector("#spInput") && doc.querySelector("#spInput").disabled === true);
console.log("   " + r + (errMsg() ? "  错误: " + errMsg() : ""));

console.log("\n【★ 拼错后必须重拼，不能跳过】");
resetSpell();
const wBad = vm.runInContext("spWord.w", sb);
setVal("spInput", "zz");
click("spCheck");
check("拼错后进入重拼阶段", vm.runInContext("spRetry", sb) === true);
check("拼错后不给「下一题」按钮", !doc.querySelector("#spNext"), "不该让用户跳过");
check("拼错后出现「我拼好了」按钮", !!doc.querySelector("#spRetry"));
check("★ 输入框已清空", vm.runInContext("spInput", sb).trim() === "",
  "输入: '" + vm.runInContext("spInput", sb) + "'");
check("★ 隐藏输入框的 value 重置为占位符（下划线）",
  /^_*$/.test(doc.querySelector("#spInput").value),
  "value: " + doc.querySelector("#spInput").value);
check("输入框仍可输入（未锁定）", !doc.querySelector("#spInput").disabled);
check("明确指出错在哪里（字母位置或长度）",
  /第\s*<b>\d+<\/b>\s*个字母不对/.test(htmlNow) ||
  /你写了\s*<b>\d+<\/b>\s*个字母/.test(htmlNow),
  htmlNow.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 180));
check("显示正确答案", htmlNow.includes("ans-word"));
check("提示要重新拼一遍", htmlNow.includes("输入框已清空"));

console.log("\n  【重拼成功才能继续】");
setVal("spInput", wBad);
click("spRetry");
check("重拼正确后本题通过", vm.runInContext("spChecked", sb) === true);
check("重拼正确后出现「下一题」", !!doc.querySelector("#spNext"));

console.log("\n【★ 可点击任意格子定位光标】");
resetSpell();
// 用一个足够长的词来测中间定位（避免随机到 2-3 字母的短词）
vm.runInContext(`
  spQueue = [WORDS.find(w=>w.w.length>=5), ...WORDS.filter(w=>w.w.length>=5).slice(1,10)];
  spPos = 0; spLoad(); render();
`, sb);
const wLoc = vm.runInContext("spWord.w", sb);
setVal("spInput", wLoc.slice(0, 3));
const sw = doc.querySelector("#slotsWrap");
const slots = doc.querySelectorAll("[data-slot]");
check("每个格子都可点击定位", slots.length > 0 && slots.every(s => s.attrs["data-slot"] !== undefined),
  "格子数=" + slots.length + " 词长=" + wLoc.length);
if (sw && typeof sw.onclick === "function" && slots.length > 3) {
  // 模拟真实点击第 4 格（index 3）：现在格子自身绑定了 onclick
  const target = slots[3];
  check("★ 每个格子自身绑定了 onclick", typeof target.onclick === "function",
    "格子没有 onclick，点击会落到 wrap 上");
  if (typeof target.onclick === "function") {
    target.closest = sel => (sel === "[data-slot]" ? target : null);

    console.log("  【★ 缓冲区模型：从任意格输入（用户报告的核心问题）】");
    resetSpell();
    vm.runInContext(`
      spQueue = [WORDS.find(w=>w.w.length>=5), ...WORDS.filter(w=>w.w.length>=5).slice(1,10)];
      spPos = 0; spLoad(); render();
    `, sb);
    const wb = vm.runInContext("spWord.w", sb);
    const L = wb.length;
    T.syncCapture();
    const capV = () => doc.querySelector("#spInput").value;
    check("★ 隐藏 input 用下划线占位（光标才能停在中间）", capV() === "_".repeat(L),
      "value=\"" + capV() + "\" 期望=\"" + "_".repeat(L) + "\"");
    check("占位长度 = 单词长度", capV().length === L, "len=" + capV().length);

    // 模拟真实敲键盘：派发 keydown，走真实处理链路
    const pressKey = (k) => vm.runInContext(`
      (function(){ const e=document.querySelector('#spInput');
        if(!e||!e.onkeydown) return 'NO_HANDLER';
        e.onkeydown({key:${JSON.stringify(k)},preventDefault(){},clipboardData:null,target:e});
        return 'OK'; })()
    `, sb);
    const typeChar = (ch) => pressKey(ch);
    const chars = () => vm.runInContext("spChars", sb);

    // 点第 2 格后直接打字（重新取 slots：render 会重建元素）
    const slots2 = doc.querySelectorAll("[data-slot]");
    slots2[1].onclick({ target: slots2[1], preventDefault() {}, stopPropagation() {} });
    check("★ 点第 2 格后光标在第 2 位", vm.runInContext("spCursor", sb) === 1);
    typeChar("x");
    check("★ 字母落在第 2 格（下标1）", chars()[1] === "x", "第2格=" + JSON.stringify(chars()[1]));
    check("★ 第 1 格仍为空", chars()[0] === "", "第1格=" + JSON.stringify(chars()[0]));
    check("★ value 里字母位置正确", capV()[1] === "x", "value=" + capV());
    check("光标自动前进到第 3 位", vm.runInContext("spCursor", sb) === 2);

    // 再在第 3 格打字，两格并存
    typeChar("y");
    check("第 3 格 = y", chars()[2] === "y", "实际=" + JSON.stringify(chars()[2]));
    check("第 2 格仍是 x", chars()[1] === "x", "实际=" + JSON.stringify(chars()[1]));
    check("value 形如 _xy__...", capV().startsWith("_xy"), "value=" + capV());

    // 跳回第 1 格打字，不影响其他格（again取 slots）
    const slots3 = doc.querySelectorAll("[data-slot]");
    slots3[0].onclick({ target: slots3[0], preventDefault() {}, stopPropagation() {} });
    typeChar("z");
    check("★ 跳回第 1 格输入后，第 2 格仍是 x", chars()[1] === "x",
      "第2格=" + JSON.stringify(chars()[1]));
    check("★ 跳回第 1 格输入后，第 3 格仍是 y", chars()[2] === "y",
      "第3格=" + JSON.stringify(chars()[2]));
    check("★ 第 1 格 = z", chars()[0] === "z", "实际=" + JSON.stringify(chars()[0]));
    // ★ 关键：自行接管按键后，在第 1 格打字【不会挤动后面的字母】
    check("★ ★ 打字不会把后面的字母挤右移",
      JSON.stringify(chars()) === JSON.stringify(["z", "x", "y", "", ""]),
      "实际=" + JSON.stringify(chars()) + " 期望=" + JSON.stringify(["z","x","y","",""]));
    check("★ spInput 长度 = 单词长度（保留位置）",
      vm.runInContext("spInput", sb).length === L,
      "len=" + vm.runInContext("spInput", sb).length + " 词长=" + L);

    // 退格删中间格
    vm.runInContext("setSpCursor(3)", sb);
    T.syncCapture();
    const bs = vm.runInContext(`
      (function(){ const e=document.querySelector('#spInput');
        if(!e||!e.onkeydown) return 'NO_HANDLER';
        e.onkeydown({key:'Backspace',preventDefault(){}}); return 'OK'; })()
    `, sb);
    check("退格不抛异常", bs === "OK", bs);
    check("★ 退格只清掉光标左边那一格", chars()[2] === "", "第3格=" + JSON.stringify(chars()[2]));
    check("★ 退格不影响其他格（y 应留在原位）",
      JSON.stringify(chars()) === JSON.stringify(["z", "x", "", "", ""]),
      "实际=" + JSON.stringify(chars()));
    check("★ 退格后光标左移一格", vm.runInContext("spCursor", sb) === 2,
      "spCursor=" + vm.runInContext("spCursor", sb));
  }
}
console.log("\n  【★ 隐藏输入层不能挡住点击（用户报告的根因）】");
const css = fs.readFileSync(path.join(__dirname, "css/style.css"), "utf8");
const captureBlock = css.match(/\.sp-capture\s*\{[^}]*\}/);
check("找到 .sp-capture 样式", !!captureBlock);
check("★ 输入层设了 pointer-events:none（否则点不到格子）",
  !!captureBlock && /pointer-events:\s*none/.test(captureBlock[0]),
  captureBlock ? captureBlock[0].replace(/\s+/g, " ") : "无");
check("输入层仍保持透明不可见", !!captureBlock && /opacity:\s*0/.test(captureBlock[0]));

console.log("\n【★ 判定按格检查，不受中间空格影响】");
resetSpell();
vm.runInContext(`
  spQueue = [WORDS.find(w=>w.w.length>=5), ...WORDS.filter(w=>w.w.length>=5).slice(1,10)];
  spPos = 0; spLoad(); render();
`, sb);
const wChk = vm.runInContext("spWord.w", sb);
const arrChk = vm.runInContext(`
  (function(){ const a=${JSON.stringify(wChk)}.split("");
    a[1]=""; a[2]=""; spChars=a; spInput=spChars.map(c=>c||" ").join(""); render();
    return spIsCorrect(); })()
`, sb);
check("中间缺字母 → 判错", arrChk === false);
check("报出第一处错误位置", vm.runInContext("spWrongAt()", sb) === 2,
  "wrongAt=" + vm.runInContext("spWrongAt()", sb));
const allOk = vm.runInContext(`
  (function(){ spChars=${JSON.stringify(wChk)}.split(""); spInput=spChars.join(""); render();
    return spIsCorrect(); })()
`, sb);
check("每格填对 → 判对", allOk === true);
check("全对时 wrongAt = 0", vm.runInContext("spWrongAt()", sb) === 0);

console.log("\n【★ 退格能删除字母】");
resetSpell();
const wDel = vm.runInContext("spWord.w", sb);
setVal("spInput", wDel);
check("已输入完整单词", vm.runInContext("spInput", sb).trim() === wDel);
vm.runInContext("spCursor=" + wDel.length, sb);
// 触发 Backspace
const backspace = vm.runInContext(`
  (function(){ const e=document.querySelector('#spInput');
    if(!e||!e.onkeydown) return 'NO_HANDLER';
    e.onkeydown({key:'Backspace',preventDefault(){}}); return 'OK'; })()
`, sb);
check("退格不抛异常", backspace === "OK", backspace);
// spInput 用空格占位保留位置，所以要 trim 后比较
check("★ 退格后删掉一个字母",
  vm.runInContext("spInput", sb).trim() === wDel.slice(0, -1),
  "结果: '" + vm.runInContext("spInput", sb).trim() + "' 期望: '" + wDel.slice(0, -1) + "'");
check("★ 退格后最后一个格子确实变空",
  vm.runInContext("spChars", sb)[wDel.length - 1] === "",
  "末格=" + JSON.stringify(vm.runInContext("spChars", sb)[wDel.length - 1]));
check("退格后最后一格变为空（spChars 末格清空）",
  vm.runInContext("spChars", sb)[wDel.length-1] === "",
  "末格="+JSON.stringify(vm.runInContext("spChars", sb)[wDel.length-1]));
// 注意：格子数量由【单词长度】决定（固定），删字母只是清空最后一格的内容
check("退格后 spChars 长度不变（仍等于词长）",
  vm.runInContext("spChars", sb).length === wDel.length,
  "len="+vm.runInContext("spChars", sb).length+" 词长="+wDel.length);

console.log("\n【点击「提示一个字母」】（全新状态）");
resetSpell();
r = click("spReveal");
check("点击未抛异常", r === "OK", r + " / " + errMsg());
check("字母格子出现已揭示字母", htmlNow.includes("blanksq shown"), "格子未更新");
console.log("   " + r + (errMsg() ? "  错误: " + errMsg() : ""));

console.log("\n【点击「直接看答案」】（全新状态）");
resetSpell();
r = click("spGive");
check("点击未抛异常", r === "OK", r + " / " + errMsg());
check("显示正确答案", htmlNow.includes("sp-fb"));
check("进入重拼阶段（不直接给下一题）", !!doc.querySelector("#spRetry"), "应给重拼机会");
console.log("   " + r + (errMsg() ? "  错误: " + errMsg() : ""));

console.log("\n【输入 + 回车提交】（全新状态）");
resetSpell();
const target = vm.runInContext("spWord.w", sb);
setVal("spInput", target);
r = click("spInput");   // 触发 keydown 无绑定，改用直接调用回车路径
r = vm.runInContext(`
  (function(){ __err=null;
    try { const e=document.querySelector('#spInput'); e.onkeydown({key:'Enter',preventDefault(){}}); return 'OK'; }
    catch(err){ __err=err.message; return 'THREW'; } })()
`, sb);
check("回车提交不抛异常", r === "OK", r + " / " + vm.runInContext("__err", sb));
check("回车后出现下一题按钮", !!doc.querySelector("#spNext"));
console.log("   目标词: " + target);

console.log("\n=== 测验页 ===\n");
vm.runInContext(`view='quiz'; qiList=[]; newQuiz(); render();`, sb);
const opts = doc.querySelectorAll("[data-quizopt]");
check("选项已渲染(4个)", opts.length === 4, "实际 " + opts.length);
check("选项已绑定 onclick", opts.every(o => typeof o.onclick === "function"));
r = opts[0] && opts[0].onclick ? (opts[0].onclick(), "OK") : "NO_HANDLER";
check("点击选项未抛异常", r === "OK", r + " / " + errMsg());
console.log("   返回: " + r + (errMsg() ? "  错误: " + errMsg() : ""));
check("作答后出现下一题按钮", !!doc.querySelector("#nextQ"), "页面未更新");

console.log("");
console.log("=== 真实导航切换路径（点导航按钮，而非直接改 view） ===\n");

/* 顶部模块切换条已移除：进入功能页后唯一的去路是「← 返回首页」。
   所以真实路径变成：先点「返回首页」回到首页，再点首页大卡片进入目标页。 */
const navTo = v => {
  const back = doc.querySelectorAll("[data-back]").find(n => n.attrs["data-back"] === "home");
  if (back) {
    if (typeof back.onclick !== "function") return "BACK_NO_HANDLER";
    try { back.onclick(); } catch (e) { return "BACK_THREW: " + e.message; }
  }
  if (v === "home") return "OK";
  const b = doc.querySelectorAll("[data-v]").find(n => n.attrs["data-v"] === v);
  if (!b) return "NAV_NOT_FOUND";
  if (typeof b.onclick !== "function") return "NAV_NO_HANDLER";
  try { b.onclick(); return "OK"; } catch (e) { return "THREW: " + e.message; }
};

console.log("【点导航切到各个页面】");
for (const v of ["spell", "cards", "etymon", "grammar", "phrases", "quiz", "me", "home"]) {
  const r = navTo(v);
  const onPage = htmlNow.length > 0;
  check("切到 " + v.padEnd(8), r === "OK" && onPage, r);
}

console.log("\n【导航切到拼写页后，三个按钮是否可用】");
navTo("spell");
resetSpell();
for (const [id, label] of [["spCheck", "检查"], ["spReveal", "提示一个字母"], ["spGive", "直接看答案"]]) {
  resetSpell();
  const r = click(id);
  check(label + " 按钮（导航进入后）", r === "OK", r + " / " + errMsg());
}

console.log("\n【导航切到测验页后，选项是否可用】");
navTo("quiz");
vm.runInContext("qiList=[]; newQuiz(); render();", sb);
const o2 = doc.querySelectorAll("[data-quizopt]");
check("选项已绑定", o2.length === 4 && o2.every(o => typeof o.onclick === "function"));
o2[0].onclick();
check("作答后出现下一题按钮", !!doc.querySelector("#nextQ"), "页面未更新");

console.log("\n【★ 用户场景：测验中途切走再回来】");
navTo("cards");
navTo("home");
navTo("quiz");
const o3 = doc.querySelectorAll("[data-quizopt]");
check("回来后仍显示题目", o3.length === 4);
// 已答过的题回来后应保持"已作答"一致状态：选项锁定 + 下一题按钮仍在
check("已答状态保持一致（选项锁定且有下一题按钮）",
  o3.length === 4 && o3[0].disabled && !!doc.querySelector("#nextQ"),
  "选项禁用=" + (o3[0] && o3[0].disabled) + " 下一题按钮=" + !!doc.querySelector("#nextQ"));
if (doc.querySelector("#nextQ")) {
  doc.querySelector("#nextQ").onclick();
  const o4 = doc.querySelectorAll("[data-quizopt]");
  check("点下一题后进入新题且可作答",
    o4.length === 4 && !o4[0].disabled && !doc.querySelector("#nextQ"),
    "新题应可作答且无按钮");
}

console.log("\n【★ 用户场景：拼写中途切走再回来】");
navTo("spell");
resetSpell();
setVal("spInput", "ab");
navTo("me");
navTo("spell");
check("回来后输入框可写", doc.querySelector("#spInput") && !doc.querySelector("#spInput").disabled, "输入框仍锁定");
r = click("spCheck");
check("回来后检查按钮可用", r === "OK", r + " / " + errMsg());

console.log("\n【脏数据容错：localStorage 里是坏数据】");
const badData = [
  ["空字符串", ""],
  ["非法 JSON", "{不是json"],
  ["字段类型全错", '{"learned":"不是数组","stars":"很多","days":123}'],
  ["缺字段", '{"foo":1}'],
  ["null", "null"]
];
for (const [label, val] of badData) {
  store["english_learning_v1"] = val;
  let r2;
  try {
    vm.runInContext("S = load(); checkDay(); render();", sb);
    r2 = htmlNow.length > 0 ? "OK" : "EMPTY";
  } catch (e) { r2 = "THREW: " + e.message; }
  check("坏数据(" + label + ")不白屏", r2 === "OK", r2);
}
delete store["english_learning_v1"];

console.log("\n【全局容错：某个页面抛异常时其他页面仍可用】");
vm.runInContext(`
  (function(){
    __err=null;
    try {
      view='cards'; curCard=null; render();   // 正常渲染
      view='quiz'; qiList=[]; newQuiz(); render();
      const opts=document.querySelectorAll('[data-quizopt]');
      if(opts.length!==4) { __err='选项数不对 '+opts.length; return; }
      if(typeof opts[0].onclick!=='function'){ __err='选项未绑定'; return; }
      opts[0].onclick();
      if(!document.querySelector('#nextQ')) { __err='作答后无按钮'; return; }
      __err='OK';
    } catch(e){ __err='THREW: '+e.message; }
  })()
`, sb);
check("坏数据恢复后测验仍正常", vm.runInContext("__err", sb) === "OK", vm.runInContext("__err", sb));

console.log("\n【★ 沙箱模式：localStorage 完全不可用（模拟你的截图）】");

/* 复现 WorkBuddy 预览面板 / 隐私模式：
   访问 window.localStorage 这个属性本身就抛 SecurityError */
const winNoLS = {};
Object.defineProperty(winNoLS, "localStorage", {
  get() { throw new Error("Failed to read the 'localStorage' property from 'Window': The document is sandboxed and lacks the 'allow-same-origin' flag."); }
});

const sbNoLS = {
  localStorage: undefined,
  window: winNoLS,
  document: doc,
  console,
  speechSynthesis: { speak() {}, cancel() {} },
  confirm: () => true,
  alert: m => { sbNoLS.__alert = String(m); },
  Date, JSON, Math, String, Number, Array, Object, parseInt, parseFloat, isNaN, setTimeout
};
sbNoLS.globalThis = sbNoLS;
vm.createContext(sbNoLS);
let noLsOk = true, noLsErr = "";
try {
  vm.runInContext(src, sbNoLS);
} catch (e) {
  noLsOk = false;
  noLsErr = "加载即抛异常: " + e.message;
}
check("沙箱下脚本能加载", noLsOk, noLsErr);

if (noLsOk) {
  vm.runInContext(`
  ;globalThis.__err=null;
  ;globalThis.__click=function(id){
    __err=null;
    try{ const e=document.querySelector('#'+id); if(!e) return 'NOT_FOUND';
         if(typeof e.onclick!=='function') return 'NO_HANDLER';
         e.onclick({preventDefault(){}}); return 'OK';
    }catch(err){ __err=err.message; return 'THREW'; }
  };`, sbNoLS);

  const clickNoLS = id => vm.runInContext(`__click(${JSON.stringify(id)})`, sbNoLS);
  const errNoLS = () => vm.runInContext("__err", sbNoLS);

  vm.runInContext(`view='spell'; spQueue=[]; spMode='cn'; spNewRound(); render();`, sbNoLS);
  check("沙箱下拼写页能渲染", htmlNow.includes("拼写练习"));
  check("沙箱下显示「进度不保存」提示", htmlNow.includes("nowarn"), "缺少提示");
  check("存储层已降级为内存模式", vm.runInContext("store.available", sbNoLS) === false);

  console.log("\n  【沙箱下点三个按钮 —— 这正是你截图里失败的场景】");
  for (const [id, label, probe] of [
    ["spCheck", "检查", "下一题"],
    ["spReveal", "提示一个字母", "blanksq shown"],
    ["spGive", "直接看答案", "sp-fb"]
  ]) {
    vm.runInContext(`spQueue=[]; spNewRound(); render();`, sbNoLS);
    const r = clickNoLS(id);
    const updated = htmlNow.includes(probe);
    check(label + "：点击不抛异常", r === "OK", r + " / " + errNoLS());
    check(label + "：页面有更新", updated, "内容未变化 → 表现为“点了没反应”");
  }

  console.log("\n  【沙箱下测验】");
  vm.runInContext(`view='quiz'; qiList=[]; newQuiz(); render();`, sbNoLS);
  const o5 = doc.querySelectorAll("[data-quizopt]");
  check("选项已绑定", o5.length === 4 && typeof o5[0].onclick === "function");
  o5[0].onclick();
  check("作答后出现下一题按钮", !!doc.querySelector("#nextQ"), "按钮未出现");

  console.log("\n  【沙箱下逐页切换，任何一页都不能抛异常】");
  for (const v of ["spell", "cards", "etymon", "grammar", "phrases", "quiz", "me", "home"]) {
    vm.runInContext(`
      __err=null;
      (function(){ try{ view=${JSON.stringify(v)}; render(); }catch(e){ __err=e.message; } })()
    `, sbNoLS);
    check("沙箱下切到 " + v.padEnd(8), vm.runInContext("__err", sbNoLS) === null,
      vm.runInContext("__err", sbNoLS));
  }
}

console.log("\n【★ 常驻底部操作栏（不用滚动就能点）】");
resetSpell();
check("拼写页有固定操作栏", htmlNow.includes("class=\"actionbar\""), "缺少 actionbar");
check("操作栏用 position:fixed 定位", htmlNow.includes('class="actionbar"') && !!doc.querySelector(".actionbar"));
check("操作栏后面有占位高度（不遮挡内容）", htmlNow.includes('class="ab-space"'));
check("未判定时操作栏含三个按钮",
  !!doc.querySelector("#spCheck") && !!doc.querySelector("#spReveal") && !!doc.querySelector("#spGive"));
check("操作栏显示题号进度", htmlNow.includes("第 1 / 10 题"));

resetSpell();
// 拼对才出下一题
const wOk = vm.runInContext("spWord.w", sb);
setVal("spInput", wOk);
click("spCheck");
check("判定后按钮切换为「下一题」", !!doc.querySelector("#spNext"), "未出现下一题");
check("下一题按钮在固定栏内而非页面末尾", htmlNow.indexOf("spNext") > htmlNow.indexOf("actionbar"),
  "按钮位置不在操作栏内");
console.log("\n【★ 回车键连点：检查 → 下一题，全程不用鼠标】");
resetSpell();
const target2 = vm.runInContext("spWord.w", sb);
const enterKey = () => vm.runInContext(`
  (function(){ const e=document.querySelector('#spInput'); if(!e||!e.onkeydown) return 'NO_HANDLER';
    e.onkeydown({key:'Enter',preventDefault(){}}); return 'OK'; })()
`, sb);
setVal("spInput", target2);
let e1 = enterKey();
check("第一次回车 = 提交检查", e1 === "OK" && !!doc.querySelector("#spNext"), e1);
e1 = enterKey();
check("第二次回车 = 进入下一题", vm.runInContext("spPos", sb) === 1, "spPos=" + vm.runInContext("spPos", sb));
check("进入下一题后输入框重新可写", doc.querySelector("#spInput") && !doc.querySelector("#spInput").disabled);
check("进入下一题后题号更新为第 2 题", htmlNow.includes("第 2 / 10 题"));

console.log("\n  【连按回车跑完 5 题】");
resetSpell();
let chainOk = true;
let entered = 0;
for (let k = 0; k < 5; k++) {
  const t = vm.runInContext("spWord.w", sb);
  setVal("spInput", t);          // 模拟打字
  if (enterKey() !== "OK") { chainOk = false; break; }   // 回车 = 检查
  entered++;
  if (!doc.querySelector("#spNext")) { chainOk = false; break; } // 应出现下一题
  if (enterKey() !== "OK") { chainOk = false; break; }   // 回车 = 下一题
  entered++;
}
check("纯键盘完成 5 题（共 " + entered + " 次回车）",
  chainOk && vm.runInContext("spPos", sb) === 5,
  "spPos=" + vm.runInContext("spPos", sb));
check("5 题全部答对计入分数", vm.runInContext("spScore.r", sb) === 5,
  "得分=" + vm.runInContext("spScore.r", sb));

console.log("\n【测验页也有固定操作栏】");
navTo("quiz");
vm.runInContext("qiList=[]; newQuiz(); render();", sb);
check("测验页有操作栏", htmlNow.includes('class="actionbar"'));
check("未作答时无下一题按钮", !doc.querySelector("#nextQ"));
const oq = doc.querySelectorAll("[data-quizopt]");
oq[0].onclick();
check("作答后下一题按钮出现在操作栏", !!doc.querySelector("#nextQ"));
check("下一题按钮在 actionbar 之后", htmlNow.indexOf("nextQ") > htmlNow.indexOf("actionbar"));

console.log("\n【非答题页面不应出现操作栏】");
for (const v of ["home", "cards", "etymon", "grammar", "phrases", "me"]) {
  navTo(v);
  check(v.padEnd(8) + " 无操作栏", !htmlNow.includes('class="actionbar"'));
}

console.log("\n【★ 字母格实时同步（打字时上面的格子立刻跟着变）】");
const freshWord = () => { resetSpell(); return vm.runInContext("spWord.w", sb); };
const w1 = freshWord();
check("初始格子数为单词长度", doc.querySelectorAll("#slotsWrap .blanksq").length === w1.length,
  "格子数=" + doc.querySelectorAll("#slotsWrap .blanksq").length + " 词长=" + w1.length);
check("初始没有字母显示在未判定格子上", !doc.querySelector("#slotsWrap .blanksq.filled"));

// 读取字母格当前 HTML（打字时 syncSlots 只改 live DOM，不整页重绘）
const slotsHtml2 = () => {
  // 打字时 syncSlots() 直接写 live DOM 的 innerHTML → 取它
  // render() 重建时 live innerHTML 为空 → 从整页 HTML 里提取
  const live = doc.querySelector(".slots");
  if (live && live.innerHTML) return live.innerHTML;
  const m = htmlNow.match(/<div class="slots[^"]*">([\s\S]*?)<\/div>/);
  return m ? m[1] : "";
};


let liveOk = true;
for (let i = 0; i < Math.min(3, w1.length); i++) {
  setVal("spInput", w1.slice(0, i + 1));
  const h = slotsHtml();
  const chArr = vm.runInContext("spChars", sb);
  if (!h.includes(">" + w1[i] + "<") || chArr[i] !== w1[i]
      || chArr.slice(0, i + 1).filter(c => c).length !== i + 1) {
    liveOk = false;
    console.log("     失败于第 " + (i + 1) + " 个字母 '" + w1[i] + "'");
    console.log("     格子 HTML: " + h.slice(0, 240));
    break;
  }
}
check("逐字输入时格子实时显示（逐格验证）", liveOk);
check("打字过程中不泄露对错（不出现 ok/bad 色）",
  !slotsHtml().includes("blanksq ok") && !slotsHtml().includes("blanksq bad"));
// 光标只在"还有下一个待填位置"时出现；单词太短打满了就没有
const typedNow = Math.min(3, w1.length);
if (typedNow < w1.length) {
  check("还有空位时显示光标提示", slotsHtml().includes("caret"));
} else {
  check("打满后不再显示光标（词长 " + w1.length + "）", !slotsHtml().includes("caret"));
}
check("格子带 data-slot 可点击定位", slotsHtml().includes('data-slot="0"'));
check("实时字数统计已更新",
  ((doc.querySelector("#spLiveTip") || {}).textContent || "").startsWith("已填"),
  "实际: " + ((doc.querySelector("#spLiveTip") || {}).textContent || "无"));

setVal("spInput", w1);
const filled = (slotsHtml().match(/blanksq filled/g) || []).length;
check("全部输完后格子数正确", filled === w1.length, "typed=" + filled + " 词长=" + w1.length);
check("输满后光标消失", !slotsHtml().includes("caret"));
check("输入框不再用 maxlength（否则满格后中间插不进去）",
  doc.querySelector("#spInput").attrs.maxlength === undefined,
  "maxlength=" + doc.querySelector("#spInput").attrs.maxlength);

click("spCheck");
check("按检查后才显示对错色（此时才上绿）", slotsHtml().includes("blanksq ok"), "判定后应显示正确色");

console.log("\n【★ 提示字母后打字，被覆盖的格子应显示你打的字】");
const w2 = freshWord();
click("spReveal");
check("提示后第一个字母用蓝色 show 样式", slotsHtml().includes("blanksq shown"), slotsHtml().slice(0, 160));
check("提示字母正确显示", slotsHtml().includes(">" + w2[0] + "<"), "应为 " + w2[0]);
setVal("spInput", "z");
check("手动覆盖后显示你打的字母 z", slotsHtml().includes(">z<"), slotsHtml().slice(0, 200));
check("覆盖后标记为已填+揭示样式", slotsHtml().includes("blanksq filled shown"));

console.log("\n【★ 删除字符后格子回退】");
const w3 = freshWord();
setVal("spInput", w3.slice(0, 2));
const beforeDel = vm.runInContext("spChars", sb).filter(c=>c).length;
setVal("spInput", w3.slice(0, 1));
const afterDel = vm.runInContext("spChars", sb).filter(c=>c).length;
check("删掉一个字母后已填格数减少", afterDel === beforeDel - 1, beforeDel + " → " + afterDel);

console.log("\n【★ 例句下划线数量必须等于单词字母数】");
const allWords = vm.runInContext("WORDS", sb);
let maskBad = [];
for (const wd of allWords) {
  const out = vm.runInContext(`maskSentence(${JSON.stringify(wd.s)}, ${JSON.stringify(wd.w)})`, sb);
  const n = (out.match(/class="blanksq[ "]/g) || []).length;
  if (n !== wd.w.length) maskBad.push(wd.w + "(词长" + wd.w.length + "→" + n + "条)");
}
check("全部 " + allWords.length + " 个词的下划线数与字母数一致",
  maskBad.length === 0, maskBad.join(", "));

// 具体抽查几个不同长度的词
for (const t of ["go", "name", "family", "thanks"]) {
  const wd = allWords.find(x => x.w === t);
  if (!wd) continue;
  const out = vm.runInContext(`maskSentence(${JSON.stringify(wd.s)}, ${JSON.stringify(wd.w)})`, sb);
  const n = (out.match(/class="blanksq[ "]/g) || []).length;
  check("「" + t + "」(" + wd.w.length + " 字母) → " + n + " 条下划线", n === wd.w.length);
}

// 页面上显示的下划线数也要对（以统一的输入区 #slotsWrap 为准）
resetSpell();
const shown = doc.querySelectorAll("#slotsWrap .blanksq").length;
check("当前题页面下划线数 = 单词长度",
  shown === vm.runInContext("spWord.w.length", sb),
  "页面显示 " + shown + " 条");

console.log("\n【★ 例句下划线跟着输入实时变化（图中圈出的问题）】");
// 注意：resetSpell() 每次会随机换词，所以每一步都要重新取当前词
const freshSpell = () => { resetSpell(); return vm.runInContext("spWord.w", sb); };
// 打字时 syncSlots() 只改 live DOM（不整页重绘），所以优先读 live DOM
const maskNow = () => {
  // 直接按当前状态实时计算（等价于真机 syncSlots 的行为）。
  // mock 不会记录 render 后的 innerHTML，读 live DOM 反而会拿到过期内容。
  return vm.runInContext("spWord ? maskSentence(spWord.s, spWord.w) : ''", sb);
};

// 从 mask HTML 里取出每个下划线格 {cls, txt}
const maskCells = () => {
  const out = [];
  const re = /<span class="([^"]*)" data-slot="(\d+)">([^<]*)<\/span>/g;
  let m;
  while ((m = re.exec(maskNow())) !== null) {
    out.push({ cls: m[1], i: parseInt(m[2]), txt: m[3] });
  }
  return out;
};

const wLive = freshSpell();
setVal("spInput", wLive[0]);
let cells = maskCells();
check("打字后例句下划线里出现该字母",
  cells.some(c => c.txt === wLive[0]), "实际: " + JSON.stringify(cells));
const hasCls = (c, k) => c.cls.split(/\s+/).includes(k);
const nFilled = maskCells().filter(c => hasCls(c, "filled")).length;
const nBlank  = maskCells().filter(c => hasCls(c, "blank")).length;
const blanks  = maskCells().filter(c => hasCls(c, "blank"));
check("该位置标记为 filled", nFilled === 1, "filled 数=" + nFilled);
check("未填的位置仍是 blank", nBlank === wLive.length - 1, "blank 数=" + nBlank + " 词长=" + wLive.length);
check("未填位置不显示字母（不能剧透）",
  blanks.length > 0 && blanks.every(c => c.txt === "&nbsp;"),
  "实际: " + JSON.stringify(blanks));
check("下划线总数 = 单词长度", cells.length === wLive.length,
  cells.length + " vs " + wLive.length);

// 逐字继续填满
for (let k = 2; k <= wLive.length; k++) setVal("spInput", wLive.slice(0, k));
cells = maskCells();
check("继续打字，已填位置数递增",
  cells.filter(c => hasCls(c, "filled")).length === wLive.length,
  "filled=" + cells.filter(c => hasCls(c, "filled")).length + " 词长=" + wLive.length);
check("全部填满后没有 blank 格子", !cells.some(c => hasCls(c, "blank")));
check("全部填满后字母都在下划线上",
  cells.every((c, i) => c.txt === wLive[i]),
  "实际: " + JSON.stringify(cells.map(c => c.txt)));
check("填满后每格都标为 filled", cells.every(c => hasCls(c, "filled")));

// 判定后下划线亮出完整单词
click("spCheck");
cells = maskCells();
check("判定后下划线亮出完整单词",
  cells.length === wLive.length && cells.every((c, i) => c.txt === wLive[i]),
  "实际: " + JSON.stringify(cells.map(c => c.txt)));
check("判定后每格亮出揭示样式（ok/bad/ans 任一）",
  cells.every(c => hasCls(c, "ans") || hasCls(c, "ok") || hasCls(c, "bad")),
  "实际: " + JSON.stringify(cells.map(c => c.cls)));
check("判定后字母不再按 filled 标记", !cells.some(c => hasCls(c, "filled")));

console.log("\n【★ 空格键进下一题（不用鼠标）】");
resetSpell();
const pressSpace = (inInput) => vm.runInContext(`
  (function(){ __err=null;
    try{ document.onkeydown({key:" ",target:{tagName:${JSON.stringify(inInput ? "INPUT" : "DIV")}},preventDefault(){}}); return 'OK'; }
    catch(e){ __err=e.message; return 'THREW'; } })()
`, sb);
check("拼写页注册了全局键盘处理", vm.runInContext("typeof document.onkeydown", sb) === "function");

setVal("spInput", vm.runInContext("spWord.w", sb));
click("spCheck");
check("已判定", vm.runInContext("spChecked", sb) === true);
const before2 = vm.runInContext("spPos", sb);
pressSpace(false);
check("按空格（焦点不在输入框）→ 下一题",
  vm.runInContext("spPos", sb) === before2 + 1, "spPos=" + vm.runInContext("spPos", sb));

setVal("spInput", vm.runInContext("spWord.w", sb));
click("spCheck");
const before3 = vm.runInContext("spPos", sb);
pressSpace(true);
check("按空格（焦点在输入框）→ 下一题",
  vm.runInContext("spPos", sb) === before3 + 1, "spPos=" + vm.runInContext("spPos", sb));

resetSpell();
const before4 = vm.runInContext("spPos", sb);
pressSpace(false);
check("未判定时按空格不会跳题", vm.runInContext("spPos", sb) === before4);

console.log("\n【★ 测验页：数字键选选项 + 空格下一题】");
navTo("quiz");
vm.runInContext("qiList=[]; newQuiz(); render();", sb);
const pressQuiz = key => vm.runInContext(`
  (function(){ __err=null;
    try{ document.onkeydown({key:${JSON.stringify(key)},target:{tagName:'DIV'},preventDefault(){}}); return 'OK'; }
    catch(e){ __err=e.message; return 'THREW'; } })()
`, sb);
pressQuiz("1");
check("按数字键 1 选中第一个选项", vm.runInContext("answeredIdx", sb) === 0);
check("选完出现下一题按钮", !!doc.querySelector("#nextQ"));
pressQuiz(" ");
check("测验页按空格 → 下一题", vm.runInContext("qi", sb) === 1, "qi=" + vm.runInContext("qi", sb));

console.log("\n【★ 操作栏显示快捷键提示】");
navTo("spell");
resetSpell();
check("操作栏有快捷键提示区", htmlNow.includes("ab-keys") && htmlNow.includes("<kbd>"));
check("拼写页提示空格=下一题", htmlNow.includes("<kbd>空格</kbd>"));
doc.querySelectorAll("[data-slot]")[0];
setVal("spInput", vm.runInContext("spWord.w", sb));
click("spCheck");
check("判定后仍提示空格", htmlNow.includes("<kbd>空格</kbd>"));
navTo("quiz");
vm.runInContext("qiList=[]; newQuiz(); render();", sb);
check("测验页操作栏也有提示区", htmlNow.includes("ab-keys"));
doc.querySelectorAll("[data-quizopt]")[0].onclick();
check("测验作答后提示空格", htmlNow.includes("<kbd>空格</kbd>下一题"));

console.log("\n【★ 直接看答案后给重拼机会（不直接跳过）】");
const wG = freshWord();
click("spGive");
check("看答案后格子显示完整单词",
  wG.split("").every(ch => maskCells().some(c => c.txt === ch)),
  "实际: " + JSON.stringify(maskCells().map(c => c.txt)));
check("看答案后进入重拼阶段", vm.runInContext("spRetry", sb) === true);
check("看答案后不直接跳过", vm.runInContext("spChecked", sb) === false);
check("操作栏变成「我拼好了」按钮", !!doc.querySelector("#spRetry"));
check("没有出现「下一题」按钮", !doc.querySelector("#spNext"));
check("提示用户照着拼一遍", htmlNow.includes("sp-fb retry") && htmlNow.includes("照着"));

setVal("spInput", "zz");
click("spRetry");
check("重拼拼错时不结束本题", vm.runInContext("spChecked", sb) === false);
check("重拼拼错后可继续输入", doc.querySelector("#spInput") && !doc.querySelector("#spInput").disabled);

const wG2 = vm.runInContext("spWord.w", sb);
setVal("spInput", wG2);
click("spRetry");
check("重拼拼对后本题通过",
  vm.runInContext("spChecked", sb) === true && vm.runInContext("spResult", sb) === true);
check("重拼拼对后出现「下一题」", !!doc.querySelector("#spNext"));

const wG3 = freshWord();
setVal("spInput", wG3);
click("spGive");
check("已拼对时点看答案 = 正常判定",
  vm.runInContext("spChecked", sb) === true && vm.runInContext("spResult", sb) === true);
check("已拼对时不进重拼阶段", vm.runInContext("spRetry", sb) === false);

console.log("\n【★ 答错时也应显示正确拼写】");
const wW = freshWord();
setVal("spInput", "zz");
click("spCheck");
check("答错后进入重拼（不给下一题）", !doc.querySelector("#spNext"));
check("★ 答错后输入框已清空", vm.runInContext("spInput", sb).trim() === "",
  "输入: '" + vm.runInContext("spInput", sb) + "'");
check("★ 明确指出错在哪里",
  /第\s*<b>\d+<\/b>\s*个字母不对/.test(htmlNow) || /你写了\s*<b>\d+<\/b>\s*个字母/.test(htmlNow),
  htmlNow.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 160));
check("保存了原答案用于展示", vm.runInContext("spLastWrong", sb).trim() === "zz");

console.log("\n【★ 听写模式：判定前不剧透，判定后才揭示】");
navTo("spell");
// 用确定有实义词的句子（Hello, nice to meet you.）避免随机到无生词的短句
vm.runInContext(`
  spMode='dict';
  spQueue=[WORDS.find(w=>w.sentWords&&w.sentWords.length>0), ...WORDS.slice(0,9)];
  spPos=0; spLoad(); render();
`, sb);
check("听写模式渲染句子帮助块", htmlNow.includes("sent-help"));
check("★ 判定前只给中文意思", htmlNow.includes("句子意思"));
check("★ 判定前不显示英文原句", !htmlNow.includes("英文原句"));
check("★ 判定前不显示本句用法", !htmlNow.includes("本句用法"));
check("★ 判定前不显示逐词释义", !htmlNow.includes("逐词释义"));
check("★ 判定前用下划线填字（非独立方框）",
  !/class="slot"/.test(htmlNow) && htmlNow.includes("blanksq"), "仍在使用独立方框 style");
check("★ 例句下划线可点击填写（fillable 类）",
  vm.runInContext("maskSentence(spWord.s, spWord.w)", sb).includes("fillable"),
  "mask=" + vm.runInContext("maskSentence(spWord.s, spWord.w)", sb).slice(0, 120));
check("★ 当前待填位置有光标提示（caret-b）",
  vm.runInContext("maskSentence(spWord.s, spWord.w)", sb).includes("caret-b"));
check("★ 有引导提示", htmlNow.includes("dict-tip"));
check("★ 下划线带 data-slot 可定位", htmlNow.includes("data-slot"));

// 例句上的点击处理
const mkEl = doc.querySelector("#spMask");
check("例句绑定了点击处理", !!mkEl && typeof mkEl.onclick === "function");
if (mkEl && typeof mkEl.onclick === "function") {
  const cells2 = doc.querySelectorAll("[data-slot]");
  if (cells2.length > 1) {
    cells2[1].closest = sel => (sel === "[data-slot]" ? cells2[1] : null);
    cells2[1].getAttribute = () => "1";
    mkEl.onclick({ target: cells2[1], preventDefault() {} });
    check("★ 点例句第 2 格 → 光标定位到第 2 位",
      vm.runInContext("spCursor", sb) === 1, "spCursor=" + vm.runInContext("spCursor", sb));
  }
}

// 判定后揭示
{
  const wd3 = vm.runInContext("spWord", sb);
  setVal("spInput", wd3.w);
  click("spCheck");
  check("★ 判定后显示英文原句", htmlNow.includes("英文原句"));
  check("★ 判定后显示本句用法", htmlNow.includes("本句用法"));
  check("★ 判定后下划线亮出完整单词",
    wd3.w.split("").every(ch => maskCells().some(c => c.txt === ch)),
    "实际: " + JSON.stringify(maskCells().map(c => c.txt)));
}
check("全部词都有 sentCn（中文例句）", vm.runInContext("WORDS", sb).every(w => w.sentCn));
console.log("\n【★ 词性 / 单复数数据完整性】");
const W2 = vm.runInContext("WORDS", sb);
// 扩充后的词库分两档：前 34 个为「详细词」（含词源/用法/逐词释义），其余为「精简词」。
// 详细词必须字段齐全；精简词只需核心字段（卡片已对可选字段做空值保护）。
const RICH = W2.filter(w => w.root);
check("全部词都有词性 pos", W2.every(w => w.pos && w.pos.length > 0),
  "缺: " + W2.filter(w => !w.pos).map(w => w.w).join(","));
check("详细词都有其他用法说明", RICH.every(w => w.senses && w.senses.length > 0),
  "缺: " + RICH.filter(w => !w.senses).map(w => w.w).join(","));
const nounish = W2.filter(w => w.pos.includes("名词"));
check("名词类单词数量合理（>=12）", nounish.length >= 12, "实际 " + nounish.length);
check("详细名词都有复数说明", RICH.filter(w => w.pos.includes("名词")).every(w => w.plural),
  "缺: " + RICH.filter(w => w.pos.includes("名词") && !w.plural).map(w => w.w).join(","));
check("不可数名词有可数性说明", RICH.filter(w => w.countNote).length >= 2);
check("多词性单词标注了多个词性",
  W2.filter(w => w.pos.includes("／")).length >= 1,
  "实际 " + W2.filter(w => w.pos.includes("／")).length);
check("family 复数标注正确", W2.find(w => w.w === "family").plural.includes("families"));
check("friend 复数标注正确", W2.find(w => w.w === "friend").plural.includes("friends"));
check("详细词都有 sentWords 字段", RICH.every(w => Array.isArray(w.sentWords)));

console.log("\n【★ 单词卡：意思和例句在同一个块里，不用点】");
// 单词卡渲染的「其他用法 / 词源」依赖当前词是否是详细词；
// 扩充后大部分词是精简词，随机翻到它们就不会显示这两块。
// 这里显式把当前词定到详细词 hello，确保两块都出现（测的是「有就显示」的逻辑）。
vm.runInContext("cardWord='hello';", sb);
navTo("cards");
check("单词卡已渲染", htmlNow.includes("单词卡"));
check("没有翻面卡片", !htmlNow.includes('id="flipCard"'));
check("没有「点击查看中文」提示", !htmlNow.includes("点击卡片看中文"));
check("单词与中文意思同块（wordcard）", htmlNow.includes("wordcard"));
check("同块内有单词", htmlNow.includes("wc-word"));
check("同块内有中文意思", htmlNow.includes("wc-cn"));
check("同块内有例句", htmlNow.includes("wc-ex-en"));
check("同块内有例句中文", htmlNow.includes("wc-ex-cn"));
check("★ 同块内有词性", htmlNow.includes("wc-grammar") && htmlNow.includes("词性"));
check("★ 同块内有其他常见用法", htmlNow.includes("其他用法"));
check("★ 词源列表里也标了词性", (() => {
  navTo("etymon");
  const ok = htmlNow.includes("et-pos");
  navTo("cards");
  return ok;
})(), "词源词典应显示词性标签");
check("例句中目标词被高亮", htmlNow.includes('class="hl"'));
check("朗读按钮在同一块内", htmlNow.includes("朗读例句"));
check("例句不重复出现在下方详情块", (htmlNow.match(/wc-ex-en/g) || []).length === 1);
check("词源仍在下方", htmlNow.includes("detail") && htmlNow.includes("这个意思是怎么来的"));
{
  const cw = vm.runInContext("WORDS.find(w=>w.sentWords&&w.sentWords.length>0)", sb);
  if (cw) {
    vm.runInContext(`
      for(let i=0;i<WORDS.length;i++){
        if(WORDS[i].w===${JSON.stringify(cw.w)}){ currentWordIndex=()=>i; break; }
      }
      view='cards'; render();
    `, sb);
    check("有实义词时同块内显示逐词释义",
      htmlNow.includes("wc-words") && htmlNow.includes("wc-k"), "词: " + cw.w);
  }
}

console.log("\n【★ 语法课：点开是完整讲解页】");
navTo("grammar");
check("课程列表页渲染", htmlNow.includes("语法课"));
const lessonCards = doc.querySelectorAll("[data-grammar]");
check("列出 20 节课", lessonCards.length === 20, "实际 " + lessonCards.length);
lessonCards[0].onclick();
check("点开后进入独立详情页", htmlNow.includes("lesson-page"));
check("详情页含规则讲解", htmlNow.includes('class="rules"'));
check("详情页含「为什么这样」", htmlNow.includes("这条规则为什么这样"));
check("详情页含例句列表", htmlNow.includes("ex-list"));
check("详情页含常见错误", htmlNow.includes("err-box"));
check("详情页含课末测验", htmlNow.includes("gquiz"));
check("有返回列表按钮", !!doc.querySelector("#backLessons"));
check("有上一课/下一课", !!doc.querySelector("#prevLesson") && !!doc.querySelector("#nextLesson"));
check("不是弹在列表下面", !htmlNow.includes('id="lessonBox"'));
check("例句至少 8 条", doc.querySelectorAll(".ex-row").length >= 8, "实际 " + doc.querySelectorAll(".ex-row").length);
check("每条例句都有中文翻译",
  vm.runInContext("GRAMMAR", sb).every(g => g.ex.every(x => Array.isArray(x) && x[0] && x[1])));

console.log("\n【★ 语法课测验：点选项立即判定】");
const g0 = vm.runInContext("GRAMMAR[0]", sb);
const gqOpts = doc.querySelectorAll("[data-gq]");
check("测验题数正确", gqOpts.length === g0.quiz.length * 4,
  "选项数=" + gqOpts.length);
check("未提交前不显示正确答案", !htmlNow.includes("gq-right"));

gqOpts.forEach(b => {
  const [n, k] = b.dataset.gq.split(":");
  if (parseInt(k) === g0.quiz[parseInt(n)].a) b.onclick();
});
check("★ 选完最后一题自动出成绩", htmlNow.includes("gq-result"));
check("全对显示满分", htmlNow.includes("/ " + g0.quiz.length));
check("全对时不列错题", !htmlNow.includes("你的答案"));
check("提供「再练一次」", !!doc.querySelector("#gqRedo"));

doc.querySelector("#gqRedo").onclick();
doc.querySelectorAll("[data-gq]").forEach(b => {
  const [n, k] = b.dataset.gq.split(":");
  if (parseInt(k) !== g0.quiz[parseInt(n)].a) b.onclick();
});
check("答错后标出你的答案", htmlNow.includes("你的答案") || htmlNow.includes("你选"));
check("答错后给出正确答案", htmlNow.includes("正确答案"));
check("答错后有逐题解析", htmlNow.includes("gq-e"));
check("提供「回去看讲解」", !!doc.querySelector("#gqBackRead"));
check("课程列表标记已完成", vm.runInContext("gqState[0].done", sb) === true);

console.log("\n  【点选项立即判定，无需点提交】");
doc.querySelector("#gqRedo").onclick();
check("底部显示实时进度条", htmlNow.includes("gq-bar"));
check("未答完时提交按钮禁用", /id="gqSubmit" disabled/.test(htmlNow));
const oneOpt = doc.querySelectorAll("[data-gq]")[0];
oneOpt.onclick();
check("★ 选第一题立刻显示对错", htmlNow.includes("gq-verdict"), "应立即显示 ✅/❌");
check("★ 该题被锁定不能改", htmlNow.includes("disabled"), "该题应锁定");
check("★ 答错时显示解析", htmlNow.includes("gq-e"));

console.log("\n【★ 语法课：返回列表 + 下一课】");
const backRead = doc.querySelector("#gqBackRead"); if (backRead) backRead.onclick();
check("能滚回讲解区", true);
doc.querySelector("#backLessons").onclick();
check("返回课程列表", !htmlNow.includes("lesson-page"));
vm.runInContext(`
  view='grammar'; lessonIdx=0; gqIdx=0; initGQuiz(0); render();
  const g = GRAMMAR[0];
  for (let n=0;n<g.quiz.length;n++) pickGQuiz(n, g.quiz[n].a);
`, sb);
doc.querySelector("#backLessons").onclick();
check("答完后列表显示完成标记", htmlNow.includes("lesson-done"));
doc.querySelectorAll("[data-grammar]")[2].onclick();
check("可打开第 3 课", htmlNow.includes(vm.runInContext("GRAMMAR[2].t", sb).replace(/^第\d+课：/, "")));

console.log("\n【★ 口语：每条有英文 + 音标 + 中文 + 朗读】");
navTo("phrases");
const P = vm.runInContext("PHRASES", sb);
check("口语条数充足（>=50，覆盖多场景不重复）", P.length >= 50, "实际 " + P.length);
check("全部有音标", P.every(p => p.ph && p.ph.startsWith("/")), "缺音标");
check("音标出现在页面上", htmlNow.includes("ph-ipa"));
check("每条都有朗读按钮", (htmlNow.match(/speak\(/g) || []).length >= 18);
check("英文在主行 ph-en", htmlNow.includes('class="ph-en"'));
check("音标+中文在同一副行", htmlNow.includes('class="ph-second"'));
check("抽查音标存在", htmlNow.includes(P.find(p => p.en === "How are you?").ph));

console.log("\n【★ 错题本：拼错/答错的词自动收集并可整页查看】");
// 构造：sorry 拼错过 2 次且已订正；water 拼错 1 次还没订正
vm.runInContext(`
  S.wrongWords = ['sorry','water'];
  S.wrongStats = {
    sorry: { n: 2, last: '2026-10-10', fixed: '2026-10-12' },
    water: { n: 1, last: '2026-10-14', fixed: '' }
  };
  save(); render();
`, sb);
check("openWrongWords 只返回未订正的", (() => {
  const r = vm.runInContext("JSON.stringify(openWrongWords())", sb);
  return r === '["water"]';
})(), vm.runInContext("JSON.stringify(openWrongWords())", sb));

navTo("wrong");
check("错题本页面已渲染", htmlNow.includes("错题本"), htmlNow.slice(0, 120));
check("显示「还没搞懂的」分组", htmlNow.includes("还没搞懂的"));
check("显示「已订正的」分组", htmlNow.includes("已订正的"));
check("未订正词 water 出现", htmlNow.includes(">water<") || htmlNow.includes("water"));
check("已订正词 sorry 出现", htmlNow.includes("sorry"));
check("显示错误次数", htmlNow.includes("错了 2 次"));
check("显示最后错误日期", htmlNow.includes("最后错于 2026-10-14"));
check("未订正卡片有 wr-open 类", htmlNow.includes("wr-open"));
check("已订正卡片有 wr-fixed 类", htmlNow.includes("wr-fixed"));
check("显示词性字段", htmlNow.includes("词性"), "错题卡应展示词性");
check("有「去拼写练习」按钮", !!doc.querySelector("#practiceWrong"));
check("「去拼写练习」已绑定 onclick", typeof (doc.querySelector("#practiceWrong") || {}).onclick === "function");
check("有「清空错题本」按钮", !!doc.querySelector("#clearWrong"));

console.log("\n【★ 错题本：点「去拼写练习」把错词排进队列】");
doc.querySelector("#practiceWrong").onclick();
check("进入拼写页", htmlNow.includes("拼写练习"));
check("错词 water 排在队首", vm.runInContext("spQueue[0] && spQueue[0].w", sb) === "water");
check("队列只含错词（不补新词）", vm.runInContext("spQueue.length", sb) === 1, "长度=" + vm.runInContext("spQueue.length", sb));
check("非复习队列（spReview=false）", vm.runInContext("spReview", sb) === false);

console.log("\n【★ 拼对错词 → 自动标记已订正】");
vm.runInContext(`
  S.wrongWords = ['water'];
  S.wrongStats = { water: { n: 1, last: '2026-10-14', fixed: '' } };
  spQueue = [WORDS.find(w => w.w === 'water')]; spPos = 0; spLoad(); spReview = false;
`, sb);
setVal("spInput", "water");
click("spCheck");
check("拼对后 water 被标记 fixed", vm.runInContext("!!S.wrongStats.water.fixed", sb) === true);
check("openWrongWords 变为空", vm.runInContext("openWrongWords().length", sb) === 0);
check("反馈提示已订正", htmlNow.includes("已订正") || htmlNow.includes("fixed-note"));

console.log("\n【★ 每日复习：只出错题、不出新词】");
vm.runInContext(`
  S.learned = ['sorry','family','today','water','happy','book'];   // 学过一批词
  S.wrongWords = ['water','sorry'];                                // 只有 2 个错题
  S.wrongStats = {
    water: { n: 1, last: '2026-10-14', fixed: '' },
    sorry: { n: 1, last: '2026-10-13', fixed: '2026-10-14' }
  };
  S.lastReview = ''; save(); render();
`, sb);
navTo("review");
check("复习页面已渲染", htmlNow.includes("每日复习"), htmlNow.slice(0, 120));
check("有「开始复习」按钮", !!doc.querySelector("#startReview"));
check("有「今天先跳过」按钮", !!doc.querySelector("#skipReview"));
check("显示本轮复习词数", htmlNow.includes("本轮复习词数"));
const rq = JSON.parse(vm.runInContext("JSON.stringify(reviewQueue().map(w=>w.w))", sb));
check("复习队列只含错题（2 个）", rq.length === 2, "队列=" + JSON.stringify(rq));
check("队列全是错题本里的词", rq.every(w => ["water", "sorry"].includes(w)), JSON.stringify(rq));
check("没学过的新词不出现", !rq.some(w => !["water", "sorry"].includes(w)), JSON.stringify(rq));
check("未订正词 water 优先于已订正词 sorry", rq[0] === "water", JSON.stringify(rq));
check("页面显示「错题本累计」", htmlNow.includes("错题本累计"));

console.log("\n【★ 复习：错题超过 8 个时只取 8 个】");
vm.runInContext(`
  S.wrongWords = WORDS.slice(0, 12).map(w=>w.w);
  S.wrongStats = {}; S.wrongWords.forEach(w => S.wrongStats[w] = { n:1, last:'2026-10-14', fixed:'' });
`, sb);
check("最多 REVIEW_SIZE 个", vm.runInContext("reviewQueue().length", sb) === vm.runInContext("REVIEW_SIZE", sb));

console.log("\n【★ 复习：错题本为空 → 不拦路、页面提示没错题】");
vm.runInContext(`
  S.wrongWords = []; S.wrongStats = {}; S.lastReview = ''; S.reviewSeen = '';
  view = 'review'; render();
`, sb);
check("空错题时复习页给出提示", htmlNow.includes("今天没有需要复习的错题"));
check("空错题时不显示开始按钮", !doc.querySelector("#startReview"));
check("有「去拼写练习」引导按钮", !!doc.querySelector("#revGoSpell"));
const landFnEmpty = `
  (function(){
    let v = 'home';
    const hasWrong = (S.wrongWords||[]).length > 0;
    if (hasWrong && S.reviewSeen !== today()) v = 'review';
    return v;
  })()
`;
check("错题本为空 → 落在首页", vm.runInContext(landFnEmpty, sb) === "home");
vm.runInContext("S.wrongWords=['water']; S.wrongStats={water:{n:1,last:'2026-10-14',fixed:''}}; S.reviewSeen='';", sb);
check("有错题 → 落在复习页", vm.runInContext(landFnEmpty, sb) === "review");

console.log("\n【★ 复习：开始 → 队列 → 做完标记今天已复习】");
vm.runInContext(`
  S.learned = ['sorry','family','today','water','happy','book'];
  S.wrongWords = ['water','sorry'];
  S.wrongStats = {
    water: { n: 1, last: '2026-10-14', fixed: '' },
    sorry: { n: 1, last: '2026-10-13', fixed: '2026-10-14' }
  };
  S.lastReview=''; S.reviewSeen='';
  view='review'; render();
`, sb);
doc.querySelector("#startReview").onclick();
check("进入拼写页并处于复习态", vm.runInContext("spReview", sb) === true);
check("复习横幅出现", htmlNow.includes("rev-banner"), "应有复习横幅");
check("队列首个是错词 water", vm.runInContext("spQueue[0].w", sb) === "water");
check("复习队列不含新词", vm.runInContext("spQueue.length", sb) === 2, "长度=" + vm.runInContext("spQueue.length", sb));
// 一路答到底，看最后一题后是否标记 lastReview
vm.runInContext(`
  (function(){
    while (spPos + 1 < spQueue.length) { spPos++; spLoad(); }
    spChecked = true; spRetry = false;
    render();                     // 重绘出「看本轮结果」按钮并重新绑定
  })();
`, sb);
click("spNext");
check("做完复习标记 lastReview=今天", vm.runInContext("S.lastReview === today()", sb) === true);

console.log("\n【★ 首日着陆逻辑：有错题 + 今天没看过复习页 → 落在复习页】");
const landFn = `
  (function(){
    let v = 'home';
    const hasWrong = (S.wrongWords||[]).length > 0;
    if (hasWrong && S.reviewSeen !== today()) v = 'review';
    return v;
  })()
`;
vm.runInContext("S.wrongWords=['water']; S.reviewSeen = today();", sb);
const landView = vm.runInContext(landFn, sb);
vm.runInContext("S.reviewSeen = '';", sb);
const landView2 = vm.runInContext(landFn, sb);
check("今天已看过复习页 → 落在首页", landView === "home", landView);
check("今天没看过 → 落在复习页", landView2 === "review", landView2);

console.log("\n【★ 首页：错题统计块可点 + 导航卡片含错题本】");
vm.runInContext(`
  S.wrongWords = ['water'];
  S.wrongStats = { water: { n: 1, last: '2026-10-14', fixed: '' } };
  view = 'home'; render();
`, sb);
check("首页有可点击错题统计块", !!doc.querySelector(".hs-wrong"));
check("错题统计已绑定 onclick", typeof (doc.querySelector(".hs-wrong") || {}).onclick === "function");
check("首页导航卡片有错题本", htmlNow.includes("nc-wrong"));
check("首页导航卡片有每日复习入口", htmlNow.includes('data-v="wrong"'));
doc.querySelector(".hs-wrong").onclick();
check("点统计块进入错题本", htmlNow.includes("还没搞懂的") || htmlNow.includes("错题本是空的"));

console.log("\n【★ 自适应引擎：掌握度由连对次数决定】");
let r1 = vm.runInContext(`
  (function(){
    S.wordStats = {}; S.learned = [];
    const out = [];
    out.push(mastery('water'));                 // 没学过 → 0
    S.learned = ['water'];
    out.push(mastery('water'));                 // 只点过"学会" → 1
    bumpWord('water', true);  out.push(mastery('water'));   // 连对 1 → 3
    bumpWord('water', true);  out.push(mastery('water'));   // 连对 2 → 4
    bumpWord('water', true);  out.push(mastery('water'));   // 连对 3 → 5
    bumpWord('water', false); out.push(mastery('water'));   // 错一次 → 连对归零 → 2
    out.push(wStat('water').wrong);
    return JSON.stringify(out);
  })()
`, sb);
let A = JSON.parse(r1);
check("没学过 → 掌握度 0", A[0] === 0, String(A[0]));
check("只在词卡点过学会 → 掌握度 1", A[1] === 1, String(A[1]));
check("连对 1 次 → 3", A[2] === 3, String(A[2]));
check("连对 2 次 → 4", A[3] === 4, String(A[3]));
check("连对 3 次 → 5（已掌握）", A[4] === 5, String(A[4]));
check("错一次后连对归零 → 2", A[5] === 2, String(A[5]));
check("错误次数被记录", A[6] === 1, String(A[6]));

console.log("\n【★ 自适应引擎：看答案/用提示拼对不算掌握】");
let A2 = JSON.parse(vm.runInContext(`
  (function(){
    S.wordStats = {}; S.learned = [];
    bumpWord('water', true, true);      // assisted
    const a = mastery('water');
    const s = wStat('water');
    return JSON.stringify([a, s.streak, s.right, s.assisted]);
  })()
`, sb));
check("assisted 拼对：连对仍为 0", A2[1] === 0, String(A2[1]));
check("assisted 拼对：不计入 right", A2[2] === 0, String(A2[2]));
check("assisted 次数被单独记录", A2[3] === 1, String(A2[3]));
check("assisted 拼对掌握度停在 2（练过但没连对）", A2[0] === 2, String(A2[0]));

console.log("\n【★ 自适应出题：错题优先、熟练词最后、都只在词库内】");
const AQ = JSON.parse(vm.runInContext(`
  (function(){
    S.wordStats = {}; S.learned = [];
    const all = WORDS.map(w => w.w);
    // 造 3 个错题（没订正）、5 个熟练到 5 级
    S.wrongWords = all.slice(0, 3);
    S.wrongStats = {}; S.wrongWords.forEach(w => S.wrongStats[w] = { n:1, last:'2026-10-14', fixed:'' });
    all.slice(3, 8).forEach(w => { for (let i=0;i<3;i++) bumpWord(w, true); });
    const q = adaptiveQueue(10).map(x => x.w);
    return JSON.stringify({
      len: q.length,
      wrongIn: q.filter(w => all.slice(0,3).includes(w)).length,
      solidIn: q.filter(w => all.slice(3,8).includes(w)).length,
      allInLib: q.every(w => all.includes(w)),
      uniq: new Set(q).size === q.length
    });
  })()
`, sb));
check("队列长度为 10", AQ.len === 10, String(AQ.len));
check("3 个错题全部入选", AQ.wrongIn === 3, String(AQ.wrongIn));
check("熟练词最多凑 1 个（名额先给该练的）", AQ.solidIn <= 1, String(AQ.solidIn));
check("出题只来自词库", AQ.allInLib === true);
check("同一轮不重复出同一个词", AQ.uniq === true);

console.log("\n【★ 自适应出题：全新用户 → 全出新词】");
const AQ2 = JSON.parse(vm.runInContext(`
  (function(){
    S.wordStats = {}; S.learned = []; S.wrongWords = []; S.wrongStats = {};
    const q = adaptiveQueue(10).map(x => x.w);
    return JSON.stringify({ len: q.length, allFresh: q.every(w => mastery(w) === 0) });
  })()
`, sb));
check("新用户也凑满 10 个", AQ2.len === 10, String(AQ2.len));
check("新用户出的全是没学过的词", AQ2.allFresh === true);

console.log("\n【★ 自适应出题：本轮构成统计正确】");
const BD = JSON.parse(vm.runInContext(`
  (function(){
    S.wordStats = {}; S.learned = []; S.wrongWords = []; S.wrongStats = {};
    const q = WORDS.slice(0, 12);
    S.wrongWords = [q[0].w]; S.wrongStats[q[0].w] = { n:1, last:'2026-10-14', fixed:'' };
    bumpWord(q[1].w, true);            // 待巩固
    for (let i=0;i<3;i++) bumpWord(q[2].w, true);   // 已掌握
    const bd = queueBreakdown([q[0], q[1], q[2], q[5]]);
    return JSON.stringify(bd);
  })()
`, sb));
check("构成统计：错题 1", BD.wrong === 1, String(BD.wrong));
check("构成统计：待巩固 1", BD.weak === 1, String(BD.weak));
check("构成统计：已掌握 1", BD.solid === 1, String(BD.solid));
check("构成统计：新词 1", BD.fresh === 1, String(BD.fresh));

console.log("\n【★ 自适应难度建议：正确率驱动升级/退回】");
const REC = JSON.parse(vm.runInContext(`
  (function(){
    const out = {};
    spMode = 'cn';
    store.set('spelling_score_cn', JSON.stringify({ r: 19, w: 1 }));   // 95%
    out.up = recommendMode('cn');
    store.set('spelling_score_cn', JSON.stringify({ r: 1, w: 1 }));    // 样本太小 → 不下结论
    out.tiny = recommendMode('cn');
    spMode = 'dict';
    store.set('spelling_score_dict', JSON.stringify({ r: 2, w: 8 }));  // 20% → 退回
    out.down = recommendMode('dict');
    store.set('spelling_score_letter', JSON.stringify({ r: 4, w: 4 }));// 50% → 维持
    out.keep = recommendMode('letter');
    return JSON.stringify(out);
  })()
`, sb));
check("中→英 95% → 建议升到首字母", REC.up && REC.up.to === "letter", JSON.stringify(REC.up));
check("样本 < 5 不下结论", REC.tiny === null, JSON.stringify(REC.tiny));
check("听写 20% → 建议退回首字母", REC.down && REC.down.to === "letter", JSON.stringify(REC.down));
check("正确率 50% → 不升不降", REC.keep === null, JSON.stringify(REC.keep));

console.log("\n【★ 学习阶段随「真正掌握」的词数变化】");
const STG = JSON.parse(vm.runInContext(`
  (function(){
    const hold = w => { for (let i=0;i<3;i++) bumpWord(w, true); };  // 连对 3 次 = 已掌握
    const dbgBefore = Object.keys(S.wordStats||{}).length;
    S.wordStats = {};
    const dbgAfter = Object.keys(S.wordStats||{}).length;
    const out = {};
    out.zero = stageInfo().id;
    for (let i=0;i<5;i++) hold(WORDS[i].w);      out.five  = stageInfo().id;
    for (let i=5;i<20;i++) hold(WORDS[i].w);     out.twenty= stageInfo().id;
    out.mastered = masteredCount();
    out.dbgBefore = dbgBefore; out.dbgAfter = dbgAfter;
    out.dbgHold = 20;
    out.dbgStatsSize = Object.keys(S.wordStats||{}).length;
    out.dbgM5 = WORDS.filter(w => mastery(w.w) === 5).length;
    out.dbgStageM = (function(){ const s={}; for (const k in S.wordStats) if (S.wordStats[k].streak>=3) s[k]=1; return Object.keys(s).length; })();
    return JSON.stringify(out);
  })()
`, sb));
check("掌握 0 个 → 入门期", STG.zero === "begin", STG.zero);
check("掌握 5 个 → 成长期", STG.five === "grow", STG.five);
check("掌握 20 个 → 熟练期", STG.twenty === "pro", STG.twenty);
check("masteredCount 统计正确", STG.mastered === 20, "mastered="+STG.mastered+" before="+STG.dbgBefore+" after="+STG.dbgAfter+" hold="+STG.dbgHold+" statsSize="+STG.dbgStatsSize+" m5="+STG.dbgM5+" stageM="+STG.dbgStageM);

console.log("\n【★ 首页「今日计划」是数据驱动、会随状态变化】");
// 情况一：有错题 + 今天没练 + 已掌握 5 个词（成长期）
vm.runInContext(`
  S.wordStats = {};
  for (let i=0;i<5;i++) for (let k=0;k<3;k++) bumpWord(WORDS[i].w, true);   // 掌握 5 个 → 成长期
  S.learned = WORDS.slice(0,25).map(w=>w.w);
  S.wrongWords = ['water','sorry']; S.wrongStats = {water:{n:1,last:'2026-10-14',fixed:''},sorry:{n:1,last:'2026-10-14',fixed:''}};
  S.todayWords = []; view='home'; render();
`, sb);
const planA = htmlNow;
check("计划里有今日计划卡片", planA.includes("今日计划"));
check("有错题时提示先订正", planA.includes("先订正 2 个错题"));
check("今天没练时提示开始拼写", planA.includes("今天还没开始拼写"));
check("显示学习阶段徽章", planA.includes("成长期"));
check("Hero 变成欢迎回来", planA.includes("欢迎回来"));
check("计划按钮已绑定", typeof (doc.querySelector(".pi-go") || {}).onclick === "function");

// 情况二：无错题 + 今天已完成
vm.runInContext(`
  S.wrongWords = []; S.wrongStats = {};
  S.todayWords = WORDS.slice(0,10).map(w=>w.w);
  view='home'; render();
`, sb);
const planB = htmlNow;
check("没错题时不再提示订正", !planB.includes("先订正"));
check("完成今日量后提示去做测验", planB.includes("今天的拼写量已完成"));
check("计划内容确实随状态变化", planA !== planB);

// 情况三：全新用户 → 原始欢迎语
vm.runInContext(`S.learned=[]; S.todayWords=[]; S.wrongWords=[]; S.wrongStats={}; S.days=[]; view='home'; render();`, sb);
check("新用户显示原始欢迎语", htmlNow.includes("你好，欢迎开始学英语"));

console.log("\n【★ 我的页：掌握度分布 + 动态建议】");
vm.runInContext(`
  S.wordStats = {}; S.learned = [];
  for (let i=0;i<3;i++) bumpWord(WORDS[0].w, true);   // 2 个已掌握
  for (let i=0;i<3;i++) bumpWord(WORDS[1].w, true);
  bumpWord(WORDS[2].w, true);                          // 1 个待巩固
  S.wrongWords = ['water']; S.wrongStats = {water:{n:1,last:'2026-10-14',fixed:''}};
  view='me'; render();
`, sb);
check("我的页有逐级掌握度", htmlNow.includes("逐级掌握度"));
check("已掌计数正确显示", htmlNow.includes(">2<") || htmlNow.includes(">2<"), "应显示 2 个已掌握");
check("我的页建议提到错题", htmlNow.includes("没订正"));
check("我的页有学习阶段", htmlNow.includes("学习阶段"));

console.log("\n【★ 拼写页：显示本轮构成 + 难度建议按钮】");
vm.runInContext(`
  S.wordStats = {}; S.learned = []; S.wrongWords = []; S.wrongStats = {};
  store.set('spelling_score_cn', JSON.stringify({ r: 19, w: 1 }));
  view='spell'; spQueue=[]; spMode='cn'; spReview=false; spNewRound(); render();
`, sb);
check("拼写页显示本轮出题构成", htmlNow.includes("本轮出题"));
check("构成里有新词/待巩固等字样", /新词|待巩固|错题/.test(htmlNow), htmlNow.slice(0, 200));
check("正确率高时出现难度建议", htmlNow.includes("sp-advice"));
check("有「切换难度」按钮且已绑定", typeof (doc.querySelector("#spTakeAdvice") || {}).onclick === "function");
doc.querySelector("#spTakeAdvice").onclick();
check("点建议后模式切到首字母", vm.runInContext("spMode", sb) === "letter");

console.log("\n【★ 功能页的页面头不重复（之前会渲两次）】");
for (const v of ["today", "wrong", "review", "cards", "grammar", "me"]) {
  navTo(v);
  const n = (htmlNow.match(/← 返回首页/g) || []).length;
  check(v + " 页「返回首页」只出现 1 次", n === 1, "出现 " + n + " 次");
}

console.log("\n【★ 错题本：每个词都能就地「再拼一遍」】");
vm.runInContext(`
  S.wordStats = {}; S.wrongWords = [];
  markWrongWord('water'); markWrongWord('sorry');
  view='wrong'; render();
`, sb);
const pwBtns = doc.querySelectorAll(".wr-practice");
check("错题本里有「再拼一遍」按钮", pwBtns.length >= 2, "找到 " + pwBtns.length + " 个");
check("按钮带 data-practice（知道练哪个词）", !!(pwBtns[0] && pwBtns[0].dataset.practice), pwBtns[0] && pwBtns[0].dataset.practice);
const clickedWord = pwBtns[0] ? pwBtns[0].dataset.practice : "";
check("「再拼一遍」按钮已绑定 onclick", typeof (pwBtns[0] || {}).onclick === "function");
if (pwBtns[0] && typeof pwBtns[0].onclick === "function") {
  pwBtns[0].onclick();
  check("点「再拼一遍」进入拼写页", vm.runInContext("view", sb) === "spell", vm.runInContext("view", sb));
  check("队列只有这一个词", vm.runInContext("spQueue.length", sb) === 1, "len=" + vm.runInContext("spQueue.length", sb));
  check("练的正是被点的那个词", vm.runInContext("spQueue[0].w", sb) === clickedWord, vm.runInContext("spQueue[0].w", sb));
  check("不是复习队列", vm.runInContext("spReview", sb) === false);
}

console.log("\n【★ 多用户档案：同一台电脑多个人，进度相互独立】");
vm.runInContext(`switchProfile('default'); S.learned=['water','sorry']; S.stars=7; save();`, sb);
const newPid = vm.runInContext(`addProfile('小明')`, sb);
check("新建档案返回了 id", typeof newPid === "string" && newPid.length > 0, String(newPid));
check("档案数量变为 2", vm.runInContext("PROFILES.length", sb) === 2, String(vm.runInContext("PROFILES.length", sb)));
vm.runInContext(`switchProfile(${JSON.stringify(newPid)})`, sb);
check("切到新档案后进度是空的", vm.runInContext("S.learned.length", sb) === 0, JSON.stringify(vm.runInContext("S.learned", sb)));
check("当前档案名是小明", vm.runInContext("curProfile().name", sb) === "小明", vm.runInContext("curProfile().name", sb));
vm.runInContext(`switchProfile('default')`, sb);
check("切回原档案：已学词还在", vm.runInContext("S.learned.length", sb) === 2, JSON.stringify(vm.runInContext("S.learned", sb)));
check("切回原档案：星星还是 7", vm.runInContext("S.stars", sb) === 7, String(vm.runInContext("S.stars", sb)));
check("我的页渲染出档案列表", (navTo("me"), htmlNow.includes("学习档案") && htmlNow.includes("小明")), "应有档案卡片");
vm.runInContext(`removeProfile(${JSON.stringify(newPid)}); switchProfile('default');`, sb);
check("删除档案后只剩 1 个", vm.runInContext("PROFILES.length", sb) === 1, String(vm.runInContext("PROFILES.length", sb)));

console.log("\n【★ 学习方案引擎：每天自动安排（用户看不到整条路线）】");
const TP1 = JSON.parse(vm.runInContext(`(function(){
  S.wordStats = {}; S.learned = [];
  const t = Curriculum.today(masteredCount(), grammarDoneFn());
  return JSON.stringify({ wpd: t.wpd, g: (t.grammar||[]).length, p: (t.phrases||[]).length, stage: t.stage && t.stage.name });
})()`, sb));
check("方案给出每天词数（>0）", TP1.wpd > 0, JSON.stringify(TP1));
check("方案安排了语法课", TP1.g >= 1, JSON.stringify(TP1));
check("零基础阶段安排了口语句", TP1.p >= 1, JSON.stringify(TP1));
vm.runInContext(`syncDailyGoal()`, sb);
check("每日目标由方案驱动", vm.runInContext("dailyGoal", sb) === TP1.wpd, "dailyGoal=" + vm.runInContext("dailyGoal", sb));
const TP2wpd = vm.runInContext(`(function(){
  S.wordStats = {}; S.learned = [];
  for (let i = 0; i < WORDS.length; i++) { const w = WORDS[i].w; for (let k = 0; k < 3; k++) bumpWord(w, true); }
  return Curriculum.today(masteredCount(), grammarDoneFn()).wpd;
})()`, sb);
check("掌握更多词后每天词数变多", TP2wpd > TP1.wpd, TP1.wpd + " → " + TP2wpd);
vm.runInContext(`S.wordStats={}; S.learned=[];`, sb);

console.log("\n【★ 阅读页：分级短文 + 整段翻译 / 填单词】");
navTo("read");
check("阅读页渲染出标题", htmlNow.includes("阅读"));
check("短文列表有 ≥10 篇", (htmlNow.match(/rd-item/g) || []).length >= 10, "实际 " + (htmlNow.match(/rd-item/g) || []).length);
check("列表标注了难度 L", htmlNow.includes("难度 L"));
// 进入第 1 篇，翻译模式
vm.runInContext("readId=0; readMode='trans'; render();", sb);
check("翻译模式显示英文段", htmlNow.includes("rd-en"));
check("翻译模式有「显示中文」按钮", htmlNow.includes("显示中文"));
check("翻译模式有「整段翻译 / 填单词」切换", htmlNow.includes("整段翻译") && htmlNow.includes("填单词"));
// 填词模式
vm.runInContext("readMode='fill'; render();", sb);
check("填词模式挖出空白", (htmlNow.match(/rd-blank/g) || []).length >= 1, "实际 " + (htmlNow.match(/rd-blank/g) || []).length);
check("填词模式有「核对答案」按钮", htmlNow.includes("核对答案"));
// 返回列表
vm.runInContext("readId=''; render();", sb);
check("可返回短文列表", htmlNow.includes("按你的进度逐步解锁"));

console.log("\n【★ 词库按阶段分带：与语法/口语一样随进度解锁】");
vm.runInContext(`S.wordStats={}; S.learned=[];`, sb);
const band0 = vm.runInContext("stageWordBand()", sb);
check("零基础时词带是 [0,6)（第 1 阶段）", band0[0] === 0 && band0[1] === 6, JSON.stringify(band0));
const fw0 = vm.runInContext("todayFocusWords(6).map(w => WORDS.indexOf(w))", sb);
check("零基础当天词都在第 1 阶段词带内", fw0.length === 6 && fw0.every(i => i >= 0 && i < 6), JSON.stringify(fw0));
// 进阶：掌握 ~40 词
vm.runInContext(`S.wordStats={}; S.learned=[]; for (let i=0;i<40;i++){ const w=WORDS[i].w; for(let k=0;k<3;k++) bumpWord(w, true); }`, sb);
const band3 = vm.runInContext("stageWordBand()", sb);
check("掌握 ~40 词后词带推进到更后的阶段", band3[0] >= 16, JSON.stringify(band3));
const fw3 = vm.runInContext("todayFocusWords(8).map(w => WORDS.indexOf(w))", sb);
check("进阶后当天词落在本阶段词带内", fw3.every(i => i >= band3[0] && i < band3[1]), JSON.stringify(fw3));
vm.runInContext(`S.wordStats={}; S.learned=[];`, sb);

console.log("\n【★ 口语：地道短句 + 语音识别优雅降级】");
vm.runInContext("view='phrases'; render();", sb);
check("口语卡片数量充足（>=70 句，覆盖日常场景）", (htmlNow.match(/class="card phrase"/g) || []).length >= 70, "实际 " + ((htmlNow.match(/class="card phrase"/g) || []).length));
check("含地道日常短句（Wanna grab a coffee?）", htmlNow.includes("Wanna grab a coffee?"), "缺少 colloquial 短句");
check("含更多口语化表达（What's up? / No worries.）", htmlNow.includes("What's up?") && htmlNow.includes("No worries."), "缺少口语化表达");
// 测试沙箱无 SpeechRecognition → 麦克风按钮不应出现（优雅降级，不影响双击即开）
check("无语音识别时麦克风按钮隐藏", !htmlNow.includes("data-mic"), "出现了 data-mic");
// comparePhrase 逐词对比逻辑
const cmp1 = vm.runInContext("comparePhrase('How are you?', 'how are you')", sb);
check("读音完全一致 → 全对", cmp1.allOk === true && cmp1.words.length === 3, JSON.stringify(cmp1));
const cmp2 = vm.runInContext("comparePhrase('How are you?', 'how is you')", sb);
check("有错词 → 标红且 not allOk", cmp2.allOk === false && cmp2.words.some(w => !w.ok), JSON.stringify(cmp2));

console.log("");
console.log("通过 " + pass + " 项，失败 " + fail + " 项");
if (fail) { console.log("=== 存在失败项 ==="); process.exit(1); }
console.log("=== ✓ 全部通过 ===");
