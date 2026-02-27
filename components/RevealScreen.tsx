"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { ScoreBreakdown } from "@/lib/scoring";

interface Option {
  key: string;
  text: string;
}

interface RevealScreenProps {
  scenario: {
    id: string;
    prompt: string;
    options: Option[];
    correct_option: string;
    reveal_summary: string;
    reveal_detail: string;
    answer_defensibility: number;
    source_title?: string | null;
    source_url?: string | null;
    nudge_framework?: string | null;
    nudge_text?: string | null;
  };
  chosenOption: string;
  confidence: number;
  scoreBreakdown: ScoreBreakdown;
  onNext: () => void;
  onSaveFramework?: () => void;
}

const FLAG_REASONS = [
  { value: "answer_wrong", label: "Answer is wrong" },
  { value: "question_unclear", label: "Question is unclear" },
  { value: "multiple_valid", label: "Multiple answers valid" },
  { value: "other", label: "Other" },
] as const;

type FlagReason = (typeof FLAG_REASONS)[number]["value"];

function accuracyLabel(score: number): string {
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Good";
  if (score >= 70) return "Fair";
  return "Needs work";
}

type CalibrationVerdict = {
  verdict: string;
  bg: string;
  color: string;
  why: string;
};

function getCalibrationVerdict(
  label: ScoreBreakdown["feedbackLabel"],
  isAmbiguous: boolean
): CalibrationVerdict {
  switch (label) {
    case "correct_calibrated":
      return {
        verdict: "Well-calibrated",
        bg: "bg-green-900/30",
        color: "text-green-400",
        why: "Your confidence matched your outcome — that's good calibration.",
      };
    case "correct_overconfident":
      return {
        verdict: "Overconfident",
        bg: "bg-amber-900/30",
        color: "text-amber-400",
        why: "You got it right, but at that confidence level you should be right nearly every time. Calibration is measured over many attempts.",
      };
    case "wrong_overconfident":
      return {
        verdict: "Overconfident",
        bg: isAmbiguous ? "bg-amber-900/30" : "bg-red-900/30",
        color: isAmbiguous ? "text-amber-400" : "text-red-400",
        why: "High confidence with a wrong answer is where calibration breaks down most.",
      };
    case "wrong_underconfident":
      return {
        verdict: "Underconfident",
        bg: "bg-blue-900/30",
        color: "text-blue-400",
        why: "You got it wrong but kept your confidence reasonable — that's appropriate uncertainty.",
      };
  }
}

