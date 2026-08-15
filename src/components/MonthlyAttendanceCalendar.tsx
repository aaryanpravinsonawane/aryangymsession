import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { localIso } from "@/lib/streak";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlyAttendanceCalendar({ daySet }: { daySet: Set<string> }) {
  const [cursor, setCursor] = useState(() => new Date());

  const { year, month, monthLabel, weeks, attendedThisMonth, daysInMonth } = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstOfMonth = new Date(y, m, 1);
    const lastOfMonth = new Date(y, m + 1, 0);

    // Monday-start week: Mon=0 .. Sun=6
    const startDow = (firstOfMonth.getDay() + 6) % 7;
    const daysInMo = lastOfMonth.getDate();

    const cells: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Leading padding from previous month
    const leadingDays = startDow;
    const prevMonthLast = new Date(y, m, 0).getDate();
    for (let i = leadingDays - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const date = localIso(new Date(y, m - 1, d));
      cells.push({ date, day: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMo; d++) {
      const date = localIso(new Date(y, m, d));
      cells.push({ date, day: d, isCurrentMonth: true });
    }

    // Trailing padding into next month so grid is full weeks
    const trailingDays = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= trailingDays; d++) {
      const date = localIso(new Date(y, m + 1, d));
      cells.push({ date, day: d, isCurrentMonth: false });
    }

    const chunked: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) chunked.push(cells.slice(i, i + 7));

    const attended = cells.filter((c) => c.isCurrentMonth && daySet.has(c.date)).length;

    return {
      year: y,
      month: m,
      monthLabel: cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      weeks: chunked,
      attendedThisMonth: attended,
      daysInMonth: daysInMo,
    };
  }, [cursor, daySet]);

  const todayIso = localIso(new Date());

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{monthLabel}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {attendedThisMonth}/{daysInMonth} days attended this month
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-lg hover:bg-secondary transition"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {WEEK_DAYS.map((d, i) => (
          <div key={d} className={i === 6 ? "opacity-60" : ""}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell, di) => {
              const isSunday = di === 6;
              const isToday = cell.date === todayIso;
              const attended = daySet.has(cell.date);
              const isCurrent = cell.isCurrentMonth;

              return (
                <div
                  key={cell.date}
                  className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium
                    transition
                    ${isCurrent ? "text-foreground" : "text-muted-foreground/40"}
                    ${isSunday && isCurrent ? "bg-rest/10 text-rest" : ""}
                    ${attended && isCurrent ? "bg-success/15 text-success-foreground" : ""}
                    ${isToday && !attended ? "ring-1 ring-primary" : ""}
                  `}
                >
                  <span>{cell.day}</span>
                  {attended && (
                    <Check className="size-3 mt-0.5 stroke-[3]" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-sm bg-success/15 flex items-center justify-center">
            <Check className="size-2.5 text-success stroke-[3]" />
          </div>
          <span>Attended</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-sm bg-rest/10" />
          <span>Sunday rest</span>
        </div>
      </div>
    </div>
  );
}
