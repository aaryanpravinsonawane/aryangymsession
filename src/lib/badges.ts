import { supabase } from "@/integrations/supabase/client";
import { currentStreak, workoutDaysSet } from "./streak";

export type BadgeDef = {
  type: string;
  label: string;
  description: string;
  icon: string; // emoji
  category: "streak" | "strength" | "consistency" | "pr";
};

export const BADGES: BadgeDef[] = [
  // Streak
  { type: "streak_7",   label: "One Week Warrior",   description: "7-day workout streak",   icon: "🔥", category: "streak" },
  { type: "streak_30",  label: "Iron Habit",         description: "30-day workout streak",  icon: "⚡", category: "streak" },
  { type: "streak_100", label: "Unbreakable",        description: "100-day workout streak", icon: "💎", category: "streak" },
  // Strength — Squat
  { type: "squat_60",   label: "Squat 60kg",         description: "First 60 kg squat",      icon: "🦵", category: "strength" },
  { type: "squat_80",   label: "Squat 80kg",         description: "First 80 kg squat",      icon: "🦵", category: "strength" },
  { type: "squat_100",  label: "Squat 100kg",        description: "First 100 kg squat",     icon: "🦵", category: "strength" },
  { type: "squat_120",  label: "Squat 120kg",        description: "First 120 kg squat",     icon: "🦵", category: "strength" },
  // Bench
  { type: "bench_60",   label: "Bench 60kg",         description: "First 60 kg bench",      icon: "🏋️", category: "strength" },
  { type: "bench_80",   label: "Bench 80kg",         description: "First 80 kg bench",      icon: "🏋️", category: "strength" },
  { type: "bench_100",  label: "Bench 100kg",        description: "First 100 kg bench",     icon: "🏋️", category: "strength" },
  { type: "bench_120",  label: "Bench 120kg",        description: "First 120 kg bench",     icon: "🏋️", category: "strength" },
  // Deadlift
  { type: "deadlift_60",  label: "Deadlift 60kg",  description: "First 60 kg deadlift",  icon: "💪", category: "strength" },
  { type: "deadlift_80",  label: "Deadlift 80kg",  description: "First 80 kg deadlift",  icon: "💪", category: "strength" },
  { type: "deadlift_100", label: "Deadlift 100kg", description: "First 100 kg deadlift", icon: "💪", category: "strength" },
  { type: "deadlift_120", label: "Deadlift 120kg", description: "First 120 kg deadlift", icon: "💪", category: "strength" },
  // Consistency
  { type: "logs_10",    label: "Getting Started",  description: "10 workouts logged",  icon: "✅", category: "consistency" },
  { type: "logs_50",    label: "Half Century",     description: "50 workouts logged",  icon: "🥉", category: "consistency" },
  { type: "logs_100",   label: "Century Club",     description: "100 workouts logged", icon: "🏆", category: "consistency" },
  // PR
  { type: "pr_any",     label: "New PR",           description: "Set a new personal record", icon: "🎯", category: "pr" },
];

const STRENGTH_THRESHOLDS = [60, 80, 100, 120];
const LIFT_KEYS = ["squat", "bench", "deadlift"] as const;
type LiftKey = (typeof LIFT_KEYS)[number];

function matchLift(name: string): LiftKey | null {
  const n = name.toLowerCase();
  if (n.includes("squat")) return "squat";
  if (n.includes("deadlift")) return "deadlift";
  if (n.includes("bench")) return "bench";
  return null;
}

export type BadgeCheckContext = {
  userId: string;
  triggeredPr?: boolean;
  latestLift?: { name: string; weight: number };
};

/** Check all badges and insert any new unlocks. Returns newly unlocked badge defs. */
export async function checkAndAwardBadges(ctx: BadgeCheckContext): Promise<BadgeDef[]> {
  const [{ data: existing }, { data: logs }, { data: prs }, { data: exs }, { data: gs }] = await Promise.all([
    supabase.from("achievements").select("badge_type").eq("user_id", ctx.userId),
    supabase.from("workout_logs").select("date, completed, weight, exercise_id").eq("user_id", ctx.userId),
    supabase.from("personal_records").select("weight, exercise_id").eq("user_id", ctx.userId),
    supabase.from("exercises").select("id, name"),
    supabase.from("general_sessions").select("date").eq("user_id", ctx.userId),
  ]);
  const owned = new Set((existing ?? []).map(r => r.badge_type));
  const toUnlock: string[] = [];

  // Streak — union workout logs with free-form general sessions
  const daySet = workoutDaysSet((logs ?? []).map(l => ({ date: l.date, completed: !!l.completed })));
  for (const g of gs ?? []) daySet.add(g.date);
  const streak = currentStreak(daySet);
  if (streak >= 7   && !owned.has("streak_7"))   toUnlock.push("streak_7");
  if (streak >= 30  && !owned.has("streak_30"))  toUnlock.push("streak_30");
  if (streak >= 100 && !owned.has("streak_100")) toUnlock.push("streak_100");

  // Consistency: total completed workout-days
  const workoutDays = daySet.size;
  if (workoutDays >= 10  && !owned.has("logs_10"))  toUnlock.push("logs_10");
  if (workoutDays >= 50  && !owned.has("logs_50"))  toUnlock.push("logs_50");
  if (workoutDays >= 100 && !owned.has("logs_100")) toUnlock.push("logs_100");

  // Strength: check max weight per tracked lift across all logs & prs
  const exById = Object.fromEntries((exs ?? []).map(e => [e.id, e.name as string]));
  const maxByLift: Record<LiftKey, number> = { squat: 0, bench: 0, deadlift: 0 };
  const collect = (exercise_id: string, weight: number | null) => {
    if (!weight) return;
    const lift = matchLift(exById[exercise_id] ?? "");
    if (!lift) return;
    if (Number(weight) > maxByLift[lift]) maxByLift[lift] = Number(weight);
  };
  (logs ?? []).forEach(l => collect(l.exercise_id, l.weight as number | null));
  (prs ?? []).forEach(p => collect(p.exercise_id, p.weight as number | null));

  for (const lift of LIFT_KEYS) {
    for (const t of STRENGTH_THRESHOLDS) {
      const key = `${lift}_${t}`;
      if (maxByLift[lift] >= t && !owned.has(key)) toUnlock.push(key);
    }
  }

  // PR badge — one-off
  if (ctx.triggeredPr && !owned.has("pr_any")) toUnlock.push("pr_any");

  if (toUnlock.length === 0) return [];
  await supabase.from("achievements").insert(
    toUnlock.map(badge_type => ({ user_id: ctx.userId, badge_type }))
  );
  return BADGES.filter(b => toUnlock.includes(b.type));
}
