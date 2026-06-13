"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type YoutubeCompareSyncActionsProps = {
  channelId: string;
  primaryStartDate: string;
  primaryEndDate: string;
  comparisonStartDate: string;
  comparisonEndDate: string;
  disabled?: boolean;
};

type SyncPayload = {
  channelsSynced?: number;
  videosSynced?: number;
  metricsRowsSynced?: number;
  warnings?: string[];
  error?: string;
};

export function YoutubeCompareSyncActions({
  channelId,
  primaryStartDate,
  primaryEndDate,
  comparisonStartDate,
  comparisonEndDate,
  disabled = false
}: YoutubeCompareSyncActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const runSync = () => {
    startTransition(async () => {
      setMessage(null);

      const ranges = [
        { label: "Range 1", startDate: primaryStartDate, endDate: primaryEndDate },
        { label: "Range 2", startDate: comparisonStartDate, endDate: comparisonEndDate }
      ];
      const uniqueRanges = ranges.filter(
        (range, index) =>
          ranges.findIndex((candidate) => candidate.startDate === range.startDate && candidate.endDate === range.endDate) ===
          index
      );
      let rowsSynced = 0;
      let videosSynced = 0;
      let channelsSynced = 0;
      let warnings = 0;

      for (const range of uniqueRanges) {
        setMessage(`Syncing ${range.label}...`);
        const response = await fetch("/api/youtube/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channelId,
            startDate: range.startDate,
            endDate: range.endDate
          })
        });
        const payload = (await response.json()) as SyncPayload;

        if (!response.ok) {
          setMessage(payload.error ?? `${range.label} sync failed.`);
          return;
        }

        rowsSynced += payload.metricsRowsSynced ?? 0;
        videosSynced += payload.videosSynced ?? 0;
        channelsSynced += payload.channelsSynced ?? 0;
        warnings += payload.warnings?.length ?? 0;
      }

      setMessage(
        `${channelsSynced} channel sync(s), ${videosSynced} videos, ${rowsSynced} metric rows synced.${
          warnings ? ` ${warnings} warning(s).` : ""
        }`
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <Button className="h-11 rounded-md" onClick={runSync} disabled={disabled || isPending} type="button">
        {isPending ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
        Sync selected ranges
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
