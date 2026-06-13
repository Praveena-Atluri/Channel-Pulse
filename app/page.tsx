import { Youtube } from "lucide-react";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { YoutubeDashboardLinks } from "@/components/youtube-dashboard-links";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";

type HomePageProps = {
  searchParams: Promise<{
    month?: string;
    channel?: string;
    contentType?: string;
    cohort?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const key of ["month", "channel", "contentType", "cohort"] as const) {
    if (params[key]) {
      query.set(key, params[key]);
    }
  }

  if (query.size > 0) {
    redirect(`/monthly?${query.toString()}`);
  }

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-lg border bg-card/95 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
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
              <p className="text-sm text-muted-foreground">Management dashboards for CMS channel performance.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </header>

        <YoutubeDashboardLinks />
      </div>
    </main>
  );
}
