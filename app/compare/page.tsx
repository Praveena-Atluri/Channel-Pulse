import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  DollarSign,
  Eye,
  Film,
  LineChart,
  PlaySquare,
  Users,
  Youtube
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { YoutubeChannelSelect } from "@/components/youtube-channel-select";
import { YoutubeCompareSyncActions } from "@/components/youtube-compare-sync-actions";
import { YoutubePdfDownloadButton } from "@/components/youtube-pdf-download-button";
import { YoutubeSubmitButton } from "@/components/youtube-submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccountViewRevenue, getAccountChannelAccess, isAuthConfigured } from "@/lib/auth";
import { requireCurrentAccount } from "@/lib/server-auth";
import { isYouTubeCmsConfigured } from "@/lib/youtube-cms-api";
import {
  getYoutubeComparisonDashboard,
  normalizeYoutubeComparisonFilters,
  type ComparisonDelta,
  type ContentTypeFilter,
  type VideoPerformanceRow
} from "@/lib/youtube-performance";
import { type MetricTotals } from "@/lib/youtube-performance-utils";

export const dynamic = "force-dynamic";

type YoutubeComparisonPageProps = {
  searchParams: Promise<{
    channel?: string;
    contentType?: string;
    primaryStartDate?: string;
    primaryEndDate?: string;
    comparisonStartDate?: string;
    comparisonEndDate?: string;
  }>;
};

