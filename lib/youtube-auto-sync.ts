import { createSupabaseAdminClient } from "@/lib/supabase";
import { syncYoutubeCmsAnalytics } from "@/lib/youtube-performance-sync";

type AutoSyncChannel = {
  channelId: string;
};

type EnsureYoutubeAnalyticsRangeDataInput = {
  channels: AutoSyncChannel[];
  forceSync?: boolean;
  startDate: string;
  endDate: string;
};

const CHECK_PAGE_SIZE = 1000;
const CHANNEL_SYNC_CONCURRENCY = 3;
const POST_SYNC_CHECK_ATTEMPTS = 15;
const POST_SYNC_CHECK_DELAY_MS = 5_000;
const inFlightSyncs = new Map<string, Promise<void>>();

export async function ensureYoutubeAnalyticsRangeData({
  channels,
  forceSync = false,
  startDate,
  endDate
}: EnsureYoutubeAnalyticsRangeDataInput) {
  const channelIds = getUniqueChannelIds(channels);
  if (channelIds.length === 0) {
    return { syncedChannels: 0 };
  }

  const missingChannelIds = forceSync
    ? channelIds
    : await getIncompleteYoutubeAnalyticsChannelIds({ channels, startDate, endDate });
  const syncErrors = new Map<string, string>();

  await mapWithConcurrency(missingChannelIds, CHANNEL_SYNC_CONCURRENCY, async (channelId) => {
    try {
      await syncYoutubeAnalyticsRangeOnce({
        channelId,
        endDate,
        startDate
      });
    } catch (error) {
      syncErrors.set(channelId, getErrorMessage(error));
    }
  });

  if (missingChannelIds.length > 0) {
    const syncedChannelIds = await waitForChannelsWithCompleteMetrics(missingChannelIds, startDate, endDate);
    const incompleteChannelIds = missingChannelIds.filter((channelId) => !syncedChannelIds.has(channelId));

    if (incompleteChannelIds.length > 0) {
      const firstIncompleteChannelId = incompleteChannelIds[0];
      const syncError = syncErrors.get(firstIncompleteChannelId);
      if (syncError) {
        throw new Error(syncError);
      }
      throw new Error(
        `YouTube sync completed, but complete daily channel metrics were not stored for ${firstIncompleteChannelId} from ${startDate} to ${endDate}.`
      );
    }
  }

  return { syncedChannels: missingChannelIds.length };
}

export async function getIncompleteYoutubeAnalyticsChannelIds({
  channels,
  startDate,
  endDate
}: EnsureYoutubeAnalyticsRangeDataInput) {
  const channelIds = getUniqueChannelIds(channels);
  if (channelIds.length === 0) return [];

  const completeChannelIds = await getChannelsWithCompleteMetrics(channelIds, startDate, endDate);
  return channelIds.filter((channelId) => !completeChannelIds.has(channelId));
}

function getUniqueChannelIds(channels: AutoSyncChannel[]) {
  return Array.from(new Set(channels.map((channel) => channel.channelId).filter(Boolean)));
}

async function waitForChannelsWithCompleteMetrics(channelIds: string[], startDate: string, endDate: string) {
  for (let attempt = 1; attempt <= POST_SYNC_CHECK_ATTEMPTS; attempt += 1) {
    const completeChannelIds = await getChannelsWithCompleteMetrics(channelIds, startDate, endDate);
    if (channelIds.every((channelId) => completeChannelIds.has(channelId)) || attempt === POST_SYNC_CHECK_ATTEMPTS) {
      return completeChannelIds;
    }

    await sleep(POST_SYNC_CHECK_DELAY_MS);
  }

  return new Set<string>();
}

async function getChannelsWithCompleteMetrics(channelIds: string[], startDate: string, endDate: string) {
  const supabase = createSupabaseAdminClient();
  const expectedDays = getInclusiveDateKeys(startDate, endDate);
  if (expectedDays.length === 0) {
    return new Set<string>();
  }

  const daysByChannelId = new Map<string, Set<string>>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("youtube_channel_daily_metrics")
      .select("channel_id,day")
      .in("channel_id", channelIds)
      .gte("day", startDate)
      .lte("day", endDate)
      .order("channel_id", { ascending: true })
      .order("day", { ascending: true })
      .range(offset, offset + CHECK_PAGE_SIZE - 1);

    if (error) throw error;

    for (const row of (data ?? []) as Array<{ channel_id: string; day: string }>) {
      if (!daysByChannelId.has(row.channel_id)) {
        daysByChannelId.set(row.channel_id, new Set());
      }
      daysByChannelId.get(row.channel_id)?.add(row.day);
    }

    if (!data || data.length < CHECK_PAGE_SIZE) {
      break;
    }

    offset += CHECK_PAGE_SIZE;
  }

  const completeChannelIds = new Set<string>();
  for (const channelId of channelIds) {
    const days = daysByChannelId.get(channelId);
    if (days && expectedDays.every((day) => days.has(day))) {
      completeChannelIds.add(channelId);
    }
  }

  return completeChannelIds;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function syncYoutubeAnalyticsRangeOnce({
  channelId,
  startDate,
  endDate
}: {
  channelId: string;
  startDate: string;
  endDate: string;
}) {
  const key = `${channelId}|${startDate}|${endDate}`;
  const existingSync = inFlightSyncs.get(key);
  if (existingSync) return existingSync;

  const syncPromise = syncYoutubeCmsAnalytics({
    channelId,
    startDate,
    endDate,
    syncType: "manual"
  })
    .then(() => undefined)
    .finally(() => {
      inFlightSyncs.delete(key);
    });

  inFlightSyncs.set(key, syncPromise);
  return syncPromise;
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  callback: (item: T) => Promise<void>
) {
  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency);
    await Promise.all(batch.map(callback));
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "YouTube sync failed.";
  }
}

function getInclusiveDateKeys(startDate: string, endDate: string) {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  if (!start || !end || start.getTime() > end.getTime()) {
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

function parseDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}
