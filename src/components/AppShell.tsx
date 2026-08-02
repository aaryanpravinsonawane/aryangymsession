import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Dumbbell, Trophy, Scale, Target, LogOut, Award, Settings, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard",    label: "Home",    icon: Home },
  { to: "/workout",      label: "Workout", icon: Dumbbell },
  { to: "/prs",          label: "PRs",     icon: Trophy },
  { to: "/achievements", label: "Badges",  icon: Award },
  { to: "/diet",         label: "Diet",    icon: Utensils },
  { to: "/weight",       label: "Weight",  icon: Scale },
  { to: "/goals",        label: "Goals",   icon: Target },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/70 border-b border-border">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="size-7 rounded-lg day-chip-push flex items-center justify-center">
              <Dumbbell className="size-4" />
            </span>
            PPL
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/settings" className="text-muted-foreground hover:text-foreground p-2" aria-label="Settings">
              <Settings className="size-5" />
            </Link>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground p-2 -mr-2" aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pt-4 pb-28">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl grid grid-cols-7">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to || (to !== "/dashboard" && loc.pathname.startsWith(to));
            return (
              <Link key={to} to={to} className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}>
                <Icon className={`size-5 ${active ? "" : "opacity-70"}`} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
