import type { ChannelPulseAccount } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { isYouTubeCmsConfigured } from "@/lib/youtube-cms-api";
import { ensureYoutubeAnalyticsRangeData } from "@/lib/youtube-auto-sync";
import { listStoredYoutubeManagedChannels } from "@/lib/youtube-managed-channels";
import { syncYoutubeCmsAnalytics } from "@/lib/youtube-performance-sync";
import { syncYoutubePublishedVideosForDate } from "@/lib/youtube-published-video-sync";
import { normalizeReportDate } from "@/lib/youtube-performance-utils";

type LoginSyncChannel = {
  channelId: string;
  title?: string | null;
};

const inFlightLoginSyncs = new Map<string, Promise<void>>();
const CHECK_PAGE_SIZE = 1000;
const RECENT_REVENUE_REFRESH_COMPLETE_DAYS = 7;
const DAILY_METRIC_REFRESH_CONCURRENCY = 2;

export async function runLoginYoutubeSync(account: ChannelPulseAccount) {
  if (!isYouTubeCmsConfigured()) {
    return;
  }

  const channels = filterChannelsForAccount(await listStoredYoutubeManagedChannels(), account);
  if (channels.length === 0) {
    return;
  }

  const { endDate, startDate } = getLoginSyncDateRange();
  const key = `${startDate}|${endDate}|${channels.map((channel) => channel.channelId).sort().join(",")}`;
  const existingSync = inFlightLoginSyncs.get(key);
  if (existingSync) {
    await existingSync;
    return;
  }

  const syncPromise = (async () => {
    await ensureYoutubeAnalyticsRangeData({
      channels,
      endDate,
      startDate,
      storePeriodBreakdowns: true
    });
    await syncStaleDailyMetricRanges(channels, { endDate, startDate });
    await syncRecentPublishedVideos(channels);
  })()
    .then(() => undefined)
    .catch((error) => {
      console.error("Login YouTube sync failed.", error);
    })
    .finally(() => {
      inFlightLoginSyncs.delete(key);
    });

  inFlightLoginSyncs.set(key, syncPromise);
  await syncPromise;
}

export function getLoginSyncDateRange(now = new Date()) {
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), 1));

  return {
    startDate: normalizeReportDate(start),
    endDate: normalizeReportDate(yesterday)
  };
}

export function getLoginRevenueRefreshDateRange(now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - RECENT_REVENUE_REFRESH_COMPLETE_DAYS + 1);

  return {
    startDate: normalizeReportDate(start),
    endDate: normalizeReportDate(end)
  };
}

export function getLoginTodayDate(now = new Date()) {
  return normalizeReportDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

async function syncRecentPublishedVideos(channels: LoginSyncChannel[]) {
  const today = getLoginTodayDate();
  const yesterday = addDays(today, -1);

  await mapWithConcurrency([yesterday, today], 1, async (date) => {
    try {
      await syncYoutubePublishedVideosForDate({ channels, date });
    } catch (error) {
      console.error(`Login published video sync failed for ${date}.`, error);
    }
  });
}

async function syncStaleDailyMetricRanges(
  channels: LoginSyncChannel[],
  loginRange: { endDate: string; startDate: string }
) {
  const channelIds = Array.from(new Set(channels.map((channel) => channel.channelId).filter(Boolean)));
  if (channelIds.length === 0) return;

  const revenueRange = getLoginRevenueRefreshDateRange();
  const ranges = mergeChannelRanges([
    ...(await getStaleDailyMetricRanges(channelIds, loginRange.startDate, loginRange.endDate)),
    ...(await getZeroRevenueChannelRanges(channelIds, revenueRange.startDate, revenueRange.endDate))
  ]);
  if (ranges.length === 0) return;

  await mapWithConcurrency(ranges, DAILY_METRIC_REFRESH_CONCURRENCY, async (range) => {
    try {
      await syncYoutubeCmsAnalytics({
        channelId: range.channelId,
        endDate: range.endDate,
        startDate: range.startDate,
        storePeriodBreakdowns: false,
        syncType: "daily"
      });
    } catch (error) {
      console.error(
        `Login daily metric refresh failed for ${range.channelId} from ${range.startDate} to ${range.endDate}.`,
        error
      );
    }
  });
}

async function getStaleDailyMetricRanges(channelIds: string[], startDate: string, endDate: string) {
  const supabase = createSupabaseAdminClient();
  const pendingDaysByChannelId = new Map(channelIds.map((channelId) => [channelId, [] as string[]]));
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("youtube_channel_daily_metrics")
      .select("channel_id,day,updated_at")
      .in("channel_id", channelIds)
      .gte("day", startDate)
      .lte("day", endDate)
      .order("channel_id", { ascending: true })
      .order("day", { ascending: true })
      .range(offset, offset + CHECK_PAGE_SIZE - 1);

    if (error) throw error;

    for (const row of (data ?? []) as Array<{
      channel_id: string;
      day: string;
      updated_at: string | null;
    }>) {
      if (!isStaleDailyMetricRow(row)) continue;
      pendingDaysByChannelId.get(row.channel_id)?.push(row.day);
    }

    if (!data || data.length < CHECK_PAGE_SIZE) break;
    offset += CHECK_PAGE_SIZE;
  }

  return Array.from(pendingDaysByChannelId.entries()).flatMap(([channelId, days]) =>
    groupConsecutiveDays(channelId, days)
  );
}

