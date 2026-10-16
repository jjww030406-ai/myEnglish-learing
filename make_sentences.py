#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_sentences.py — 生成「拼句打字」模块的逐词标注句库 → js/sentences.js
每句结构：{ id, en, cn, words:[{ w, ipa, role, cn }] }
  w    = 卡片上的英文（可以是一个词或一个短语卡，如 "every morning"）
  ipa  = 音标（短语卡可只标第一个词的）
  role = 句子成分（主语/谓语/宾语/定语/状语/补语/其他）
  cn   = 该卡片的中文意思

用法：
    python3 make_sentences.py dry  --batches 1   # 预览
    python3 make_sentences.py apply --batches 3  # 生成并写入 js/sentences.js
默认走 BlockRun 免费 AI；失败可 AI_API_KEY=sk-xxx(DeepSeek) 兜底。
"""
import os, sys, json, time, re, urllib.request, urllib.error

AI_API_KEY = os.environ.get("AI_API_KEY", "not-needed")
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://blockrun.ai/api/v1").rstrip("/")
AI_MODEL = os.environ.get("AI_MODEL", "nvidia/nemotron-3.5-lightning")
OUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "js", "sentences.js")

UA = {"User-Agent": "Mozilla/5.0 (compatible; EnglishSiteBot/1.0)", "Content-Type": "application/json"}

PROMPT = """你是零基础英语教材编辑。生成 {n} 个适合中国零基础英语学习者的英语句子，用于"整句逐词打字"练习。

要求：
1. 句子严格按难度递增：前一半 3-5 个词，后一半 6-9 个词；日常话题（问候/自我介绍/家庭/食物/学校/天气/爱好/日常作息）。
2. 每句拆成若干"词卡"（卡片可以是一个词，也可以是一个短语，如 "every morning"、"my mother"）。
3. 每张卡片标注：w（原句中的英文，保持原样）、ipa（音标，/.../ 格式；多词短语只标第一个词）、role（句子成分，只能用：主语/谓语/宾语/定语/状语/补语）、cn（这张卡的中文意思）。
4. cn 整句翻译自然通顺，结尾若有标点请保留在最后一张卡的 w 之外（w 不要包含句尾标点，标点放在 en 里）。
5. 全部输出为纯 JSON 数组，不要 markdown 代码块，格式：
[{{"en":"I like fresh apples.","cn":"我喜欢吃新鲜的苹果。","words":[{{"w":"I","ipa":"/aɪ/","role":"主语","cn":"我"}},{{"w":"like","ipa":"/laɪk/","role":"谓语","cn":"喜欢"}},{{"w":"fresh apples","ipa":"/freʃ/","role":"宾语","cn":"新鲜的苹果"}}]}}]
"""

def ask_ai(prompt, timeout=180):
    body = json.dumps({
        "model": AI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.8,
        "max_tokens": 4000,
    }).encode("utf-8")
    req = urllib.request.Request(AI_BASE_URL + "/chat/completions", data=body, headers=UA, method="POST")
    if AI_API_KEY and AI_API_KEY != "not-needed":
        req.add_header("Authorization", "Bearer " + AI_API_KEY)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]

def parse_json(text):
    t = text.strip()
    t = re.sub(r"^```(json)?|```$", "", t, flags=re.M).strip()
    m = re.search(r"\[.*\]", t, re.S)
    if not m:
        raise ValueError("没找到 JSON 数组")
    return json.loads(m.group(0))

def valid_sentence(s):
    if not isinstance(s, dict): return False
    if not s.get("en") or not s.get("cn"): return False
    ws = s.get("words")
    if not isinstance(ws, list) or len(ws) < 2: return False
    for w in ws:
        if not w.get("w") or not w.get("role") or not w.get("cn"): return False
    # 卡片拼起来应接近原句（去掉空格比较，允许标点差异）
    joined = re.sub(r"[^a-z']", "", "".join(w["w"].lower() for w in ws))
    origin = re.sub(r"[^a-z']", "", s["en"].lower())
    return joined == origin

def gen_batch(n):
    for attempt in range(3):
        try:
            raw = ask_ai(PROMPT.format(n=n))
            arr = parse_json(raw)
            arr = [s for s in arr if valid_sentence(s)]
            if arr: return arr
        except Exception as e:
            print(f"  第 {attempt+1} 次尝试失败：{e}", flush=True)
            time.sleep(3)
    return []

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry"
    batches = 3
    if "--batches" in sys.argv:
        batches = int(sys.argv[sys.argv.index("--batches") + 1])
    all_s = []
    for i in range(batches):
        print(f"生成第 {i+1}/{batches} 批（每批 12 句）...", flush=True)
        all_s += gen_batch(12)
        time.sleep(2)
    # 去重
    seen, out = set(), []
    for s in all_s:
        key = re.sub(r"[^a-z]", "", s["en"].lower())
        if key in seen: continue
        seen.add(key)
        s["id"] = "sent_" + str(len(out) + 1)
        out.append(s)
    print(f"共生成 {len(out)} 句")
    if mode == "apply":
        js = ("/* 拼句打字句库（由 make_sentences.py 用 AI 生成，可重新跑脚本追加）\n"
              "   结构：{id, en, cn, words:[{w, ipa, role, cn}]} */\n"
              "const SENTENCES = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
        with open(OUT_FILE, "w", encoding="utf-8") as f:
            f.write(js)
        print("已写入", OUT_FILE)
    else:
        print(json.dumps(out[:3], ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
