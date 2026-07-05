import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DAYS, DAY_META, type DayKey } from "@/lib/day-utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Bell, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  requestNotificationPermission,
  scheduleReminders,
  cancelAllReminders,
  isNativeAvailable,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

type Settings = {
  enabled: boolean;
  planned_days: DayKey[];
  reminder_time: string;
};

function SettingsPage() {
  const qc = useQueryClient();
  const [isNative, setIsNative] = useState(false);
  useEffect(() => { isNativeAvailable().then(setIsNative); }, []);

  const { data } = useQuery({
    queryKey: ["notification_settings"],
    queryFn: async (): Promise<Settings> => {
      const user = (await supabase.auth.getUser()).data.user!;
      const { data } = await supabase.from("notification_settings").select("*").eq("user_id", user.id).maybeSingle();
      return {
        enabled: data?.enabled ?? false,
        planned_days: (data?.planned_days as DayKey[]) ?? ["monday","tuesday","wednesday","thursday","friday","saturday"],
        reminder_time: data?.reminder_time ?? "20:00",
      };
    },
  });

  const save = useMutation({
    mutationFn: async (v: Settings) => {
      const user = (await supabase.auth.getUser()).data.user!;
      await supabase.from("notification_settings").upsert({
        user_id: user.id,
        enabled: v.enabled,
        planned_days: v.planned_days,
        reminder_time: v.reminder_time,
      }, { onConflict: "user_id" });

      if (v.enabled) {
        const granted = await requestNotificationPermission();
        if (!granted && isNative) throw new Error("Notification permission denied");
        await scheduleReminders(v.planned_days, v.reminder_time);
      } else {
        await cancelAllReminders();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification_settings"] });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!data) return <div className="text-muted-foreground">Loading…</div>;

  const toggleDay = (d: DayKey) => {
    const planned = data.planned_days.includes(d)
      ? data.planned_days.filter(x => x !== d)
      : [...data.planned_days, d];
    save.mutate({ ...data, planned_days: planned });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage reminders and preferences.</p>
      </div>

      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Bell className="size-4" /> Workout reminders</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Get a nudge if you haven't logged today's session by your check-in time.
            </p>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(v) => save.mutate({ ...data, enabled: !!v })}
          />
        </div>

        {!isNative && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border">
            <Smartphone className="size-4 shrink-0 mt-0.5" />
            <span>Notifications only fire in the installed Android app (Capacitor). This screen still saves your prefs on web.</span>
          </div>
        )}

        {data.enabled && (
          <>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Check-in time</label>
              <Input
                type="time"
                value={data.reminder_time}
                onChange={(e) => save.mutate({ ...data, reminder_time: e.target.value })}
                className="h-10 mt-1"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Planned training days</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DAYS.map(d => {
                  const active = data.planned_days.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition ${
                        active
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "bg-secondary text-secondary-foreground border-border"
                      }`}
                    >
                      {DAY_META[d].short}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
