import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DAYS, DAY_META, todayKey, todayIso, typeChipClass, type DayKey } from "@/lib/day-utils";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Trophy, Moon } from "lucide-react";
import { toast } from "sonner";
import { checkAndAwardBadges } from "@/lib/badges";



export const Route = createFileRoute("/_authenticated/workout")({
  ssr: false,
  component: WorkoutPage,
});

const QUOTES: Record<DayKey, string> = {
  monday:    "Iron sharpens iron. Start the week heavy.",
  tuesday:   "Pull yourself toward the person you're becoming.",
  wednesday: "Legs built the ancients. Squat like one.",
  thursday:  "Volume today. Precision over ego.",
  friday:    "Every rep is a deposit.",
  saturday:  "Finish strong. The week rewards those who don't skip.",
  sunday:    "Rest is not the absence of work — it's the completion of it.",
};

function WorkoutPage() {
  const [day, setDay] = useState<DayKey>(todayKey());
  const meta = DAY_META[day];
  const date = todayIso();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["workout", day, date],
    queryFn: async () => {
      const { data: exs } = await supabase.from("exercises").select("*").eq("day", day).order("order_index");
      const ids = (exs ?? []).map(e => e.id);
      const [{ data: logs }, { data: prs }] = await Promise.all([
        ids.length ? supabase.from("workout_logs").select("*").eq("date", date).in("exercise_id", ids) : Promise.resolve({ data: [] as any[] }),
        ids.length ? supabase.from("personal_records").select("*").in("exercise_id", ids) : Promise.resolve({ data: [] as any[] }),
      ]);
      return {
        exercises: exs ?? [],
        logs: Object.fromEntries((logs ?? []).map(l => [l.exercise_id, l])),
        prs: Object.fromEntries((prs ?? []).map(p => [p.exercise_id, p])),
      };
    },
  });

  const upsert = useMutation({
    mutationFn: async (v: { exercise_id: string; weight?: number | null; reps?: number | null; completed?: boolean }) => {
      const user = (await supabase.auth.getUser()).data.user!;
      const existing = data?.logs[v.exercise_id];
      const payload: any = {
        user_id: user.id,
        exercise_id: v.exercise_id,
        date,
        weight: v.weight ?? existing?.weight ?? null,
        reps: v.reps ?? existing?.reps ?? null,
        completed: v.completed ?? existing?.completed ?? false,
        updated_at: new Date().toISOString(),
      };
      const { data: saved, error } = await supabase.from("workout_logs")
        .upsert(payload, { onConflict: "user_id,exercise_id,date" })
        .select().single();
      if (error) throw error;

      // PR check
      if (saved.weight && saved.reps) {
        const existingPr = data?.prs[v.exercise_id];
        const beats = !existingPr
          || Number(saved.weight) > Number(existingPr.weight)
          || (Number(saved.weight) === Number(existingPr.weight) && saved.reps > existingPr.reps);
        if (beats) {
          await supabase.from("personal_records").upsert({
            user_id: user.id,
            exercise_id: v.exercise_id,
            weight: saved.weight,
            reps: saved.reps,
            date,
          }, { onConflict: "user_id,exercise_id" });
          await supabase.from("pr_history").insert({
            user_id: user.id,
            exercise_id: v.exercise_id,
            weight: saved.weight,
            reps: saved.reps,
            date,
          });
          return { pr: true };
        }
      }
      return { pr: false };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["workout", day, date] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["prs"] });
      if (r.pr) toast.success("🏆 New personal record!");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-5">
      {/* Day tabs */}
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {DAYS.map(d => {
            const m = DAY_META[d];
            const isActive = d === day;
            const isToday = d === todayKey();
            return (
              <button key={d} onClick={() => setDay(d)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${isActive ? typeChipClass(m.type) : "bg-secondary text-secondary-foreground"}`}>
                {m.short}{isToday && <span className="ml-1 opacity-70">·</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div>
        <p className={`text-xs uppercase tracking-widest font-semibold ${meta.type === "push" ? "text-push" : meta.type === "pull" ? "text-pull" : meta.type === "legs" ? "text-legs" : "text-rest"}`}>{meta.label}</p>
        <h1 className="text-2xl font-bold mt-0.5">{meta.title}</h1>
        <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
        <blockquote className="mt-3 text-sm italic text-muted-foreground border-l-2 border-border pl-3">"{QUOTES[day]}"</blockquote>
      </div>

      {meta.type === "rest" ? (
        <div className="card-elevated p-8 text-center">
          <Moon className="size-10 mx-auto text-rest mb-3" />
          <h3 className="text-lg font-semibold">Rest day</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">Sleep 7–8 hrs. Walk, stretch, eat well. Your muscles grow now.</p>
        </div>
      ) : isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading…</div>
      ) : (
        <div className="space-y-2">
          {data?.exercises.map(ex => {
            const log = data.logs[ex.id];
            const pr = data.prs[ex.id];
            const isPr = log?.weight && log?.reps && pr && Number(log.weight) === Number(pr.weight) && log.reps === pr.reps && pr.date === date;
            return (
              <ExerciseRow key={ex.id} ex={ex} log={log} isPr={!!isPr}
                onToggle={(completed) => upsert.mutate({ exercise_id: ex.id, completed })}
                onSave={(weight, reps) => upsert.mutate({ exercise_id: ex.id, weight, reps })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExerciseRow({ ex, log, isPr, onToggle, onSave }: {
  ex: any; log?: any; isPr: boolean;
  onToggle: (v: boolean) => void;
  onSave: (weight: number | null, reps: number | null) => void;
}) {
  const [weight, setWeight] = useState<string>(log?.weight?.toString() ?? "");
  const [reps, setReps] = useState<string>(log?.reps?.toString() ?? "");

  return (
    <div className={`card-elevated p-4 ${log?.completed ? "opacity-80" : ""}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={!!log?.completed}
          onCheckedChange={(v) => onToggle(!!v)}
          className="mt-1 size-6"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold leading-tight ${log?.completed ? "line-through text-muted-foreground" : ""}`}>{ex.name}</h3>
            {isPr && <Trophy className="size-4 text-legs shrink-0 mt-0.5" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{ex.scheme} · {ex.muscle_group}</p>

          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Weight (kg)</label>
              <Input type="number" inputMode="decimal" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} className="h-10" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reps</label>
              <Input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} className="h-10" />
            </div>
            <button
              onClick={() => onSave(weight ? Number(weight) : null, reps ? Number(reps) : null)}
              disabled={!weight && !reps}
              className="h-10 mt-4 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
            >Log</button>
          </div>
        </div>
      </div>
    </div>
  );
}
