export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const DAYS: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const DAY_META: Record<DayKey, { label: string; short: string; type: "push" | "pull" | "legs" | "rest"; title: string; subtitle: string }> = {
  monday:    { label: "Monday",    short: "Mon", type: "push", title: "Push — Heavy",    subtitle: "Chest · Shoulders · Triceps" },
  tuesday:   { label: "Tuesday",   short: "Tue", type: "pull", title: "Pull — Heavy",    subtitle: "Back · Biceps · Rear Delts" },
  wednesday: { label: "Wednesday", short: "Wed", type: "legs", title: "Legs — Heavy",    subtitle: "Quads · Hamstrings · Calves" },
  thursday:  { label: "Thursday",  short: "Thu", type: "push", title: "Push — Volume",   subtitle: "Chest · Shoulders · Triceps" },
  friday:    { label: "Friday",    short: "Fri", type: "pull", title: "Pull — Volume",   subtitle: "Back · Biceps · Rear Delts" },
  saturday:  { label: "Saturday",  short: "Sat", type: "legs", title: "Legs + Core",     subtitle: "Posterior chain · Glutes · Core" },
  sunday:    { label: "Sunday",    short: "Sun", type: "rest", title: "Rest Day",        subtitle: "Recover · Refuel · Repeat" },
};

export function todayKey(): DayKey {
  // JS getDay: 0=Sun..6=Sat
  const map: DayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return map[new Date().getDay()];
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function typeChipClass(type: "push" | "pull" | "legs" | "rest") {
  return type === "push" ? "day-chip-push"
    : type === "pull" ? "day-chip-pull"
    : type === "legs" ? "day-chip-legs"
    : "day-chip-rest";
}

export function typeTextClass(type: "push" | "pull" | "legs" | "rest") {
  return type === "push" ? "text-push"
    : type === "pull" ? "text-pull"
    : type === "legs" ? "text-legs"
    : "text-rest";
}
