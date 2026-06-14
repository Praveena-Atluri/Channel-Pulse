"use client";

import { useEffect } from "react";

export function ProductionInteractionGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("contextmenu", preventContextMenu);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, []);

  return null;
}
