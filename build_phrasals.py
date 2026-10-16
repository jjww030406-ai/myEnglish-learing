#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_phrasals.py — 用 Python 动态生成「用法 / 短语动词」词库并写入云端
================================================================================
替代手搓 js/phrasals.js 种子：脚本读一份高频短语清单 → AI 生成完整条目
（中文释义 / 例句 / 翻译 / 难度 / 后接什么 / 用法提示）→ 合并写入
Supabase 的 __global_phrasals__。站点运行时自动拉取，全站立刻生效。

用法：
    python3 build_phrasals.py list                  # 看云端现有多少条（只读）
    python3 build_phrasals.py dry  --count 5        # 预览将生成的 JSON（不写云端）
    python3 build_phrasals.py apply --count 50      # 调 AI 生成并写入云端

配置（环境变量，均可选；默认已走免费免 key 端点，什么都不设也能跑）：
    A. 默认（零配置）：BlockRun 免 key 匿名通道，直接 python3 build_phrasals.py apply
    B. 直连你自己的 OpenAI 兼容 key：
       AI_API_KEY=sk-xxx  AI_BASE_URL=https://api.openai.com/v1  AI_MODEL=gpt-4o-mini
    C. 走你的 Python 后端（key 只存后端，更隐私）：
       BACKEND=https://english-learning-backend.onrender.com
    云端（默认用站点同款，一般不用改）：
       SUPABASE_URL / SUPABASE_ANON_KEY

说明：AI 只【新增】云端没有的短语，绝不覆盖你已手调好的条目。
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
import urllib.parse

# ---------------- 云端（与站点同款 anon key，RLS 允许 anon 写） ----------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://vseeskrcwconhoknwstm.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY", "sb_publishable_2m6HQqQtZ06CHVfvf7hloA_EhFp6khq")
PHRASALS_KEY = "__global_phrasals__"

# 默认走免费免 key 端点（BlockRun 的 OpenAI 兼容匿名通道），零配置即可用。
# 想换自己的 key：export AI_API_KEY=sk-xxx AI_BASE_URL=https://api.openai.com/v1
# 想走自建后端（key 只存后端）：export BACKEND=https://你的-python主机
AI_API_KEY = os.environ.get("AI_API_KEY", "not-needed")
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://blockrun.ai/api/v1").rstrip("/")
AI_MODEL = os.environ.get("AI_MODEL", "nvidia/nemotron-3.5-lightning")
BACKEND = os.environ.get("BACKEND", "").rstrip("/")

UA = {"User-Agent": "Mozilla/5.0 (compatible; EnglishSiteBot/1.0)"}


# ---------------- 高频短语清单（只列短语，内容由 AI 生成） ----------------
SEED_PHRASES = [
    "look for", "look after", "look forward to", "look up", "look out",
    "get up", "get on", "get off", "get over", "get along with",
    "give up", "give in", "give out", "give away", "give back",
    "take off", "take up", "take over", "take after", "take part in",
    "put on", "put off", "put up with", "put down", "put out",
    "turn on", "turn off", "turn up", "turn down", "turn into",
    "come back", "come in", "come across", "come from", "come up with",
    "go out", "go on", "go through", "go over", "go ahead",
    "break down", "break up", "break out", "break into", "break in",
    "bring up", "bring about", "bring back", "bring out", "bring in",
    "run out of", "run into", "run away", "run over", "run after",
    "set up", "set off", "set out", "set aside", "set about",
    "cut down", "cut off", "cut out", "cut up", "cut in",
    "fall down", "fall off", "fall behind", "fall out", "fall for",
    "keep on", "keep up", "keep off", "keep out", "keep back",
    "make up", "make out", "make up for", "make up one's mind", "make do",
    "pick up", "pick out", "point out", "find out", "work out",
    "carry on", "carry out", "carry over", "call off", "call on",
    "show up", "show off", "stand for", "stand by", "pass away",
    "pay back", "pay for", "pay off", "hold on", "hold up",
]


