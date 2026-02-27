"use client";

import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

interface DashboardChartsProps {
  trendData: TrendDataPoint[];
  tagPerformance: TagPerformance[];
  confidenceGap: number;
  totalAttempts: number;
  avgAccuracy: number;
  avgAccuracyScore: number;
  streak: number;
}

function accuracyScoreLabel(score: number): string {
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Good";
  if (score >= 70) return "Fair";
  return "Needs work";
}

function accuracyScoreColor(score: number): string {
  if (score >= 95) return "text-green-400";
  if (score >= 85) return "text-blue-400";
  if (score >= 70) return "text-yellow-400";
  return "text-red-400";
}

// ── Animated counter hook ──────────────────────────────────────────
function useCountUp(target: number, duration = 800, decimals = 0): string {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    startTime.current = null;

    function animate(ts: number) {
      if (!startTime.current) startTime.current = ts;
      const progress = Math.min((ts - startTime.current) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    }

    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, duration]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}

export default function DashboardCharts({
  trendData,
  tagPerformance,
  confidenceGap,
  totalAttempts,
  avgAccuracy,
  avgAccuracyScore,
  streak,
}: DashboardChartsProps) {
  const [showAccuracyInfo, setShowAccuracyInfo] = useState(false);

  // ── Fix: prevent overlap between strengths and blind spots ───────
  const sortedTags = [...tagPerformance].sort(
    (a, b) => b.accuracy - a.accuracy
  );
  const strengths = sortedTags
    .filter((t) => t.attempts >= 3)
    .slice(0, 3);
  const strengthTagNames = new Set(strengths.map((t) => t.tag));
  const blindSpots = sortedTags
    .filter((t) => t.attempts >= 3 && !strengthTagNames.has(t.tag))
    .slice(-3)
    .reverse();

  // ── Streak insight text ──────────────────────────────────────────
  const streakInsight =
    streak >= 10
      ? "On fire! Keep it going."
      : streak >= 5
        ? "Solid run. Stay focused."
        : streak >= 1
          ? "Building momentum."
          : "Every streak starts with one.";

  return (
    <div className="space-y-5">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Scenarios"
          rawValue={totalAttempts}
          icon={
            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Accuracy"
          rawValue={Math.round(avgAccuracy * 100)}
          suffix="%"
          icon={
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Accuracy Score"
          rawValue={avgAccuracyScore}
          subtext={accuracyScoreLabel(avgAccuracyScore)}
          subtextClass={accuracyScoreColor(avgAccuracyScore)}
          onClick={() => setShowAccuracyInfo(!showAccuracyInfo)}
          icon={
            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label="Streak"
          rawValue={streak}
          icon={
            <span className="text-base" role="img" aria-label="fire">
              {streak >= 5 ? "\uD83D\uDD25" : "\u26A1"}
            </span>
          }
          subtext={streakInsight}
        />
      </div>

      {/* Accuracy Score explainer */}
      {showAccuracyInfo && (
        <div className="dash-fade-in bg-gray-800/60 backdrop-blur rounded-xl p-4 text-sm text-gray-300 leading-relaxed border border-gray-700/50">
          <p className="font-semibold text-gray-200 mb-1">
            About Your Accuracy Score
          </p>
          <p>
            This captures how well your confidence tracks reality. Higher is better (0–100).
          </p>
          <ul className="mt-2 space-y-1 text-gray-400">
            <li>
              <strong className="text-green-400">95 – 100</strong> —
              Excellent. You know what you know.
            </li>
            <li>
              <strong className="text-blue-400">85 – 94</strong> — Good.
              Solid self-awareness.
            </li>
            <li>
              <strong className="text-yellow-400">70 – 84</strong> — Fair.
              Confidence often mismatches outcomes.
            </li>
            <li>
              <strong className="text-red-400">0 – 69</strong> — Needs work.
              Systematically miscalibrated.
            </li>
          </ul>
          <p className="mt-2 text-gray-500 text-xs">
            Advanced: Accuracy Score is based on Brier error, a standard probability scoring method.
          </p>
        </div>
      )}

      {/* Confidence Gap gauge */}
      <div className="dash-slide-up bg-gray-900 rounded-xl p-4 border border-gray-800/50">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Confidence Gap
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 rounded-full relative overflow-hidden bg-gray-800">
            {/* Color gradient background */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #f87171, #fbbf24, #34d399, #fbbf24, #f87171)",
                opacity: 0.25,
              }}
            />
            {/* Marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-white/30 transition-all duration-700 ease-out ring-2 ring-white/40"
              style={{
                left: `calc(${Math.min(Math.max((confidenceGap + 0.5) * 100, 2), 98)}% - 6px)`,
              }}
            />
            {/* Center line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-green-400/60" />
          </div>
          <span
            className={`text-sm font-mono w-16 text-right font-semibold ${
              Math.abs(confidenceGap) < 0.05
                ? "text-green-400"
                : confidenceGap > 0
                  ? "text-red-400"
                  : "text-blue-400"
            }`}
          >
            {confidenceGap > 0 ? "+" : ""}
            {(confidenceGap * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1.5">
          <span>Underconfident</span>
          <span className="text-green-500/70">Calibrated</span>
          <span>Overconfident</span>
        </div>
      </div>

      {/* Accuracy trend with gradient area fill */}
      {trendData.length > 1 && (
        <div className="dash-slide-up bg-gray-900 rounded-xl p-4 border border-gray-800/50">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Accuracy Trend (7 days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" fontSize={10} stroke="#6b7280" />
              <YAxis
                domain={[0, 100]}
                fontSize={10}
                stroke="#6b7280"
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
                labelStyle={{ color: "#d1d5db" }}
                formatter={(value) => [
                  `${Number(value).toFixed(0)}%`,
                  "Accuracy",
                ]}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#818cf8"
                strokeWidth={2}
                fill="url(#accuracyGradient)"
                dot={{ fill: "#818cf8", r: 4, strokeWidth: 2, stroke: "#1f2937" }}
                activeDot={{ r: 6, fill: "#a5b4fc", stroke: "#818cf8", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strengths & Blind Spots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {strengths.length > 0 && (
          <div className="dash-slide-up bg-gray-900 rounded-xl p-4 border border-green-900/30">
            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Strengths
            </h3>
            <div className="space-y-3">
              {strengths.map((t) => (
                <TagBar
                  key={t.tag}
                  tag={t.tag}
                  accuracy={t.accuracy}
                  attempts={t.attempts}
                  color="green"
                />
              ))}
            </div>
          </div>
        )}

        {blindSpots.length > 0 && (
          <div className="dash-slide-up bg-gray-900 rounded-xl p-4 border border-red-900/30">
            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Blind Spots
            </h3>
            <div className="space-y-3">
              {blindSpots.map((t) => (
                <TagBar
                  key={t.tag}
                  tag={t.tag}
                  accuracy={t.accuracy}
                  attempts={t.attempts}
                  color="red"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Streak insight */}
      <div className="dash-slide-up bg-gray-900 rounded-xl p-4 border border-gray-800/50">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">
          How Streaks Work
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your current streak counts consecutive correct answers starting from
          your most recent attempt and going backward. One wrong answer resets
          it. Your best streak tracks the longest unbroken run of correct answers
          across your entire history.
        </p>
      </div>
    </div>
  );
}

// ── Stat Card with animated counter ────────────────────────────────
function StatCard({
  label,
  rawValue,
  suffix,
  decimals,
  subtext,
  subtextClass,
  onClick,
  icon,
}: {
  label: string;
  rawValue: number;
  suffix?: string;
  decimals?: number;
  subtext?: string;
  subtextClass?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  const displayValue = useCountUp(rawValue, 800, decimals ?? 0);
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`dash-fade-in bg-gray-900 rounded-xl p-4 text-center border border-gray-800/50 ${
        onClick
          ? "hover:bg-gray-800 hover:border-gray-700 transition-all duration-200 cursor-pointer"
          : ""
      }`}
    >
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className="text-2xl font-bold text-white tabular-nums">
        {displayValue}
        {suffix && <span className="text-lg">{suffix}</span>}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {subtext && (
        <p
          className={`text-[10px] mt-0.5 ${
            subtextClass ??
            (onClick
              ? "text-brand-400 underline decoration-dotted"
              : "text-gray-500")
          }`}
        >
          {subtext}
        </p>
      )}
    </Wrapper>
  );
}

// ── Tag performance bar ────────────────────────────────────────────
function TagBar({
  tag,
  accuracy,
  attempts,
  color,
}: {
  tag: string;
  accuracy: number;
  attempts: number;
  color: "green" | "red";
}) {
  const pct = Math.round(accuracy * 100);
  const barColor =
    color === "green"
      ? "bg-green-500/30"
      : "bg-red-500/30";
  const textColor =
    color === "green" ? "text-green-400" : "text-red-400";

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-300 capitalize">{tag}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{attempts} tries</span>
          <span className={`text-sm font-mono font-semibold ${textColor}`}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} dash-bar-fill`}
          style={
            {
              "--bar-width": `${pct}%`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}
