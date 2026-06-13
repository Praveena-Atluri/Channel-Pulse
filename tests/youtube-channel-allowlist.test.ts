import assert from "node:assert/strict";
import test from "node:test";

import {
  FOCUSED_YOUTUBE_CHANNELS,
  filterFocusedYouTubeChannels,
  isFocusedYouTubeChannelId,
  isFocusedYouTubeChannelTitle,
  normalizeYouTubeChannelTitle
} from "../lib/youtube-channel-allowlist.ts";

test("normalizes focused YouTube channel titles", () => {
  assert.equal(normalizeYouTubeChannelTitle("TOne News"), normalizeYouTubeChannelTitle("Tone News"));
  assert.equal(isFocusedYouTubeChannelTitle("TeluguOne Music"), true);
  assert.equal(isFocusedYouTubeChannelId("UCXjhJbviBl0M4JAC3cxDXqA"), true);
  assert.equal(isFocusedYouTubeChannelTitle("Unrelated CMS Channel"), false);
  assert.equal(isFocusedYouTubeChannelId("UC-unrelated"), false);
});

test("filters CMS channels by stored channel IDs and uses management labels", () => {
  const channels = [
    { channelId: "UCzVPlhwpWSrvTuGJ9-BP8vA", title: "NavvulaTV - Telugu Comedy Scenes" },
    { channelId: "UCXjhJbviBl0M4JAC3cxDXqA", title: "TeluguOne" },
    { channelId: "3", title: "24 / 7 News TV" },
    { channelId: "UCEII-OnIwBOdyTpvYcAjEIA", title: "Old Telugu Songs" }
  ];

  assert.deepEqual(filterFocusedYouTubeChannels(channels).map((channel) => channel.title), [
    "TeluguOne",
    "Navvula TV",
    "Old Songs Telugu"
  ]);
  assert.equal(FOCUSED_YOUTUBE_CHANNELS.length, 14);
});
