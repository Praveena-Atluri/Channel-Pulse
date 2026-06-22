import { createSupabaseAdminClient } from "@/lib/supabase";
import type { StoredYoutubeManagedChannel } from "@/lib/youtube-managed-channels";
import type { VideoContentType } from "@/lib/youtube-performance-utils";

export type DailyMetricsVideoRow = {
  channelId: string;
  channelTitle: string;
  contentType: VideoContentType;
  estimatedRevenue: number | null;
  hasDailyMetrics: boolean;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  title: string;
  videoId: string;
  views: number | null;
};

export type DailyMetricsDashboardData = {
  channelId: string;
  date: string;
  rows: DailyMetricsVideoRow[];
  totals: {
    estimatedRevenue: number | null;
    longVideosPublished: number;
    shortVideosPublished: number;
    unclassifiedVideosPublished: number;
    videosWithDailyMetrics: number;
    views: number | null;
  };
};

type DailyVideoCatalogRow = {
  channel_id: string;
  content_type: VideoContentType | null;
  published_at: string | null;
  thumbnail_url: string | null;
  title: string | null;
  video_id: string;
};

type DailyVideoMetricRow = {
  estimated_revenue: number | string | null;
  video_id: string;
  views: number | string | null;
};

const PAGE_SIZE = 1000;

export function getDefaultDailyMetricsDate(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function getMaxDailyMetricsDate(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

export function normalizeDailyMetricsDate(
  value: string | null | undefined,
  maxDate = getMaxDailyMetricsDate(),
  defaultDate = getDefaultDailyMetricsDate()
) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return defaultDate > maxDate ? maxDate : defaultDate;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return defaultDate > maxDate ? maxDate : defaultDate;
  }
  return value > maxDate ? maxDate : value;
}

export async function getDailyMetricsDashboardData({
  channelId,
  channels,
  date
}: {
  channelId: string;
  channels: StoredYoutubeManagedChannel[];
  date: string;
}): Promise<DailyMetricsDashboardData> {
  const selectedChannelIds =
    channelId === "all" ? channels.map((channel) => channel.channelId) : channels.some((channel) => channel.channelId === channelId) ? [channelId] : [];
  const channelTitleById = new Map(channels.map((channel) => [channel.channelId, channel.title]));
  const catalogRows = selectedChannelIds.length > 0 ? await getPublishedVideoCatalogRows(selectedChannelIds, date) : [];
  const metricRows = await getDailyVideoMetricRows(catalogRows.map((row) => row.video_id), date);
  const metricByVideoId = new Map(metricRows.map((row) => [row.video_id, row]));
  const rows = catalogRows
    .map((row) => {
      const metric = metricByVideoId.get(row.video_id);

      return {
        channelId: row.channel_id,
        channelTitle: channelTitleById.get(row.channel_id) ?? row.channel_id,
        contentType: row.content_type ?? "unknown",
        estimatedRevenue: metric ? toNumber(metric.estimated_revenue) : null,
        hasDailyMetrics: Boolean(metric),
        publishedAt: row.published_at,
        thumbnailUrl: row.thumbnail_url,
        title: row.title || row.video_id,
        videoId: row.video_id,
        views: metric ? Math.round(toNumber(metric.views)) : null
      };
    })
    .sort((first, second) => {
      return getTime(first.publishedAt) - getTime(second.publishedAt);
    });
  const rowsWithDailyMetrics = rows.filter((row) => row.hasDailyMetrics);

  return {
    channelId: selectedChannelIds.length === 1 ? selectedChannelIds[0] : "all",
    date,
    rows,
    totals: {
      estimatedRevenue:
        rowsWithDailyMetrics.length > 0
          ? rowsWithDailyMetrics.reduce((total, row) => total + (row.estimatedRevenue ?? 0), 0)
          : null,
      longVideosPublished: rows.filter((row) => row.contentType === "long").length,
      shortVideosPublished: rows.filter((row) => row.contentType === "short").length,
      unclassifiedVideosPublished: rows.filter((row) => row.contentType !== "long" && row.contentType !== "short").length,
      videosWithDailyMetrics: rowsWithDailyMetrics.length,
      views: rowsWithDailyMetrics.length > 0 ? rowsWithDailyMetrics.reduce((total, row) => total + (row.views ?? 0), 0) : null
    }
  };
}

async function getPublishedVideoCatalogRows(channelIds: string[], date: string) {
  const supabase = createSupabaseAdminClient();
  const rows: DailyVideoCatalogRow[] = [];
  const endDate = addDays(date, 1);
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("youtube_video_catalog")
      .select("video_id,channel_id,title,thumbnail_url,published_at,content_type")
      .in("channel_id", channelIds)
      .gte("published_at", `${date}T00:00:00.000Z`)
      .lt("published_at", `${endDate}T00:00:00.000Z`)
      .order("published_at", { ascending: true })
      .order("video_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    rows.push(...((data ?? []) as DailyVideoCatalogRow[]));
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function getDailyVideoMetricRows(videoIds: string[], date: string) {
  const supabase = createSupabaseAdminClient();
  const rows: DailyVideoMetricRow[] = [];

  for (const ids of chunk(Array.from(new Set(videoIds)), 500)) {
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from("youtube_video_daily_metrics")
      .select("video_id,views,estimated_revenue")
      .eq("day", date)
      .in("video_id", ids);

    if (error) throw error;
    rows.push(...((data ?? []) as DailyVideoMetricRow[]));
  }

  return rows;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTime(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}
