interface UserProfile {
  interests: string[];
  skill_level: number;
}

interface Scenario {
  id: string;
  domain: string;
  difficulty: number;
  tags: string[];
}

interface RecentAttempt {
  scenario_id: string;
  is_correct: boolean;
  created_at: string;
}

/**
 * Generate a personalized feed of scenario IDs.
 *
 * Rules:
 * 1. 80% from user's interest domains, 20% from other domains
 * 2. Difficulty centered on user's skill_level (+/- 1)
 * 3. Exclude scenarios attempted in the last 90 days
 * 4. Return up to `limit` scenario IDs
 */
export function generateFeed(
  allScenarios: Scenario[],
  recentAttempts: RecentAttempt[],
  profile: UserProfile,
  limit: number = 10
): string[] {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentIds = new Set(
    recentAttempts
      .filter((a) => new Date(a.created_at) > ninetyDaysAgo)
      .map((a) => a.scenario_id)
  );

  const available = allScenarios.filter((s) => !recentIds.has(s.id));

  // Difficulty window: skill_level +/- 1
  const minDiff = Math.max(1, profile.skill_level - 1);
  const maxDiff = Math.min(5, profile.skill_level + 1);

  const inDifficulty = available.filter(
    (s) => s.difficulty >= minDiff && s.difficulty <= maxDiff
  );

  // If not enough in range, use all available
  const pool = inDifficulty.length >= limit ? inDifficulty : available;

  // Split into interest-matching and other
  const interestLower = profile.interests.map((i) => i.toLowerCase());
  const interestPool = pool.filter(
    (s) =>
      interestLower.includes(s.domain.toLowerCase()) ||
      s.tags.some((t) => interestLower.includes(t.toLowerCase()))
  );
  const otherPool = pool.filter(
    (s) =>
      !interestLower.includes(s.domain.toLowerCase()) &&
      !s.tags.some((t) => interestLower.includes(t.toLowerCase()))
  );

  // 80/20 split
  const interestCount = Math.ceil(limit * 0.8);
  const otherCount = limit - interestCount;

  const selected: Scenario[] = [];

  // Pick from interest pool (shuffled)
  shuffle(interestPool);
  selected.push(...interestPool.slice(0, interestCount));

  // Fill with other pool
  shuffle(otherPool);
  selected.push(...otherPool.slice(0, otherCount));

  // If still not enough, add any remaining available
  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((s) => s.id));
    const rest = pool.filter((s) => !selectedIds.has(s.id));
    shuffle(rest);
    selected.push(...rest.slice(0, limit - selected.length));
  }

  // Final shuffle to mix interest and other scenarios
  shuffle(selected);

  return selected.map((s) => s.id);
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Adjust skill level based on recent performance.
 * If accuracy in last 20 attempts > 80%, increase. If < 40%, decrease.
 */
export function suggestSkillAdjustment(
  currentLevel: number,
  recentAttempts: Array<{ is_correct: boolean }>
): number {
  if (recentAttempts.length < 10) return currentLevel;

  const last20 = recentAttempts.slice(-20);
  const accuracy = last20.filter((a) => a.is_correct).length / last20.length;

  if (accuracy > 0.8 && currentLevel < 5) return currentLevel + 1;
  if (accuracy < 0.4 && currentLevel > 1) return currentLevel - 1;
  return currentLevel;
}
