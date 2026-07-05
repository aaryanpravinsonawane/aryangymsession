// Capacitor Local Notifications wrapper — safely no-ops on web/preview.
import { DAY_META, type DayKey } from "./day-utils";

async function getPlugin() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    return LocalNotifications;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;
  const res = await plugin.requestPermissions();
  return res.display === "granted";
}

const DAY_TO_WEEKDAY: Record<DayKey, number> = {
  // Capacitor: 1=Sun, 2=Mon, ..., 7=Sat
  sunday: 1, monday: 2, tuesday: 3, wednesday: 4, thursday: 5, friday: 6, saturday: 7,
};

// Deterministic notification id per weekday, so rescheduling replaces cleanly.
const BASE_ID = 8100;
const idFor = (day: DayKey) => BASE_ID + DAY_TO_WEEKDAY[day];

export async function cancelAllReminders() {
  const plugin = await getPlugin();
  if (!plugin) return;
  const pending = await plugin.getPending();
  const ids = pending.notifications
    .filter(n => typeof n.id === "number" && n.id >= BASE_ID && n.id < BASE_ID + 20)
    .map(n => ({ id: n.id }));
  if (ids.length) await plugin.cancel({ notifications: ids });
}

export async function scheduleReminders(plannedDays: DayKey[], reminderTime: string) {
  const plugin = await getPlugin();
  if (!plugin) return;
  await cancelAllReminders();
  const [hh, mm] = reminderTime.split(":").map(Number);
  const notifications = plannedDays.map(day => {
    const meta = DAY_META[day];
    const type = meta.type === "rest" ? "session" : meta.type.charAt(0).toUpperCase() + meta.type.slice(1);
    return {
      id: idFor(day),
      title: "Missed workout?",
      body: `You haven't logged today's ${type} session yet 💪`,
      schedule: {
        on: { weekday: DAY_TO_WEEKDAY[day], hour: hh, minute: mm },
        allowWhileIdle: true,
      },
      smallIcon: "ic_stat_icon_config_sample",
    };
  });
  if (notifications.length) await plugin.schedule({ notifications });
}

export async function isNativeAvailable(): Promise<boolean> {
  const plugin = await getPlugin();
  return !!plugin;
}
