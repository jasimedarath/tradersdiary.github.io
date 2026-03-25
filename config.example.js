window.APP_CONFIG = {
  appName: "Swing Trade Tracker",
  currency: "USD",

  // Recommended:
  // authMode: "supabase"
  // Fallback only:
  // authMode: "demo"
  authMode: "supabase",

  demoAuth: {
    username: "trader",
    password: "change-me",
  },

  supabase: {
    url: "https://YOUR_PROJECT.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY",
    table: "trades",
  },
};
