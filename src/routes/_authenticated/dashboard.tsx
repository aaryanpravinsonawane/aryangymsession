import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DAY_META, todayKey, typeChipClass } from "@/lib/day-utils";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Dumbbell, TrendingUp, TrendingDown, Award, Sparkles } from "lucide-react";
import { Heatmap } from "@/components/Heatmap";
import { currentStreak, longestStreak, workoutDaysSet, buildHeatmap } from "@/lib/streak";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const day = todayKey();
  const meta = DAY_META[day];

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [prsRes, wRes, goalRes, logsRes, historyRes, achRes, gsRes] = await Promise.all([
        supabase.from("personal_records").select("*, exercises(name)").order("date", { ascending: false }).limit(3),
        supabase.from("body_weight_logs").select("*").order("date", { ascending: false }).limit(30),
        supabase.from("goals").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("workout_logs").select("date, completed").eq("completed", true),
        supabase.from("pr_history").select("date"),
        supabase.from("achievements").select("badge_type").order("unlocked_at", { ascending: false }).limit(4),
        supabase.from("general_sessions").select("*").order("date", { ascending: false }).limit(50),
      ]);
      return {
        prs: prsRes.data ?? [],
        weights: wRes.data ?? [],
        goal: goalRes.data,
        logs: logsRes.data ?? [],
        prHistory: historyRes.data ?? [],
        achievements: achRes.data ?? [],
        generalSessions: gsRes.data ?? [],
      };
    },
  });

  const currentWeight = data?.weights?.[0]?.weight;
  const goal = data?.goal;
  const goalProgress = (() => {
    if (!goal || !currentWeight) return null;
    const total = Math.abs(Number(goal.goal_weight) - Number(goal.start_weight));
    const done = Math.abs(Number(currentWeight) - Number(goal.start_weight));
    return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  })();

  const daySet = workoutDaysSet((data?.logs ?? []).map(l => ({ date: l.date, completed: !!l.completed })));
  // General sessions also count as "trained" days for streak & heatmap purposes.
  for (const gs of data?.generalSessions ?? []) daySet.add(gs.date);
  const prDaySet = new Set((data?.prHistory ?? []).map(p => p.date));
  const streak = currentStreak(daySet);
  const best = longestStreak(daySet);
  const heatmapCells = buildHeatmap(daySet, prDaySet, 365);

  const weekChange = (() => {
    if (!data?.weights?.length || data.weights.length < 2) return null;
    const now = data.weights[0];
    const weekAgo = data.weights.find(w => {
      const diff = (new Date(now.date).getTime() - new Date(w.date).getTime()) / 86400000;
      return diff >= 6;
    });
    if (!weekAgo) return null;
    return Number(now.weight) - Number(weekAgo.weight);
  })();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-3xl font-bold mt-1">Let's train.</h1>
      </div>

      {/* Streak hero */}
      {streak > 0 && (
        <div className="card-elevated p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Current streak</p>
            <p className="text-2xl font-bold mt-0.5 flex items-center gap-1.5">
              <Flame className="size-6 text-legs" />
              {streak} day{streak === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Longest</p>
            <p className="text-lg font-mono font-bold">{best}</p>
          </div>
        </div>
      )}

      {/* Today's workout card */}
      <Link to="/workout" className="block group">
        <div className={`rounded-2xl p-5 ${typeChipClass(meta.type)} relative overflow-hidden`}>
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-widest opacity-80 font-semibold">Today · {meta.label}</p>
            <h2 className="text-2xl font-bold mt-1">{meta.title}</h2>
            <p className="text-sm opacity-90 mt-1">{meta.subtitle}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
              {meta.type === "rest" ? "Take the day off →" : "Start workout →"}
            </div>
          </div>
        </div>
      </Link>

      {/* Heatmap */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Last 12 months</h3>
          <span className="text-xs text-muted-foreground">{daySet.size} workouts</span>
        </div>
        <Heatmap cells={heatmapCells} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Dumbbell className="size-4" /> PRs
          </div>
          <p className="text-3xl font-bold mt-2">{data?.prs?.length ?? 0}<span className="text-base font-normal text-muted-foreground ml-1">recent</span></p>
        </div>
        <Link to="/achievements" className="card-elevated p-4 block hover:opacity-90 transition">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Award className="size-4" /> BADGES
          </div>
          <p className="text-3xl font-bold mt-2">{data?.achievements?.length ?? 0}<span className="text-base font-normal text-muted-foreground ml-1">unlocked</span></p>
        </Link>
      </div>

      {/* Goal / Weight */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Body weight</h3>
          <Link to="/weight" className="text-xs text-muted-foreground hover:text-foreground">Log →</Link>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <p className="text-3xl font-bold">{currentWeight ? `${currentWeight}` : "—"}<span className="text-base font-normal text-muted-foreground ml-1">kg</span></p>
          {weekChange !== null && (
            <span className={`text-sm font-semibold flex items-center gap-0.5 ${weekChange > 0 ? "text-success" : "text-push"}`}>
              {weekChange > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {weekChange > 0 ? "+" : ""}{weekChange.toFixed(1)} kg / wk
            </span>
          )}
        </div>
        {goal && currentWeight && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{goal.start_weight} kg</span>
              <span className="uppercase tracking-widest font-semibold">{goal.goal_type} → {goal.goal_weight} kg</span>
            </div>
            <Progress value={goalProgress ?? 0} className="h-2" />
          </div>
        )}
      </div>

      {/* Recent PRs */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Trophy className="size-4 text-legs" /> Recent PRs</h3>
          <Link to="/prs" className="text-xs text-muted-foreground hover:text-foreground">All →</Link>
        </div>
        <div className="mt-3 divide-y divide-border">
          {data?.prs?.length ? data.prs.map(pr => (
            <div key={pr.id} className="py-2.5 flex justify-between items-center">
              <span className="text-sm font-medium">{(pr as any).exercises?.name}</span>
              <span className="text-sm font-mono text-muted-foreground">{pr.weight} kg × {pr.reps}</span>
            </div>
          )) : <p className="text-sm text-muted-foreground py-2">No PRs yet — log some sets to get started.</p>}
        </div>
      </div>

      {/* Recent general sessions */}
      {data?.generalSessions?.length ? (
        <div className="card-elevated p-5">
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="size-4 text-pull" /> General sessions</h3>
          <div className="mt-3 divide-y divide-border">
            {data.generalSessions.slice(0, 5).map((gs: any) => (
              <div key={gs.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{gs.note || "General session"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(gs.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {gs.duration_minutes ? ` · ${gs.duration_minutes} min` : ""}
                    {gs.intensity ? ` · ${gs.intensity}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
