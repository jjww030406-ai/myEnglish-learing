/* ===== 动态词源引擎（运行时从网络实时抓取，绝不写死） =====
   思路：
   1. 每个单词的词源，打开词源页 / 单词卡时，按词实时去 Wiktionary API 抓真实的 Etymology 段落；
   2. 抓到的英文词源经免费翻译接口（mymemory）译成中文，零基础也能看懂；
   3. 抓到的结果缓存在 本地(localStorage) + 全站共享(Supabase __global_etym__)，
      第一个用户抓过，后面所有人直接读缓存，且全局词源库随用户浏览不断长大 —— 真正动态、自生长；
   4. 任何词（包括运行时从词频队列动态扩充出来的新词）都能抓，不再固定 253 个。
   依赖：window.CLOUD_CONFIG.sync（与 daily.js 复用同一套 Supabase 配置）。
=========================================================== */
(function () {
  "use strict";
  var SYNC = (window.CLOUD_CONFIG && window.CLOUD_CONFIG.sync) || {};
  var SHARED_KEY = "__global_etym__";      // learning_progress 表里存放共享词源行的保留主键
  var LOCAL_KEY = "el_etym_v1";             // 本地缓存 key
  var ETYM = {};                            // word(小写) -> { en, zh }

  /* ---------- 本地缓存 ---------- */
  try {
    var c = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    for (var k in c) if (c.hasOwnProperty(k)) ETYM[k] = c[k];
  } catch (e) {}
  function saveLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(ETYM)); } catch (e) {}
  }

  /* ---------- 全站共享（Supabase） ---------- */
  function sbHeaders() {
    return {
      "apikey": SYNC.anonKey || "",
      "Authorization": "Bearer " + (SYNC.anonKey || ""),
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    };
  }
  async function loadShared() {
    if (!SYNC.enabled || !SYNC.url) return;
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_KEY + "&select=data", { headers: sbHeaders() });
      if (!r.ok) return;
      var rows = await r.json();
      var arr = (rows && rows[0] && rows[0].data && rows[0].data.words) || [];
      arr.forEach(function (x) { if (x && x.w) ETYM[x.w.toLowerCase()] = { en: x.en || "", zh: x.zh || "" }; });
    } catch (e) {}
  }
  async function saveShared(word, en, zh) {
    if (!SYNC.enabled || !SYNC.url) return;
    try {
      var r = await fetch(SYNC.url + "/rest/v1/learning_progress?profile_id=eq." + SHARED_KEY + "&select=data", { headers: sbHeaders() });
      var old = [];
      if (r.ok) { var rows = await r.json(); old = (rows && rows[0] && rows[0].data && rows[0].data.words) || []; }
      var seen = {}, merged = [];
      old.forEach(function (x) { if (x && x.w && !seen[x.w]) { seen[x.w] = 1; merged.push(x); } });
      merged.push({ w: word, en: en || "", zh: zh || "" });
      await fetch(SYNC.url + "/rest/v1/learning_progress", {
        method: "POST", headers: sbHeaders(),
        body: JSON.stringify([{ profile_id: SHARED_KEY, data: { words: merged }, updated_at: new Date().toISOString() }])
      });
    } catch (e) {}
  }

  /* ---------- 从 Wiktionary 抓真实词源 ---------- */
  async function fetchWiki(word) {
    var url = "https://en.wiktionary.org/w/api.php?origin=*&action=query&prop=extracts" +
      "&explaintext=1&redirects=1&format=json&titles=" + encodeURIComponent(word);
    var r = await fetch(url);
    if (!r.ok) return null;
    var d = await r.json();
    var pages = (d && d.query && d.query.pages) || {};
    for (var id in pages) {
      if (!pages.hasOwnProperty(id)) continue;
      var et = parseEtym(pages[id].extract || "");
      if (et) return et;
    }
    return null;
  }
  function parseEtym(txt) {
    if (!txt) return null;
    var lines = txt.split("\n");
    var start = -1, level = 0;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^(={2,4})\s*Etymology\b/);
      if (m) { start = i; level = m[1].length; break; }
    }
    if (start < 0) return null;
    var buf = [];
    for (var j = start + 1; j < lines.length; j++) {
      var ln = lines[j];
      if (/^={2,4}\s*Etymology\b/.test(ln)) continue;                   // 连续的 Etymology 小节：跳过标题行，只取内容
      var hm = ln.match(/^(={2,4})/);
      if (hm && hm[1].length <= level) break;                            // 遇到同级或更高级标题 => 结束
      buf.push(ln);
    }
    var text = buf.join("\n").trim();
    text = text
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/'''/g, "")
      .replace(/<\/?[^>]+>/g, "")
      .replace(/\s*\n\s*\n+/g, "\n")
      .trim();
    return text || null;
  }

  /* ---------- 翻译（best-effort，免费、无需 key） ---------- */
  async function translate(text) {
    if (!text) return "";
    var q = text.length > 480 ? text.slice(0, 480) : text;
    try {
      var r = await fetch("https://api.mymemory.translated.net/get?langpair=en|zh-CN&q=" + encodeURIComponent(q));
      if (!r.ok) return "";
      var d = await r.json();
      var t = (d && d.responseData && d.responseData.translatedText) || "";
      if (/MYMEMORY WARNING/i.test(t)) return "";
      return t;
    } catch (e) { return ""; }
  }

  /* ---------- 统一获取（带缓存 / 防重） ---------- */
  var inflight = {};
  function get(word) {
    var key = (word || "").toLowerCase();
    if (!key) return Promise.resolve(null);
    if (ETYM[key]) return Promise.resolve(ETYM[key]);
    if (inflight[key]) return inflight[key];
    inflight[key] = (async function () {
      var en = null;
      try { en = await fetchWiki(key); } catch (e) { en = null; }
      var zh = (en && ETYM[key] === undefined) ? await translate(en) : "";
      if (en) {
        ETYM[key] = { en: en, zh: zh };
        saveLocal();
        saveShared(key, en, zh);
      }
      delete inflight[key];
      return ETYM[key] || null;
    })();
    return inflight[key];
  }

  /* ---------- 批量抓取（限并发 + 礼貌限速） ---------- */
  function queue(items, concurrency, onUpdate) {
    items = items || [];
    var i = 0, active = 0;
    function pump() {
      if (i >= items.length && active === 0) return;
      while (active < (concurrency || 3) && i < items.length) {
        var it = items[i++];
        active++;
        (function (it) {
          get(it.word).then(function (res) {
            active--;
            try { if (onUpdate) onUpdate(it, res); } catch (e) {}
            setTimeout(pump, 90); // 两个请求之间稍歇，避免触发限流
          }).catch(function () { active--; setTimeout(pump, 90); });
        })(it);
      }
    }
    pump();
  }

  /* ---------- 渲染时调用：填充页面上所有 [data-etym] 节点 ---------- */
  function findWordObj(w) {
    if (typeof WORDS === "undefined" || !WORDS) return null;
    for (var i = 0; i < WORDS.length; i++) if (WORDS[i].w === w) return WORDS[i];
    return null;
  }
  function hydrate() {
    if (typeof document === "undefined") return;
    var nodes = document.querySelectorAll("[data-etym]");
    if (!nodes.length) return;
    var items = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var word = n.getAttribute("data-etym");
      if (word) items.push({ word: word, node: n });
    }
    queue(items, 3, function (it, res) {
      var node = it.node;
      if (!node || !node.parentNode) return;
      var text = res ? (res.zh || res.en) : null;
      var wobj = findWordObj(it.word);
      if (text) {
        if (wobj) wobj.root = text;
        node.outerHTML = '<h4>📖 这个意思是怎么来的</h4><p class="why">' + text + "</p>";
      } else {
        node.outerHTML = '<h4>📖 这个故事正在整理中</h4><p class="why muted">这个词的网络词源暂时没抓到，来源会持续补充进来。</p>';
      }
    });
  }

  window.Etym = { loadShared: loadShared, get: get, queue: queue, hydrate: hydrate, cache: ETYM };
})();
