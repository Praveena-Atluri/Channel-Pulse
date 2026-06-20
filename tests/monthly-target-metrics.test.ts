import assert from "node:assert/strict";
import { test } from "node:test";

import {
  aggregateTargetProgressRows,
  calculatePercentTarget,
  createEmptyActualValues,
  createEmptyTargetValues,
  getEditableTargetMonths,
  getTargetBaselineCutoffMonth,
  getTargetBaselineMonth,
  normalizeTargetValue
} from "../lib/monthly-target-metrics.ts";

test("builds editable current and upcoming target months", () => {
  assert.deepEqual(getEditableTargetMonths(new Date("2026-06-15T08:00:00.000Z")), ["2026-06", "2026-07"]);
});

test("uses the previous completed month as the percent baseline", () => {
  const now = new Date("2026-06-15T08:00:00.000Z");

  assert.equal(getTargetBaselineMonth("2026-06", now), "2026-05");
  assert.equal(getTargetBaselineMonth("2026-07", now), "2026-05");
});

test("searches baseline data before the selected or current month", () => {
  const now = new Date("2026-06-15T08:00:00.000Z");

  assert.equal(getTargetBaselineCutoffMonth("2026-06", now), "2026-06");
  assert.equal(getTargetBaselineCutoffMonth("2026-07", now), "2026-06");
});

test("calculates percent targets with metric-specific rounding", () => {
  assert.equal(calculatePercentTarget("shortViews", 1234, 10), 1357);
  assert.equal(calculatePercentTarget("shortVideosToPublish", 12, 25), 15);
  assert.equal(calculatePercentTarget("watchHours", 12.34, 15), 14.2);
  assert.equal(calculatePercentTarget("netSubscribers", 7, 50), 11);
});

test("normalizes blank targets as null and rejects invalid values", () => {
  assert.equal(normalizeTargetValue("longViews", ""), null);
  assert.equal(normalizeTargetValue("watchHours", "10.24"), 10.2);
  assert.throws(() => normalizeTargetValue("longVideosToPublish", "-1"), /non-negative/);
});

test("aggregates progress using only channels with targets for each metric", () => {
  const firstActual = createEmptyActualValues();
  const firstTarget = createEmptyTargetValues();
  firstActual.shortViews = 120;
  firstActual.longViews = 500;
  firstActual.shortVideosToPublish = 3;
  firstTarget.shortViews = 200;
  firstTarget.shortVideosToPublish = 5;

  const secondActual = createEmptyActualValues();
  const secondTarget = createEmptyTargetValues();
  secondActual.shortViews = 300;
  secondActual.longViews = 100;
  secondActual.shortVideosToPublish = 4;
  secondTarget.longViews = 400;
  secondTarget.shortVideosToPublish = 10;

  const aggregate = aggregateTargetProgressRows([
    { actual: firstActual, target: firstTarget },
    { actual: secondActual, target: secondTarget }
  ]);

  assert.equal(aggregate.target.shortViews, 200);
  assert.equal(aggregate.actual.shortViews, 120);
  assert.equal(aggregate.progress.shortViews.percent, 60);
  assert.equal(aggregate.target.longViews, 400);
  assert.equal(aggregate.actual.longViews, 100);
  assert.equal(aggregate.progress.longViews.remaining, 300);
  assert.equal(aggregate.target.shortVideosToPublish, 15);
  assert.equal(aggregate.actual.shortVideosToPublish, 7);
  assert.equal(aggregate.progress.shortVideosToPublish.remaining, 8);
});
