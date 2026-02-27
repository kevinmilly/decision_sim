export type FeedbackLabel =
  | "correct_calibrated"
  | "correct_overconfident"
  | "wrong_overconfident"
  | "wrong_underconfident";

export interface AttemptResult {
  isCorrect: boolean;
  confidence: number; // 25–95
  responseTimeMs: number;
}

export interface ScoreBreakdown {
  brierScore: number;      // internal; lower is better
  accuracyScore: number;   // 0–100, higher is better; derived from brier
  feedbackLabel: FeedbackLabel;
  feedbackText: string;
  calibrationDelta: number; // positive = overconfident
  speedBucket: "fast" | "moderate" | "slow";
}

/**
 * Convert a Brier score to a 0–100 Accuracy Score.
 * brier 0 → 100 (perfect), brier 1 → 0 (worst).
 */
export function brierToAccuracyScore(brier: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 * (1 - brier))));
}

/**
 * Brier score for a single prediction.
 * Lower is better. Range: 0 (perfect) to 1 (worst).
 * Formula: (confidence/100 - outcome)^2
 */
export function brierScore(confidence: number, isCorrect: boolean): number {
  const prob = confidence / 100;
  const outcome = isCorrect ? 1 : 0;
  return Math.round(Math.pow(prob - outcome, 2) * 10000) / 10000;
}

/**
 * Average Brier score across multiple attempts.
 */
export function avgBrierScore(
  attempts: Array<{ confidence: number; isCorrect: boolean }>
): number {
  if (attempts.length === 0) return 0;
  const sum = attempts.reduce(
    (acc, a) => acc + brierScore(a.confidence, a.isCorrect),
    0
  );
  return Math.round((sum / attempts.length) * 10000) / 10000;
}

/**
 * Overconfidence index = avg(confidence/100) - accuracy
 * Positive = overconfident, negative = underconfident
 */
export function overconfidenceIndex(
  attempts: Array<{ confidence: number; isCorrect: boolean }>
): number {
  if (attempts.length === 0) return 0;
  const avgConf =
    attempts.reduce((s, a) => s + a.confidence, 0) / attempts.length / 100;
  const accuracy =
    attempts.filter((a) => a.isCorrect).length / attempts.length;
  return Math.round((avgConf - accuracy) * 10000) / 10000;
}

/**
 * Determine the feedback label for a single attempt.
 * "Calibrated" threshold: confidence within 15% of actual outcome probability.
 */
export function getFeedbackLabel(
  confidence: number,
  isCorrect: boolean
): FeedbackLabel {
  const prob = confidence / 100;
  // For a single binary outcome, the "ideal" confidence is 1 if correct, 0 if wrong.
  // We consider overconfident if confidence > 65% and wrong,
  // or if confidence > 85% and correct (barely — this is well-calibrated).
  if (isCorrect) {
    return prob > 0.85 ? "correct_overconfident" : "correct_calibrated";
  } else {
    return prob > 0.65 ? "wrong_overconfident" : "wrong_underconfident";
  }
}

export function getFeedbackText(label: FeedbackLabel): string {
  switch (label) {
    case "correct_calibrated":
      return "Correct & well-calibrated";
    case "correct_overconfident":
      return "Correct, but overconfident";
    case "wrong_overconfident":
      return "Wrong & overconfident — recalibrate";
    case "wrong_underconfident":
      return "Wrong, but appropriately uncertain";
  }
}

/**
 * Categorize response speed into buckets.
 */
export function getSpeedBucket(
  responseTimeMs: number
): "fast" | "moderate" | "slow" {
  if (responseTimeMs < 5000) return "fast";
  if (responseTimeMs < 15000) return "moderate";
  return "slow";
}

/**
 * Reduce Brier penalty for low-defensibility scenarios.
 * Defensibility 1-100: at 100 no reduction, at 1 up to 50% reduction.
 * Only applies when the user got it wrong — correct answers aren't penalized anyway.
 */
export function adjustedBrierScore(
  confidence: number,
  isCorrect: boolean,
  answerDefensibility: number
): number {
  const raw = brierScore(confidence, isCorrect);
  if (isCorrect || answerDefensibility >= 80) return raw;
  // Scale reduction: defensibility 1 → 50% reduction, 79 → ~1% reduction
  const reductionFactor = 0.5 * (1 - answerDefensibility / 80);
  return Math.round(raw * (1 - reductionFactor) * 10000) / 10000;
}

/**
 * Compute the full score breakdown for a single attempt.
 * Pass answerDefensibility (1-100) to reduce penalty on ambiguous scenarios.
 */
export function scoreAttempt(
  attempt: AttemptResult,
  answerDefensibility?: number
): ScoreBreakdown {
  const bs =
    answerDefensibility != null
      ? adjustedBrierScore(attempt.confidence, attempt.isCorrect, answerDefensibility)
      : brierScore(attempt.confidence, attempt.isCorrect);
  const label = getFeedbackLabel(attempt.confidence, attempt.isCorrect);
  const calibrationDelta = attempt.confidence / 100 - (attempt.isCorrect ? 1 : 0);

  return {
    brierScore: bs,
    accuracyScore: brierToAccuracyScore(bs),
    feedbackLabel: label,
    feedbackText: getFeedbackText(label),
    calibrationDelta,
    speedBucket: getSpeedBucket(attempt.responseTimeMs),
  };
}

/**
 * Compute rolling accuracy for the last N attempts.
 */
export function rollingAccuracy(
  attempts: Array<{ isCorrect: boolean }>,
  window: number = 20
): number {
  const slice = attempts.slice(-window);
  if (slice.length === 0) return 0;
  return slice.filter((a) => a.isCorrect).length / slice.length;
}

/**
 * Map daily target minutes to card count.
 */
export function dailyTargetToCards(minutes: number): number {
  switch (minutes) {
    case 2:
      return 4;
    case 5:
      return 10;
    case 10:
      return 20;
    default:
      return 10;
  }
}
