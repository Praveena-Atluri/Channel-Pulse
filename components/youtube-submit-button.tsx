"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type YoutubeSubmitButtonProps = {
  label?: string;
  loadingLabel?: string;
};

const SUBMIT_TIMEOUT_MS = 120_000;

export function YoutubeSubmitButton({ label = "Apply", loadingLabel = "Loading" }: YoutubeSubmitButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleApplyFinish = () => setIsSubmitting(false);
    window.addEventListener("channel-pulse:apply-finish", handleApplyFinish);

    return () => {
      window.removeEventListener("channel-pulse:apply-finish", handleApplyFinish);
    };
  }, []);

  useEffect(() => {
    if (!isSubmitting) return undefined;

    const timeout = window.setTimeout(() => {
      setIsSubmitting(false);
    }, SUBMIT_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [isSubmitting]);

  return (
    <Button
      className="h-11 w-full rounded-md"
      disabled={isSubmitting}
      onClick={(event) => {
        event.preventDefault();

        const form = event.currentTarget.form;
        if (!form || !form.reportValidity()) return;

        const nextUrl = buildFormUrl(form);
        const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;

        setIsSubmitting(true);
        window.dispatchEvent(new CustomEvent("channel-pulse:apply-start"));
        if (nextUrl === currentUrl) {
          router.refresh();
          return;
        }

        router.push(nextUrl as Parameters<typeof router.push>[0]);
      }}
      type="submit"
    >
      {isSubmitting ? (
        <LoaderCircle className="mr-2 size-4 animate-spin" />
      ) : (
        <RefreshCcw className="mr-2 size-4" />
      )}
      {isSubmitting ? loadingLabel : label}
    </Button>
  );
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