export default async function YoutubeComparisonPage({ searchParams }: YoutubeComparisonPageProps) {
  const params = await searchParams;
  const account = await requireCurrentAccount("/compare");
  const canViewRevenue = canAccountViewRevenue(account);
  const filters = normalizeYoutubeComparisonFilters(params);
  const dashboard = await getYoutubeComparisonDashboard(filters, getAccountChannelAccess(account));
  const cmsConfigured = isYouTubeCmsConfigured();
  const selectedChannel = dashboard.channels.find((channel) => channel.channelId === dashboard.filters.channelId);
  const hasSelectedChannel = dashboard.channels.some((channel) => channel.channelId === dashboard.filters.channelId);
  const canEvaluateDataCoverage = dashboard.schemaReady && cmsConfigured;
  const hasComparisonData = canEvaluateDataCoverage && dashboard.primary.hasData && dashboard.comparison.hasData;

  return (
    <main className="youtube-report-page min-h-screen p-4 md:p-6">
      <div className="youtube-report-shell mx-auto flex max-w-7xl flex-col gap-4">
        <header className="youtube-report-header flex flex-col gap-4 rounded-lg border bg-card/95 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-3 text-red-600 dark:text-red-400">
              <Youtube className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black">Channel Pulse</h1>
                <Badge variant="secondary" className="rounded-md">
                  CMS Analytics
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Range 1: {formatRangeLabel(dashboard.primary.startDate, dashboard.primary.endDate)} compared with Range 2:{" "}
                {formatRangeLabel(dashboard.comparison.startDate, dashboard.comparison.endDate)}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {selectedChannel?.title ?? "Selected channel"} | {contentTypeLabel(dashboard.filters.contentType)}
              </p>
            </div>
          </div>

          <div className="youtube-print-hidden flex items-center gap-2">
            {hasComparisonData ? (
              <YoutubePdfDownloadButton
                filename={`youtube-compare-${dashboard.primary.startDate}-to-${dashboard.primary.endDate}-vs-${dashboard.comparison.startDate}-to-${dashboard.comparison.endDate}-${slugify(selectedChannel?.title ?? "channel")}`}
              />
            ) : null}
            <Link
              href="/"
              className={buttonVariants({ variant: "secondary", className: "h-10 rounded-md" })}
            >
              Home
            </Link>
            <LogoutButton />
            <ThemeToggle />
          </div>
        </header>

        {!dashboard.schemaReady ? (
          <StatusPanel
            title="Analytics schema is not ready"
            message="Apply the Channel Pulse Supabase schema, then sync the date ranges you want to compare."
          />
        ) : null}

        {!cmsConfigured ? (
          <StatusPanel
            title="YouTube CMS OAuth is not configured"
            message="Add the Google OAuth and YouTube CMS environment values before running a comparison sync."
          />
        ) : null}

        {!isAuthConfigured() ? (
          <StatusPanel
            title="Dashboard login is not enabled"
            message="Configure at least one Channel Pulse account before using this management dashboard."
          />
        ) : null}

        <section className="youtube-print-hidden rounded-lg border bg-card/95 p-4 shadow-sm">
          <form className="grid gap-4" action="/compare" method="get">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DateInput label="Range 1 start" name="primaryStartDate" value={dashboard.filters.primaryStartDate} />
              <DateInput label="Range 1 end" name="primaryEndDate" value={dashboard.filters.primaryEndDate} />
              <DateInput label="Range 2 start" name="comparisonStartDate" value={dashboard.filters.comparisonStartDate} />
              <DateInput label="Range 2 end" name="comparisonEndDate" value={dashboard.filters.comparisonEndDate} />
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(18rem,1.5fr)_minmax(12rem,0.8fr)_auto]">
              <YoutubeChannelSelect
                canRefreshChannels={account.role === "admin"}
                channels={dashboard.channels}
                disabled={!dashboard.schemaReady || !cmsConfigured}
                name="channel"
                value={dashboard.filters.channelId}
              />
              <FilterSelect label="Format" name="contentType" value={dashboard.filters.contentType}>
                <option value="all">All formats</option>
                <option value="short">Short form</option>
                <option value="long">Long form</option>
                <option value="live">Live</option>
                <option value="unknown">Unknown</option>
              </FilterSelect>

              <div className="flex items-end">
                <YoutubeSubmitButton />
              </div>
            </div>
          </form>
        </section>

        {canEvaluateDataCoverage && !hasComparisonData ? (
          <>
            <StatusPanel
              title="Sync both comparison ranges"
              message="Both selected date ranges need synced channel data before the comparison can be shown."
            />
            <div className="youtube-print-hidden">
              <SyncPanel
                disabled={!dashboard.schemaReady || !cmsConfigured || !hasSelectedChannel}
                filters={dashboard.filters}
              />
            </div>
          </>
        ) : null}

        {hasComparisonData ? (
          <>
            <section className="youtube-report-kpi-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ComparisonMetricCard
                title="Views"
                rangeOneValue={formatCompactNumber(dashboard.deltas.views.current)}
                rangeTwoValue={formatCompactNumber(dashboard.deltas.views.previous)}
                delta={dashboard.deltas.views}
                deltaLabel={formatSignedCompactNumber(dashboard.deltas.views.absolute)}
                icon={Eye}
              />
              <ComparisonMetricCard
                title="Watch Time"
                rangeOneValue={`${formatCompactNumber(dashboard.deltas.watchTime.current / 60)} hrs`}
                rangeTwoValue={`${formatCompactNumber(dashboard.deltas.watchTime.previous / 60)} hrs`}
                delta={dashboard.deltas.watchTime}
                deltaLabel={`${formatSignedCompactNumber(dashboard.deltas.watchTime.absolute / 60)} hrs`}
                icon={Clock3}
              />
              <ComparisonMetricCard
                title="Subscribers"
                rangeOneValue={formatSignedCompactNumber(dashboard.deltas.subscribers.current)}
                rangeTwoValue={formatSignedCompactNumber(dashboard.deltas.subscribers.previous)}
                delta={dashboard.deltas.subscribers}
                deltaLabel={formatSignedCompactNumber(dashboard.deltas.subscribers.absolute)}
                icon={Users}
              />
              {canViewRevenue ? (
                <ComparisonMetricCard
                  title="Estimated Revenue"
                  rangeOneValue={formatCurrency(dashboard.deltas.revenue.current)}
                  rangeTwoValue={formatCurrency(dashboard.deltas.revenue.previous)}
                  delta={dashboard.deltas.revenue}
                  deltaLabel={formatSignedCurrency(dashboard.deltas.revenue.absolute)}
                  icon={DollarSign}
                />
              ) : null}
            </section>

            <section className="youtube-report-two-col grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              {canViewRevenue ? (
                <ComparisonTotalsCard primary={dashboard.primary.totals} comparison={dashboard.comparison.totals} />
              ) : null}
              <FormatComparisonCard rows={dashboard.contentTypeComparison} />
            </section>

            <section className="youtube-report-two-col youtube-compare-video-section grid gap-4 xl:grid-cols-2">
              <VideoTable title="Top Viewed Videos In Range 1" rows={dashboard.topViewedRangeOneVideos} metric="views" />
              <VideoTable title="Top Viewed Videos In Range 2" rows={dashboard.topViewedRangeTwoVideos} metric="views" />
            </section>

            {canViewRevenue ? (
              <section className="youtube-report-two-col youtube-compare-video-section grid gap-4 xl:grid-cols-2">
                <VideoTable title="Top Revenue Videos In Range 1" rows={dashboard.topRevenueRangeOneVideos} metric="revenue" />
                <VideoTable title="Top Revenue Videos In Range 2" rows={dashboard.topRevenueRangeTwoVideos} metric="revenue" />
              </section>
            ) : null}

            <div className="youtube-print-hidden">
              <SyncPanel
                disabled={!dashboard.schemaReady || !cmsConfigured || !hasSelectedChannel}
                filters={dashboard.filters}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function DateInput({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-muted-foreground">
      {label}
      <input
        className="h-11 rounded-md border bg-background px-3 text-sm font-semibold text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring"
        name={name}
        type="date"
        defaultValue={value}
      />
    </label>
  );
}

function FilterSelect({
  label,
  name,
  value,
  children
}: {
  label: string;
  name: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-muted-foreground">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="h-11 rounded-md border bg-background px-3 text-sm font-semibold text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring"
      >
        {children}
      </select>
    </label>
  );
}

function ComparisonMetricCard({
  title,
  rangeOneValue,
  rangeTwoValue,
  delta,
  deltaLabel,
  icon: Icon
}: {
  title: string;
  rangeOneValue: string;
  rangeTwoValue: string;
  delta: ComparisonDelta;
  deltaLabel: string;
  icon: typeof Eye;
}) {
  const isPositive = delta.absolute >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2 text-primary">
              <Icon className="size-5" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          </div>
          <Badge variant={isPositive ? "secondary" : "outline"} className="gap-1 rounded-md">
            <TrendIcon className="size-3" />
            {formatSignedPercent(delta.percent)}
          </Badge>
        </div>

        <div className="mt-4 grid gap-2">
          <ComparisonValueRow label="Range 1" value={rangeOneValue} />
          <ComparisonValueRow label="Range 2" value={rangeTwoValue} />
          <ComparisonValueRow label="Difference" value={deltaLabel} emphasized />
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonValueRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div
      className={
        emphasized
          ? "rounded-lg border border-primary/40 bg-primary/10 p-3"
          : "rounded-lg border bg-background/70 p-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className={emphasized ? "text-lg font-black text-foreground" : "text-base font-black text-foreground"}>
          {value}
        </span>
      </div>
    </div>
  );
}

function ComparisonTotalsCard({ primary, comparison }: { primary: MetricTotals; comparison: MetricTotals }) {
  const rows = [
    {
      label: "Estimated revenue",
      primary: formatCurrency(primary.estimatedRevenue),
      comparison: formatCurrency(comparison.estimatedRevenue),
      difference: formatSignedCurrency(primary.estimatedRevenue - comparison.estimatedRevenue)
    },
    {
      label: "Estimated ad revenue",
      primary: formatCurrency(primary.estimatedAdRevenue),
      comparison: formatCurrency(comparison.estimatedAdRevenue),
      difference: formatSignedCurrency(primary.estimatedAdRevenue - comparison.estimatedAdRevenue)
    },
    {
      label: "Gross revenue",
      primary: formatCurrency(primary.grossRevenue),
      comparison: formatCurrency(comparison.grossRevenue),
      difference: formatSignedCurrency(primary.grossRevenue - comparison.grossRevenue)
    },
    {
      label: "Monetized playbacks",
      primary: formatCompactNumber(primary.monetizedPlaybacks),
      comparison: formatCompactNumber(comparison.monetizedPlaybacks),
      difference: formatSignedCompactNumber(primary.monetizedPlaybacks - comparison.monetizedPlaybacks)
    },
    {
      label: "Ad impressions",
      primary: formatCompactNumber(primary.adImpressions),
      comparison: formatCompactNumber(comparison.adImpressions),
      difference: formatSignedCompactNumber(primary.adImpressions - comparison.adImpressions)
    },
    {
      label: "Playback CPM",
      primary: formatCurrency(calculatePlaybackCpm(primary)),
      comparison: formatCurrency(calculatePlaybackCpm(comparison)),
      difference: formatSignedCurrency(calculatePlaybackCpm(primary) - calculatePlaybackCpm(comparison))
    }
  ];

  return (
    <Card className="youtube-revenue-comparison-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-primary" />
          Revenue Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="youtube-revenue-comparison-content space-y-2 overflow-x-auto">
        <div className="youtube-revenue-comparison-header grid min-w-[44rem] grid-cols-[minmax(12rem,1fr)_8rem_8rem_8.5rem] items-center gap-4 px-3 text-xs font-semibold text-muted-foreground">
          <span>Metric</span>
          <span className="text-right">Range 1</span>
          <span className="text-right">Range 2</span>
          <span className="text-right">Difference</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            className="youtube-revenue-comparison-row grid min-w-[44rem] grid-cols-[minmax(12rem,1fr)_8rem_8rem_8.5rem] items-center gap-4 rounded-lg border bg-background/70 p-3"
          >
            <span className="text-sm font-semibold text-muted-foreground">{row.label}</span>
            <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">{row.primary}</span>
            <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">
              {row.comparison}
            </span>
            <span className="whitespace-nowrap text-right text-sm font-black tabular-nums text-foreground">
              {row.difference}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FormatComparisonCard({
  rows
}: {
  rows: Array<{
    contentType: ContentTypeFilter;
    primaryViews: number;
    comparisonViews: number;
    viewsDelta: number;
    primaryRevenue: number;
    comparisonRevenue: number;
    revenueDelta: number;
  }>;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Film className="size-4 text-primary" />
          Format Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length > 0 ? (
          rows.map((row) => {
            const rowMaxViews = Math.max(row.primaryViews, row.comparisonViews, 1);

            return (
              <div key={row.contentType} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{contentTypeLabel(row.contentType)}</span>
                  <span className="text-muted-foreground">{formatSignedCompactNumber(row.viewsDelta)} views</span>
                </div>
                <ComparisonBar label="Range 1" value={row.primaryViews} max={rowMaxViews} />
                <ComparisonBar label="Range 2" value={row.comparisonViews} max={rowMaxViews} muted />
              </div>
            );
          })
        ) : (
          <p className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground">
            No format split is available for these filters.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonBar({ label, value, max, muted = false }: { label: string; value: number; max: number; muted?: boolean }) {
  const width = value <= 0 ? 0 : Math.max(2, Math.round((value / max) * 100));

  return (
    <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={muted ? "h-full rounded-full bg-muted-foreground/40" : "h-full rounded-full bg-primary"}
          style={{ width: `${width}%` }}
        />
      </div>
      <span>{formatCompactNumber(value)}</span>
    </div>
  );
}

function VideoTable({
  title,
  rows,
  metric
}: {
  title: string;
  rows: VideoPerformanceRow[];
  metric: "views" | "revenue";
}) {
  return (
    <Card className="youtube-video-table shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="youtube-video-table-content space-y-3">
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <VideoListItem
              key={row.videoId}
              index={index}
              videoId={row.videoId}
              title={row.title}
              channelTitle={row.channelTitle}
              contentType={row.contentType}
              value={metric === "revenue" ? formatCurrency(row.estimatedRevenue) : formatCompactNumber(row.views)}
              subvalue={`${formatCompactNumber(row.estimatedMinutesWatched / 60)} hrs`}
            />
          ))
        ) : (
          <EmptyVideoMessage />
        )}
      </CardContent>
    </Card>
  );
}

function VideoListItem({
  index,
  videoId,
  title,
  channelTitle,
  contentType,
  value,
  subvalue
}: {
  index: number;
  videoId: string;
  title: string;
  channelTitle: string;
  contentType: ContentTypeFilter;
  value: string;
  subvalue: string;
}) {
  return (
    <div className="youtube-video-row grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border bg-background/70 p-3">
      <div className="youtube-video-rank flex size-8 items-center justify-center rounded-md bg-secondary text-xs font-black">
        {index + 1}
      </div>
      <div className="min-w-0">
        <a
          href={getVideoUrl(videoId)}
          target="_blank"
          rel="noreferrer"
          className="youtube-video-title block truncate text-sm font-bold hover:text-primary"
        >
          {title}
        </a>
        <div className="youtube-video-meta mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{channelTitle}</span>
          <span>{contentTypeLabel(contentType)}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="youtube-video-value text-sm font-black">{value}</p>
        <p className="youtube-video-subvalue text-xs text-muted-foreground">{subvalue}</p>
      </div>
    </div>
  );
}

function EmptyVideoMessage() {
  return <p className="rounded-lg border bg-background/70 p-4 text-sm text-muted-foreground">No videos found for this filter.</p>;
}

function SyncPanel({
  disabled,
  filters
}: {
  disabled: boolean;
  filters: {
    channelId: string;
    primaryStartDate: string;
    primaryEndDate: string;
    comparisonStartDate: string;
    comparisonEndDate: string;
  };
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlaySquare className="size-4 text-primary" />
          Sync Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-lg border bg-background/70 p-3 text-sm text-muted-foreground">
          Click the Sync button to sync the selected comparison ranges before viewing this dashboard.
        </p>
        <YoutubeCompareSyncActions
          channelId={filters.channelId}
          primaryStartDate={filters.primaryStartDate}
          primaryEndDate={filters.primaryEndDate}
          comparisonStartDate={filters.comparisonStartDate}
          comparisonEndDate={filters.comparisonEndDate}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function StatusPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="youtube-print-hidden rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}

function getVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

function contentTypeLabel(value: ContentTypeFilter) {
  if (value === "short") return "Short form";
  if (value === "long") return "Long form";
  if (value === "live") return "Live";
  if (value === "unknown") return "Unknown";
  return "All formats";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatRangeLabel(startDate: string, endDate: string) {
  return `${formatDateLabel(startDate)} to ${formatDateLabel(endDate)}`;
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00.000Z`)
  );
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatSignedCompactNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    signDisplay: "exceptZero",
    maximumFractionDigits: 1
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatSignedCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "USD",
    signDisplay: "exceptZero",
    maximumFractionDigits: 2
  }).format(value);
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function calculatePlaybackCpm(totals: MetricTotals) {
  if (totals.monetizedPlaybacks > 0) {
    return (totals.estimatedRevenue / totals.monetizedPlaybacks) * 1000;
  }

  return totals.playbackBasedCpm;
}
