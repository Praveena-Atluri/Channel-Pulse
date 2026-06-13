# Channel Pulse

Channel Pulse is a standalone Next.js dashboard for YouTube CMS performance. It tracks monthly channel performance, compares custom date ranges, syncs YouTube Analytics data on demand, and exports management-ready reports.

## Stack

- Next.js 15 App Router
- Supabase Postgres
- YouTube Analytics and Data APIs
- Shadcn-style UI components
- Node test runner for utility coverage

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Fill in the required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_OAUTH_REFRESH_TOKEN`
- `YOUTUBE_CONTENT_OWNER_ID`
- `DASHBOARD_BASIC_PASSWORD`
- `CHANNEL_PULSE_SESSION_SECRET`

4. Apply the dashboard schema in Supabase:

```bash
supabase db push
```

5. Start the app:

```bash
npm run dev
```

Open `/` for the dashboard hub. The monthly dashboard lives at `/monthly`, and the comparison dashboard lives at `/compare`.

## Syncing Data

Use the channel refresh button in the dashboard to pull the CMS-managed channel catalog, select one channel, then sync the month or date range you want to report on.

The sync API is also available directly:

```bash
curl -X POST http://localhost:3000/api/youtube/sync \
  -H "content-type: application/json" \
  -d '{"channelId":"UCXjhJbviBl0M4JAC3cxDXqA","startDate":"2026-05-01","endDate":"2026-05-31"}'
```

Revenue values are YouTube API-reported estimates. `creatorContentType` is used for Shorts and long-form splits where the Analytics API allows it; otherwise Channel Pulse falls back to video duration.

## Supabase

The schema is in `supabase/migrations/youtube_performance_schema.sql`. It creates the private analytics tables used by the dashboards:

- `youtube_managed_channels`
- `youtube_video_catalog`
- `youtube_channel_daily_metrics`
- `youtube_video_daily_metrics`
- `youtube_content_type_daily_metrics`
- `youtube_country_daily_metrics`
- `youtube_analytics_sync_runs`

## Auth

The dashboard and YouTube API routes are protected by the Channel Pulse login page.

`DASHBOARD_BASIC_USER` and `DASHBOARD_BASIC_PASSWORD` create the admin account. Admins can view revenue details and refresh the channel catalog.

Add non-admin accounts with `CHANNEL_PULSE_ACCOUNTS`:

```bash
CHANNEL_PULSE_ACCOUNTS='[
  {"username":"viewer","password":"strong-password","role":"user","channels":"all"},
  {"username":"channel-example","password":"strong-password","role":"user","channels":["UCXjhJbviBl0M4JAC3cxDXqA"]}
]'
```

Accounts with `role: "user"` cannot see revenue cards, revenue tables, country revenue, CPM, ad impressions, or revenue video leaderboards. Use `channels: "all"` for a non-revenue user who can see all channels, or provide a channel ID array to create one login per channel.

## Tests

```bash
npm test
```
