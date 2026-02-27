"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";
import { scoreAttempt, avgBrierScore, dailyTargetToCards } from "@/lib/scoring";
import { track } from "@/lib/analytics";
import { queueAttempt, flushQueue } from "@/lib/offline-queue";
import { useToast } from "@/components/Toast";
import ScenarioCard from "@/components/ScenarioCard";
import ConfidenceSlider from "@/components/ConfidenceSlider";
import RevealScreen from "@/components/RevealScreen";
import SessionComplete from "@/components/SessionComplete";
import EmptyState from "@/components/EmptyState";
import Tutorial from "@/components/Tutorial";
import type { ScoreBreakdown } from "@/lib/scoring";

interface Scenario {
  id: string;
  domain: string;
  difficulty: number;
  prompt: string;
  options: Array<{ key: string; text: string }>;
  correct_option: string;
  reveal_summary: string;
  reveal_detail: string;
  source_title?: string | null;
  source_url?: string | null;
  nudge_framework?: string | null;
  nudge_text?: string | null;
  answer_defensibility: number;
  tags: string[];
}

type Phase = "tutorial" | "card" | "confidence" | "reveal" | "session_complete" | "empty";

interface AttemptRecord {
  confidence: number;
  isCorrect: boolean;
}

export default function FeedPage() {
  const router = useRouter();
  const { sessionId, recordActivity } = useSession();
  const { showToast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("tutorial_complete")) {
      return "tutorial";
    }
    return "card";
  });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [sessionAttempts, setSessionAttempts] = useState<AttemptRecord[]>([]);
  const [dailyTarget, setDailyTarget] = useState(10);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Load scenarios and user profile
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/onboarding");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("daily_target_minutes, interests, skill_level")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDailyTarget(dailyTargetToCards(profile.daily_target_minutes));
      }

      const { data: attemptedData } = await supabase
        .from("attempts")
        .select("scenario_id")
        .eq("user_id", user.id);

      const attemptedIds = new Set(
        (attemptedData || []).map((a) => a.scenario_id)
      );

      const { data: allScenarios } = await supabase
        .from("scenarios")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: true });

      if (allScenarios) {
        const unseen = allScenarios.filter((s) => !attemptedIds.has(s.id));
        for (let i = unseen.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unseen[i], unseen[j]] = [unseen[j], unseen[i]];
        }
        setScenarios(unseen);
        if (unseen.length === 0) setPhase("empty");
      }

      flushQueue(supabase);
      setLoading(false);
    }
    init();
  }, [router]);

  const currentScenario = scenarios[currentIndex];

  const handleOptionSelect = useCallback(
    (optionKey: string, elapsed: number) => {
      setSelectedOption(optionKey);
      setResponseTimeMs(elapsed);
      recordActivity();
      track("option_selected", {
        scenario_id: currentScenario.id,
        chosen_option: optionKey,
      });
      setPhase("confidence");
    },
    [currentScenario, recordActivity]
  );

  const handleConfidenceSubmit = useCallback(
    async (conf: number) => {
      if (!currentScenario || !selectedOption || !userId) return;
      setConfidence(conf);
      recordActivity();

      const isCorrect = selectedOption === currentScenario.correct_option;
      const breakdown = scoreAttempt(
        { isCorrect, confidence: conf, responseTimeMs },
        currentScenario.answer_defensibility
      );
      setScoreBreakdown(breakdown);

      track("confidence_submitted", {
        scenario_id: currentScenario.id,
        confidence: conf,
      });

      const attemptData = {
        user_id: userId,
        scenario_id: currentScenario.id,
        chosen_option: selectedOption,
        confidence: conf,
        is_correct: isCorrect,
        response_time_ms: responseTimeMs,
        session_id: sessionId,
      };

      const supabase = createClient();
      const { error } = await supabase.from("attempts").insert(attemptData);

      if (error) {
        queueAttempt(attemptData);
      } else {
        supabase.rpc("recompute_user_stats", { p_user_id: userId });
        supabase.rpc("recompute_scenario_stats", {
          p_scenario_id: currentScenario.id,
        });
      }

      const newAttempts = [...sessionAttempts, { confidence: conf, isCorrect }];
      setSessionAttempts(newAttempts);

      track("attempt_completed", {
        scenario_id: currentScenario.id,
        is_correct: isCorrect,
        confidence: conf,
        brier_score: breakdown.brierScore,
        response_time_ms: responseTimeMs,
        feedback_label: breakdown.feedbackLabel,
      });

      setPhase("reveal");
    },
    [currentScenario, selectedOption, userId, responseTimeMs, sessionId, sessionAttempts, recordActivity]
  );

  const handleSaveFramework = useCallback(async () => {
    if (!currentScenario || !userId) return;
    if (!currentScenario.nudge_framework || !currentScenario.nudge_text) return;

    const supabase = createClient();
    const { error } = await supabase.from("user_saved_frameworks").insert({
      user_id: userId,
      framework_name: currentScenario.nudge_framework,
      nudge_text: currentScenario.nudge_text,
      scenario_id: currentScenario.id,
    });

    if (error) {
      showToast("Failed to save framework", "error");
      return;
    }

    track("framework_saved", {
      framework_name: currentScenario.nudge_framework,
      scenario_id: currentScenario.id,
    });
  }, [currentScenario, userId, showToast]);

  const handleNext = useCallback(() => {
    recordActivity();

    if (sessionAttempts.length >= dailyTarget) {
      setPhase("session_complete");
      track("session_completed", {
        session_id: sessionId,
        attempts_count: sessionAttempts.length,
        accuracy:
          sessionAttempts.filter((a) => a.isCorrect).length /
          sessionAttempts.length,
      });
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= scenarios.length) {
      setPhase("empty");
      return;
    }

    setCurrentIndex(nextIndex);
    setSelectedOption(null);
    setResponseTimeMs(0);
    setConfidence(0);
    setScoreBreakdown(null);
    setPhase("card");
  }, [currentIndex, scenarios.length, sessionAttempts, dailyTarget, sessionId, recordActivity]);

  const handleContinue = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= scenarios.length) {
      setPhase("empty");
      return;
    }
    setCurrentIndex(nextIndex);
    setSelectedOption(null);
    setResponseTimeMs(0);
    setConfidence(0);
    setScoreBreakdown(null);
    setPhase("card");
  };

  const handleExitSession = () => {
    if (sessionAttempts.length > 0) {
      track("session_completed", {
        session_id: sessionId,
        attempts_count: sessionAttempts.length,
        accuracy:
          sessionAttempts.filter((a) => a.isCorrect).length /
          sessionAttempts.length,
      });
    }
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg text-gray-400">
          Loading scenarios...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="font-bold text-white">The Pause</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {sessionAttempts.length}/{dailyTarget}
          </span>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-brand-400 font-medium hover:text-brand-300"
          >
            Stats
          </button>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            title="End this session"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-white">End session?</h3>
            <p className="text-sm text-gray-400">
              {sessionAttempts.length > 0
                ? `You've completed ${sessionAttempts.length} scenario${sessionAttempts.length !== 1 ? "s" : ""} this session. Your progress is saved.`
                : "You haven't answered any scenarios yet."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition-colors"
              >
                Keep going
              </button>
              <button
                onClick={handleExitSession}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {phase === "tutorial" && (
          <Tutorial
            onComplete={() => {
              localStorage.setItem("tutorial_complete", "1");
              setPhase("card");
            }}
          />
        )}

        {phase === "card" && currentScenario && (
          <ScenarioCard
            scenario={currentScenario}
            onSelect={handleOptionSelect}
            selectedOption={selectedOption}
          />
        )}

        {phase === "confidence" && (
          <ConfidenceSlider onSubmit={handleConfidenceSubmit} />
        )}

        {phase === "reveal" && currentScenario && scoreBreakdown && (
          <RevealScreen
            scenario={currentScenario}
            chosenOption={selectedOption!}
            confidence={confidence}
            scoreBreakdown={scoreBreakdown}
            onNext={handleNext}
            onSaveFramework={handleSaveFramework}
          />
        )}

        {phase === "session_complete" && (
          <SessionComplete
            totalAttempts={sessionAttempts.length}
            correctCount={
              sessionAttempts.filter((a) => a.isCorrect).length
            }
            avgBrier={avgBrierScore(sessionAttempts)}
            onContinue={handleContinue}
            onDone={() => router.push("/dashboard")}
          />
        )}

        {phase === "empty" && <EmptyState />}
      </div>
    </main>
  );
}
