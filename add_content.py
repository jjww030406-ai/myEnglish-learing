#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_content.py — 自己往云端词库加内容（无需他人跑脚本）
=====================================================
网站的内容（单词/短语/阅读/语法/用法/测验）都存在 Supabase 的
learning_progress 表里，用 __global_* 保留主键，并在每次打开网页时动态拉取。

本工具用和网站前端完全相同的「匿名 key」读写这些行，所以你本地跑它，
就能自己往云端塞内容，全站用户刷新即见，无需重新部署、无需改代码。

安全说明：用的是前端已公开的 anon key（Supabase 设计上公开），不泄露任何密钥。

命令：
  python3 add_content.py list
      —— 列出 6 个内容库当前各有多少条（只读，安全）

  python3 add_content.py get <库名> [--out 文件.json]
      —— 把某个库的现有内容下载成 JSON，方便你本地改完再上传
         python3 add_content.py get grammar grammar.json

  python3 add_content.py add <库名> <文件.json> [--apply]
      —— 把你写的 JSON 合并进云端库。
         默认 dry-run（只显示将要写入什么，不改云端）；加 --apply 才真写。
         python3 add_content.py add grammar grammar.json --apply

库名：words | phrases | reading | grammar | phrasals | gquiz
  - words/phrases/reading/grammar/phrasals 的 JSON 是一个「数组」：[{...},{...}]
  - gquiz 的 JSON 是一个「字典」，键是课标题：{"第1课：be 动词":[{q,opts,a,e},...]}

