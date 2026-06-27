import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getLoginSyncScope,
  isLoginSyncFresh
} from "../lib/login-sync-utils.ts";

test("treats login sync state as fresh for less than one hour", () => {
  const now = new Date("2026-06-27T06:00:00.000Z");

  assert.equal(isLoginSyncFresh("2026-06-27T05:00:01.000Z", now), true);
  assert.equal(isLoginSyncFresh("2026-06-27T05:00:00.000Z", now), false);
  assert.equal(isLoginSyncFresh("2026-06-27T04:59:59.000Z", now), false);
  assert.equal(isLoginSyncFresh(null, now), false);
  assert.equal(isLoginSyncFresh("not-a-date", now), false);
});

test("builds a stable all-channel login sync scope", () => {
  assert.equal(getLoginSyncScope(["UC2", "UC1"]), getLoginSyncScope(["UC1", "UC2"]));
  assert.notEqual(getLoginSyncScope(["UC1"]), getLoginSyncScope(["UC1", "UC2"]));
});
