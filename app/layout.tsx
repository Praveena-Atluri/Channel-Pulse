import type { Metadata } from "next";
import { Manrope, Noto_Sans_Telugu } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const headingFont = Manrope({
  subsets: ["latin"],
  variable: "--font-heading"
});

const teluguFont = Noto_Sans_Telugu({
  subsets: ["telugu"],
  variable: "--font-telugu"
});

export const metadata: Metadata = {
  title: "Channel Pulse",
  description: "YouTube CMS performance dashboards for channels, subscribers, and video cohorts."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          headingFont.variable,
          teluguFont.variable,
          "min-h-screen font-[var(--font-heading)]"
        )}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
