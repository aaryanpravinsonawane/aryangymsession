import { createFileRoute } from "@tanstack/react-router";
import {
  buildUserDataSummary,
  getAuthedSupabase,
} from "@/lib/gym-buddy-context.server";

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
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "AI is not configured for this app yet." }, { status: 200 });
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

        const trimmed = messages
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

        let systemInstruction = SYSTEM_INSTRUCTION;
        try {
          const authed = await getAuthedSupabase(request.headers.get("authorization"));
          if (authed) {
            const summary = await buildUserDataSummary(authed.supabase, authed.userId);
            if (summary) systemInstruction = `${summary}\n\n${SYSTEM_INSTRUCTION}`;
          }
        } catch (err) {
          console.error("Ask RN context load failed:", err);
        }

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
            },
            body: JSON.stringify({
              model: "google/gemini-3.6-flash",
              messages: [{ role: "system", content: systemInstruction }, ...trimmed],
            }),
          });

          const raw = await res.text();
          if (!res.ok) {
            console.error(`Gym Buddy AI request failed [${res.status}]: ${raw}`);
            const detail =
              res.status === 429
                ? "too many requests right now — try again in a moment"
                : res.status === 402
                  ? "the workspace is out of AI credits"
                  : `AI service error ${res.status}`;
            return Response.json({ error: `Gym Buddy can't answer right now: ${detail}.` }, { status: 200 });
          }

          const data = JSON.parse(raw) as {
            choices?: { message?: { content?: string } }[];
          };
          const reply = data.choices?.[0]?.message?.content?.trim() ?? "";

          if (!reply) {
            return Response.json({ error: "Gym Buddy had nothing to say — try rephrasing." }, { status: 200 });
          }

          return Response.json({ reply });
        } catch (err) {
          console.error("Gym Buddy chat error:", err);
          return Response.json({ error: "Gym Buddy is having trouble responding, try again." }, { status: 200 });
        }
      },
    },
  },
});
