"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type YoutubePdfDownloadButtonProps = {
  filename: string;
};

export function YoutubePdfDownloadButton({ filename }: YoutubePdfDownloadButtonProps) {
  const [isPreparing, setIsPreparing] = useState(false);
  const previousTitleRef = useRef<string | null>(null);

  useEffect(() => {
    const resetPreparing = () => {
      if (previousTitleRef.current) {
        document.title = previousTitleRef.current;
        previousTitleRef.current = null;
      }
      setIsPreparing(false);
    };

    window.addEventListener("afterprint", resetPreparing);

    return () => window.removeEventListener("afterprint", resetPreparing);
  }, []);

  const downloadPdf = () => {
    previousTitleRef.current = document.title;
    setIsPreparing(true);
    document.title = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        if (previousTitleRef.current) {
          document.title = previousTitleRef.current;
          previousTitleRef.current = null;
        }
        setIsPreparing(false);
      }, 1000);
    }, 50);
  };

  return (
    <Button className="h-10 rounded-md" onClick={downloadPdf} disabled={isPreparing} type="button">
      {isPreparing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
      Download PDF
    </Button>
  );
}
