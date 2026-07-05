import { localIso } from "@/lib/streak";
import { useMemo } from "react";

type Cell = { date: string; level: 0 | 1 | 2 | 3 };

// 52 weeks × 7 days grid, columns = weeks.
export function Heatmap({ cells }: { cells: Cell[] }) {
  const { columns, monthLabels } = useMemo(() => {
    // Align so today is in the rightmost column. Pad the start of the first week
    // with placeholders so each column has 7 rows (Sun..Sat).
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dowToday = today.getDay(); // 0=Sun..6=Sat
    // Pad end so today's column is filled up to Sat.
    const trailing: Cell[] = [];
    for (let i = 1; i <= 6 - dowToday; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      trailing.push({ date: localIso(d), level: 0 });
    }
    const all = [...cells, ...trailing];
    // Pad start so first column starts on Sun.
    const firstDate = new Date(all[0].date + "T00:00:00");
    const dowFirst = firstDate.getDay();
    const leading: Cell[] = [];
    for (let i = dowFirst; i > 0; i--) {
      const d = new Date(firstDate);
      d.setDate(d.getDate() - i);
      leading.push({ date: localIso(d), level: 0 });
    }
    const flat = [...leading, ...all];
    // Chunk into weeks (columns of 7).
    const cols: Cell[][] = [];
    for (let i = 0; i < flat.length; i += 7) cols.push(flat.slice(i, i + 7));

    // Month labels: show label at first column of each new month.
    const labels: (string | null)[] = cols.map((col, idx) => {
      const first = new Date(col[0].date + "T00:00:00");
      if (idx === 0) return first.toLocaleDateString(undefined, { month: "short" });
      const prev = new Date(cols[idx - 1][0].date + "T00:00:00");
      if (first.getMonth() !== prev.getMonth() && first.getDate() <= 7) {
        return first.toLocaleDateString(undefined, { month: "short" });
      }
      return null;
    });

    return { columns: cols, monthLabels: labels };
  }, [cells]);

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="inline-block min-w-full">
        <div className="flex gap-[3px] text-[9px] text-muted-foreground pl-6 mb-1">
          {monthLabels.map((m, i) => (
            <div key={i} className="w-[10px] shrink-0">{m ?? ""}</div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] text-[9px] text-muted-foreground pr-1 w-5 shrink-0">
            <div className="h-[10px]" />
            <div className="h-[10px]">M</div>
            <div className="h-[10px]" />
            <div className="h-[10px]">W</div>
            <div className="h-[10px]" />
            <div className="h-[10px]">F</div>
            <div className="h-[10px]" />
          </div>
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((c) => (
                <div
                  key={c.date}
                  title={`${c.date}${c.level === 3 ? " · PR day" : c.level >= 2 ? " · Workout" : ""}`}
                  className="w-[10px] h-[10px] rounded-[2px]"
                  style={{ background: levelColor(c.level) }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-2 justify-end text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3].map(l => (
            <div key={l} className="w-[10px] h-[10px] rounded-[2px]" style={{ background: levelColor(l as 0|1|2|3) }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function levelColor(level: 0 | 1 | 2 | 3) {
  switch (level) {
    case 0: return "oklch(1 0 0 / 6%)";
    case 1: return "oklch(0.55 0.14 250 / 45%)";
    case 2: return "oklch(0.65 0.19 250)";
    case 3: return "oklch(0.78 0.15 85)"; // gold PR
  }
}
