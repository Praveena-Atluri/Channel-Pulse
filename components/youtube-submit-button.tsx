"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type YoutubeSubmitButtonProps = {
  label?: string;
  loadingLabel?: string;
};

export function YoutubeSubmitButton({ label = "Apply", loadingLabel = "Loading" }: YoutubeSubmitButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsSubmitting(false);
  }, [pathname, queryString]);

  useEffect(() => {
    if (!isSubmitting) return undefined;

    const timeout = window.setTimeout(() => {
      setIsSubmitting(false);
    }, 30000);

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
        if (nextUrl === currentUrl) {
          router.refresh();
          window.setTimeout(() => setIsSubmitting(false), 500);
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