async function getZeroRevenueChannelRanges(channelIds: string[], startDate: string, endDate: string) {
  const supabase = createSupabaseAdminClient();
  const pendingDaysByChannelId = new Map(channelIds.map((channelId) => [channelId, [] as string[]]));
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("youtube_channel_daily_metrics")
      .select("channel_id,day,views,estimated_revenue,monetized_playbacks,ad_impressions")
      .in("channel_id", channelIds)
      .gte("day", startDate)
      .lte("day", endDate)
      .order("channel_id", { ascending: true })
      .order("day", { ascending: true })
      .range(offset, offset + CHECK_PAGE_SIZE - 1);

    if (error) throw error;

    for (const row of (data ?? []) as Array<{
      ad_impressions: number | string | null;
      channel_id: string;
      day: string;
      estimated_revenue: number | string | null;
      monetized_playbacks: number | string | null;
      views: number | string | null;
    }>) {
      if (!hasActivityWithZeroRevenue(row)) continue;
      pendingDaysByChannelId.get(row.channel_id)?.push(row.day);
    }

    if (!data || data.length < CHECK_PAGE_SIZE) break;
    offset += CHECK_PAGE_SIZE;
  }

  return Array.from(pendingDaysByChannelId.entries()).flatMap(([channelId, days]) =>
    groupConsecutiveDays(channelId, days)
  );
}

function isStaleDailyMetricRow(row: { day: string; updated_at: string | null }) {
  const updatedDate = row.updated_at?.slice(0, 10) ?? "";
  return !updatedDate || updatedDate <= row.day;
}

function hasActivityWithZeroRevenue(row: {
  ad_impressions: number | string | null;
  estimated_revenue: number | string | null;
  monetized_playbacks: number | string | null;
  views: number | string | null;
}) {
  return (
    isZero(row.estimated_revenue) &&
    (toNumber(row.views) > 0 || toNumber(row.monetized_playbacks) > 0 || toNumber(row.ad_impressions) > 0)
  );
}

function mergeChannelRanges(ranges: Array<{ channelId: string; endDate: string; startDate: string }>) {
  const daysByChannelId = new Map<string, string[]>();

  for (const range of ranges) {
    const days = daysByChannelId.get(range.channelId) ?? [];
    days.push(...getInclusiveDateKeys(range.startDate, range.endDate));
    daysByChannelId.set(range.channelId, days);
  }

  return Array.from(daysByChannelId.entries()).flatMap(([channelId, days]) =>
    groupConsecutiveDays(channelId, days)
  );
}

function groupConsecutiveDays(channelId: string, days: string[]) {
  const sortedDays = Array.from(new Set(days)).sort();
  const ranges: Array<{ channelId: string; endDate: string; startDate: string }> = [];
  let startDate = "";
  let previousDate = "";

  for (const day of sortedDays) {
    if (!startDate) {
      startDate = day;
      previousDate = day;
      continue;
    }

    if (day === addDays(previousDate, 1)) {
      previousDate = day;
      continue;
    }

    ranges.push({ channelId, endDate: previousDate, startDate });
    startDate = day;
    previousDate = day;
  }

  if (startDate) {
    ranges.push({ channelId, endDate: previousDate, startDate });
  }

  return ranges;
}

function getInclusiveDateKeys(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) {
    return [];
  }

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

async function mapWithConcurrency<T>(items: T[], concurrency: number, callback: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency);
    await Promise.all(batch.map(callback));
  }
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isZero(value: number | string | null | undefined) {
  return Math.abs(toNumber(value)) < 0.000001;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function filterChannelsForAccount<T extends LoginSyncChannel>(channels: T[], account: ChannelPulseAccount) {
  if (account.channelIds === null) return channels;

  const allowedChannelIds = new Set(account.channelIds);
  return channels.filter((channel) => allowedChannelIds.has(channel.channelId));
}
