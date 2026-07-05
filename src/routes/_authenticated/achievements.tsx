import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BADGES } from "@/lib/badges";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/achievements")({
  ssr: false,
  component: AchievementsPage,
});

function AchievementsPage() {
  const { data } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("*");
      return Object.fromEntries((data ?? []).map(a => [a.badge_type, a]));
    },
  });

  const unlocked = data ?? {};
  const totalUnlocked = Object.keys(unlocked).length;
  const groups = ["streak", "strength", "consistency", "pr"] as const;
  const groupLabels: Record<typeof groups[number], string> = {
    streak: "Streak", strength: "Strength Milestones", consistency: "Consistency", pr: "Personal Records",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalUnlocked} of {BADGES.length} unlocked
        </p>
      </div>

      {groups.map(g => {
        const items = BADGES.filter(b => b.category === g);
        return (
          <div key={g}>
            <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
              {groupLabels[g]}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {items.map(b => {
                const u = unlocked[b.type];
                const isUnlocked = !!u;
                return (
                  <div
                    key={b.type}
                    title={isUnlocked ? `Unlocked ${new Date(u.unlocked_at).toLocaleDateString()}` : "Locked"}
                    className={`card-elevated p-3 text-center transition ${isUnlocked ? "" : "opacity-40 grayscale"}`}
                  >
                    <div className="text-3xl mb-1 relative inline-block">
                      {b.icon}
                      {!isUnlocked && (
                        <Lock className="size-3 absolute -bottom-0.5 -right-1 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-[11px] font-semibold leading-tight">{b.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{b.description}</p>
                    {isUnlocked && (
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {new Date(u.unlocked_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
