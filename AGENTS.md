# AGENTS.md — 英语学习网站 · 项目简报（给接手的 AI / 协作者）

> 这份文件是给**下一个接手改这个项目的人或 AI** 看的。不同账号的 AI 没有历史对话，
> 读完这份就能无缝接着改，不必从零问。最新版以仓库为准。

## 这是什么
纯前端的英语学习小网站（HTML / CSS / JS，**无构建步骤**），可选配一个**零依赖 Python 后端**
（`server.py`，只用标准库）做"服务端代理抓取 + AI 推理"。已上线。
- 仓库：`github.com/jjww030406-ai/myEnglish-learing`
- 线上靠 GitHub Pages / jsDelivr（`cdn.jsdelivr.net/gh/...@main/...`）+ Netlify 之类托管静态文件

## 技术栈
- 前端：原生 HTML/CSS/JS，单页应用（SPA），状态驱动 `render()` / `bind()` / `goView()`
- 进度存档：`localStorage`（`js/state.js`）
- 可选云服务：**Supabase**（公开 `anonKey`，仅读写全局词库）、**WorkBuddy 云 endpoint**（`cloud-config.js`，可选）
- 可选后端：Python3 标准库零依赖 `server.py`，提供 `/api/proxy` `/api/ai` `/api/enrich` `/api/tts` `/api/plan`

## 文件地图（改哪里）
| 文件 | 改什么 | 备注 |
| --- | --- | --- |
| `index.html` | 页面骨架、按序加载脚本、**CSS/JS 版本号 `?v=`**（改后必须 bump，否则浏览器用缓存） | |
| `css/style.css` | 全部外观：配色、卡片、动画（末尾"视觉精修 v3"层是纯叠加） | |
| `js/app.js` | 主逻辑（最大）：各页面、拼写、测验、错题本、复习、拼句、首页 AI 计划 | 改完跑 `node test-bind.js` |
| `js/data.js` | 内置基础词库 | |
| `js/grammar.js` / `js/curriculum.js` | 语法课内容 / 内部学习方案（10 阶段） | |
| `js/state.js` | 存档层：进度、错题、多用户档案、本地存储 | |
| `js/cloud-config.js` | 云服务配置（endpoint / publishableKey / anonKey / `backend`） | `backend:""` 留空逻辑别删 |
| `js/daily.js` | 每日联网新词 | |
| `js/sentences.js` | 拼句句库（**由 `make_sentences.py` 生成，勿手改**） | |
| `server.py` | 可选 Python 后端 | key 走环境变量 `AI_API_KEY` |
| `make_sentences.py` / `build_phrasals.py` / `add_content.py` | 生成 / 维护词库的脚本 | |

## 本地预览（无需 GitHub，纯本地即可改和看）
- 双击 `index.html`（`file://` 下联网功能自动回落内置词库，其余正常）
- 或：`python3 -m http.server 8123` → 访问 `http://localhost:8123/index.html`
- **改代码完全不需要 GitHub 账号**；只有把改动推到线上仓库（下面"上线"）才需要 `GH_TOKEN`。

## 改完怎么上线（二选一）
1. **Git（推荐）**：被仓库加为 collaborator 后，`clone` → 改 → `commit` → `push`。
2. **无 git 环境**：设环境变量 `GH_TOKEN`（GitHub 有本仓库写权限的 token），跑
   `python3 push.py`，通过 GitHub Contents API 直推 `main`。

> ⚠️ 改了 `index.html` 里任何 JS/CSS 的 `?v=` 版本号（如 `v=20261016m` → `v=20261016n`），
> 否则用户强刷也看不到改动。

## 需要的密钥（都在环境变量，**绝不写进会进 git 的文件**）
- `GH_TOKEN`：`push.py` 推代码用（GitHub 后台生成 fine-grained token，仅限本仓库）
- `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`：`server.py` 后端 AI 推理用（**可选**：
  免费端点 `blockrun.ai` 优先，失败自动回退你的 key）
- Supabase：`cloud-config.js` 里的 `anonKey` 已公开可留；**绝不放 `service_role` key**
- DeepSeek key：可选，作 `server.py` 兜底，通过 `AI_API_KEY` 传入，别写进前端

## 历史设计决策（别推翻，避免重复踩坑）
- **拼句打字模块**（`viewSent`）：看中文逐词敲英文，拼对的词变彩色成分卡（主语/谓语/宾语…）。
  底部按钮栏可鼠标点也可用快捷键（`Ctrl+1` 发音 / `Ctrl+;` 显示答案 / `Ctrl+R` 重打）；
  **显示答案不算连对、也无 Perfect 加成**。
- **用法测验**：固定搭配专练——挖例句末的小品词三选一（A.to/B.for/C.on + 中文），不是背整短语。
- **首页"AI 今日学习重点"卡**：POST 后端 `/api/plan` 出路线，目前是**建议层**，尚不反向驱动每日词单。
- **后端多源词典兜底**：`dictionaryapi.dev` 常被 Cloudflare 拦（403/000）→ 回退 `datamuse` / `wiktionary`。
- **AI 容错三级**：免费端点优先 + DeepSeek 兜底 + 纯规则兜底。
- **统计面板 / 模块卡主题色**：纯 CSS 换肤（`.home-stats` 一体化仪表盘、`.nav-card` 各模块主题色），
  靠稳定类名叠加，没动 DOM 结构。

## 禁忌
- 不要把任何 token / key 硬编码进会进 git 的文件（`.md`、`.py`、`.js`、`.html` 都在内）。
- 不要删 `cloud-config.js` 里 `backend:""` 的留空逻辑（前端靠它判断有无自建后端）。
- 改完忘了 bump `?v=` 版本号 = 用户看不到改动。
- 不要手改 `js/sentences.js` / 词库生成产物，用对应 `make_*.py` 脚本生成。

## 自检
环境有 Node 时：
```bash
node test-bind.js     # 主逻辑
node test-daily.js    # 每日词引擎
node test-quiz.js     # 测验
```
三个都"全部通过"才说明没改坏。

## 协作者怎么快速上手
看根目录 `给朋友-先看这个.md`（面向人）+ 本文件（面向 AI）。拿到仓库写权限后，
按上面"上线"二选一即可。提问时用中文，项目全部注释与文档均为中文。
