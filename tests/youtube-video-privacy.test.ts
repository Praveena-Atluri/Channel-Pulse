import assert from "node:assert/strict";
import test from "node:test";

import {
  isPublicVideoPrivacyStatus,
  normalizeVideoPrivacyStatus
} from "../lib/youtube-video-privacy.ts";

test("normalizes YouTube video privacy statuses", () => {
  assert.equal(normalizeVideoPrivacyStatus("public"), "public");
  assert.equal(normalizeVideoPrivacyStatus("private"), "private");
  assert.equal(normalizeVideoPrivacyStatus("unlisted"), "unlisted");
  assert.equal(normalizeVideoPrivacyStatus("PUBLIC"), "unknown");
  assert.equal(normalizeVideoPrivacyStatus(null), "unknown");
});

test("only treats public videos as public", () => {
  assert.equal(isPublicVideoPrivacyStatus("public"), true);
  assert.equal(isPublicVideoPrivacyStatus("private"), false);
  assert.equal(isPublicVideoPrivacyStatus("unlisted"), false);
  assert.equal(isPublicVideoPrivacyStatus("unknown"), false);
  assert.equal(isPublicVideoPrivacyStatus(undefined), false);
});
