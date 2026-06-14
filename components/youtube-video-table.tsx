"use client";

import { useMemo, useState } from "react";
import { ChevronDown, LineChart, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type YoutubeVideoTableRow = {
  videoId: string;
  title: string;
  value: string;
  subvalue: string;
  meta: string[];
};

type YoutubeVideoTableProps = {
  title: string;
  rows: YoutubeVideoTableRow[];
  ascending?: boolean;
  unavailableMessage?: string | null;
};

const INITIAL_ROW_COUNT = 10;
const ROW_INCREMENT = 10;

export function YoutubeVideoTable({
  title,
  rows,
  ascending = false,
  unavailableMessage
}: YoutubeVideoTableProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROW_COUNT);
  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const remainingCount = Math.max(0, rows.length - visibleRows.length);
  const Icon = ascending ? TrendingDown : LineChart;

  return (
    <Card className="youtube-video-table shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="youtube-video-table-content space-y-3">
        {unavailableMessage ? (
          <p className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground">{unavailableMessage}</p>
        ) : rows.length > 0 ? (
          <>
            {visibleRows.map((row, index) => (
              <div
                key={row.videoId}
                className="youtube-video-row grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border bg-background/70 p-3"
              >
                <div className="youtube-video-rank flex size-8 items-center justify-center rounded-md bg-secondary text-xs font-black">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <a
                    href={getVideoUrl(row.videoId)}
                    target="_blank"
                    rel="noreferrer"
                    className="youtube-video-title block truncate text-sm font-bold hover:text-primary"
                  >
                    {row.title}
                  </a>
                  <div className="youtube-video-meta mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {row.meta.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="youtube-video-value text-sm font-black">{row.value}</p>
                  <p className="youtube-video-subvalue text-xs text-muted-foreground">{row.subvalue}</p>
                </div>
              </div>
            ))}

            {remainingCount > 0 ? (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Showing {visibleRows.length} of {rows.length}
                </p>
                <Button
                  className="h-10 rounded-md"
                  onClick={() => setVisibleCount((count) => Math.min(count + ROW_INCREMENT, rows.length))}
                  type="button"
                  variant="secondary"
                >
                  <ChevronDown className="mr-2 size-4" />
                  Show {Math.min(ROW_INCREMENT, remainingCount)} more
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground">
            No videos found for this filter.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
