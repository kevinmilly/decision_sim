const QUEUE_KEY = "decision_sim_offline_queue";

interface QueuedAttempt {
  user_id: string;
  scenario_id: string;
  chosen_option: string;
  confidence: number;
  is_correct: boolean;
  response_time_ms: number;
  session_id: string;
  queued_at: number;
}

export function queueAttempt(attempt: Omit<QueuedAttempt, "queued_at">) {
  if (typeof window === "undefined") return;
  const queue = getQueue();
  queue.push({ ...attempt, queued_at: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function getQueue(): QueuedAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function flushQueue(
  supabase: { from: (table: string) => any; rpc: (fn: string, params: any) => any }
) {
  const queue = getQueue();
  if (queue.length === 0) return;

  const remaining: QueuedAttempt[] = [];

  for (const item of queue) {
    const { queued_at, ...attemptData } = item;
    const { error } = await supabase.from("attempts").insert(attemptData);
    if (error) {
      remaining.push(item);
    } else {
      // Recompute stats in the background
      supabase.rpc("recompute_user_stats", { p_user_id: item.user_id });
      supabase.rpc("recompute_scenario_stats", {
        p_scenario_id: item.scenario_id,
      });
    }
  }

  if (remaining.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(QUEUE_KEY);
  }
}
