import {
  MONTHLY_TARGET_METRICS,
  aggregateTargetProgressRows,
  buildTargetProgress,
  createEmptyActualValues,
  createEmptyTargetValues,
  getTargetBaselineCutoffMonth,
  getTargetBaselineMonth,
  normalizeTargetValue,
  type MonthlyActualValues,
  type MonthlyTargetMetric,
  type MonthlyTargetValues
} from "@/lib/monthly-target-metrics";
import { createDatabaseAdminClient } from "@/lib/database";
import { getMonthDateRange, type VideoContentType } from "@/lib/youtube-performance-utils";

export type MonthlyTargetDashboardRow = {
  actual: MonthlyActualValues;
  baseline: MonthlyActualValues;
  channelId: string;
  channelTitle: string;
  hasBaselineData: boolean;
  progress: ReturnType<typeof buildTargetProgress>;
  target: MonthlyTargetValues;
};

export type MonthlyTargetDashboardData = {
  baselineMonth: string;
  errorMessage?: string;
  month: string;
  rows: MonthlyTargetDashboardRow[];
  schemaReady: boolean;
  totals: ReturnType<typeof aggregateTargetProgressRows>;
};

export type SaveMonthlyTargetInputRow = {
  channelId: string;
  targets: Partial<Record<MonthlyTargetMetric, unknown>>;
};