export default function RevealScreen({
  scenario,
  chosenOption,
  confidence,
  scoreBreakdown,
  onNext,
  onSaveFramework,
}: RevealScreenProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showAccuracyInfo, setShowAccuracyInfo] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flagReason, setFlagReason] = useState<FlagReason | null>(null);
  const [flagExplanation, setFlagExplanation] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [savedToPlaybook, setSavedToPlaybook] = useState(false);
  const { showToast } = useToast();
  const isCorrect = chosenOption === scenario.correct_option;
  const isAmbiguous = scenario.answer_defensibility < 60;
  const calibration = getCalibrationVerdict(scoreBreakdown.feedbackLabel, isAmbiguous);

  const handleFlagSubmit = async () => {
    if (!flagReason || submittingFlag) return;
    setSubmittingFlag(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("scenario_flags").insert({
        user_id: user.id,
        scenario_id: scenario.id,
        reason: flagReason,
        explanation: flagExplanation.trim() || null,
      });

      if (error && error.code === "23505") {
        showToast("You've already flagged this scenario", "info");
      } else if (error) {
        showToast("Failed to submit flag — try again", "error");
        setSubmittingFlag(false);
        return;
      }
    }

    track("scenario_flagged", {
      scenario_id: scenario.id,
      reason: flagReason,
      has_explanation: flagExplanation.trim().length > 0,
    });

    setFlagged(true);
    setShowFlagMenu(false);
    setSubmittingFlag(false);
    showToast("Thanks for the feedback — we'll review this scenario", "info");
  };

  const handleSaveFramework = () => {
    if (savedToPlaybook) return;
    onSaveFramework?.();
    setSavedToPlaybook(true);
    showToast("Saved to your playbook", "success");
  };

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg p-6 max-w-lg mx-auto w-full space-y-5">
      {/* Result header — calibration verdict is primary */}
      <div className={`text-center p-4 rounded-xl ${calibration.bg}`}>
        <div className={`text-3xl font-bold mb-1 ${calibration.color}`}>
          {calibration.verdict}
        </div>
        <p className={`text-sm ${calibration.color} opacity-80 mb-2`}>
          {calibration.why}
        </p>
        <p className="text-sm text-gray-400">
          Answer:{" "}
          {isCorrect
            ? "✓ Correct"
            : isAmbiguous
            ? "Not the suggested best"
            : "✗ Incorrect"}
        </p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <p className="text-xs text-gray-500">
            Your confidence: {confidence}%
          </p>
          <span className="text-gray-600 text-xs">|</span>
          <button
            onClick={() => setShowAccuracyInfo(!showAccuracyInfo)}
            className="text-xs text-gray-500 hover:text-gray-300 underline decoration-dotted underline-offset-2 transition-colors"
          >
            Accuracy Score: {scoreBreakdown.accuracyScore} — {accuracyLabel(scoreBreakdown.accuracyScore)}
          </button>
        </div>
        {isAmbiguous && !isCorrect && (
          <p className="text-xs text-yellow-500/70 mt-1">
            Score penalty reduced for this ambiguous question
          </p>
        )}
        {showAccuracyInfo && (
          <div className="mt-3 p-3 bg-gray-800/60 rounded-lg text-xs text-gray-300 text-left leading-relaxed">
            <p className="font-semibold text-gray-200 mb-1">What is Accuracy Score?</p>
            <p>
              It measures how well your confidence matches reality. A score of <strong>100</strong> means
              perfect calibration (you were confident and correct). A score of <strong>0</strong> means
              maximally wrong. Being correct with low confidence or wrong with high confidence both lower
              your score.
            </p>
            <p className="mt-1 text-gray-400">
              Think of it as: <em>did you know what you knew?</em>
            </p>
            <p className="mt-1 text-gray-500 text-[10px]">
              Advanced: Accuracy Score is based on Brier error, a standard probability scoring method. Brier error: {scoreBreakdown.brierScore.toFixed(3)} (lower is better).
            </p>
          </div>
        )}
      </div>

      {/* Options with correct/wrong highlights */}
      <div className="space-y-2">
        {scenario.options.map((opt) => {
          const isChosen = opt.key === chosenOption;
          const isAnswer = opt.key === scenario.correct_option;
          let borderClass = "border-gray-800";
          if (isAnswer) borderClass = "border-green-500 bg-green-900/20";
          else if (isChosen && !isCorrect) borderClass = "border-red-500 bg-red-900/20";

          return (
            <div
              key={opt.key}
              className={`p-3 rounded-xl border-2 ${borderClass}`}
            >
              <span className="font-semibold mr-2">{opt.key}.</span>
              <span className="text-gray-200 text-sm">{opt.text}</span>
              {isAnswer && (
                <span className="ml-2 text-xs text-green-400 font-semibold">
                  {isAmbiguous ? "SUGGESTED BEST" : "CORRECT"}
                </span>
              )}
              {isChosen && !isCorrect && (
                <span className="ml-2 text-xs text-red-400 font-semibold">YOUR PICK</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Reveal summary */}
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-sm text-gray-300">{scenario.reveal_summary}</p>
      </div>

      {/* Expandable detail */}
      <button
        onClick={() => {
          setShowDetail(!showDetail);
          if (!showDetail) track("reveal_expanded", { scenario_id: scenario.id });
        }}
        className="text-sm text-brand-400 font-medium hover:underline"
      >
        {showDetail ? "Hide details" : "Read more"}
      </button>
      {showDetail && (
        <div className="text-sm text-gray-400 leading-relaxed">
          {scenario.reveal_detail}
          {scenario.source_title && (
            <p className="mt-2 text-xs">
              Source:{" "}
              {scenario.source_url ? (
                <a
                  href={scenario.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 underline"
                >
                  {scenario.source_title}
                </a>
              ) : (
                scenario.source_title
              )}
            </p>
          )}
        </div>
      )}

      {/* Micro-lesson nudge */}
      {scenario.nudge_framework && scenario.nudge_text && (
        <div className="bg-brand-900/20 rounded-xl p-4 border border-brand-800">
          <p className="text-xs uppercase tracking-wide text-brand-400 font-semibold mb-1">
            Framework: {scenario.nudge_framework}
          </p>
          <p className="text-sm text-gray-300">{scenario.nudge_text}</p>
          {onSaveFramework && (
            <button
              onClick={handleSaveFramework}
              disabled={savedToPlaybook}
              className="group mt-2 text-xs text-brand-400 font-medium hover:underline disabled:opacity-50 disabled:cursor-default relative"
              title="Save this decision-making framework to your personal collection for future reference"
            >
              {savedToPlaybook ? "Saved to playbook" : "+ Add to playbook"}
              {!savedToPlaybook && (
                <span className="hidden group-hover:block absolute bottom-full left-0 mb-1 w-56 p-2 bg-gray-800 text-gray-300 text-xs rounded-lg shadow-lg font-normal leading-relaxed">
                  Save this framework to your personal collection so you can review it later
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="relative">
          {flagged ? (
            <span className="text-xs text-gray-500 opacity-50">Flagged</span>
          ) : (
            <button
              onClick={() => setShowFlagMenu(!showFlagMenu)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Flag scenario
            </button>
          )}

          {/* Flag reason dropdown */}
          {showFlagMenu && !flagged && (
            <div className="absolute bottom-full left-0 mb-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-3 space-y-3 z-10">
              <p className="text-xs text-gray-300 font-semibold">What&apos;s the issue?</p>
              <div className="space-y-1">
                {FLAG_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setFlagReason(r.value)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                      flagReason === r.value
                        ? "bg-brand-500/20 text-brand-400"
                        : "text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {flagReason && (
                <textarea
                  value={flagExplanation}
                  onChange={(e) => setFlagExplanation(e.target.value)}
                  placeholder="Optional: explain why (helps us fix it faster)"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 p-2 resize-none focus:outline-none focus:border-brand-500"
                  rows={2}
                  maxLength={500}
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowFlagMenu(false);
                    setFlagReason(null);
                    setFlagExplanation("");
                  }}
                  className="flex-1 text-xs py-1.5 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlagSubmit}
                  disabled={!flagReason || submittingFlag}
                  className="flex-1 text-xs py-1.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submittingFlag ? "Sending..." : "Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
        >
          Next scenario
        </button>
      </div>
    </div>
  );
}
