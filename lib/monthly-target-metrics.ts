export const MONTHLY_TARGET_METRICS = [
  {
    key: "shortViews",
    label: "Short views",
    dbColumn: "short_views_target",
    decimals: 0
  },
  {
    key: "longViews",
    label: "Long views",
    dbColumn: "long_views_target",
    decimals: 0
  },
  {
    key: "shortVideosToPublish",
    label: "Short videos to publish",
    dbColumn: "short_videos_target",
    decimals: 0
  },
  {
    key: "longVideosToPublish",
    label: "Long videos to publish",
    dbColumn: "long_videos_target",
    decimals: 0
  },
  {
    key: "watchHours",
    label: "Watch hours",
    dbColumn: "watch_hours_target",
    decimals: 1
  },
  {
    key: "netSubscribers",
    label: "Net subscribers",
    dbColumn: "net_subscribers_target",
    decimals: 0
  }
] as const;

export const TARGET_PERCENT_PRESETS = [5, 10, 15, 20, 25, 50] as const;

export type MonthlyTargetMetric = (typeof MONTHLY_TARGET_METRICS)[number]["key"];

export type MonthlyTargetValues = Record<MonthlyTargetMetric, number | null>;
export type MonthlyActualValues = Record<MonthlyTargetMetric, number>;

export type MonthlyTargetProgress = Record<
  MonthlyTargetMetric,
  {
    actual: number;
    percent: number | null;
    remaining: number | null;
    target: number | null;
  }
>;

export type MonthlyTargetProgressInput = {
  actual: MonthlyActualValues;
  target: MonthlyTargetValues;
};

const METRIC_DEFINITIONS_BY_KEY = new Map(MONTHLY_TARGET_METRICS.map((metric) => [metric.key, metric]));

export function createEmptyTargetValues(): MonthlyTargetValues {
  return {
    shortViews: null,
    longViews: null,
    shortVideosToPublish: null,
    longVideosToPublish: null,
    watchHours: null,
    netSubscribers: null
  };
}

export function createEmptyActualValues(): MonthlyActualValues {
  return {
    shortViews: 0,
    longViews: 0,
    shortVideosToPublish: 0,
    longVideosToPublish: 0,
    watchHours: 0,
    netSubscribers: 0
  };
}

export function getEditableTargetMonths(now = new Date()) {
  const currentMonth = getCurrentMonth(now);
  const [year, month] = currentMonth.split("-").map(Number);
  const upcomingMonth = formatMonth(new Date(Date.UTC(year, month, 1)));

  return [currentMonth, upcomingMonth];
}

export function normalizeEditableTargetMonth(value: string | null | undefined, now = new Date()) {
  const months = getEditableTargetMonths(now);
  return value && months.includes(value) ? value : months[0];
}

export function isEditableTargetMonth(value: string, now = new Date()) {
  return getEditableTargetMonths(now).includes(value);
}

export function getTargetBaselineMonth(targetMonth: string, now = new Date()) {
  const currentMonth = getCurrentMonth(now);
  return getPreviousMonth(compareMonths(targetMonth, currentMonth) <= 0 ? targetMonth : currentMonth);
}

export function getTargetBaselineCutoffMonth(targetMonth: string, now = new Date()) {
  const currentMonth = getCurrentMonth(now);
  return compareMonths(targetMonth, currentMonth) <= 0 ? targetMonth : currentMonth;
}

export function calculatePercentTarget(metric: MonthlyTargetMetric, baseline: number, percent: number) {
  return roundTargetValue(metric, baseline * (1 + percent / 100));
}

export function normalizeTargetValue(metric: MonthlyTargetMetric, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${getMetricLabel(metric)} target must be a non-negative number.`);
  }

  return roundTargetValue(metric, parsed);
}

export function roundTargetValue(metric: MonthlyTargetMetric, value: number) {
  const definition = METRIC_DEFINITIONS_BY_KEY.get(metric);
  const decimals = definition?.decimals ?? 0;
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

export function buildTargetProgress({ actual, target }: MonthlyTargetProgressInput): MonthlyTargetProgress {
  return Object.fromEntries(
    MONTHLY_TARGET_METRICS.map((metric) => {
      const key = metric.key;
      const targetValue = target[key];
      const actualValue = actual[key];

      return [
        key,
        {
          actual: actualValue,
          percent: calculateProgressPercent(actualValue, targetValue),
          remaining: targetValue === null ? null : roundTargetValue(key, Math.max(0, targetValue - actualValue)),
          target: targetValue
        }
      ];
    })
  ) as MonthlyTargetProgress;
}

export function aggregateTargetProgressRows(rows: MonthlyTargetProgressInput[]) {
  const aggregate = {
    actual: createEmptyActualValues(),
    target: createEmptyTargetValues()
  };

  for (const metric of MONTHLY_TARGET_METRICS) {
    let hasTarget = false;

    for (const row of rows) {
      const targetValue = row.target[metric.key];
      if (targetValue === null) continue;

      hasTarget = true;
      aggregate.target[metric.key] = (aggregate.target[metric.key] ?? 0) + targetValue;
      aggregate.actual[metric.key] += row.actual[metric.key];
    }

    if (!hasTarget) {
      aggregate.target[metric.key] = null;
      aggregate.actual[metric.key] = 0;
    }
  }

  return {
    ...aggregate,
    progress: buildTargetProgress(aggregate)
  };
}

export function hasAnyTargetValue(target: MonthlyTargetValues) {
  return MONTHLY_TARGET_METRICS.some((metric) => target[metric.key] !== null);
}

export function getMetricLabel(metric: MonthlyTargetMetric) {
  return METRIC_DEFINITIONS_BY_KEY.get(metric)?.label ?? metric;
}

function calculateProgressPercent(actual: number, target: number | null) {
  if (target === null) return null;
  if (target <= 0) return actual >= target ? 100 : 0;

  return Math.round((actual / target) * 1000) / 10;
}

function compareMonths(left: string, right: string) {
  return left.localeCompare(right);
}

function getCurrentMonth(now: Date) {
  return formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

function formatMonth(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return formatMonth(new Date(Date.UTC(year, monthNumber - 2, 1)));
}
