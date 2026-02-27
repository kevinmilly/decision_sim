"use client";

import { useState } from "react";

interface ConfidenceSliderProps {
  onSubmit: (confidence: number) => void;
}

const LABELS: Record<number, string> = {
  25: "Random guess",
  30: "Slight lean",
  35: "Leaning",
  40: "Some confidence",
  45: "Moderate lean",
  50: "Coin flip",
  55: "Slight edge",
  60: "Somewhat confident",
  65: "Moderately confident",
  70: "Fairly confident",
  75: "Confident",
  80: "Quite confident",
  85: "Very confident",
  90: "Highly confident",
  95: "Virtually certain",
};

function getLabel(value: number): string {
  const keys = Object.keys(LABELS)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (value >= keys[i]) return LABELS[keys[i]];
  }
  return LABELS[50];
}

export default function ConfidenceSlider({ onSubmit }: ConfidenceSliderProps) {
  const [confidence, setConfidence] = useState(70);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 space-y-6 border-t border-gray-700 sm:border sm:border-gray-700">
        <div className="text-center">
          <h3 className="text-xl font-bold text-white">
            How confident are you?
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Calibrate your certainty before seeing the answer
          </p>
        </div>

        <div className="text-center">
          <span className="text-5xl font-bold text-brand-400">
            {confidence}%
          </span>
          <p className="text-sm text-gray-400 mt-1">{getLabel(confidence)}</p>
        </div>

        <div className="px-2">
          <input
            type="range"
            min={25}
            max={95}
            step={5}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>25%</span>
            <span>95%</span>
          </div>
        </div>

        <button
          onClick={() => onSubmit(confidence)}
          className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
        >
          Lock it in
        </button>
      </div>
    </div>
  );
}
