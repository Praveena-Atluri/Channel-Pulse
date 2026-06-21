"use client";

import { LoaderCircle, Save, Search, Target } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { DailyPublishingTargetDashboardRow } from "@/lib/daily-targets";
import { cn } from "@/lib/utils";

type DailyPublishingTargetsDashboardProps = {
  errorMessage?: string;
  rows: DailyPublishingTargetDashboardRow[];
  schemaReady: boolean;
  selectedDateLabel?: string;
  showActuals?: boolean;
};

type EditableDailyTargetRow = Omit<DailyPublishingTargetDashboardRow, "target"> & {
  target: {
    longVideos: string;
    shortVideos: string;
  };
};

export function DailyPublishingTargetsDashboard({
  errorMessage,
  rows: initialRows,
  schemaReady,
  selectedDateLabel,
  showActuals = false
}: DailyPublishingTargetsDashboardProps) {
  const [rows, setRows] = useState<EditableDailyTargetRow[]>(() => toEditableRows(initialRows));
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState(errorMessage ?? "");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter(
      (row) =>
        row.channelTitle.toLowerCase().includes(query) || row.channelId.toLowerCase().includes(query)
    );
  }, [rows, search]);
  const totals = useMemo(() => getTotals(rows), [rows]);
  const canSave = schemaReady && rows.length > 0 && !isSaving;

  const updateRowTarget = (
    channelId: string,
    metric: keyof EditableDailyTargetRow["target"],
    value: string
  ) => {
    const normalizedValue = value.replace(/[^\d]/g, "");
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.channelId === channelId
          ? {
              ...row,
              target: {
                ...row.target,
                [metric]: normalizedValue
              }
            }
          : row
      )
    );
    setMessage("");
    setSaveError("");
  };

  const saveTargets = async () => {
    setIsSaving(true);
    setMessage("");
    setSaveError("");

    try {
      const response = await fetch("/api/targets/daily", {
        body: JSON.stringify({
          rows: rows.map((row) => ({
            channelId: row.channelId,
            longVideosTarget: row.target.longVideos,
            shortVideosTarget: row.target.shortVideos
          }))
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PUT"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save daily targets.");
      }

      setMessage(`Daily targets saved for ${rows.length} channel${rows.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save daily targets.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-black">
            <Target className="size-4 text-primary" />
            Daily Publishing Targets
          </div>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Set one long-video and short-video target per channel. These targets apply every day.
          </p>
        </div>
        <Button className="h-10 gap-2 rounded-md md:self-start" disabled={!canSave} onClick={saveTargets} type="button">
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isSaving ? "Saving" : "Save Daily Targets"}
        </Button>
      </div>

      {!schemaReady ? (
        <div className="rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
          {errorMessage ?? "Apply the daily publishing targets schema before saving daily targets."}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-md border border-emerald-500/50 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100">
          {message}
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          {saveError}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TargetStatCard label="Long target/day" value={formatNullableTotal(totals.longTarget, totals.longTargetCount)} />
        <TargetStatCard label="Short target/day" value={formatNullableTotal(totals.shortTarget, totals.shortTargetCount)} />
        <TargetStatCard label="Channels with targets" value={`${totals.channelsWithTargets}/${rows.length}`} />
        {showActuals ? (
          <TargetStatCard
            label={selectedDateLabel ? `Actual on ${selectedDateLabel}` : "Actual selected day"}
            value={`${formatNumber(totals.longActual)} long · ${formatNumber(totals.shortActual)} short`}
          />
        ) : null}
      </div>

      <div className="rounded-md border bg-card/60">
        <div className="grid gap-3 border-b p-3 md:grid-cols-[1fr_auto] md:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm font-semibold text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search channels"
              type="search"
              value={search}
            />
          </label>
          <div className="text-sm font-bold text-muted-foreground">
            {filteredRows.length}/{rows.length} channels
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-black">Channel</th>
                <th className="px-3 py-2 text-right font-black">Long videos/day</th>
                <th className="px-3 py-2 text-right font-black">Short videos/day</th>
                {showActuals ? <th className="px-3 py-2 text-right font-black">Long actual</th> : null}
                {showActuals ? <th className="px-3 py-2 text-right font-black">Short actual</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className="border-t" key={row.channelId}>
                  <td className="px-3 py-2 align-middle">
                    <div className="font-bold">{row.channelTitle}</div>
                  </td>
                  <TargetInput
                    label={`${row.channelTitle} long videos per day`}
                    value={row.target.longVideos}
                    onChange={(value) => updateRowTarget(row.channelId, "longVideos", value)}
                  />
                  <TargetInput
                    label={`${row.channelTitle} short videos per day`}
                    value={row.target.shortVideos}
                    onChange={(value) => updateRowTarget(row.channelId, "shortVideos", value)}
                  />
                  {showActuals ? (
                    <td
                      className={cn(
                        "px-3 py-2 text-right align-middle font-black tabular-nums",
                        getActualClass(row.actual.longVideos, row.target.longVideos)
                      )}
                    >
                      {formatNumber(row.actual.longVideos)}
                    </td>
                  ) : null}
                  {showActuals ? (
                    <td
                      className={cn(
                        "px-3 py-2 text-right align-middle font-black tabular-nums",
                        getActualClass(row.actual.shortVideos, row.target.shortVideos)
                      )}
                    >
                      {formatNumber(row.actual.shortVideos)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 ? (
          <div className="border-t p-4 text-sm font-semibold text-muted-foreground">No channels match your search.</div>
        ) : null}
      </div>
    </div>
  );
}

function TargetInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <td className="px-3 py-2 text-right align-middle">
      <input
        aria-label={label}
        className="h-10 w-28 rounded-md border bg-background px-3 text-right text-sm font-black tabular-nums text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring"
        inputMode="numeric"
        min={0}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Not set"
        type="text"
        value={value}
      />
    </td>
  );
}

function TargetStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/70 p-3">
      <div className="text-xs font-black uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function toEditableRows(rows: DailyPublishingTargetDashboardRow[]): EditableDailyTargetRow[] {
  return rows.map((row) => ({
    ...row,
    target: {
      longVideos: stringifyTarget(row.target.longVideos),
      shortVideos: stringifyTarget(row.target.shortVideos)
    }
  }));
}

function stringifyTarget(value: number | null) {
  return value === null ? "" : String(value);
}

function getTotals(rows: EditableDailyTargetRow[]) {
  return rows.reduce(
    (totals, row) => {
      const longTarget = parseTarget(row.target.longVideos);
      const shortTarget = parseTarget(row.target.shortVideos);

      if (longTarget !== null) totals.longTarget += longTarget;
      if (longTarget !== null) totals.longTargetCount += 1;
      if (shortTarget !== null) {
        totals.shortTarget += shortTarget;
        totals.shortTargetCount += 1;
      }
      if (longTarget !== null || shortTarget !== null) totals.channelsWithTargets += 1;
      totals.longActual += row.actual.longVideos;
      totals.shortActual += row.actual.shortVideos;

      return totals;
    },
    {
      channelsWithTargets: 0,
      longActual: 0,
      longTarget: 0,
      longTargetCount: 0,
      shortActual: 0,
      shortTarget: 0,
      shortTargetCount: 0
    }
  );
}

function parseTarget(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getActualClass(actual: number, targetValue: string) {
  const target = parseTarget(targetValue);
  if (target === null) return "text-muted-foreground";
  return actual >= target ? "text-emerald-600 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300";
}

function formatNullableTotal(value: number, targetCount: number) {
  return targetCount > 0 ? formatNumber(value) : "Not set";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}
