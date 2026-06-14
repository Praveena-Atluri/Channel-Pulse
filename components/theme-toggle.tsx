"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-[4.75rem] rounded-md border bg-secondary/60" aria-hidden="true" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      className="inline-grid h-10 w-[4.75rem] grid-cols-2 items-center rounded-md border bg-secondary/70 p-1 text-muted-foreground shadow-sm transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      type="button"
    >
      <span
        className={cn(
          "flex h-8 items-center justify-center rounded-sm transition",
          !isDark && "bg-card text-primary shadow-sm"
        )}
      >
        <Sun className="size-4" />
      </span>
      <span
        className={cn(
          "flex h-8 items-center justify-center rounded-sm transition",
          isDark && "bg-card text-primary shadow-sm"
        )}
      >
        <Moon className="size-4" />
      </span>
    </button>
  );
}
