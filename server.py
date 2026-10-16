#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
server.py — 零依赖 Python 后端（服务端代理爬取 + AI 推理网关 + 多源词典 + TTS）
================================================================================
为什么需要它：浏览器只能跑 JS，且受 CORS 限制、不能藏密钥。
把抓取 / AI / 词典聚合放到服务端，浏览器只调本服务。

  · /api/proxy    服务端代理抓取（绕过 CORS、藏密钥、爬任意网页）
  · /api/ai       AI 推理网关（OpenAI 兼容，key 只存服务端）
  · /api/enrich   组合：多源词典聚合 + AI 整理成中文词库条目（不依赖单一数据源）
  · /api/tts      免费 TTS 发音（代理 Google TTS，best-effort）
  · /api/health   自检

运行（无需 pip install，只用 Python 标准库）：
    python3 server.py
    curl http://localhost:8000/api/health

配置（环境变量，可选）：
    PORT=8000                 监听端口
    ALLOW_ORIGIN=*           允许跨域的源（上线填你的域名，如 https://jjww.new.tg）
    AI_BASE_URL=https://api.openai.com/v1   OpenAI 兼容地址
    AI_API_KEY=sk-xxx         你的 key（只存服务端，绝不进前端）
    AI_MODEL=gpt-4o-mini      模型名

