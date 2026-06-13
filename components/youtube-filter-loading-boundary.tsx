"use client";

import { type ReactNode, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

export const YOUTUBE_FILTER_LOADING_EVENT = "youtube-filter-loading";

type YoutubeFilterLoadingBoundaryProps = {
  children: ReactNode;
};

export function YoutubeFilterLoadingBoundary({ children }: YoutubeFilterLoadingBoundaryProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [pathname, queryString]);

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
    return (
      <section className="rounded-lg border bg-card/95 p-10 shadow-sm" aria-live="polite">
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
          <LoaderCircle className="size-8 animate-spin text-primary" />
          <div>
            <p className="text-base font-black text-foreground">Preparing your dashboard...</p>
            <p className="text-sm text-muted-foreground">Bringing in the latest view for your selected filters.</p>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
