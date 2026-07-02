import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Target, Flame, Beef, Moon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/goals")({
  ssr: false,
  component: GoalsPage,
});

function GoalsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["goal-tracking"],
    queryFn: async () => {
      const [{ data: goal }, { data: weights }] = await Promise.all([
        supabase.from("goals").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("body_weight_logs").select("*").order("date", { ascending: false }).limit(30),
      ]);
      return { goal, weights: weights ?? [] };
    },
  });

  const [type, setType] = useState<"bulk" | "cut">("bulk");
  const [startWeight, setStartWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [rate, setRate] = useState(0.35);

  useEffect(() => {
    if (data?.goal) {
      setType(data.goal.goal_type as "bulk" | "cut");
      setStartWeight(String(data.goal.start_weight));
      setGoalWeight(String(data.goal.goal_weight));
      setRate(Number(data.goal.target_rate));
    } else if (data?.weights[0] && !startWeight) {
      setStartWeight(String(data.weights[0].weight));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user!;
      await supabase.from("goals").update({ active: false }).eq("user_id", user.id).eq("active", true);
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        goal_type: type,
        start_weight: Number(startWeight),
        goal_weight: Number(goalWeight),
        target_rate: rate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Goal saved");
      qc.invalidateQueries({ queryKey: ["goal-tracking"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rateRange = type === "bulk" ? [0.25, 0.5] : [0.5, 1.0];
  // clamp rate when type changes
  useEffect(() => {
    if (rate < rateRange[0]) setRate(rateRange[0]);
    if (rate > rateRange[1]) setRate(rateRange[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const projection = (() => {
    const sw = Number(startWeight), gw = Number(goalWeight);
    if (!sw || !gw || !rate) return null;
    const diff = Math.abs(gw - sw);
    const weeks = Math.ceil(diff / rate);
    const target = new Date();
    target.setDate(target.getDate() + weeks * 7);
    return { weeks, target };
  })();

  const actualRate = (() => {
    if (!data?.weights?.length || data.weights.length < 2) return null;
    const sorted = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28);
    const recent = sorted.filter(w => new Date(w.date) >= cutoff);
    if (recent.length < 2) return null;
    const first = recent[0], last = recent[recent.length - 1];
    const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
    if (days < 7) return null;
    const perWeek = ((Number(last.weight) - Number(first.weight)) / days) * 7;
    return perWeek;
  })();

  const status = (() => {
    if (actualRate === null || !data?.goal) return null;
    const target = type === "bulk" ? rate : -rate;
    const actual = actualRate;
    const diff = actual - target;
    const tolerance = Math.max(Math.abs(target) * 0.3, 0.1);
    if (Math.abs(diff) <= tolerance) return { label: "On track", color: "text-success" };
    if (type === "bulk") return diff > 0 ? { label: "Ahead of pace", color: "text-legs" } : { label: "Behind pace", color: "text-destructive" };
    return diff < 0 ? { label: "Ahead of pace", color: "text-legs" } : { label: "Behind pace", color: "text-destructive" };
  })();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Target /> Bulk / Cut goal</h1>
        <p className="text-sm text-muted-foreground mt-1">Set a target rate and let the tracker keep you honest.</p>
      </div>

      <div className="card-elevated p-5 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {(["bulk", "cut"] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`h-11 rounded-xl font-semibold text-sm transition ${type === t ? (t === "bulk" ? "day-chip-legs" : "day-chip-pull") : "bg-secondary text-muted-foreground"}`}>
              {t === "bulk" ? "Bulk" : "Cut"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Current (kg)</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={startWeight} onChange={e => setStartWeight(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label>Goal (kg)</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} className="h-11" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>{type === "bulk" ? "Gain" : "Loss"} rate</Label>
            <span className="font-mono font-semibold text-sm">{rate.toFixed(2)} kg / week</span>
          </div>
          <Slider min={rateRange[0]} max={rateRange[1]} step={0.05} value={[rate]} onValueChange={([v]) => setRate(v)} />
          <p className="text-[11px] text-muted-foreground">Recommended: {rateRange[0]}–{rateRange[1]} kg/week</p>
        </div>

        <Button onClick={() => save.mutate()} disabled={!startWeight || !goalWeight || save.isPending} className="w-full h-11 font-semibold">
          {data?.goal ? "Update goal" : "Save goal"}
        </Button>
      </div>

      {projection && (
        <div className="card-elevated p-5">
          <h3 className="font-semibold mb-3">Projection</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Weeks</p>
              <p className="text-2xl font-bold mt-1">{projection.weeks}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Target date</p>
              <p className="text-2xl font-bold mt-1">{projection.target.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
            </div>
          </div>
          {actualRate !== null && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Actual (last 4 wks)</p>
                  <p className="font-mono text-lg font-bold mt-1">{actualRate > 0 ? "+" : ""}{actualRate.toFixed(2)} kg/wk</p>
                </div>
                {status && <span className={`font-semibold ${status.color}`}>{status.label}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nutrition reference */}
      <div className="card-elevated p-5 space-y-3">
        <h3 className="font-semibold">Nutrition reference</h3>
        <div className="grid gap-3">
          <RefRow icon={<Flame className="size-4 text-legs" />} label="Bulk calories" value="Surplus 300–500 kcal (~2400–2800 kcal/day)" />
          <RefRow icon={<Beef className="size-4 text-destructive" />} label="Protein" value="1.6–2 g/kg bodyweight (~100–120 g/day)" />
          <RefRow icon={<Moon className="size-4 text-push" />} label="Sleep" value="7–8 hrs · progressive overload weekly" />
        </div>
      </div>
    </div>
  );
}

function RefRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