说明：workbuddy 的 LLM 地址锁在它的前端 SDK 内部、直连会 501，
所以这里用标准 OpenAI 兼容协议；把你的 key 填进 AI_API_KEY 即可。
"""
import os
import json
import re
import urllib.request
import urllib.error
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8000"))
ALLOW_ORIGIN = os.environ.get("ALLOW_ORIGIN", "*")
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
AI_API_KEY = os.environ.get("AI_API_KEY", "")
AI_MODEL = os.environ.get("AI_MODEL", "gpt-4o-mini")

UA = {"User-Agent": "Mozilla/5.0 (compatible; EnglishSiteBot/1.0)"}
TAG_RE = re.compile(r"<(script|style|head|meta)[^>]*>.*?</\1>", re.S | re.I)
HTML_RE = re.compile(r"<[^>]+>")


# ---------------- 底层抓取 ----------------
def server_fetch(url, headers=None, timeout=25):
    """服务端抓取：绕过浏览器 CORS，可在服务端带密钥。返回 (status, bytes)。"""
    h = dict(UA)
    h.update(headers or {})
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return 0, str(e).encode("utf-8")


def html_to_text(html):
    html = TAG_RE.sub(" ", html)
    html = html.replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", HTML_RE.sub(" ", html)).strip()


# ---------------- 多源词典 ----------------
def _jget(url):
    st, c = server_fetch(url)
    if st != 200:
        return None
    try:
        return json.loads(c.decode("utf-8", "ignore"))
    except Exception:
        return None


def parse_dictionaryapi(data):
    """dictionaryapi.dev → 规范化 {ph,pos,def,ex}"""
    arr = data if isinstance(data, list) else []
    first = arr[0] if arr else {}
    ph = next((p.get("text") for p in first.get("phonetics", []) if p.get("text")), "")
    m0 = (first.get("meanings") or [{}])[0]
    d0 = (m0.get("definitions") or [{}])[0]
    return {"ph": ph, "pos": m0.get("partOfSpeech", ""),
            "def": d0.get("definition", ""), "ex": d0.get("example", "")}


def parse_datamuse(data, word):
    """datamuse (md=dps) → 规范化 {ph,pos,def,ex}，无音标"""
    if not isinstance(data, list):
        return {}
    for it in data:
        if it.get("word", "").lower() == word.lower() and it.get("defs"):
            pos = ""
            for t in it.get("tags", []):
                if re.match(r"^(n|v|adj|adv)$", t):
                    pos = t
                    break
            return {"ph": "", "pos": pos,
                    "def": it["defs"][0].split("\t", 1)[-1], "ex": ""}
    return {}


def parse_wiktionary(data):
    """wiktionary extracts → 纯文本释义（作为 AI 上下文，难结构化）"""
    try:
        pages = data["query"]["pages"]
        for pid, pg in pages.items():
            ex = pg.get("extract", "")
            if ex:
                return ex[:1500]
    except Exception:
        pass
    return ""


def enrich_word(word):
    """多源聚合词典，返回 (norm_dict, raw_context)。任一源失败都不影响其它源。"""
    norm = {"ph": "", "pos": "", "def": "", "ex": ""}
    raws = []
    w = word.lower()

    # 源1：dictionaryapi.dev（含音标/例句，偶尔被 Cloudflare 拦）
    try:
        d = _jget(f"https://api.dictionaryapi.dev/api/v2/entries/en/{w}")
        if d:
            p = parse_dictionaryapi(d)
            for k in ("ph", "pos", "def", "ex"):
                if not norm[k] and p[k]:
                    norm[k] = p[k]
            raws.append("dictionaryapi.dev: " + json.dumps(p, ensure_ascii=False))
    except Exception:
        pass

    # 源2：datamuse（无 key、稳，补释义/词性）
    try:
        d = _jget(f"https://api.datamuse.com/words?sp={w}&md=dps")
        if d:
            p = parse_datamuse(d, w)
            for k in ("pos", "def"):
                if not norm[k] and p[k]:
                    norm[k] = p[k]
            raws.append("datamuse: " + json.dumps(p, ensure_ascii=False))
    except Exception:
        pass

    # 源3：wiktionary（兜底释义上下文）
    try:
        url = "https://en.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=" + urllib.parse.quote(word)
        d = _jget(url)
        wt = parse_wiktionary(d)
        if wt:
            raws.append("wiktionary: " + wt)
    except Exception:
        pass

    return norm, "\n---\n".join(raws)[:4000]


# ---------------- AI ----------------
def ai_chat(messages, system=None):
    """转发到 OpenAI 兼容端点，返回 (文本, 错误)。"""
    if not AI_API_KEY:
        return None, "AI_API_KEY 未配置（在服务端 export 你的 key）"
    msgs = ([{"role": "system", "content": system}] if system else []) + list(messages)
    payload = {"model": AI_MODEL, "messages": msgs, "stream": False}
    req = urllib.request.Request(
        AI_BASE_URL + "/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + AI_API_KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            data = json.loads(r.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"], None
    except Exception as e:
        return None, str(e)


def extract_json(text):
    """从模型输出里抠出第一个 JSON 对象。"""
    if not text:
        return None
    s = text.find("{")
    e = text.rfind("}")
    if s >= 0 and e > s:
        try:
            return json.loads(text[s:e + 1])
        except Exception:
            return None
    return None


# ---------------- HTTP 处理 ----------------
def _cors(h):
    h.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
    h.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")


def _send(h, code, obj):
    body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    h.send_response(code)
    h.send_header("Content-Type", "application/json; charset=utf-8")
    _cors(h)
    h.send_header("Content-Length", str(len(body)))
    h.end_headers()
    h.wfile.write(body)


def _send_bytes(h, code, data, ctype):
    h.send_response(code)
    h.send_header("Content-Type", ctype)
    _cors(h)
    h.send_header("Content-Length", str(len(data)))
    h.end_headers()
    h.wfile.write(data)


class H(BaseHTTPRequestHandler):
    def _body(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8") or "{}")
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        _cors(self)
        self.end_headers()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/api/health":
            return _send(self, 200, {"ok": True, "ai_configured": bool(AI_API_KEY)})
        if u.path == "/api/proxy":
            q = urllib.parse.parse_qs(u.query)
            url = q.get("url", [""])[0]
            if not url:
                return _send(self, 400, {"error": "缺 url 参数，如 /api/proxy?url=https://..."})
            status, content = server_fetch(url)
            raw = content.decode("utf-8", "ignore") if isinstance(content, (bytes, bytearray)) else str(content)
            out = {"status": status, "raw": raw[:50000]}
            if q.get("text", [""])[0] == "1":
                out["text"] = html_to_text(raw)[:20000]
            return _send(self, 200, out)
        if u.path == "/api/tts":
            q = urllib.parse.parse_qs(u.query)
            word = q.get("word", [""])[0]
            if not word:
                return _send(self, 400, {"error": "缺 word 参数"})
            turl = "https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=" + urllib.parse.quote(word)
            status, content = server_fetch(turl)
            if status == 200 and isinstance(content, (bytes, bytearray)):
                return _send_bytes(self, 200, content, "audio/mpeg")
            return _send(self, 502, {"error": "TTS 获取失败(" + str(status) + ")，可改用浏览器自带朗读"})
        return _send(self, 404, {"error": "not found"})

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/api/ai":
            b = self._body()
            text, err = ai_chat(b.get("messages", []), b.get("system"))
            if err:
                return _send(self, 502, {"error": err})
            return _send(self, 200, {"text": text})
        if u.path == "/api/enrich":
            b = self._body()
            word = (b.get("word") or "").strip()
            if not word:
                return _send(self, 400, {"error": "缺 word"})
            norm, raw = enrich_word(word)
            ctx = f"音标: {norm['ph']}\n词性: {norm['pos']}\n英文释义: {norm['def']}\n例句: {norm['ex']}\n原始资料:\n{raw}"
            sys = "你是为零基础中文学习者编写英语词库的助手。只输出一个 JSON 对象（不要 markdown、不要额外文字）：cn(中文释义，顿号分隔，简洁), pos(词性), s(一个 A2 简单英文例句), sentCn(例句中文翻译)。"
            user = f"单词: {word}\n{ctx}"
            text, err = ai_chat([{"role": "user", "content": user}], sys)
            return _send(self, 200, {
                "word": word, "ph": norm["ph"], "pos": norm["pos"], "def": norm["def"],
                "dict_raw": raw[:2000], "ai": text, "ai_error": err,
            })
        return _send(self, 404, {"error": "not found"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"Python 后端已启动 → http://localhost:{PORT}")
    print(f"  ALLOW_ORIGIN = {ALLOW_ORIGIN}")
    print(f"  AI 已配置     = {'是 ('+AI_MODEL+')' if AI_API_KEY else '否（设 AI_API_KEY 后启用 /api/ai、/api/enrich）'}")
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
