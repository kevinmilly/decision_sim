"use client";

import posthog from "posthog-js";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    persistence: "localStorage",
  });
  initialized = true;
}

type EventMap = {
  scenario_viewed: { scenario_id: string; domain: string; difficulty: number };
  option_selected: { scenario_id: string; chosen_option: string };
  confidence_submitted: { scenario_id: string; confidence: number };
  attempt_completed: {
    scenario_id: string;
    is_correct: boolean;
    confidence: number;
    brier_score: number;
    response_time_ms: number;
    feedback_label: string;
  };
  reveal_expanded: { scenario_id: string };
  scenario_flagged: { scenario_id: string; reason: string; has_explanation: boolean };
  framework_saved: { framework_name: string; scenario_id: string };
  session_completed: {
    session_id: string;
    attempts_count: number;
    accuracy: number;
  };
  onboarding_completed: {
    track: string;
    interests: string[];
    daily_target: number;
  };
  page_viewed: { path: string };
};

export function track<K extends keyof EventMap>(
  event: K,
  properties: EventMap[K]
) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string) {
  if (typeof window === "undefined") return;
  posthog.identify(userId);
}