# ---------------- 云端读写（与 daily.js 同格式、按 phrase 去重合并） ----------------
def sb_headers():
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }


def sb_load_phrasals():
    url = SUPABASE_URL + "/rest/v1/learning_progress?profile_id=eq." + PHRASALS_KEY + "&select=data"
    try:
        req = urllib.request.Request(url, headers=sb_headers())
        with urllib.request.urlopen(req, timeout=30) as r:
            rows = json.loads(r.read().decode("utf-8"))
        arr = (rows and rows[0] and rows[0].get("data", {}).get("phrasals")) or []
        return [x for x in arr if isinstance(x, dict) and x.get("phrase")]
    except Exception as e:
        print("  [warn] 读云端失败:", e, file=sys.stderr)
        return []


def sb_upsert_phrasals(merged):
    url = SUPABASE_URL + "/rest/v1/learning_progress"
    body = json.dumps([{
        "profile_id": PHRASALS_KEY,
        "data": {"phrasals": merged},
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }], ensure_ascii=False).encode("utf-8")
    try:
        req = urllib.request.Request(url, data=body, headers=sb_headers(), method="POST")
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status in (200, 201, 204)
    except urllib.error.HTTPError as e:
        print("  [warn] 写云端 HTTP", e.code, ":", e.read().decode("utf-8", "ignore")[:300], file=sys.stderr)
        return False
    except Exception as e:
        print("  [warn] 写云端失败:", e, file=sys.stderr)
        return False