每个库的字段模板见文件底部 EXAMPLES，或直接跑：python3 add_content.py examples
"""
import argparse
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

SUPABASE_URL = "https://vseeskrcwconhoknwstm.supabase.co"
ANON_KEY = "sb_publishable_2m6HQqQtZ06CHVfvf7hloA_EhFp6khq"
TABLE = "learning_progress"

# 库名 -> (保留主键, data 里容器字段名, 数组去重字段)
BANKS = {
    "words":    {"key": "__global_words__",   "field": "words",    "dedup": "w"},
    "phrases":  {"key": "__global_phrases__", "field": "phrases",  "dedup": "en"},
    "reading":  {"key": "__global_reading__", "field": "reading",  "dedup": "title"},
    "grammar":  {"key": "__global_grammar__", "field": "grammar",  "dedup": "t"},
    "phrasals": {"key": "__global_phrasals__","field": "phrasals", "dedup": "phrase"},
    "gquiz":    {"key": "__global_gquiz__",   "field": "bank",     "dedup": None},
}


def _req_headers(extra=None):
    h = {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": "Bearer " + ANON_KEY,
    }
    if extra:
        h.update(extra)
    return h


def api(method, path, body=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, method=method, headers=_req_headers())
    if body is not None:
        req.data = json.dumps(body).encode("utf-8")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8")
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, None
    except Exception as e:  # 网络错误等
        return 0, str(e)


def get_current(name):
    """返回该库当前的 data 字典（保留其它字段）。"""
    b = BANKS[name]
    st, rows = api("GET", f"{TABLE}?profile_id=eq.{b['key']}&select=data")
    if st == 200 and rows:
        return (rows[0].get("data") or {}) if isinstance(rows[0], dict) else {}
    return {}


def merge_array(existing, new_items, dedup):
    seen, out = set(), []
    for x in existing:
        k = x.get(dedup) if isinstance(x, dict) else None
        if k is not None and k not in seen:
            seen.add(k); out.append(x)
    added = 0
    for x in new_items:
        k = x.get(dedup) if isinstance(x, dict) else None
        if k is not None and k not in seen:
            seen.add(k); out.append(x); added += 1
    return out, added


def merge_bank(existing, new_bank):
    out = dict(existing)
    added = 0
    for lesson, qs in new_bank.items():
        cur = list(out.get(lesson, []))
        seen = {(q.get("q") if isinstance(q, dict) else None) for q in cur}
        for q in qs:
            k = q.get("q") if isinstance(q, dict) else None
            if k not in seen:
                seen.add(k); cur.append(q); added += 1
        out[lesson] = cur
    return out, added


def cmd_list():
    print("云端内容库现状：")
    for name in BANKS:
        data = get_current(name)
        if name == "gquiz":
            bank = data.get("bank") or {}
            lessons = len(bank)
            qs = sum(len(v) for v in bank.values())
            print(f"  {name:8s} -> {lessons} 节课 / 共 {qs} 道测验题")
        else:
            arr = data.get(BANKS[name]["field"]) or []
            print(f"  {name:8s} -> {len(arr)} 条")
    print("\n（以上为只读查询，未改动云端）")


def cmd_get(name, out):
    data = get_current(name)
    if name == "gquiz":
        payload = data.get("bank") or {}
    else:
        payload = data.get(BANKS[name]["field"]) or []
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if out:
        with open(out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"已下载 {name} 库到 {out}（{len(payload) if isinstance(payload, list) else len(payload)} 项）")
    else:
        print(text)
    print("\n改完之后用：python3 add_content.py add " + name + " " + (out or "文件.json") + " --apply")


def cmd_add(name, file, apply):
    with open(file, "r", encoding="utf-8") as f:
        incoming = json.load(f)

    data = get_current(name)
    if name == "gquiz":
        existing = data.get("bank") or {}
        if not isinstance(incoming, dict):
            print("错误：gquiz 库需要一个「字典」JSON，键为课标题。见 examples。"); sys.exit(1)
        merged, added = merge_bank(existing, incoming)
        data["bank"] = merged
        print(f"[gquiz] 现有 {len(existing)} 节课，合并后 {len(merged)} 节课，本次新增 {added} 道题")
    else:
        field = BANKS[name]["field"]
        dedup = BANKS[name]["dedup"]
        existing = data.get(field) or []
        if not isinstance(incoming, list):
            print(f"错误：{name} 库需要一个「数组」JSON。见 examples。"); sys.exit(1)
        merged, added = merge_array(existing, incoming, dedup)
        data[field] = merged
        print(f"[{name}] 现有 {len(existing)} 条，合并后 {len(merged)} 条，本次新增 {added} 条（按 {dedup} 去重）")

    if not apply:
        print("\n*** DRY-RUN：未写入云端。加 --apply 才真正上传。***")
        return
    body = [{
        "profile_id": BANKS[name]["key"],
        "data": data,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }]
    st, resp = api("POST", TABLE, body)  # 靠 Prefer: resolution=merge-duplicates 按主键 upsert
    # 重新发一次带 Prefer 头更稳妥
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}"
    req = urllib.request.Request(url, method="POST", headers=_req_headers({"Prefer": "resolution=merge-duplicates"}))
    req.data = json.dumps(body).encode("utf-8")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"\n已写入云端：HTTP {r.status}（全站刷新即生效）")
    except urllib.error.HTTPError as e:
        print(f"\n写入失败：HTTP {e.code}  {e.read().decode('utf-8', 'ignore')[:300]}")
        sys.exit(1)


EXAMPLES = r'''
========== 各库 JSON 模板（复制改内容即可） ==========

【words】  数组，每个单词：
[
  {"w":"apple", "ph":"/ˈæpl/", "cn":"苹果", "s":"I eat an apple.", "sentCn":"我吃一个苹果。", "pos":"名词"},
  {"w":"run",   "cn":"跑", "s":"He runs fast.", "sentCn":"他跑得快。", "pos":"动词"}
]

【phrases】 数组，每个口语短语：
[
  {"en":"How are you?", "cn":"你好吗？", "ph":"/haʊ ɑr ju/", "level":1},
  {"en":"Thank you.",   "cn":"谢谢。",   "level":1}
]

【reading】 数组，每篇短文（en 英文 / cn 中文，整段）：
[
  {"lv":1, "topic":"日常", "title":"My Day",
   "en":"I get up at seven. I eat breakfast. I go to school.",
   "cn":"我七点起床。我吃早饭。我去上学。"}
]

【grammar】 数组，每节课（t=标题，必填；其余字段见 grammar.js）：
[
  {"t":"第30课：现在完成时",
   "en":"We have finished our homework.",
   "cn":"我们已经写完了作业。",
   "rule":"have/has + 过去分词，表示过去发生、与现在有关。",
   "level":30}
]

【phrasals】 数组，每个短语动词：
[
  {"phrase":"look for", "cn":"寻找",
   "ex":"I am looking for my book.", "exCn":"我在找我的书。",
   "level":2, "pat":"sth",
   "tests":[{"s":"I ___ my keys. (look for)", "a":"look for"}]}
]
  pat 取值：sth / sb / sb/sth / doing / sth / doing / 不接宾语
  （决定用法页显示的 💡 提示）

【gquiz】  字典，键=课标题，值=该题的换题库数组：
{
  "第1课：be 动词": [
    {"q":"I ___ a student.", "opts":["am","is","are"], "a":"am", "e":"I 后用 am"},
    {"q":"She ___ happy.",   "opts":["am","is","are"], "a":"is", "e":"She 后用 is"}
  ]
}
====================================================
'''


def main():
    p = argparse.ArgumentParser(description="自己往云端词库加内容（无需他人跑脚本）")
    sub = p.add_subparsers(dest="cmd")

    sub.add_parser("list", help="列出各库现有条数（只读）")
    sub.add_parser("examples", help="打印各库 JSON 模板")

    pg = sub.add_parser("get", help="下载某库内容为 JSON")
    pg.add_argument("name", choices=BANKS.keys())
    pg.add_argument("--out", help="输出文件名（不填则打印到屏幕）")

    pa = sub.add_parser("add", help="把 JSON 合并进某库")
    pa.add_argument("name", choices=BANKS.keys())
    pa.add_argument("file", help="JSON 文件")
    pa.add_argument("--apply", action="store_true", help="真正写入云端（不加则只预览）")

    args = p.parse_args()
    if not args.cmd or args.cmd == "examples":
        print(EXAMPLES)
        return
    if args.cmd == "list":
        cmd_list(); return
    if args.cmd == "get":
        cmd_get(args.name, args.out); return
    if args.cmd == "add":
        cmd_add(args.name, args.file, args.apply); return
    p.print_help()


if __name__ == "__main__":
    main()
