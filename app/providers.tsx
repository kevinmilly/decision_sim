"use client";

import { useEffect } from "react";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/Toast";
import { initAnalytics } from "@/lib/analytics";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
