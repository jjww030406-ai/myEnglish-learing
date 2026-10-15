/* 测验模块回归测试 —— 在 Node 里用 vm 沙箱模拟浏览器环境
   运行：node test-quiz.js                                          */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const dir = __dirname;
const src = ["js/data.js", "js/grammar.js", "js/curriculum.js", "js/state.js", "js/app.js"]
  .map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");

const store = {};
const el = {
  innerHTML: "", textContent: "", value: "", disabled: false, style: {},
  scrollIntoView() {}, blur() {}, focus() {},
  classList: { add() {}, remove() {}, toggle() {} },
  querySelectorAll: () => [], after() {}, remove() {}
};

let lastAlert = "";
const lsMock = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const sb = {
  localStorage: lsMock,
  // 站点代码通过 window.localStorage 访问存储，这里提供同一份
  window: { localStorage: lsMock },
  document: { querySelector: () => el, querySelectorAll: () => [] },
  console,
  speechSynthesis: { speak() {}, cancel() {} },
  confirm: () => true,
  alert: m => { lastAlert = String(m); },
  Date, JSON, Math, String, Number, Array, Object, parseInt, parseFloat, isNaN, setTimeout
};
sb.globalThis = sb;
vm.createContext(sb);

vm.runInContext(src + `
;globalThis.T = {
  newQuiz, pickOption, quizNext, viewQuiz, render,
  get qi(){return qi}, get qiList(){return qiList}, set qiList(v){qiList=v},
  get answeredIdx(){return answeredIdx}, get answeredPick(){return answeredPick},
  get roundRight(){return roundRight},
  get view(){return view}, set view(v){view=v},
  get spChecked(){return spChecked}, get spInput(){return spInput}
};`, sb);

const T = sb.T;
const has = (h, t) => h.includes(t);
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("   ✓ " + name); }
  else { fail++; console.log("   ✗ " + name + (extra ? " → " + extra : "")); }
};

console.log("【1】首次进入测验页");
T.view = "quiz"; T.qiList = []; T.newQuiz();
let h = T.viewQuiz();
check("未作答时不显示按钮", !has(h, "nextQ"));
check("选项可点击（未禁用）", !has(h, "disabled"));
check("题目数 = 10", T.qiList.length === 10);

console.log("【2】选择答案后");
T.pickOption(T.qiList[0].ans);
h = T.viewQuiz();
check("「下一题」按钮出现", has(h, "nextQ"));
check("显示答对反馈", has(h, "答对了"));
check("选项已锁定", has(h, "disabled"));

console.log("【3】★ 回归：答完 → 切到别的页 → 回来再点选项");
T.view = "home"; T.view = "quiz";
h = T.viewQuiz();
check("回来后按钮仍在（状态无残留）", has(h, "nextQ"));
const before = T.roundRight;
T.pickOption((T.qiList[T.qi].ans + 1) % 4);
check("仍能正常作答下一题", T.roundRight !== before || T.answeredIdx === T.qi);

console.log("【4】连续答完 10 题，每题作答后都出现按钮");
T.qiList = []; T.newQuiz();
let allOk = true;
for (let k = 0; k < 10; k++) {
  if (has(T.viewQuiz(), "nextQ")) { allOk = false; console.log("     第" + (T.qi + 1) + "题未作答就出现按钮"); break; }
  T.pickOption(T.qiList[T.qi].ans);
  if (!has(T.viewQuiz(), "nextQ")) { allOk = false; console.log("     第" + (T.qi + 1) + "题作答后缺按钮"); break; }
  if (!has(T.viewQuiz(), "下一题") && !has(T.viewQuiz(), "看本轮结果")) {
    allOk = false; console.log("     第" + (T.qi + 1) + "题按钮文案不对"); break;
  }
  T.quizNext();
}
check("10 题全流程无卡死", allOk);

console.log("【5】答题中途反复切换页面 5 次");
T.qiList = []; T.newQuiz();
let stable = true;
for (let n = 0; n < 5; n++) {
  T.view = "cards"; T.view = "spell"; T.view = "home"; T.view = "quiz";
  T.pickOption((T.qiList[T.qi].ans + 1) % 4);
  if (!has(T.viewQuiz(), "nextQ")) { stable = false; console.log("     第" + (n + 1) + "次切页后丢按钮"); break; }
  T.quizNext();
}
check("反复切页仍正常出按钮", stable);

console.log("【6】连点同一选项不重复计分");
T.qiList = []; T.newQuiz();
T.pickOption(T.qiList[0].ans);
T.pickOption(T.qiList[0].ans);
T.pickOption(T.qiList[0].ans);
check("roundRight = 1（不是 3）", T.roundRight === 1, "实际 " + T.roundRight);

console.log("【7】数据完整性");
T.qiList = []; T.newQuiz();
check("每题 4 个选项", T.qiList.every(q => q.opts.length === 4));
check("选项无重复", T.qiList.every(q => new Set(q.opts).size === 4));
check("答案索引合法", T.qiList.every(q => q.ans >= 0 && q.ans < 4));
check("每题都带例句解析（详细词再附词源）", T.qiList.every(q => q.key.s && q.key.sentCn));

console.log("【8】计分与错词本");
const st = JSON.parse(store["english_learning_v1"]);
check("错词本已记录", Array.isArray(st.wrongWords) && st.wrongWords.length > 0);
check("最高分已保存", typeof st.quizBest === "number");
check("结果弹窗已弹出", lastAlert.includes("本轮得分"));

console.log("");
console.log("通过 " + pass + " 项，失败 " + fail + " 项");
console.log(fail === 0 ? "=== ✓ 全部通过 ===" : "=== ✗ 存在失败项 ===");
process.exit(fail === 0 ? 0 : 1);
