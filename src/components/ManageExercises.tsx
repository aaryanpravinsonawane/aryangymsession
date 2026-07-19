import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { DayKey } from "@/lib/day-utils";

type Exercise = {
  id: string;
  day: string;
  name: string;
  scheme: string;
  muscle_group: string | null;
  order_index: number;
};

export function ManageExercises({ day, open, onOpenChange }: { day: DayKey; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["manage-exercises", day],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").eq("day", day).order("order_index");
      if (error) throw error;
      return data as Exercise[];
    },
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["manage-exercises", day] });
    qc.invalidateQueries({ queryKey: ["workout", day] });
  };

  const create = useMutation({
    mutationFn: async (v: { name: string; scheme: string; muscle_group: string }) => {
      const nextIdx = (exercises[exercises.length - 1]?.order_index ?? -1) + 1;
      const { error } = await supabase.from("exercises").insert({
        day, name: v.name, scheme: v.scheme, muscle_group: v.muscle_group || null, order_index: nextIdx,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setAdding(false); toast.success("Exercise added"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; name: string; scheme: string; muscle_group: string }) => {
      const { error } = await supabase.from("exercises")
        .update({ name: v.name, scheme: v.scheme, muscle_group: v.muscle_group || null })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditingId(null); toast.success("Saved"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (ex: Exercise) => {
      const [{ count: logCount }, { count: prCount }] = await Promise.all([
        supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("exercise_id", ex.id),
        supabase.from("personal_records").select("id", { count: "exact", head: true }).eq("exercise_id", ex.id),
      ]);
      if ((logCount ?? 0) > 0 || (prCount ?? 0) > 0) {
        throw new Error(`Can't delete — has ${logCount ?? 0} log(s) and ${prCount ?? 0} PR(s). Remove those first.`);
      }
      const { error } = await supabase.from("exercises").delete().eq("id", ex.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success("Deleted"); },
    onError: (e) => { toast.error((e as Error).message); setConfirmDelete(null); },
  });

  const reorder = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const i = exercises.findIndex(e => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= exercises.length) return;
      const a = exercises[i], b = exercises[j];
      // swap using a temp value to avoid unique index conflicts if any
      const { error: e1 } = await supabase.from("exercises").update({ order_index: -1 - i }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("exercises").update({ order_index: a.order_index }).eq("id", b.id);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from("exercises").update({ order_index: b.order_index }).eq("id", a.id);
      if (e3) throw e3;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Manage exercises</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
            ) : exercises.length === 0 && !adding ? (
              <p className="text-sm text-muted-foreground text-center py-6">No exercises yet.</p>
            ) : (
              exercises.map((ex, i) => (
                <ExerciseCard
                  key={ex.id}
                  ex={ex}
                  isEditing={editingId === ex.id}
                  canUp={i > 0}
                  canDown={i < exercises.length - 1}
                  onEdit={() => setEditingId(ex.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={(v) => update.mutate({ id: ex.id, ...v })}
                  onDelete={() => setConfirmDelete(ex)}
                  onMove={(dir) => reorder.mutate({ id: ex.id, dir })}
                />
              ))
            )}

            {adding ? (
              <EditForm onCancel={() => setAdding(false)} onSave={(v) => create.mutate(v)} />
            ) : (
              <Button variant="outline" className="w-full mt-2" onClick={() => setAdding(true)}>
                <Plus className="size-4 mr-2" /> Add exercise
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. If logs or PRs exist for this exercise, deletion will be blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && del.mutate(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ExerciseCard({ ex, isEditing, canUp, canDown, onEdit, onCancel, onSave, onDelete, onMove }: {
  ex: Exercise; isEditing: boolean; canUp: boolean; canDown: boolean;
  onEdit: () => void; onCancel: () => void;
  onSave: (v: { name: string; scheme: string; muscle_group: string }) => void;
  onDelete: () => void; onMove: (dir: -1 | 1) => void;
}) {
  if (isEditing) {
    return <EditForm initial={ex} onCancel={onCancel} onSave={onSave} />;
  }
  return (
    <div className="card-elevated p-3 flex items-center gap-2">
      <div className="flex flex-col gap-1">
        <button disabled={!canUp} onClick={() => onMove(-1)} className="p-1 rounded hover:bg-secondary disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-4" /></button>
        <button disabled={!canDown} onClick={() => onMove(1)} className="p-1 rounded hover:bg-secondary disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-4" /></button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate">{ex.name}</p>
        <p className="text-xs text-muted-foreground">{ex.scheme}{ex.muscle_group ? ` · ${ex.muscle_group}` : ""}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit"><Pencil className="size-4" /></Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button>
    </div>
  );
}

function EditForm({ initial, onCancel, onSave }: {
  initial?: Exercise;
  onCancel: () => void;
  onSave: (v: { name: string; scheme: string; muscle_group: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [scheme, setScheme] = useState(initial?.scheme ?? "");
  const [mg, setMg] = useState(initial?.muscle_group ?? "");
  const canSave = name.trim() && scheme.trim();
  return (
    <div className="card-elevated p-3 space-y-2">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Name</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Bench Press" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Scheme</label>
          <Input value={scheme} onChange={e => setScheme(e.target.value)} placeholder="4x8-10" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Muscle group</label>
          <Input value={mg} onChange={e => setMg(e.target.value)} placeholder="Chest" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="size-4 mr-1" />Cancel</Button>
        <Button size="sm" disabled={!canSave} onClick={() => onSave({ name: name.trim(), scheme: scheme.trim(), muscle_group: mg.trim() })}>
          <Check className="size-4 mr-1" />Save
        </Button>
      </div>
    </div>
  );
}
