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

    /* ---- 账户（仅云端模式使用）---- */
    async signup(email, password) {
      if (!ENABLED) return { ok: false, msg: "未启用云端同步" };
      try {
        var res = await fetch(cfg.url + "/auth/v1/signup", {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ email: email, password: password })
        });
        if (!res.ok) return { ok: false, msg: "注册失败（" + res.status + "）" };
        return { ok: true };
      } catch (e) { return { ok: false, msg: "网络错误：" + e.message }; }
    },
    async login(email, password) {
      if (!ENABLED) return { ok: false, msg: "未启用云端同步" };
      try {
        var res = await fetch(cfg.url + "/auth/v1/token?grant_type=password", {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ email: email, password: password })
        });
        if (!res.ok) return { ok: false, msg: "邮箱或密码不正确" };
        var j = await res.json();
        this.token = j.access_token || null;
        this.user = j.user || { email: email };
        return { ok: true };
      } catch (e) { return { ok: false, msg: "网络错误：" + e.message }; }
    },
    logout() { this.token = null; this.user = null; },

    /* ---- 进度读写（每个档案一份）---- */
    // profileId 即本地档案 id；用 key 区分不同客户。
    async saveProgress(profileId, state) {
      if (!ENABLED) return false;
      try {
        await fetch(cfg.url + "/rest/v1/" + cfg.table + "?profile_id=eq." + encodeURIComponent(profileId), {
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
    }
  };

  window.CloudSync = CloudSync;
})();
