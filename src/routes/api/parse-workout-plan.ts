import { createFileRoute } from "@tanstack/react-router";
import { getAuthedSupabase } from "@/lib/gym-buddy-context.server";

const PROMPT = `You extract weekly gym workout plans into structured data.
Return ONLY a valid JSON array, no markdown fences, no preamble, in exactly this shape:
[{"day": "monday", "name": "Bench Press", "scheme": "3x8-12", "muscle_group": "Chest", "order_index": 1}]
Rules:
- "day" must be a lowercase full day name (monday..sunday).
- "order_index" restarts at 1 for each day and increments per exercise within that day.
- "muscle_group" is a single word or short phrase (e.g. "Chest", "Back", "Quads"); use "" if unclear.
- If an entry is unclear, still include it with best-effort values instead of dropping it.`;

type ParsedExercise = {
  day: string;
  name: string;
  scheme: string;
  muscle_group: string;
  order_index: number;
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function normalize(value: unknown): ParsedExercise[] {
  if (!Array.isArray(value)) return [];
  const counters = new Map<string, number>();
  const out: ParsedExercise[] = [];
  for (const raw of value) {
    if (raw == null || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const day = String(r["day"] ?? "").toLowerCase().trim();
    const name = String(r["name"] ?? "").trim();
    if (!name || !DAYS.includes(day)) continue;
    const next = (counters.get(day) ?? 0) + 1;
    counters.set(day, next);
    out.push({
      day,
      name,
      scheme: String(r["scheme"] ?? "").trim(),
      muscle_group: String(r["muscle_group"] ?? "").trim(),
      order_index: next,
    });
  }
  return out;
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export const Route = createFileRoute("/api/parse-workout-plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "AI is not configured for this app yet." }, { status: 500 });
        }

        const authed = await getAuthedSupabase(request.headers.get("authorization"));
        if (!authed) {
          return Response.json({ error: "You need to be signed in." }, { status: 401 });
        }

        const { count, error: countError } = await authed.supabase
          .from("exercises")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authed.userId);

        if (countError) {
          return Response.json({ error: "Could not check your existing program." }, { status: 500 });
        }
        if ((count ?? 0) > 0) {
          return Response.json(
            {
              error:
                "You already have an active workout program. Please delete your existing program before uploading a new one.",
            },
            { status: 409 },
          );
        }

        let body: { text?: unknown; imageDataUrl?: unknown };
        try {
          body = (await request.json()) as { text?: unknown; imageDataUrl?: unknown };
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const text = typeof body.text === "string" ? body.text.trim() : "";
        const imageDataUrl =
          typeof body.imageDataUrl === "string" && body.imageDataUrl.startsWith("data:image/")
            ? body.imageDataUrl
            : "";

        if (!text && !imageDataUrl) {
          return Response.json({ error: "Provide a photo or some text to parse." }, { status: 400 });
        }

        const userContent = imageDataUrl
          ? [
              { type: "text", text: "Extract the weekly workout plan from this image." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ]
          : [{ type: "text", text: `Extract the weekly workout plan from this text:\n\n${text.slice(0, 12000)}` }];

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
            body: JSON.stringify({
              model: "google/gemini-3.6-flash",
              messages: [
                { role: "system", content: PROMPT },
                { role: "user", content: userContent },
              ],
            }),
          });

          const raw = await res.text();
          if (!res.ok) {
            console.error(`parse-workout-plan AI failed [${res.status}]: ${raw}`);
            const detail =
              res.status === 429
                ? "too many requests right now — try again in a moment"
                : res.status === 402
                  ? "the workspace is out of AI credits"
                  : `AI service error ${res.status}`;
            return Response.json({ error: `Couldn't parse your plan: ${detail}.` }, { status: 200 });
          }

          const data = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] };
          const content = data.choices?.[0]?.message?.content ?? "";
          const exercises = normalize(extractJson(content));

          if (exercises.length === 0) {
            return Response.json(
              { error: "I couldn't find any exercises in that. Try a clearer photo or more detailed text." },
              { status: 200 },
            );
          }

          return Response.json({ exercises });
        } catch (err) {
          console.error("parse-workout-plan error:", err);
          return Response.json({ error: "Something went wrong parsing your plan. Try again." }, { status: 200 });
        }
      },
    },
  },
});
