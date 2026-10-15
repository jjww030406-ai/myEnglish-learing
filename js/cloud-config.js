// 云服务公开配置（可安全放在前端：endpoint + publishableKey 都是公开的，不含任何密钥）
window.CLOUD_CONFIG = {
  endpoint: "https://english-daily-06186.app.workbuddy.host",
  publishableKey: "wbpk_5Rc9q8rRdWs8uGzuocfpHm_8FicWHgdbEXjMO79fg3yxrmfszZvGl8x",

  // ===== 学习进度云端同步（可选层）=====
  // 留空 = 纯本地（双击即开、离线可用，进度存在本机浏览器）。
  // 填上下面两项，网站就会把每个客户的进度同步到云端，实现「多客户 / 换设备接着学」。
  // 后端以 Supabase 为例（REST + 匿名 Key，任何人都能看前端代码，所以只用 anonKey，绝不放服务密钥）。
  // 表 learning_progress 需要字段：profile_id text 主键, data jsonb, updated_at timestamptz。
  sync: {
    enabled: true,
    url: "https://vseeskrcwconhoknwstm.supabase.co", // Supabase 项目根地址（不含 /rest/v1/）
    anonKey: "sb_publishable_2m6HQqQtZ06CHVfvf7hloA_EhFp6khq", // Supabase publishable key（前端可暴露）
    table: "learning_progress"
  }
};
