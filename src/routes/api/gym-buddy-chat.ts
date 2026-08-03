import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_INSTRUCTION =
  "You are Gym Buddy, a friendly, knowledgeable fitness assistant inside a Push/Pull/Legs workout tracking app called Lift Log Pro. Answer gym, workout, nutrition, recovery, and general fitness questions clearly and concisely. Keep answers short and practical unless the user asks for detail. If asked something totally unrelated to fitness/health, gently redirect back to fitness topics.";

type ChatMessage = { role: "user" | "assistant"; content: string };

function isMessageArray(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) =>
        m != null &&
        typeof m === "object" &&
        (( m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string",
    )
  );
}

export const Route = createFileRoute("/api/gym-buddy-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["GEMINI_API_KEY"];
        if (!apiKey) {
          return Response.json(
            { error: "GEMINI_API_KEY is not configured. Add the GEMINI_API_KEY secret to enable Gym Buddy." },
            { status: 500 },
          );
        }

        let body: { messages?: unknown };
        try {
          body = (await request.json()) as { messages?: unknown };
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        const messages = body.messages;
        if (!isMessageArray(messages) || messages.length === 0) {
          return Response.json({ error: "messages must be a non-empty array of {role, content}." }, { status: 400 });
        }

        const trimmed = messages.slice(-20).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content.slice(0, 4000) }],
        }));

        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: trimmed,
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
              }),
            },
          );

          const raw = await res.text();
          if (!res.ok) {
            console.error(`Gemini request failed [${res.status}]: ${raw}`);
            const detail =
              res.status === 429
                ? "the Gemini API key has no remaining quota for gemini-2.0-flash — check your Google AI Studio plan/billing"
                : `AI service error ${res.status}`;
            return Response.json({ error: `Gym Buddy can't answer right now: ${detail}.` }, { status: 502 });
          }

          const data = JSON.parse(raw) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const reply =
            data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

          if (!reply) {
            return Response.json({ error: "Gym Buddy had nothing to say — try rephrasing." }, { status: 502 });
          }

          return Response.json({ reply });
        } catch (err) {
          console.error("Gym Buddy chat error:", err);
          return Response.json({ error: "Gym Buddy is having trouble responding, try again." }, { status: 500 });
        }
      },
    },
  },
});
