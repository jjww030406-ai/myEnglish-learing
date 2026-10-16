# 部署 Python 后端（server.py）到云端

本目录里的 `server.py` 是网站的**自建后端**：服务端代理爬取词典 + AI 推理网关（OpenAI 兼容）。
它零依赖（只用 Python 标准库），可一键部署到 Render 或 Railway 的免费层。

---

## 方式一：Render 一键部署（最简单）

1. 打开一键部署链接（会读取本仓库的 `render.yaml`）：

   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jjww030406-ai/myEnglish-learing)

   或直接访问：https://render.com/deploy?repo=https://github.com/jjww030406-ai/myEnglish-learing

2. 登录 / 注册 Render，在弹出的环境变量里填两项：
   - **AI_API_KEY**：你的 OpenAI（或兼容服务）key，如 `sk-xxx`
   - **ALLOW_ORIGIN**：你的网站域名，如 `https://jjww.new.tg`（控制谁能跨域调用）

3. 点 Deploy，约 1 分钟搞定。部署完后记下分配的地址，形如
   `https://english-learning-backend.onrender.com`

4. 免费层注意：一段时间无请求会「冷启动」，首次访问稍慢，属正常。

---

## 方式二：Railway

1. 打开 https://railway.app → 「New Project」→「Deploy from GitHub repo」
2. 选仓库 `jjww030406-ai/myEnglish-learing`
3. 在 Variables 里添加：
   - `AI_API_KEY=sk-xxx`
   - `ALLOW_ORIGIN=https://jjww.new.tg`
   - （可选）`AI_BASE_URL`、`AI_MODEL`
4. Railway 读 `railway.json` 自动用 `python server.py` 启动。
5. 部署完在设置里拿到域名，如 `https://english-learning-backend.up.railway.app`

---

## 方式三：本机 / 自己的服务器

```bash
cd english-learning
export AI_API_KEY=sk-xxx
export ALLOW_ORIGIN=https://jjww.new.tg
python3 server.py          # 监听 http://localhost:8000
```
放到常开、有公网 IP 的机器即可（或用上面的云平台）。

---

## 部署完后，把网站接到后端

编辑前端 `js/cloud-config.js`，把：

```js
backend: ""
```

改成你的后端地址（注意**不要**结尾斜杠）：

```js
backend: "https://english-learning-backend.onrender.com"
```

然后重新部署网站（让 `cloud-config.js` 生效）。之后站点补词 / 生例句就会走
`/api/enrich`（服务端多源爬词典 + AI 整理），AI 的 key 只在后端，前端永不暴露。

---

## 接口速查

| 接口 | 作用 |
|---|---|
| `GET  /api/health` | 自检 |
| `GET  /api/proxy?url=...` | 服务端代理抓取（绕过 CORS） |
| `POST /api/ai` | AI 推理网关（OpenAI 兼容） |
| `POST /api/enrich` | 多源词典聚合 + AI 整理成中文词库条目 |
| `GET  /api/tts?word=...` | 免费 TTS 发音（best-effort） |
