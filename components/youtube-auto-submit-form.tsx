"use client";

import { type ChangeEvent, type ReactNode, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { YOUTUBE_FILTER_LOADING_EVENT } from "@/components/youtube-filter-loading-boundary";

type YoutubeAutoSubmitFormProps = {
  action: string;
  children: ReactNode;
  className?: string;
};

export function YoutubeAutoSubmitForm({ action, children, className }: YoutubeAutoSubmitFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsSubmitting(false);
    publishFilterLoading(false);
  }, [pathname, queryString]);

  useEffect(() => {
    if (!isSubmitting) return undefined;

    const timeout = window.setTimeout(() => {
      setIsSubmitting(false);
    }, 30000);

    return () => window.clearTimeout(timeout);
  }, [isSubmitting]);

  const handleChange = (event: ChangeEvent<HTMLFormElement>) => {
    if (!(event.target instanceof HTMLSelectElement)) return;

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const nextUrl = buildFormUrl(form);
    const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;

    setIsSubmitting(true);
    publishFilterLoading(true);
    startTransition(() => {
      if (nextUrl === currentUrl) {
        router.refresh();
        window.setTimeout(() => {
          setIsSubmitting(false);
          publishFilterLoading(false);
        }, 500);
        return;
      }

      router.push(nextUrl as Parameters<typeof router.push>[0], { scroll: false });
    });
  };

  return (
    <form
      action={action}
      aria-busy={isSubmitting || isPending}
      className={className}
      method="get"
      onChange={handleChange}
    >
      {children}
    </form>
  );
}

function publishFilterLoading(loading: boolean) {
  window.dispatchEvent(new CustomEvent(YOUTUBE_FILTER_LOADING_EVENT, { detail: { loading } }));
}

function buildFormUrl(form: HTMLFormElement) {
  const action = form.getAttribute("action") || window.location.pathname;
  const url = new URL(action, window.location.origin);
  const params = new URLSearchParams(url.search);
  const formData = new FormData(form);

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}
