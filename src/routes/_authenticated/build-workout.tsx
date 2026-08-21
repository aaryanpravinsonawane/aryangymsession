import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DAY_META, DAYS, type DayKey } from "@/lib/day-utils";

export const Route = createFileRoute("/_authenticated/build-workout")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Build My Workout — PPL Tracker" },
      {
        name: "description",
        content:
          "Upload a photo or paste your weekly gym plan and let AI turn it into your PPL Tracker program.",
      },
      { property: "og:title", content: "Build My Workout — PPL Tracker" },
      {
        property: "og:description",
        content: "Turn a photo or pasted text of your weekly split into a tracked workout program.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuildWorkout,
});

type Row = {
  key: string;
  day: DayKey;
  name: string;
  scheme: string;
  muscle_group: string;
};

const PROGRAM_EXISTS =
  "You already have an active workout program. Please delete your existing program before uploading a new one.";

let keySeed = 0;
const newKey = () => `r${++keySeed}`;

function BuildWorkout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"photo" | "text">("photo");
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canParse = tab === "photo" ? !!imageDataUrl : text.trim().length > 0;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Couldn't read that image.");
    reader.readAsDataURL(file);
  };

  const parse = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/parse-workout-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          tab === "photo" ? { imageDataUrl } : { text },
        ),
      });
      const json = (await res.json()) as {
        error?: string;
        exercises?: { day: string; name: string; scheme: string; muscle_group: string }[];
      };
      if (json.error) throw new Error(json.error);
      return json.exercises ?? [];
    },
    onSuccess: (exercises) => {
      setRows(
        exercises.map((e) => ({
          key: newKey(),
          day: (DAYS.includes(e.day as DayKey) ? e.day : "monday") as DayKey,
          name: e.name,
          scheme: e.scheme ?? "",
          muscle_group: e.muscle_group ?? "",
        })),
      );
      toast.success(`Parsed ${exercises.length} exercises — review and save.`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const list = rows ?? [];
      const clean = list.filter((r) => r.name.trim().length > 0);
      if (clean.length === 0) throw new Error("Add at least one exercise before saving.");

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You need to be signed in.");

      const { count, error: countError } = await supabase
        .from("exercises")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (countError) throw countError;
      if ((count ?? 0) > 0) throw new Error(PROGRAM_EXISTS);

      const counters = new Map<string, number>();
      const payload = clean.map((r) => {
        const next = (counters.get(r.day) ?? 0) + 1;
        counters.set(r.day, next);
        return {
          user_id: userId,
          day: r.day,
          name: r.name.trim(),
          scheme: r.scheme.trim() || "3x8-12",
          muscle_group: r.muscle_group.trim() || null,
          order_index: next,
        };
      });

      const { error } = await supabase.from("exercises").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success("Your workout plan is live!");
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const grouped = useMemo(() => {
    const map = new Map<DayKey, Row[]>();
    for (const day of DAYS) map.set(day, []);
    for (const r of rows ?? []) map.get(r.day)?.push(r);
    return map;
  }, [rows]);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) => (prev ?? []).map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const remove = (key: string) => setRows((prev) => (prev ?? []).filter((r) => r.key !== key));

  const addRow = (day: DayKey) =>
    setRows((prev) => [...(prev ?? []), { key: newKey(), day, name: "", scheme: "", muscle_group: "" }]);

  const startOver = () => {
    setRows(null);
    setImageDataUrl("");
    setText("");
  };

  if (rows) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Step 2 of 2</p>
          <h1 className="text-3xl font-bold mt-1">Review your plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit anything that looks off, then save it as your program.
          </p>
        </div>

        {DAYS.map((day) => {
          const dayRows = grouped.get(day) ?? [];
          return (
            <div key={day} className="card-elevated p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{DAY_META[day].label}</h2>
                <Button variant="ghost" size="sm" onClick={() => addRow(day)}>
                  <Plus className="size-4 mr-1" /> Add exercise
                </Button>
              </div>

              {dayRows.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">No exercises for this day.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {dayRows.map((r) => (
                    <div key={r.key} className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2">
                        <Input
                          value={r.name}
                          placeholder="Exercise name"
                          onChange={(e) => update(r.key, { name: e.target.value })}
                        />
                        <Input
                          value={r.scheme}
                          placeholder="3x8-12"
                          onChange={(e) => update(r.key, { scheme: e.target.value })}
                        />
                        <Input
                          value={r.muscle_group}
                          placeholder="Muscle group"
                          onChange={(e) => update(r.key, { muscle_group: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={() => remove(r.key)}
                        aria-label={`Delete ${r.name || "exercise"}`}
                        className="text-muted-foreground hover:text-destructive p-2"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Confirm &amp; Save
          </Button>
          <Button variant="outline" onClick={startOver} disabled={save.isPending}>
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Step 1 of 2</p>
        <h1 className="text-3xl font-bold mt-1">Build my workout</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a photo of your plan or paste it as text — AI turns it into your program.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["photo", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2.5 text-sm font-semibold border transition-colors ${
              tab === t
                ? "border-transparent day-chip-push"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "photo" ? "Upload Photo" : "Paste Text"}
          </button>
        ))}
      </div>

      <div className="card-elevated p-5">
        {tab === "photo" ? (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {imageDataUrl ? (
              <div className="relative w-fit">
                <img
                  src={imageDataUrl}
                  alt="Selected workout plan preview"
                  className="max-h-64 rounded-xl border border-border"
                />
                <button
                  onClick={() => {
                    setImageDataUrl("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  aria-label="Remove photo"
                  className="absolute -top-2 -right-2 rounded-full bg-background border border-border p-1.5"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-border py-10 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ImagePlus className="size-7" />
                <span className="text-sm font-medium">Choose a photo of your plan</span>
              </button>
            )}
          </div>
        ) : (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste your weekly workout plan here... e.g. Monday: Bench Press 3x8-12, Squat..."
          />
        )}
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!canParse || parse.isPending}
        onClick={() => parse.mutate()}
      >
        {parse.isPending ? (
          <Loader2 className="size-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="size-4 mr-2" />
        )}
        Parse My Workout
      </Button>
    </div>
  );
}
