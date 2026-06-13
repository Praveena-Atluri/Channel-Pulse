"use client";

import { ArrowRight, BarChart3, CalendarDays, GitCompareArrows, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, type MouseEvent } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const dashboardLinks = [
  {
    href: "/monthly",
    title: "Monthly Dashboard",
    description: "Views, watch time, subscribers, long vs short split, and video rankings.",
    Icon: CalendarDays
  },
  {
    href: "/compare",
    title: "Comparison Dashboard",
    description: "Compare two custom date ranges for views, watch time, subscribers, formats, and video gains.",
    Icon: GitCompareArrows
  }
] as const;

type DashboardHref = (typeof dashboardLinks)[number]["href"];

export function YoutubeDashboardLinks() {
  const [pendingHref, setPendingHref] = useState<DashboardHref | null>(null);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, href: DashboardHref) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    setPendingHref(href);
  };

  return (
    <section className="grid gap-4 md:grid-cols-2" aria-busy={pendingHref ? "true" : "false"}>
      {dashboardLinks.map(({ href, title, description, Icon }) => {
        const isPending = pendingHref === href;

        return (
          <Link
            key={href}
            href={href}
            onClick={(event) => handleClick(event, href)}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={isPending ? `Opening ${title}` : title}
          >
            <Card className={isPending ? "border-primary shadow-sm transition" : "shadow-sm transition hover:border-primary"}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    {title}
                  </span>
                  {isPending ? (
                    <span className="flex items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                      <LoaderCircle className="size-3 animate-spin" />
                      Opening
                    </span>
                  ) : (
                    <ArrowRight className="size-4 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                <BarChart3 className="size-4 shrink-0 text-primary" />
                <span>{description}</span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </section>
  );
}
