import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { todayIso } from "@/lib/day-utils";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/diet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diet & Macros — PPL Tracker" },
      { name: "description", content: "Log meals and track calories, protein, carbs, fat and fiber daily, weekly and monthly." },
      { property: "og:title", content: "Diet & Macros — PPL Tracker" },
      { property: "og:description", content: "Log meals and track calories, protein, carbs, fat and fiber daily, weekly and monthly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DietPage,
});

type View = "daily" | "weekly" | "monthly";

type Food = {
  id: string;
  name: string;
  category: string;
  serving_label: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  calories: number;
};

type LogRow = { id: string; food_id: string; date: string; quantity: number; foods: Food | null };

const CATEGORY_LABEL: Record<string, string> = {
  grains: "Grains",
  dal: "Dal & legumes",
  sabzi: "Sabzi",
  non_veg: "Non-veg & eggs",
  dairy: "Dairy",
  snacks: "Snacks",
  other: "Other",
};

const VIEWS: { key: View; label: string; days: number }[] = [
  { key: "daily", label: "Daily", days: 1 },
  { key: "weekly", label: "Weekly", days: 7 },
  { key: "monthly", label: "Monthly", days: 30 },
];

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function DietPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("daily");
  const [open, setOpen] = useState(false);
  const [foodId, setFoodId] = useState("");
  const [qty, setQty] = useState("1");
  const today = todayIso();

  const { data: foods } = useQuery({
    queryKey: ["foods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("foods").select("*").order("category").order("name");
      if (error) throw error;
      return (data ?? []) as Food[];
    },
    staleTime: 1000 * 60 * 60,
  });

  const days = VIEWS.find(v => v.key === view)!.days;
  const from = days === 1 ? today : isoDaysAgo(days - 1);

  const { data: logs } = useQuery({
    queryKey: ["diet-logs", view],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diet_logs")
        .select("id, food_id, date, quantity, foods(*)")
        .gte("date", from)
        .lte("date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
  });

  const { data: todayLogs } = useQuery({
    queryKey: ["diet-logs", "today", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diet_logs")
        .select("id, food_id, date, quantity, foods(*)")
        .eq("date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
  });

  const selectedFood = foods?.find(f => f.id === foodId);

  const grouped = useMemo(() => {
    const map = new Map<string, Food[]>();
    (foods ?? []).forEach(f => {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    });
    return [...map.entries()];
  }, [foods]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["diet-logs"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user!;
      const { error } = await supabase.from("diet_logs").insert({
        user_id: user.id, food_id: foodId, date: today, quantity: Number(qty),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added to today's log");
      setFoodId("");
      setQty("1");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diet_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["diet-logs"] });
      const snapshot = qc.getQueriesData<LogRow[]>({ queryKey: ["diet-logs"] });
      snapshot.forEach(([key, rows]) => {
        if (rows) qc.setQueryData(key, rows.filter(r => r.id !== id));
      });
      return { snapshot };
    },
    onError: (e, _id, ctx) => {
      ctx?.snapshot.forEach(([key, rows]) => qc.setQueryData(key, rows));
      toast.error((e as Error).message);
    },
    onSettled: invalidate,
  });

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    (logs ?? []).forEach(l => {
      if (!l.foods) return;
      const q = Number(l.quantity);
      t.calories += Number(l.foods.calories) * q;
      t.protein += Number(l.foods.protein_g) * q;
      t.carbs += Number(l.foods.carbs_g) * q;
      t.fat += Number(l.foods.fat_g) * q;
      t.fiber += Number(l.foods.fiber_g) * q;
    });
    return t;
  }, [logs]);

  const pieData = [
    { name: "Protein", value: Math.round(totals.protein * 10) / 10, color: "var(--color-push)" },
    { name: "Carbs", value: Math.round(totals.carbs * 10) / 10, color: "var(--color-pull)" },
    { name: "Fat", value: Math.round(totals.fat * 10) / 10, color: "var(--color-legs)" },
    { name: "Fiber", value: Math.round(totals.fiber * 10) / 10, color: "var(--color-success)" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Diet</h1>
        <p className="text-sm text-muted-foreground mt-1">Log what you eat and keep your macros honest.</p>
      </div>

      {/* Add food */}
      <div className="card-elevated p-5 space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="min-w-0">
            <label className="text-xs text-muted-foreground font-medium">Food</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="h-11 w-full justify-between font-normal">
                  <span className="truncate">{selectedFood ? selectedFood.name : "Search foods…"}</span>
                  <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[min(92vw,26rem)]" align="start">
                <Command>
                  <CommandInput placeholder="Search foods…" />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No food found.</CommandEmpty>
                    {grouped.map(([cat, items]) => (
                      <CommandGroup key={cat} heading={CATEGORY_LABEL[cat] ?? cat}>
                        {items.map(f => (
                          <CommandItem
                            key={f.id}
                            value={`${f.name} ${f.serving_label}`}
                            onSelect={() => { setFoodId(f.id); setOpen(false); }}
                          >
                            <Check className={`size-4 ${foodId === f.id ? "opacity-100" : "opacity-0"}`} />
                            <span className="flex-1">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground">{f.serving_label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-20">
            <label className="text-xs text-muted-foreground font-medium">Qty</label>
            <Input type="number" inputMode="decimal" step="0.5" min="0.5" value={qty} onChange={e => setQty(e.target.value)} className="h-11" />
          </div>
        </div>
        {selectedFood && (
          <p className="text-xs text-muted-foreground">
            {selectedFood.serving_label} · {Math.round(Number(selectedFood.calories) * Number(qty || 0))} kcal ·
            {" "}{(Number(selectedFood.protein_g) * Number(qty || 0)).toFixed(1)}g protein
          </p>
        )}
        <Button onClick={() => add.mutate()} disabled={!foodId || !qty || add.isPending} className="w-full h-11 font-semibold">Add</Button>
      </div>

      {/* View toggle */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-secondary">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`h-9 rounded-lg text-xs font-semibold transition-colors ${view === v.key ? "bg-background text-foreground" : "text-muted-foreground"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Calories" value={`${Math.round(totals.calories)}`} />
        <StatCard label="Protein" value={`${totals.protein.toFixed(0)} g`} />
        <StatCard label="Carbs" value={`${totals.carbs.toFixed(0)} g`} />
        <StatCard label="Fat" value={`${totals.fat.toFixed(0)} g`} />
        <StatCard label="Fiber" value={`${totals.fiber.toFixed(0)} g`} />
      </div>

      {/* Pie */}
      <div className="card-elevated p-4 h-72">
        <h3 className="font-semibold text-sm mb-2 px-2">Macro split (g)</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="88%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="var(--color-card)">
                {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip
                formatter={(v: number, n: string) => [`${v} g`, n]}
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No entries yet.</div>
        )}
      </div>

      {/* Today's log */}
      <div className="card-elevated p-4">
        <h3 className="font-semibold text-sm mb-3 px-1">Today's log</h3>
        {todayLogs && todayLogs.length > 0 ? (
          <ul className="divide-y divide-border">
            {todayLogs.map(l => {
              const q = Number(l.quantity);
              const f = l.foods;
              return (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f?.name ?? "Unknown"} <span className="text-muted-foreground font-normal">×{q}</span></p>
                    {f && (
                      <p className="text-[11px] text-muted-foreground">
                        {Math.round(Number(f.calories) * q)} kcal · P {(Number(f.protein_g) * q).toFixed(1)} · C {(Number(f.carbs_g) * q).toFixed(1)} · F {(Number(f.fat_g) * q).toFixed(1)} · Fib {(Number(f.fiber_g) * q).toFixed(1)}
                      </p>
                    )}
                  </div>
                  <button onClick={() => remove.mutate(l.id)} className="text-muted-foreground hover:text-destructive p-2" aria-label={`Remove ${f?.name ?? "entry"}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground px-1 py-4">No entries yet.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}
