import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, EyeOff, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

function RobotIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="9" y1="3" x2="9" y2="6" />
      <line x1="15" y1="3" x2="15" y2="6" />
      <rect x="5" y="7" width="14" height="12" rx="4" ry="4" />
      <circle cx="10" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hey! I'm Ask RN 💪 Ask me anything about your workouts, form, recovery, or nutrition.",
};

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ node: _node, ...props }) => (
          <h1
            className="text-base font-semibold text-foreground mt-3 mb-1.5 normal-case"
            {...props}
          />
        ),
        h2: ({ node: _node, ...props }) => (
          <h2
            className="text-base font-semibold text-foreground mt-3 mb-1.5 normal-case"
            {...props}
          />
        ),
        strong: ({ node: _node, ...props }) => (
          <strong className="font-bold text-foreground" {...props} />
        ),
        p: ({ node: _node, ...props }) => (
          <p className="text-sm leading-relaxed text-foreground mb-2 last:mb-0" {...props} />
        ),
        ul: ({ node: _node, ...props }) => (
          <ul className="list-disc pl-4 space-y-1.5 mb-2 last:mb-0" {...props} />
        ),
        ol: ({ node: _node, ...props }) => (
          <ol className="list-decimal pl-4 space-y-1.5 mb-2 last:mb-0" {...props} />
        ),
        li: ({ node: _node, ...props }) => (
          <li className="text-sm leading-relaxed text-foreground" {...props} />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export function GymBuddy() {
  const [open, setOpen] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const [incognitoMessages, setIncognitoMessages] = useState<ChatMessage[]>([WELCOME]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const history = useQuery({
    queryKey: ["gym-buddy-messages"],
    enabled: open && !incognito,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("gym_buddy_messages")
        .select("role, content")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));
    },
  });

  const persisted = localMessages ?? history.data ?? [];
  const messages = incognito
    ? incognitoMessages
    : persisted.length > 0
      ? persisted
      : [WELCOME];

  const setMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    if (incognito) setIncognitoMessages(updater);
    else setLocalMessages((prev) => updater(prev ?? history.data ?? []));
  };

  const save = async (role: "user" | "assistant", content: string) => {
    if (incognito) return;
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    const { error } = await supabase
      .from("gym_buddy_messages")
      .insert({ user_id: userId, role, content });
    if (error) console.error("Failed to save Ask RN message:", error.message);
  };

  const ask = useMutation({
    mutationFn: async (history: ChatMessage[]) => {
      const res = await fetch("/api/gym-buddy-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.filter((m) => m !== WELCOME) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply)
        throw new Error(data.error ?? "Ask RN is having trouble responding, try again.");
      return data.reply;
    },
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      void save("assistant", reply);
    },
    onError: (e) =>
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: (e as Error).message || "Ask RN is having trouble responding, try again.",
        },
      ]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, ask.isPending]);

  const toggleIncognito = () => {
    if (incognito) {
      setIncognitoMessages([WELCOME]);
      setIncognito(false);
      setLocalMessages(null);
      void queryClient.invalidateQueries({ queryKey: ["gym-buddy-messages"] });
    } else {
      setIncognitoMessages([WELCOME]);
      setIncognito(true);
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || ask.isPending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(() => next);
    setInput("");
    void save("user", text);
    ask.mutate(next);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Ask RN chat"
        className="fixed right-4 bottom-24 z-40 size-14 rounded-full flex items-center justify-center active:scale-95 transition"
        style={{
          background: "linear-gradient(135deg, #6a5cf0, #8b7bf7)",
          boxShadow: "0 0 28px -6px rgba(107, 92, 240, 0.55)",
        }}
      >
        <RobotIcon className="size-7" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] flex flex-col">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div
                  className="size-[46px] rounded-[13px] flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #6a5cf0, #8b7bf7)",
                    boxShadow: "0 0 24px -5px rgba(107, 92, 240, 0.5)",
                  }}
                >
                  <RobotIcon className="size-6" />
                </div>
                <div>
                  <SheetTitle>Ask RN</SheetTitle>
                  <SheetDescription>Your fitness Q&amp;A</SheetDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 pr-8">
                {incognito && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-1 bg-purple-500/15 text-purple-300">
                    Incognito
                  </span>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant={incognito ? "secondary" : "ghost"}
                  onClick={toggleIncognito}
                  aria-label={incognito ? "Turn off Incognito Mode" : "Turn on Incognito Mode"}
                  aria-pressed={incognito}
                >
                  {incognito ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div
            ref={scrollRef}
            className={`flex-1 overflow-y-auto overscroll-contain h-full mt-4 space-y-3 pr-1 rounded-xl ${
              incognito ? "bg-purple-500/5 px-2 py-2" : ""
            }`}
            style={{ overscrollBehavior: "contain" }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
                      : "card-elevated rounded-bl-sm"
                  }`}
                >
                  {m.role === "user" ? m.content : <Markdown>{m.content}</Markdown>}
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

          <form
            onSubmit={send}
            className="mt-3 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Ask RN about form, macros, recovery…"
              disabled={ask.isPending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={ask.isPending || !input.trim()}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
