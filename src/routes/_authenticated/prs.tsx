import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DAYS, DAY_META, type DayKey } from "@/lib/day-utils";
import { useState } from "react";
import { Trophy, ChevronDown, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/prs")({
  ssr: false,
  component: PrsPage,
});

function PrsPage() {
  const { data } = useQuery({
    queryKey: ["prs"],
    queryFn: async () => {
      const [{ data: exs }, { data: prs }, { data: history }] = await Promise.all([
        supabase.from("exercises").select("*").order("day").order("order_index"),
        supabase.from("personal_records").select("*"),
        supabase.from("pr_history").select("*").order("date"),
      ]);
      return {
        exercises: exs ?? [],
        prs: Object.fromEntries((prs ?? []).map(p => [p.exercise_id, p])),
        history: (history ?? []).reduce<Record<string, any[]>>((acc, h) => {
          (acc[h.exercise_id] ??= []).push(h);
          return acc;
        }, {}),
      };
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-legs" /> Personal Records</h1>
        <p className="text-sm text-muted-foreground mt-1">Auto-updated whenever you beat a lift.</p>
      </div>

      {DAYS.filter(d => d !== "sunday").map(d => {
        const meta = DAY_META[d as DayKey];
        const exs = data?.exercises.filter(e => e.day === d) ?? [];
        return (
          <div key={d}>
            <h2 className={`text-xs uppercase tracking-widest font-bold mb-2 ${meta.type === "push" ? "text-push" : meta.type === "pull" ? "text-pull" : "text-legs"}`}>
              {meta.label} · {meta.title}
            </h2>
            <div className="space-y-2">
              {exs.map(ex => (
                <PrRow key={ex.id} ex={ex} pr={data?.prs[ex.id]} history={data?.history[ex.id] ?? []} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrRow({ ex, pr, history }: { ex: any; pr?: any; history: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-elevated">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{ex.name}</h3>
          <p className="text-xs text-muted-foreground">{ex.scheme}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pr ? (
            <div className="text-right">
              <p className="font-mono font-bold">{pr.weight} kg × {pr.reps}</p>
              <p className="text-[10px] text-muted-foreground">{pr.date}</p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No PR yet</span>
          )}
          {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        </div>
      </button>
      {open && history.length > 0 && (
        <div className="border-t border-border p-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.map(h => ({ date: h.date, weight: Number(h.weight) }))}>
              <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} width={30} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="var(--color-legs)" strokeWidth={2} dot={{ fill: "var(--color-legs)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {open && history.length === 0 && (
        <div className="border-t border-border p-4 text-center text-xs text-muted-foreground">No PR history yet.</div>
      )}
    </div>
  );
}
