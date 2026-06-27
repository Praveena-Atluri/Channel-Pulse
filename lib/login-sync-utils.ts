export const LOGIN_SYNC_INTERVAL_MS = 60 * 60 * 1000;

export function isLoginSyncFresh(lastSyncedAt: string | null | undefined, now = new Date()) {
  if (!lastSyncedAt) return false;

  const syncedAt = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(syncedAt)) return false;

  return now.getTime() - syncedAt < LOGIN_SYNC_INTERVAL_MS;
}

export function getLoginSyncScope(channelIds: string[]) {
  return `all-focused-channels:${hashValues(channelIds)}`;
}

function hashValues(values: string[]) {
  let hash = 5381;
  for (const value of [...values].sort().join("|")) {
    hash = ((hash << 5) + hash + value.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}
