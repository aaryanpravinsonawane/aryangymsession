// Local-timezone-safe date utilities & streak calculation

export function localIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build a Set of local ISO dates from workout_logs rows.
 * A day counts if at least one exercise was marked completed that day.
 */
export function workoutDaysSet(logs: { date: string; completed: boolean }[]): Set<string> {
  const s = new Set<string>();
  for (const l of logs) if (l.completed) s.add(l.date);
  return s;
}

/** Current consecutive-day streak ending today (or yesterday if today not logged yet). */
export function currentStreak(daySet: Set<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  const cursor = new Date(today);

  // Grace: if today has no workout, start counting from yesterday.
  if (!daySet.has(localIso(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(localIso(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Longest streak ever. */
export function longestStreak(daySet: Set<string>): number {
  if (daySet.size === 0) return 0;
  const sorted = [...daySet].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

/** Build heatmap cells for the last N days (default 365) ending today. */
export function buildHeatmap(
  daySet: Set<string>,
  prDaySet: Set<string>,
  days = 365,
): { date: string; level: 0 | 1 | 2 | 3 }[] {
  const cells: { date: string; level: 0 | 1 | 2 | 3 }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = localIso(d);
    let level: 0 | 1 | 2 | 3 = 0;
    if (prDaySet.has(iso)) level = 3;
    else if (daySet.has(iso)) level = 2;
    cells.push({ date: iso, level });
  }
  return cells;
}
