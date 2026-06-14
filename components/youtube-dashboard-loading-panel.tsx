"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

const loadingMessages = [
  "Taking a fresh look at your numbers...",
  "Take a long breath while this loads...",
  "Have a sip of water while this comes together...",
  "Relax your shoulders for a moment...",
  "Stretch your neck gently while the dashboard loads...",
  "Give your wrists a quick stretch...",
  "Let your eyes rest for a few seconds...",
  "Sit back for a moment, the numbers are loading...",
  "Good time for a tiny screen break...",
  "One calm pause and we'll be ready...",
  "Thanks for waiting, the dashboard is catching up...",
  "Getting the dashboard ready...",
  "The dashboard is getting everything in order...",
  "Your report is coming together...",
  "A larger range can take a little longer...",
  "Breathe in, breathe out, almost there...",
  "The numbers are lining up now...",
  "A quick pause, then the dashboard is yours...",
  "The dashboard is nearly ready...",
  "Almost ready..."
];

export function YoutubeDashboardLoadingPanel() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="rounded-lg border bg-card/95 p-10 shadow-sm" aria-live="polite">
      <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
        <LoaderCircle className="size-8 animate-spin text-primary" />
        <div>
          <p className="text-base font-black text-foreground">Preparing your dashboard...</p>
          <p className="min-h-5 text-sm text-muted-foreground">{loadingMessages[messageIndex]}</p>
        </div>
      </div>
    </section>
  );
}
