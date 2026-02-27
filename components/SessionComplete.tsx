"use client";

import { useState } from "react";

interface SessionCompleteProps {
  totalAttempts: number;
  correctCount: number;
  avgBrier: number;
  onContinue: () => void;
  onDone: () => void;
}

function brierLabel(brier: number): string {
  if (brier <= 0.05) return "Excellent calibration";
  if (brier <= 0.15) return "Good calibration";
  if (brier <= 0.3) return "Fair calibration";
  return "Room to improve";
}

export default function SessionComplete({
  totalAttempts,
  correctCount,
  avgBrier,
  onContinue,
  onDone,
}: SessionCompleteProps) {
  const [showBrierInfo, setShowBrierInfo] = useState(false);
  const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg p-6 max-w-lg mx-auto w-full text-center space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Session Complete</h2>
        <p className="text-gray-400 mt-1">You&apos;ve hit your daily target</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-brand-400">{totalAttempts}</p>
          <p className="text-xs text-gray-400">Scenarios</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-400">
            {accuracy.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400">Accuracy</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-400">
            {avgBrier.toFixed(2)}
          </p>
          <button
            onClick={() => setShowBrierInfo(!showBrierInfo)}
            className="text-xs text-gray-400 underline decoration-dotted underline-offset-2 hover:text-gray-200"
          >
            Calibration
          </button>
        </div>
      </div>

      {showBrierInfo && (
        <div className="bg-gray-800/60 rounded-xl p-4 text-sm text-gray-300 text-left leading-relaxed">
          <p className="font-semibold text-gray-200 mb-1">
            Your Brier Score: {avgBrier.toFixed(3)} — {brierLabel(avgBrier)}
          </p>
          <p>
            This measures how well your confidence matches your actual accuracy.
            Lower is better — <strong>0.0</strong> is perfect, <strong>0.25</strong> is like guessing randomly.
            The goal isn&apos;t just to be right, but to <em>know when you&apos;re right</em>.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={onContinue}
          className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
        >
          Keep going
        </button>
        <button
          onClick={onDone}
          className="w-full py-3 bg-gray-800 text-gray-300 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
        >
          View my stats
        </button>
      </div>
    </div>
  );
}
