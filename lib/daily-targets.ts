import { createSupabaseAdminClient } from "@/lib/supabase";
import type { DailyMetricsVideoRow } from "@/lib/daily-metrics";

export type DailyPublishingTargetValues = {
  longVideos: number | null;
  shortVideos: number | null;
};

export type DailyPublishingTargetActuals = {
  longVideos: number;
  shortVideos: number;
};

export type DailyPublishingTargetDashboardRow = {
  actual: DailyPublishingTargetActuals;
  channelId: string;
  channelTitle: string;
  target: DailyPublishingTargetValues;
};

export type DailyPublishingTargetDashboardData = {
  errorMessage?: string;
  rows: DailyPublishingTargetDashboardRow[];
  schemaReady: boolean;
};

export type SaveDailyPublishingTargetInputRow = {
  channelId: string;
  longVideosTarget: unknown;
  shortVideosTarget: unknown;
};

type DailyTargetChannel = {
  channelId: string;
  title: string;
};

type TargetDbRow = {
  channel_id: string;
  long_videos_target: number | string | null;
  short_videos_target: number | string | null;
  created_by?: string | null;
};

const TARGET_SELECT_COLUMNS = [
  "channel_id",
  "short_videos_target",
  "long_videos_target",
  "created_by"
].join(",");

export async function getDailyPublishingTargetDashboardData({
  actualRows = [],
  channels
}: {
  actualRows?: DailyMetricsVideoRow[];
  channels: DailyTargetChannel[];
}): Promise<DailyPublishingTargetDashboardData> {
  const targetRows = await getDailyTargetRows(channels.map((channel) => channel.channelId));
  const targetRowsByChannelId = new Map(targetRows.map((row) => [row.channel_id, row]));
  const actualsByChannelId = getActualsByChannelId(actualRows);

  return {
    rows: channels.map((channel) => ({
      actual: actualsByChannelId.get(channel.channelId) ?? createEmptyActuals(),
      channelId: channel.channelId,
      channelTitle: channel.title,
      target: mapTargetDbRow(targetRowsByChannelId.get(channel.channelId))
    })),
    schemaReady: true
  };
}

export async function getDailyPublishingTargetDashboardDataSafe(input: {
  actualRows?: DailyMetricsVideoRow[];
  channels: DailyTargetChannel[];
}): Promise<DailyPublishingTargetDashboardData> {
  try {
    return await getDailyPublishingTargetDashboardData(input);
  } catch (error) {
    if (isMissingDailyTargetTableError(error)) {
      return {
        errorMessage: "Apply the daily publishing targets schema before saving daily targets.",
        rows: [],
        schemaReady: false
      };
    }

    throw error;
  }
}

export async function saveDailyPublishingTargets({
  rows,
  username
}: {
  rows: SaveDailyPublishingTargetInputRow[];
  username: string;
}) {
  const supabase = createSupabaseAdminClient();
  const channelIds = rows.map((row) => row.channelId);
  const existingRows = await getDailyTargetRows(channelIds);
  const existingRowsByChannelId = new Map(existingRows.map((row) => [row.channel_id, row]));
  const savedAt = new Date().toISOString();
  const payload = rows.map((row) => {
    const existingRow = existingRowsByChannelId.get(row.channelId);

    return {
      channel_id: row.channelId,
      short_videos_target: normalizeDailyPublishingTargetValue(row.shortVideosTarget),
      long_videos_target: normalizeDailyPublishingTargetValue(row.longVideosTarget),
      created_by: existingRow?.created_by ?? username,
      updated_by: username,
      updated_at: savedAt
    };
  });

  if (payload.length === 0) return;

  const { error } = await supabase
    .from("youtube_daily_channel_targets")
    .upsert(payload, { onConflict: "channel_id" });

  if (error) throw error;
}

export function normalizeDailyPublishingTargetValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Daily publishing targets must be whole numbers greater than or equal to 0.");
  }

  return parsed;
}

async function getDailyTargetRows(channelIds: string[]) {
  if (channelIds.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("youtube_daily_channel_targets")
    .select(TARGET_SELECT_COLUMNS)
    .in("channel_id", channelIds);

  if (error) throw error;

  return (data ?? []) as TargetDbRow[];
}

function mapTargetDbRow(row: TargetDbRow | undefined): DailyPublishingTargetValues {
  if (!row) {
    return {
      longVideos: null,
      shortVideos: null
    };
  }

  return {
    longVideos: toNullableNumber(row.long_videos_target),
    shortVideos: toNullableNumber(row.short_videos_target)
  };
}

function getActualsByChannelId(rows: DailyMetricsVideoRow[]) {
  const actualsByChannelId = new Map<string, DailyPublishingTargetActuals>();

  for (const row of rows) {
    const actuals = actualsByChannelId.get(row.channelId) ?? createEmptyActuals();
    if (row.contentType === "long") {
      actuals.longVideos += 1;
    } else if (row.contentType === "short") {
      actuals.shortVideos += 1;
    }

    actualsByChannelId.set(row.channelId, actuals);
  }

  return actualsByChannelId;
}

function createEmptyActuals(): DailyPublishingTargetActuals {
  return {
    longVideos: 0,
    shortVideos: 0
  };
}

function isMissingDailyTargetTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("youtube_daily_channel_targets") &&
    (message.includes("does not exist") || message.includes("no such table"))
  );
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
