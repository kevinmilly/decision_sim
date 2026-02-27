"use client";

import { track } from "@/lib/analytics";

interface MicroLessonProps {
  frameworkName: string;
  nudgeText: string;
  scenarioId: string;
  onSave: () => void;
  saved?: boolean;
}

export default function MicroLesson({
  frameworkName,
  nudgeText,
  scenarioId,
  onSave,
  saved = false,
}: MicroLessonProps) {
  const handleSave = () => {
    onSave();
    track("framework_saved", {
      framework_name: frameworkName,
      scenario_id: scenarioId,
    });
  };

  return (
    <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-800">
      <p className="text-xs uppercase tracking-wide text-brand-600 dark:text-brand-400 font-semibold mb-1">
        Framework: {frameworkName}
      </p>
      <p className="text-sm text-gray-700 dark:text-gray-300">{nudgeText}</p>
      <button
        onClick={handleSave}
        disabled={saved}
        className="mt-2 text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline disabled:opacity-50 disabled:cursor-default"
      >
        {saved ? "Saved to playbook" : "+ Add to playbook"}
      </button>
    </div>
  );
}
