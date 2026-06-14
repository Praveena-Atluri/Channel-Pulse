"use client";

import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import { YoutubeDashboardLoadingPanel } from "@/components/youtube-dashboard-loading-panel";

type CompareFilterChangeBoundaryProps = {
  children: ReactNode;
  filters: ReactNode;
  renderKey: string;
};

export function CompareFilterChangeBoundary({ children, filters, renderKey }: CompareFilterChangeBoundaryProps) {
  const [hasPendingFilterChange, setHasPendingFilterChange] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setHasPendingFilterChange(false);
    setIsApplying(false);
    window.dispatchEvent(new CustomEvent("channel-pulse:apply-finish"));
  }, [renderKey]);

  useEffect(() => {
    const handleApplyStart = () => setIsApplying(true);

    window.addEventListener("channel-pulse:apply-start", handleApplyStart);

    return () => {
      window.removeEventListener("channel-pulse:apply-start", handleApplyStart);
    };
  }, []);

  const markPending = (event: SyntheticEvent) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
      setHasPendingFilterChange(true);
    }
  };

  return (
    <>
      <div onChangeCapture={markPending} onInputCapture={markPending}>
        {filters}
      </div>

      {isApplying ? (
        <YoutubeDashboardLoadingPanel />
      ) : hasPendingFilterChange ? (
        <div className="youtube-print-hidden rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-black">Filters changed</p>
          <p className="mt-1 text-sm">Click Apply to load data for the selected comparison range.</p>
        </div>
      ) : (
        children
      )}
    </>
  );
}
