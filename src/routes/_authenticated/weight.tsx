import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { todayIso } from "@/lib/day-utils";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/weight")({
  ssr: false,
  component: WeightPage,
});

function WeightPage() {
  const qc = useQueryClient();
  const [w, setW] = useState("");
  const [date, setDate] = useState(todayIso());

  const { data: logs } = useQuery({
    queryKey: ["bodyweight"],
    queryFn: async () => {
      const { data } = await supabase.from("body_weight_logs").select("*").order("date", { ascending: true });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user!;
      const { error } = await supabase.from("body_weight_logs").upsert({
        user_id: user.id, date, weight: Number(w),
      }, { onConflict: "user_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Weight logged");
      setW("");
      qc.invalidateQueries({ queryKey: ["bodyweight"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["goal-tracking"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const stats = (() => {
    if (!logs?.length) return null;
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const last7 = sorted.slice(-7);
    const avg = last7.reduce((s, l) => s + Number(l.weight), 0) / last7.length;
    const now = sorted[sorted.length - 1];
    const weekAgo = sorted.find(l => (new Date(now.date).getTime() - new Date(l.date).getTime()) / 86400000 >= 6);
    const change = weekAgo ? Number(now.weight) - Number(weekAgo.weight) : null;
    return { avg, change, current: Number(now.weight) };
  })();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Body weight</h1>
        <p className="text-sm text-muted-foreground mt-1">One entry per day. Log first thing in the morning for consistency.</p>
      </div>

      <div className="card-elevated p-5">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground font-medium">Weight (kg)</label>
            <Input type="number" inputMode="decimal" step="0.1" value={w} onChange={e => setW(e.target.value)} className="h-11" placeholder="78.5" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11" />
          </div>
          <Button onClick={() => add.mutate()} disabled={!w || add.isPending} className="h-11 font-semibold">Log</Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Current" value={`${stats.current} kg`} />
          <StatCard label="7-day avg" value={`${stats.avg.toFixed(1)} kg`} />
          <StatCard label="Δ / week" value={stats.change !== null ? `${stats.change > 0 ? "+" : ""}${stats.change.toFixed(1)} kg` : "—"} icon={stats.change !== null ? (stats.change > 0 ? <TrendingUp className="size-3.5 text-success" /> : <TrendingDown className="size-3.5 text-push" />) : null} />
        </div>
      )}

      <div className="card-elevated p-4 h-72">
        <h3 className="font-semibold text-sm mb-2 px-2">History</h3>
        {logs && logs.length > 0 ? (
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={logs.map(l => ({ date: l.date, weight: Number(l.weight) }))}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} width={35} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="var(--color-push)" strokeWidth={2.5} dot={{ fill: "var(--color-push)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No entries yet.</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <p className="text-lg font-bold mt-1 flex items-center gap-1">{value} {icon}</p>
    </div>
  );
}
