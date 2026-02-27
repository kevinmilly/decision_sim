"use client";

import { useState } from "react";

interface TutorialProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Read the scenario",
    description:
      "You'll see a real-world engineering situation with four possible choices. Read carefully — context matters.",
    visual: "scenario",
  },
  {
    title: "Pick your answer",
    description:
      "Tap the option you think is best. There's no time limit, but your response time is tracked to help measure your decision speed over time.",
    visual: "pick",
  },
  {
    title: "Calibrate your confidence",
    description:
      "Before seeing the answer, rate how confident you are (50-95%). This is the key part — it trains you to know what you know and what you don't.",
    visual: "confidence",
  },
  {
    title: "Learn from the reveal",
    description:
      "See if you were right, read the explanation, and check your calibration score. Save useful frameworks to your playbook for later.",
    visual: "reveal",
  },
];

export default function Tutorial({ onComplete }: TutorialProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg p-6 max-w-lg mx-auto w-full space-y-6">
      <div className="text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          How it works — {step + 1} of {STEPS.length}
        </p>
        <h2 className="text-xl font-bold text-white">{current.title}</h2>
      </div>

      {/* Visual representation */}
      <div className="bg-gray-800 rounded-xl p-5">
        {current.visual === "scenario" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-400 bg-brand-900/30 px-2 py-0.5 rounded-full">
                debugging
              </span>
              <span className="text-xs text-gray-500">Medium</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Your API returns 200 OK but the response body is empty. Logs show the database query returns data...
            </p>
            <div className="space-y-2">
              {["A", "B", "C", "D"].map((key) => (
                <div
                  key={key}
                  className="p-2.5 rounded-lg border border-gray-700 text-xs text-gray-400"
                >
                  <span className="font-semibold text-brand-400 mr-1">{key}.</span>
                  Option {key}
                </div>
              ))}
            </div>
          </div>
        )}

        {current.visual === "pick" && (
          <div className="space-y-3 text-center">
            <div className="space-y-2">
              {["A", "B", "C", "D"].map((key) => (
                <div
                  key={key}
                  className={`p-2.5 rounded-lg border text-xs ${
                    key === "A"
                      ? "border-brand-500 bg-brand-900/20 text-brand-300"
                      : "border-gray-700 text-gray-500 opacity-60"
                  }`}
                >
                  <span className="font-semibold mr-1">{key}.</span>
                  {key === "A" ? "Your selection" : `Option ${key}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {current.visual === "confidence" && (
          <div className="text-center space-y-3">
            <p className="text-3xl font-bold text-brand-400">75%</p>
            <p className="text-xs text-gray-400">Confident</p>
            <div className="h-2 bg-gray-700 rounded-full relative">
              <div className="absolute top-0 left-0 h-full w-[55%] bg-brand-500 rounded-full" />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>50%</span>
              <span>95%</span>
            </div>
          </div>
        )}

        {current.visual === "reveal" && (
          <div className="space-y-3">
            <div className="text-center p-3 bg-green-900/30 rounded-lg">
              <p className="text-sm font-medium text-green-400">Correct</p>
              <p className="text-xs text-gray-400">Well-calibrated</p>
            </div>
            <div className="p-2.5 rounded-lg border border-green-600 bg-green-900/10 text-xs text-gray-300">
              <span className="font-semibold text-brand-400 mr-1">A.</span>
              The correct answer <span className="text-green-400 ml-1 text-xs">CORRECT</span>
            </div>
            <div className="text-xs text-gray-400">
              Brier Score: 0.063 — <span className="text-brand-400 underline decoration-dotted">What&apos;s this?</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-400 text-center leading-relaxed">
        {current.description}
      </p>

      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === step ? "bg-brand-500" : i < step ? "bg-brand-800" : "bg-gray-700"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={() => (isLast ? onComplete() : setStep(step + 1))}
          className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
        >
          {isLast ? "Let's go" : "Next"}
        </button>
      </div>

      {!isLast && (
        <button
          onClick={onComplete}
          className="w-full text-center text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          Skip tutorial
        </button>
      )}
    </div>
  );
}
