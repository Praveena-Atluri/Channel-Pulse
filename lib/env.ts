function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getEnv() {
  return {
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    youtubeOauthRefreshToken: process.env.YOUTUBE_OAUTH_REFRESH_TOKEN ?? "",
    youtubeContentOwnerId: process.env.YOUTUBE_CONTENT_OWNER_ID ?? "",
    youtubeAnalyticsFilters: process.env.YOUTUBE_ANALYTICS_FILTERS ?? "claimedStatus==claimed",
    dashboardBasicUser: process.env.DASHBOARD_BASIC_USER ?? "management",
    dashboardBasicPassword: process.env.DASHBOARD_BASIC_PASSWORD ?? ""
  };
}
