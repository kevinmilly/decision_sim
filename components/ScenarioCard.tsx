"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

interface Option {
  key: string;
  text: string;
}

interface Scenario {
  id: string;
  domain: string;
  difficulty: number;
  prompt: string;
  options: Option[];
}

interface ScenarioCardProps {
  scenario: Scenario;
  onSelect: (optionKey: string, responseTimeMs: number) => void;
  selectedOption: string | null;
}

export default function ScenarioCard({
  scenario,
  onSelect,
  selectedOption,
}: ScenarioCardProps) {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();
    track("scenario_viewed", {
      scenario_id: scenario.id,
      domain: scenario.domain,
      difficulty: scenario.difficulty,
    });
  }, [scenario.id, scenario.domain, scenario.difficulty]);

  const handleSelect = (key: string) => {
    if (selectedOption) return;
    const elapsed = Date.now() - mountTime.current;
    onSelect(key, elapsed);
  };

  const difficultyLabel = ["", "Beginner", "Easy", "Medium", "Hard", "Expert"][
    scenario.difficulty
  ];

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg p-6 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-400 bg-brand-900/30 px-2 py-1 rounded-full">
          {scenario.domain}
        </span>
        <span className="text-xs text-gray-500">{difficultyLabel}</span>
      </div>

      <p className="text-lg font-medium text-white mb-6 leading-relaxed">
        {scenario.prompt}
      </p>

      <div className="space-y-3">
        {scenario.options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleSelect(opt.key)}
            disabled={!!selectedOption}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              selectedOption === opt.key
                ? "border-brand-500 bg-brand-900/20"
                : selectedOption
                  ? "border-gray-800 opacity-60"
                  : "border-gray-700 hover:border-brand-400 hover:bg-gray-800"
            }`}
          >
            <span className="font-semibold text-brand-400 mr-2">
              {opt.key}.
            </span>
            <span className="text-gray-200">
              {opt.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
