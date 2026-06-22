"use client";

import { type ReactNode, useEffect, useState } from "react";
import { YoutubeDashboardLoadingPanel } from "@/components/youtube-dashboard-loading-panel";

export const YOUTUBE_FILTER_LOADING_EVENT = "youtube-filter-loading";

type YoutubeFilterLoadingBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  renderKey?: string;
};

export function YoutubeFilterLoadingBoundary({
  children,
  fallback,
  renderKey = ""
}: YoutubeFilterLoadingBoundaryProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
    publishFilterLoading(false);
  }, [renderKey]);

  useEffect(() => {
    const handleLoadingChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      setIsLoading(Boolean(event.detail?.loading));
    };

    window.addEventListener(YOUTUBE_FILTER_LOADING_EVENT, handleLoadingChange);

    return () => {
      window.removeEventListener(YOUTUBE_FILTER_LOADING_EVENT, handleLoadingChange);
    };
  }, []);

  if (isLoading) {
    return fallback ?? <YoutubeDashboardLoadingPanel />;
  }

  return <>{children}</>;
}

function publishFilterLoading(loading: boolean) {
  window.dispatchEvent(new CustomEvent(YOUTUBE_FILTER_LOADING_EVENT, { detail: { loading } }));
}
