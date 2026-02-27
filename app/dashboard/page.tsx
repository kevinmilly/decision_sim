"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardCharts from "@/components/DashboardCharts";

interface TrendDataPoint {
  date: string;
  accuracy: number;
  brierScore: number;
  attempts: number;
}

interface TagPerformance {
  tag: string;
  accuracy: number;
  attempts: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    avgAccuracy: 0,
    avgBrier: 0,
    overconfidenceIndex: 0,
    streak: 0,
  });
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [tagPerformance, setTagPerformance] = useState<TagPerformance[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/onboarding");
        return;
      }

      // Recompute stats fresh before loading (in case feed didn't finish)
      await supabase.rpc("recompute_user_stats", { p_user_id: user.id });

      // Load user stats
      const { data: userStats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userStats) {
        setStats({
          totalAttempts: userStats.total_attempts,
          avgAccuracy: parseFloat(userStats.avg_accuracy || "0"),
          avgBrier: parseFloat(userStats.brier_score || "0"),
          overconfidenceIndex: parseFloat(userStats.overconfidence_index || "0"),
          streak: userStats.streak_current || 0,
        });
      }

      // Load recent attempts for trend data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentAttempts } = await supabase
        .from("attempts")
        .select("is_correct, confidence, created_at, scenario_id")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (recentAttempts && recentAttempts.length > 0) {
        // Group by date
        const byDate: Record<string, Array<{ is_correct: boolean; confidence: number }>> = {};
        for (const a of recentAttempts) {
          const date = new Date(a.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          if (!byDate[date]) byDate[date] = [];
          byDate[date].push({
            is_correct: a.is_correct,
            confidence: a.confidence,
          });
        }

        const trend: TrendDataPoint[] = Object.entries(byDate).map(
          ([date, attempts]) => ({
            date,
            accuracy:
              (attempts.filter((a) => a.is_correct).length / attempts.length) *
              100,
            brierScore:
              attempts.reduce((sum, a) => {
                const prob = a.confidence / 100;
                const outcome = a.is_correct ? 1 : 0;
                return sum + Math.pow(prob - outcome, 2);
              }, 0) / attempts.length,
            attempts: attempts.length,
          })
        );
        setTrendData(trend);
      }

      // Load tag performance
      const { data: allAttempts } = await supabase
        .from("attempts")
        .select("is_correct, scenario_id")
        .eq("user_id", user.id);

      if (allAttempts && allAttempts.length > 0) {
        const scenarioIds = [...new Set(allAttempts.map((a) => a.scenario_id))];
        const { data: scenarios } = await supabase
          .from("scenarios")
          .select("id, tags, domain")
          .in("id", scenarioIds);

        if (scenarios) {
          const scenarioMap = new Map(scenarios.map((s) => [s.id, s]));
          const tagStats: Record<string, { correct: number; total: number }> = {};

          for (const attempt of allAttempts) {
            const scenario = scenarioMap.get(attempt.scenario_id);
            if (!scenario) continue;

            // Count by domain
            const domain = scenario.domain;
            if (!tagStats[domain]) tagStats[domain] = { correct: 0, total: 0 };
            tagStats[domain].total++;
            if (attempt.is_correct) tagStats[domain].correct++;

            // Count by tags
            for (const tag of scenario.tags || []) {
              if (!tagStats[tag]) tagStats[tag] = { correct: 0, total: 0 };
              tagStats[tag].total++;
              if (attempt.is_correct) tagStats[tag].correct++;
            }
          }

          setTagPerformance(
            Object.entries(tagStats)
              .filter(([, v]) => v.total >= 2)
              .map(([tag, v]) => ({
                tag,
                accuracy: v.correct / v.total,
                attempts: v.total,
              }))
          );
        }
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg text-gray-500">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-8">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="font-bold text-white">Dashboard</h1>
        <button
          onClick={() => router.push("/feed")}
          className="text-sm text-brand-400 font-medium hover:text-brand-300"
        >
          Start scenarios
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {stats.totalAttempts === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Complete some scenarios to see your stats here.
            </p>
            <button
              onClick={() => router.push("/feed")}
              className="mt-4 px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold"
            >
              Start training
            </button>
          </div>
        ) : (
          <DashboardCharts
            trendData={trendData}
            tagPerformance={tagPerformance}
            overconfidenceIndex={stats.overconfidenceIndex}
            totalAttempts={stats.totalAttempts}
            avgAccuracy={stats.avgAccuracy}
            avgBrier={stats.avgBrier}
            streak={stats.streak}
          />
        )}
      </div>
    </main>
  );
}
