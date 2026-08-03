import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageCircleMore, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME: ChatMessage = {
  role: "assistant",
  content: "Hey! I'm Gym Buddy 💪 Ask me anything about your workouts, form, recovery, or nutrition.",
};

export function GymBuddy() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: async (history: ChatMessage[]) => {
      const res = await fetch("/api/gym-buddy-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.filter((m) => m !== WELCOME) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "Gym Buddy is having trouble responding, try again.");
      return data.reply;
    },
    onSuccess: (reply) => setMessages((prev) => [...prev, { role: "assistant", content: reply }]),
    onError: (e) =>
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: (e as Error).message || "Gym Buddy is having trouble responding, try again." },
      ]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, ask.isPending]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || ask.isPending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    ask.mutate(next);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Gym Buddy chat"
        className="fixed right-4 bottom-24 z-40 size-14 rounded-full day-chip-push shadow-lg flex items-center justify-center active:scale-95 transition"
      >
        <MessageCircleMore className="size-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] flex flex-col">
          <SheetHeader className="text-left">
            <SheetTitle>Gym Buddy</SheetTitle>
            <SheetDescription>Your fitness Q&amp;A</SheetDescription>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "card-elevated rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {ask.isPending && (
              <div className="flex justify-start">
                <div className="card-elevated rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={send} className="mt-3 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about form, macros, recovery…"
              disabled={ask.isPending}
            />
            <Button type="submit" size="icon" disabled={ask.isPending || !input.trim()} aria-label="Send">
              <Send className="size-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
