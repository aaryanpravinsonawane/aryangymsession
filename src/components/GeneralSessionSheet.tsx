import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { todayIso } from "@/lib/day-utils";

type Intensity = "light" | "moderate" | "hard";

export function GeneralSessionSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<Intensity | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("general_sessions").insert({
        user_id: user.id,
        date: todayIso(),
        note: note.trim() || null,
        duration_minutes: duration ? Number(duration) : null,
        intensity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("General session logged 💪");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["general-sessions"] });
      setNote(""); setDuration(""); setIntensity(null);
      onOpenChange(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Log general session</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">What did you do?</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Full body, light day / cardio only / …"
              className="mt-1"
              rows={3}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Duration (min)</label>
            <Input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 45"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Intensity</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(["light", "moderate", "hard"] as Intensity[]).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIntensity(intensity === i ? null : i)}
                  className={`h-10 rounded-md text-sm font-semibold capitalize transition ${
                    intensity === i ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full h-11"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save session"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
