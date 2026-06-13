export const FOCUSED_YOUTUBE_CHANNELS = [
  { title: "TeluguOne", channelId: "UCXjhJbviBl0M4JAC3cxDXqA" },
  { title: "BhaktiOne", channelId: "UChOHAoVKJ3coNFomdN-evBA" },
  { title: "Tone News", channelId: "UCEOx1MOSAw9k0vix1Ay4Ehw" },
  { title: "TeluguOne Originals", channelId: "UC3G6CyzDjtFofutzyjpRCew" },
  { title: "Navvula TV", channelId: "UCzVPlhwpWSrvTuGJ9-BP8vA" },
  { title: "Old Songs Telugu", channelId: "UCEII-OnIwBOdyTpvYcAjEIA" },
  { title: "TeluguOne Cinema", channelId: "UClil81xNKxtTCdRmLs5qB_g" },
  { title: "TeluguOne Music", channelId: "UCbaXz-cMRa1Kx6gNmEQgJoQ" },
  { title: "TeluguOne Health", channelId: "UCVFfR4eOjEdcj1ic1N21CDw" },
  { title: "Tone Agri", channelId: "UCPu0e0aMOqFSHQ94abhpUfw" },
  { title: "Tone Academy", channelId: "UCHtsA_T0_R9TW9oFI3I6qBA" },
  { title: "TeluguOne Food", channelId: "UCkld6KqjsC8mkfoP15sZCvw" },
  { title: "Tone Fashion", channelId: "UCv6uNOhfhOa9agcrcJppB2Q" },
  { title: "Naveena Column", channelId: "UC55glYJiK5lhOKC_xnlkSnQ" }
] as const;

const FOCUSED_CHANNELS_BY_ID = new Map<string, { title: string; channelId: string; index: number }>(
  FOCUSED_YOUTUBE_CHANNELS.map((channel, index) => [channel.channelId, { ...channel, index }])
);

const FOCUSED_CHANNEL_TITLE_KEYS = new Set(FOCUSED_YOUTUBE_CHANNELS.map((channel) => normalizeYouTubeChannelTitle(channel.title)));

export function filterFocusedYouTubeChannels<T extends { channelId: string; title: string }>(channels: T[]) {
  return channels
    .filter((channel) => FOCUSED_CHANNELS_BY_ID.has(channel.channelId))
    .map((channel) => ({
      ...channel,
      title: FOCUSED_CHANNELS_BY_ID.get(channel.channelId)?.title ?? channel.title
    }))
    .sort((first, second) => getFocusedChannelOrder(first.channelId) - getFocusedChannelOrder(second.channelId));
}

export function isFocusedYouTubeChannelId(channelId: string) {
  return FOCUSED_CHANNELS_BY_ID.has(channelId);
}

export function isFocusedYouTubeChannelTitle(title: string) {
  return FOCUSED_CHANNEL_TITLE_KEYS.has(normalizeYouTubeChannelTitle(title));
}

export function normalizeYouTubeChannelTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getFocusedChannelOrder(channelId: string) {
  return FOCUSED_CHANNELS_BY_ID.get(channelId)?.index ?? Number.MAX_SAFE_INTEGER;
}
