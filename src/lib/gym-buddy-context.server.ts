import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * Creates a Supabase client scoped to the caller's bearer token (RLS applies as
 * that user). Returns null when the request is unauthenticated or misconfigured.
 */
export async function getAuthedSupabase(
  authHeader: string | null,
): Promise<{ supabase: SupabaseClient<Database>; userId: string } | null> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  if (token.split(".").length !== 3) return null;

  const supabase = createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await supabase.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || !userId) return null;
    return { supabase, userId };
  } catch {
    return null;
  }
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Builds a short plain-text summary of the user's app data. Never throws. */
export async function buildUserDataSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const today = todayIso();

  const [exercises, logs, weights, diet, prs] = await Promise.all([
    supabase
      .from("exercises")
      .select("day, name, scheme, order_index")
      .eq("user_id", userId)
      .order("day")
      .order("order_index"),
    supabase
      .from("workout_logs")
      .select("date, weight, reps, exercises(name)")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("body_weight_logs")
      .select("date, weight")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("diet_logs")
      .select("quantity, foods(name, calories, protein_g)")
      .eq("user_id", userId)
      .eq("date", today),
    supabase
      .from("personal_records")
      .select("date, weight, reps, exercises(name)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(10),
  ]);

  const sections: string[] = [];

  if (!exercises.error && exercises.data?.length) {
    const byDay = new Map<string, string[]>();
    for (const ex of exercises.data) {
      const list = byDay.get(ex.day) ?? [];
      list.push(`${ex.name} ${ex.scheme}`);
      byDay.set(ex.day, list);
    }
    const split = [...byDay.entries()]
      .map(([day, items]) => `${day}: ${items.join(", ")}`)
      .join(" | ");
    sections.push(`Workout split: ${split}`);
  }

  if (!logs.error && logs.data?.length) {
    const lines = logs.data.map((l) => {
      const name = (l.exercises as { name?: string } | null)?.name ?? "exercise";
      const load = l.weight != null ? `${l.weight}kg` : "bodyweight";
      const reps = l.reps != null ? ` x${l.reps}` : "";
      return `${l.date} - ${name} ${load}${reps}`;
    });
    sections.push(`Recent workout logs: ${lines.join("; ")}`);
  }

  if (!weights.error && weights.data?.length) {
    sections.push(
      `Body weight (most recent first): ${weights.data.map((w) => `${w.weight}kg on ${w.date}`).join("; ")}`,
    );
  }

  if (!diet.error && diet.data?.length) {
    let cals = 0;
    let protein = 0;
    const items = diet.data.map((d) => {
      const f = d.foods as { name?: string; calories?: number; protein_g?: number } | null;
      const q = Number(d.quantity ?? 1);
      cals += Number(f?.calories ?? 0) * q;
      protein += Number(f?.protein_g ?? 0) * q;
      return `${f?.name ?? "food"} x${q}`;
    });
    sections.push(
      `Today's diet log (${today}): ${items.join("; ")} — total ~${Math.round(cals)} kcal, ${Math.round(protein)}g protein`,
    );
  }

  if (!prs.error && prs.data?.length) {
    const lines = prs.data.map((p) => {
      const name = (p.exercises as { name?: string } | null)?.name ?? "exercise";
      return `${name} ${p.weight}kg x${p.reps} on ${p.date}`;
    });
    sections.push(`Recent PRs: ${lines.join("; ")}`);
  }

  if (sections.length === 0) return "";
  return `Here is the user's current data from the app:\n\n${sections.join("\n\n")}`;
}
