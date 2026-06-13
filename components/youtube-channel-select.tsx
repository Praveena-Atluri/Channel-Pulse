"use client";

import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ManagedChannel } from "@/lib/youtube-performance";

type ChannelPayload = {
  channels?: ManagedChannel[];
  channelCount?: number;
  error?: string;
};

type YoutubeChannelSelectProps = {
  name: string;
  value: string;
  channels: ManagedChannel[];
  canRefreshChannels?: boolean;
  disabled?: boolean;
};

export function YoutubeChannelSelect({
  name,
  value,
  channels: initialChannels,
  canRefreshChannels = true,
  disabled = false
}: YoutubeChannelSelectProps) {
  const [channels, setChannels] = useState(initialChannels);
  const [selectedValue, setSelectedValue] = useState(value);
  const [message, setMessage] = useState<string | null>(null);
  const [hasRefreshed, setHasRefreshed] = useState(initialChannels.length > 0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setChannels(initialChannels);
    setHasRefreshed(initialChannels.length > 0);
  }, [initialChannels]);

  useEffect(() => {
    setSelectedValue(resolveSelectedValue(value, channels));
  }, [channels, value]);

  const refreshChannels = () => {
    if (disabled || isPending) return;

    startTransition(async () => {
      setMessage("Loading channels...");

      const response = await fetch("/api/youtube/channels", {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      const payload = (await response.json()) as ChannelPayload;

      if (!response.ok) {
        setMessage(payload.error ?? "Unable to load channels.");
        return;
      }

      setChannels(payload.channels ?? []);
      setSelectedValue((current) => resolveSelectedValue(current, payload.channels ?? []));
      setHasRefreshed(true);
      setMessage(`${payload.channelCount ?? payload.channels?.length ?? 0} channels loaded.`);
    });
  };

  return (
    <div className="grid gap-1 text-sm font-semibold text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <span>Channel</span>
        {canRefreshChannels ? (
          <button
            aria-label="Refresh channels"
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md border bg-background text-foreground shadow-sm transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            )}
            disabled={disabled || isPending}
            onClick={refreshChannels}
            title="Refresh channels"
            type="button"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
          </button>
        ) : null}
      </div>
      <select
        className="h-11 rounded-md border bg-background px-3 text-sm font-semibold text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        name={name}
        onChange={(event) => setSelectedValue(event.target.value)}
        onFocus={() => {
          if (canRefreshChannels && channels.length === 0 && !hasRefreshed) {
            refreshChannels();
          }
        }}
        value={selectedValue}
      >
        {channels.length === 0 ? <option value="">Refresh channels</option> : null}
        {channels.map((channel) => (
          <option key={channel.channelId} value={channel.channelId}>
            {channel.title}
          </option>
        ))}
      </select>
      {message ? <p className="truncate text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function resolveSelectedValue(value: string, channels: ManagedChannel[]) {
  if (channels.some((channel) => channel.channelId === value)) return value;
  return channels[0]?.channelId ?? "";
}
