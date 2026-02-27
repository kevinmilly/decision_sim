"use client";

interface CommunityInsightsProps {
  optionDistribution: Record<string, number>;
  totalAttempts: number;
  accuracyRate: number;
  options: Array<{ key: string; text: string }>;
  correctOption: string;
}

export default function CommunityInsights({
  optionDistribution,
  totalAttempts,
  accuracyRate,
  options,
  correctOption,
}: CommunityInsightsProps) {
  if (totalAttempts < 5) return null;

  const maxCount = Math.max(...Object.values(optionDistribution), 1);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Community Results ({totalAttempts} attempts)
      </h4>

      <div className="space-y-2">
        {options.map((opt) => {
          const count = optionDistribution[opt.key] || 0;
          const pct = totalAttempts > 0 ? (count / totalAttempts) * 100 : 0;
          const isCorrect = opt.key === correctOption;

          return (
            <div key={opt.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span
                  className={
                    isCorrect
                      ? "font-semibold text-green-600"
                      : "text-gray-600 dark:text-gray-400"
                  }
                >
                  {opt.key}
                </span>
                <span className="text-gray-500">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isCorrect ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Community accuracy: {(accuracyRate * 100).toFixed(0)}%
      </p>
    </div>
  );
}
