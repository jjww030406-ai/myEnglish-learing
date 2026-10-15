/* =====================================================================
   学习进度云端同步（可选层 · 本地优先）
   ---------------------------------------------------------------------
   设计原则：本地优先。没配置云端时，一切照旧（localStorage 存进度），
   网站双击即开、离线可用、不需要联网。

   一旦在 cloud-config.js 里把 sync.enabled 设为 true 并填上 url / anonKey，
   本模块就会：
     1) 把每个客户（档案）的学习进度推送到云端；
     2) 启动时若本机没有进度，则从云端拉取（换设备接着学）；
     3) 提供登录 / 注册（邮箱+密码，走 Supabase Auth）。
   后端以 Supabase 为例，换成别的 BaaS 只要改这里的请求即可。

   所有网络调用都包裹在 try/catch 里：云端挂了 / 没网，本地照常工作。
   ===================================================================== */
(function () {
  var cfg = (window.CLOUD_CONFIG && window.CLOUD_CONFIG.sync) || {};
  var ENABLED = !!(cfg.enabled && cfg.url && cfg.anonKey);

  function authHeaders() {
    return { "Content-Type": "application/json", "apikey": cfg.anonKey };
  }
  function dataHeaders() {
    return {
      "Content-Type": "application/json",
      "apikey": cfg.anonKey,
      "Authorization": "Bearer " + (CloudSync.token || cfg.anonKey),
      "Prefer": "resolution=merge-duplicates"
    };
  }

  var CloudSync = {
    enabled: ENABLED,
    token: null,
    user: null,
    _sessKey: "english_cloud_session",

    /* ---- 账户（仅云端模式使用）---- */
    async signup(email, password) {
      if (!ENABLED) return { ok: false, msg: "未启用云端同步" };
      try {
        var res = await fetch(cfg.url + "/auth/v1/signup", {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ email: email, password: password })
        });
        if (!res.ok) {
          // 400 通常是「该邮箱已注册」
          if (res.status === 400) {
            try { var t = (await res.text()) || ""; } catch (e) { var t = ""; }
            if (/already registered|already been registered|User already/i.test(t)) {
              return { ok: false, msg: "该邮箱已注册，请直接登录" };
            }
            return { ok: false, msg: "邮箱格式有误或已被占用" };
          }
          return { ok: false, msg: "注册失败（" + res.status + "）" };
        }
        var j = await res.json();
        // 若开启了邮箱验证，注册后用户处于未验证状态，需要去邮箱点链接
        var needConfirm = !!(j && j.user && !j.user.email_confirmed_at);
        return { ok: true, needConfirm: needConfirm };
      } catch (e) { return { ok: false, msg: "网络错误：" + e.message }; }
    },
    async login(email, password) {
      if (!ENABLED) return { ok: false, msg: "未启用云端同步" };
      try {
        var res = await fetch(cfg.url + "/auth/v1/token?grant_type=password", {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ email: email, password: password })
        });
        if (!res.ok) {
          // 登录失败：先判断是否「邮箱未验证」，给出明确指引而非笼统的密码错误
          try { var lt = (await res.text()) || ""; } catch (e) { var lt = ""; }
          if (/not confirmed|email.*confirm|unconfirmed|Email not verified/i.test(lt)) {
            return { ok: false, msg: "邮箱还没验证，请先到邮箱点击验证链接，再回来登录" };
          }
          return { ok: false, msg: "邮箱或密码不正确" };
        }
        var j = await res.json();
        this.token = j.access_token || null;
        this.user = j.user || { email: email };
        this._persist();
        return { ok: true };
      } catch (e) { return { ok: false, msg: "网络错误：" + e.message }; }
    },
    logout() { this.token = null; this.user = null; this._clear(); },

    /* 把登录态存到本地，刷新页面后自动恢复（仍可继续用云端进度） */
    _persist() {
      try { window.localStorage.setItem(this._sessKey, JSON.stringify({ token: this.token, user: this.user })); } catch (e) {}
    },
    _clear() {
      try { window.localStorage.removeItem(this._sessKey); } catch (e) {}
    },
    restore() {
      try {
        var s = JSON.parse(window.localStorage.getItem(this._sessKey));
        if (s && s.token) { this.token = s.token; this.user = s.user || null; return true; }
      } catch (e) {}
      return false;
    },

    /* ---- 进度读写（每个档案一份）---- */
    // profileId 即云端用户 id；用 key 区分不同客户。整包（档案+进度）upsert。
    async saveProgress(profileId, state) {
      if (!ENABLED) return false;
      try {
        await fetch(cfg.url + "/rest/v1/" + cfg.table, {
          method: "POST",
          headers: dataHeaders(),
          body: JSON.stringify({ profile_id: profileId, data: state, updated_at: new Date().toISOString() })
        });
        return true;
      } catch (e) { return false; }
    },
    async loadProgress(profileId) {
      if (!ENABLED) return null;
      try {
        var res = await fetch(cfg.url + "/rest/v1/" + cfg.table +
          "?profile_id=eq." + encodeURIComponent(profileId) + "&select=data", { headers: dataHeaders() });
        if (!res.ok) return null;
        var rows = await res.json();
        if (rows && rows[0] && rows[0].data) return rows[0].data;
        return null;
      } catch (e) { return null; }
    },

    /* ---- 内容读取（单词 / 口语 / 阅读 / 语法，存于后端，可随时扩充）----
       表结构统一为：id 自增主键 + data jsonb（存完整内容对象）+ created_at。
       匿名可读（RLS 关闭），所以前端能直接拉；表不存在 / 出错则返回 null，
       由调用方回落到本地内置词库。 */
    async loadContent() {
      if (!ENABLED) return null;
      var tables = ["content_words", "content_phrases", "content_reading", "content_grammar"];
      var out = {};
      try {
        for (var i = 0; i < tables.length; i++) {
          var res = await fetch(cfg.url + "/rest/v1/" + tables[i] + "?select=*&order=id.asc", { headers: authHeaders() });
          if (!res.ok) return null;            // 任一张表不存在 → 整体回落本地
          var rows = await res.json();
          out[tables[i]] = (rows || []).map(function (r) { return r.data; }).filter(Boolean);
        }
        return out;
      } catch (e) { return null; }
    }
  };

  window.CloudSync = CloudSync;
})();