# ---------------- AI 生成 ----------------
def ai_chat(system, user):
    """返回 (文本, 错误)。优先 BACKEND，否则直连 OpenAI 兼容。"""
    if BACKEND:
        try:
            req = urllib.request.Request(
                BACKEND + "/api/ai",
                data=json.dumps({"system": system, "messages": [{"role": "user", "content": user}]}).encode("utf-8"),
                headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.loads(r.read().decode("utf-8"))
            if d.get("error"):
                return None, d["error"]
            return d.get("text"), None
        except Exception as e:
            return None, str(e)
    if not AI_API_KEY:
        return None, "未配置 AI：设 AI_API_KEY（直连）或 BACKEND（走后端）"
    payload = {"model": AI_MODEL, "messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], "stream": False}
    try:
        req = urllib.request.Request(
            AI_BASE_URL + "/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + AI_API_KEY},
            method="POST")
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.loads(r.read().decode("utf-8"))
        return d["choices"][0]["message"]["content"], None
    except Exception as e:
        return None, str(e)


def extract_json_array(text):
    if not text:
        return None
    s = text.find("[")
    e = text.rfind("]")
    if s >= 0 and e > s:
        try:
            return json.loads(text[s:e + 1])
        except Exception:
            pass
    # 退一步：找单个对象
    s = text.find("{")
    e = text.rfind("}")
    if s >= 0 and e > s:
        try:
            return [json.loads(text[s:e + 1])]
        except Exception:
            return None
    return None


PAT_CHOICES = ["sth", "sb", "sb/sth", "doing", "sth / doing", "不接宾语"]

SYSTEM = (
    "你是为零基础中文学习者编写英语『短语动词 / 固定搭配』词库的助手。"
    "对每组短语，输出一个 JSON 数组，每个元素严格包含字段："
    "phrase(原短语), cn(中文释义，顿号分隔，简洁), "
    "ex(一个 A2 级简单英文例句，且【必须包含完整短语本身】，如短语是 look forward to 则句中出现 look forward to), "
    "exCn(例句中文翻译), level(1~3 难度，越基础越小), "
    "pat(只能取: sth / sb / sb/sth / doing / sth / doing / 不接宾语), "
    "note(可选，一句话中文用法提示，如『进行时变 looking for；宾语放后面』；没有可不给)。"
    "只输出 JSON，不要 markdown、不要任何额外文字。"
)


def normalize(item, phrase):
    out = {
        "phrase": (item.get("phrase") or phrase).strip(),
        "cn": (item.get("cn") or "").strip(),
        "ex": (item.get("ex") or "").strip(),
        "exCn": (item.get("exCn") or "").strip(),
        "level": int(item.get("level") or 1),
        "pat": item.get("pat") if item.get("pat") in PAT_CHOICES else "",
        "note": (item.get("note") or "").strip(),
        "tests": item.get("tests") or [],
    }
    if out["level"] < 1 or out["level"] > 3:
        out["level"] = 1
    return out


def gen_batch(phrases):
    user = "请为以下短语动词生成词库条目：\n" + "\n".join("- " + p for p in phrases)
    last_err = ""
    for attempt in range(3):                       # 免费端点偶发限流，重试
        text, err = ai_chat(SYSTEM, user)
        if err:
            last_err = err
            time.sleep(3)
            continue
        arr = extract_json_array(text)
        if arr:
            return arr, None
        last_err = "AI 未返回可解析 JSON：" + (text or "")[:200]
        time.sleep(2)
    return None, last_err


# ---------------- CLI ----------------
def cmd_list():
    arr = sb_load_phrasals()
    print("云端 __global_phrasals__ 现有 %d 条：" % len(arr))
    for x in arr:
        print("  ·", x.get("phrase"), "—", x.get("cn", ""))


def cmd_dry(count):
    existing = {x["phrase"] for x in sb_load_phrasals()}
    targets = [p for p in SEED_PHRASES if p not in existing][:count]
    print("将生成 %d 条（云端已有 %d 条跳过）：" % (len(targets), len(existing)))
    print(json.dumps(targets, ensure_ascii=False, indent=2))
    print("\n[预览] 发送 SYSTEM：")
    print(SYSTEM)
    if not (AI_API_KEY or BACKEND):
        print("\n⚠️ 未配置 AI（AI_API_KEY / BACKEND），dry 仅展示计划，不调用模型。")


def cmd_apply(count):
    existing = {x["phrase"] for x in sb_load_phrasals()}
    targets = [p for p in SEED_PHRASES if p not in existing]
    if count:
        targets = targets[:count]
    if not targets:
        print("没有需要新增的短语（云端已覆盖全部种子）。")
        return
    print("需新增 %d 条，开始调 AI 生成…" % len(targets))

    current = sb_load_phrasals()
    seen = {x["phrase"] for x in current}
    merged = list(current)
    ok = 0
    batch = 6
    for i in range(0, len(targets), batch):
        grp = targets[i:i + batch]
        arr, err = gen_batch(grp)
        if err:
            print("  [skip] %s → %s" % (", ".join(grp), err))
            continue
        for it in arr:
            ph = (it.get("phrase") or "").strip()
            if not ph or ph in seen:
                continue
            entry = normalize(it, ph)
            if not entry["cn"] or not entry["ex"]:
                print("  [skip] %s → 字段不完整" % ph)
                continue
            merged.append(entry)
            seen.add(ph)
            ok += 1
            print("  ✅ %s — %s" % (entry["phrase"], entry["cn"]))
        time.sleep(0.5)
    if ok == 0:
        print("没有成功生成任何新条目（检查 AI 配置）。")
        return
    if sb_upsert_phrasals(merged):
        print("\n🎉 已写入云端：新增 %d 条，现共 %d 条。刷新网站即生效。" % (ok, len(merged)))
    else:
        print("\n❌ 写入云端失败，本地已生成但未保存，请检查网络/权限后重试。")


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else "list"
    count = 0
    if "--count" in args:
        try:
            count = int(args[args.index("--count") + 1])
        except Exception:
            count = 0
    if cmd == "list":
        cmd_list()
    elif cmd == "dry":
        cmd_dry(count or len(SEED_PHRASES))
    elif cmd == "apply":
        cmd_apply(count)
    else:
        print("用法: build_phrasals.py [list|dry|apply] [--count N]")


if __name__ == "__main__":
    main()