type TargetDbRow = {
  month: string;
  channel_id: string;
  short_views_target: number | string | null;
  long_views_target: number | string | null;
  short_videos_target: number | string | null;
  long_videos_target: number | string | null;
  watch_hours_target: number | string | null;
  net_subscribers_target: number | string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ChannelMetricRow = {
  channel_id: string;
  estimated_minutes_watched: number | string | null;
  subscribers_gained: number | string | null;
  subscribers_lost: number | string | null;
};

type ContentTypeMetricRow = {
  channel_id: string;
  content_type: VideoContentType;
  views: number | string | null;
};

type PublishedVideoRow = {
  channel_id: string;
  content_type: VideoContentType | null;
};

type LatestMetricDayRow = {
  day: string;
};

type ActualBucket = {
  hasData: boolean;
  values: MonthlyActualValues;
};

type TargetChannel = {
  channelId: string;
  title: string;
};

const TARGET_SELECT_COLUMNS = [
  "month",
  "channel_id",
  "short_views_target",
  "long_views_target",
  "short_videos_target",
  "long_videos_target",
  "watch_hours_target",
  "net_subscribers_target",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at"
].join(",");

export async function getMonthlyTargetDashboardData({
  baselineMonth,
  channels,
  month
}: {
  baselineMonth: string;
  channels: TargetChannel[];
  month: string;
}): Promise<MonthlyTargetDashboardData> {
  const rows = await getMonthlyTargetRows({ baselineMonth, channels, month });

  return {
    baselineMonth,
    month,
    rows,
    schemaReady: true,
    totals: aggregateTargetProgressRows(rows)
  };
}

export async function getMonthlyTargetDashboardDataSafe(input: {
  baselineMonth: string;
  channels: TargetChannel[];
  month: string;
}): Promise<MonthlyTargetDashboardData> {
  try {
    return await getMonthlyTargetDashboardData(input);
  } catch (error) {
    if (isMissingTargetTableError(error)) {
      return {
        baselineMonth: input.baselineMonth,
        errorMessage: "Apply the monthly targets schema before using target tracking.",
        month: input.month,
        rows: [],
        schemaReady: false,
        totals: aggregateTargetProgressRows([])
      };
    }

    throw error;
  }
}

export async function resolveMonthlyTargetBaselineMonth({
  channels,
  month
}: {
  channels: TargetChannel[];
  month: string;
}) {
  const fallbackMonth = getTargetBaselineMonth(month);
  const channelIds = channels.map((channel) => channel.channelId);

  if (channelIds.length === 0) return fallbackMonth;

  const db = createDatabaseAdminClient();
  const cutoffDate = `${getTargetBaselineCutoffMonth(month)}-01`;
  const [latestChannelDay, latestContentTypeDay] = await Promise.all([
    getLatestMetricDay(db, "youtube_channel_daily_metrics", cutoffDate, channelIds),
    getLatestMetricDay(db, "youtube_content_type_daily_metrics", cutoffDate, channelIds)
  ]);
  const latestDay = [latestChannelDay, latestContentTypeDay].filter(Boolean).sort().at(-1);

  return latestDay ? latestDay.slice(0, 7) : fallbackMonth;
}

export async function saveMonthlyTargets({
  month,
  rows,
  username
}: {
  month: string;
  rows: SaveMonthlyTargetInputRow[];
  username: string;
}) {
  const db = createDatabaseAdminClient();
  const channelIds = rows.map((row) => row.channelId);
  const existingRows = await getTargetDbRows(db, month, channelIds);
  const existingRowsByChannelId = new Map(existingRows.map((row) => [row.channel_id, row]));
  const savedAt = new Date().toISOString();
  const payload = rows.map((row) => {
    const normalizedTargets = normalizeTargetValues(row.targets);
    const existingRow = existingRowsByChannelId.get(row.channelId);

    return {
      month,
      channel_id: row.channelId,
      short_views_target: normalizedTargets.shortViews,
      long_views_target: normalizedTargets.longViews,
      short_videos_target: normalizedTargets.shortVideosToPublish,
      long_videos_target: normalizedTargets.longVideosToPublish,
      watch_hours_target: normalizedTargets.watchHours,
      net_subscribers_target: normalizedTargets.netSubscribers,
      created_by: existingRow?.created_by ?? username,
      updated_by: username,
      updated_at: savedAt
    };
  });

  if (payload.length === 0) return;

  const { error } = await db
    .from("youtube_monthly_channel_targets")
    .upsert(payload, { onConflict: "month,channel_id" });

  if (error) throw error;
}

export function normalizeTargetValues(values: Partial<Record<MonthlyTargetMetric, unknown>>) {
  const normalized = createEmptyTargetValues();

  for (const metric of MONTHLY_TARGET_METRICS) {
    normalized[metric.key] = normalizeTargetValue(metric.key, values[metric.key]);
  }

  return normalized;
}

function mapTargetDbRow(row: TargetDbRow | undefined): MonthlyTargetValues {
  if (!row) return createEmptyTargetValues();

  return {
    shortViews: toNullableNumber(row.short_views_target),
    longViews: toNullableNumber(row.long_views_target),
    shortVideosToPublish: toNullableNumber(row.short_videos_target),
    longVideosToPublish: toNullableNumber(row.long_videos_target),
    watchHours: toNullableNumber(row.watch_hours_target),
    netSubscribers: toNullableNumber(row.net_subscribers_target)
  };
}

async function getMonthlyTargetRows({
  baselineMonth,
  channels,
  month
}: {
  baselineMonth: string;
  channels: TargetChannel[];
  month: string;
}) {
  const db = createDatabaseAdminClient();
  const channelIds = channels.map((channel) => channel.channelId);

  if (channelIds.length === 0) return [];

  const [targetRows, actualBuckets, baselineBuckets] = await Promise.all([
    getTargetDbRows(db, month, channelIds),
    getActualBuckets(db, month, channelIds),
    getActualBuckets(db, baselineMonth, channelIds)
  ]);
  const targetRowsByChannelId = new Map(targetRows.map((row) => [row.channel_id, row]));

  return channels.map((channel) => {
    const target = mapTargetDbRow(targetRowsByChannelId.get(channel.channelId));
    const actualBucket = actualBuckets.get(channel.channelId) ?? createActualBucket();
    const baselineBucket = baselineBuckets.get(channel.channelId) ?? createActualBucket();

    return {
      actual: actualBucket.values,
      baseline: baselineBucket.values,
      channelId: channel.channelId,
      channelTitle: channel.title,
      hasBaselineData: baselineBucket.hasData,
      progress: buildTargetProgress({ actual: actualBucket.values, target }),
      target
    };
  });
}

async function getTargetDbRows(
  db: ReturnType<typeof createDatabaseAdminClient>,
  month: string,
  channelIds: string[]
) {
  const { data, error } = await db
    .from("youtube_monthly_channel_targets")
    .select(TARGET_SELECT_COLUMNS)
    .eq("month", month)
    .in("channel_id", channelIds);

  if (error) throw error;

  return (data ?? []) as TargetDbRow[];
}

async function getActualBuckets(
  db: ReturnType<typeof createDatabaseAdminClient>,
  month: string,
  channelIds: string[]
) {
  const range = getMonthDateRange(month);
  const buckets = new Map(channelIds.map((channelId) => [channelId, createActualBucket()]));
  const [channelMetricRows, contentTypeMetricRows, publishedVideoRows] = await Promise.all([
    getChannelMetricRows(db, range.startDate, range.endDate, channelIds),
    getContentTypeMetricRows(db, range.startDate, range.endDate, channelIds),
    getPublishedVideoRows(db, range.startDate, range.endDate, channelIds)
  ]);

  for (const row of channelMetricRows) {
    const bucket = buckets.get(row.channel_id);
    if (!bucket) continue;

    bucket.hasData = true;
    bucket.values.watchHours += toNumber(row.estimated_minutes_watched) / 60;
    bucket.values.netSubscribers += toNumber(row.subscribers_gained) - toNumber(row.subscribers_lost);
  }

  for (const row of contentTypeMetricRows) {
    const bucket = buckets.get(row.channel_id);
    if (!bucket) continue;
    const metricKey = contentTypeMetricKey(row.content_type);
    if (!metricKey) continue;

    bucket.hasData = true;
    bucket.values[metricKey] += toNumber(row.views);
  }

  for (const row of publishedVideoRows) {
    const bucket = buckets.get(row.channel_id);
    if (!bucket) continue;

    if (row.content_type === "short") {
      bucket.hasData = true;
      bucket.values.shortVideosToPublish += 1;
    } else if (row.content_type === "long") {
      bucket.hasData = true;
      bucket.values.longVideosToPublish += 1;
    }
  }

  for (const bucket of buckets.values()) {
    bucket.values.watchHours = Math.round(bucket.values.watchHours * 10) / 10;
  }

  return buckets;
}

async function getChannelMetricRows(
  db: ReturnType<typeof createDatabaseAdminClient>,
  startDate: string,
  endDate: string,
  channelIds: string[]
) {
  const { data, error } = await db
    .from("youtube_channel_daily_metrics")
    .select("channel_id,estimated_minutes_watched,subscribers_gained,subscribers_lost")
    .in("channel_id", channelIds)
    .gte("day", startDate)
    .lt("day", endDate);

  if (error) throw error;

  return (data ?? []) as ChannelMetricRow[];
}

async function getContentTypeMetricRows(
  db: ReturnType<typeof createDatabaseAdminClient>,
  startDate: string,
  endDate: string,
  channelIds: string[]
) {
  const { data, error } = await db
    .from("youtube_content_type_daily_metrics")
    .select("channel_id,content_type,views")
    .in("channel_id", channelIds)
    .gte("day", startDate)
    .lt("day", endDate);

  if (error) throw error;

  return (data ?? []) as ContentTypeMetricRow[];
}

async function getPublishedVideoRows(
  db: ReturnType<typeof createDatabaseAdminClient>,
  startDate: string,
  endDate: string,
  channelIds: string[]
) {
  const { data, error } = await db
    .from("youtube_video_catalog")
    .select("channel_id,content_type")
    .in("channel_id", channelIds)
    .gte("published_at", `${startDate}T00:00:00.000Z`)
    .lt("published_at", `${endDate}T00:00:00.000Z`);

  if (error) throw error;

  return (data ?? []) as PublishedVideoRow[];
}

async function getLatestMetricDay(
  db: ReturnType<typeof createDatabaseAdminClient>,
  table: "youtube_channel_daily_metrics" | "youtube_content_type_daily_metrics",
  cutoffDate: string,
  channelIds: string[]
) {
  const { data, error } = await db
    .from(table)
    .select("day")
    .in("channel_id", channelIds)
    .lt("day", cutoffDate)
    .order("day", { ascending: false })
    .limit(1);

  if (error) throw error;

  const row = ((data ?? []) as LatestMetricDayRow[])[0];
  return typeof row?.day === "string" ? row.day : null;
}

function createActualBucket(): ActualBucket {
  return {
    hasData: false,
    values: createEmptyActualValues()
  };
}

function contentTypeMetricKey(contentType: VideoContentType): MonthlyTargetMetric | null {
  if (contentType === "short") return "shortViews";
  if (contentType === "long") return "longViews";
  return null;
}

function isMissingTargetTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("youtube_monthly_channel_targets") &&
    (message.includes("does not exist") || message.includes("no such table"))
  );
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
