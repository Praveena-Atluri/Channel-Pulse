import { YoutubeDashboardLoadingPanel } from "@/components/youtube-dashboard-loading-panel";

export default function CompareLoading() {
  return (
    <main className="youtube-report-page min-h-screen p-4 md:p-6">
      <div className="youtube-report-shell mx-auto flex max-w-7xl flex-col gap-4">
        <YoutubeDashboardLoadingPanel />
      </div>
    </main>
  );
}
