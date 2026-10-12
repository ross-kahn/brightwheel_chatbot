"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CENTER } from "@/lib/center";
import { sendJson } from "@/lib/http";

type Source = { id: number; title: string; body: string };

type Message =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      id?: number;
      mode?: "answered" | "unknown" | "sensitive";
      sources?: Source[];
      feedback?: "up" | "down";
      contactSent?: boolean;
    };

const STARTERS = [
  "Are you open on Veterans Day?",
  "What's for lunch today?",
  "My child has a fever. Can they come in?",
  "How much is infant tuition?",
  "How do I schedule a tour?",
];

const MAX_LENGTH = 500;

// The parent-facing chat. The conversation lives only in this component's
// state, so a refresh starts a new chat.
export default function ParentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [openSource, setOpenSource] = useState<Source | null>(null);
  const sessionId = useRef("");
  const bottom = useRef<HTMLDivElement>(null);

  // PROTOTYPE: an anonymous random id groups one visit's questions in the log.
  // Production would use the signed-in parent.
  useEffect(() => {
    sessionId.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  // Merges new fields into one assistant message (feedback given, contact sent).
  function update(index: number, patch: Partial<Extract<Message, { role: "assistant" }>>) {
    setMessages((all) => all.map((m, i) => (i === index ? ({ ...m, ...patch } as Message) : m)));
  }

  // Sends a question with the chat so far and appends the reply, or an apology
  // with the phone number if the request fails.
  async function ask(question: string) {
    question = question.trim();
    if (!question || pending) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((all) => [...all, { role: "user", content: question }]);
    setInput("");
    setPending(true);
    try {
      const res = await sendJson("/api/ask", "POST", { question, history, sessionId: sessionId.current });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((all) => [
        ...all,
        { role: "assistant", content: data.answer, id: data.id, mode: data.mode, sources: data.sources },
      ]);
    } catch {
      setMessages((all) => [
        ...all,
        {
          role: "assistant",
          content: `Sorry, something went wrong on our end. Please try again, or call the front desk at ${CENTER.phone}.`,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl">
          🌱
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight">{CENTER.name}</h1>
          <p className="text-xs text-stone-500">Front desk assistant · answers from our family handbook</p>
        </div>
        <Link href="/admin" className="shrink-0 text-xs font-medium text-indigo-600 hover:underline">
          Staff view
        </Link>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="pt-6">
            <p className="text-lg font-semibold">Hi! What can I help with?</p>
            <p className="mt-1 text-sm text-stone-600">
              Ask about hours, closures, tuition, meals, illness policy or tours. If I don&apos;t know,
              I&apos;ll pass your question to our staff.
            </p>
            <div className="mt-5 flex flex-col items-start gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-stone-300 px-4 py-2 text-left text-sm hover:border-indigo-400 hover:bg-indigo-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-[15px] text-white">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="max-w-[92%] space-y-2">
              <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-stone-100 px-4 py-2.5 text-[15px] leading-relaxed">
                {m.content}
              </p>

              {!!m.sources?.length && (
                <div className="flex flex-wrap items-center gap-1.5 pl-1">
                  <span className="text-xs text-stone-500">Source:</span>
                  {m.sources.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setOpenSource(s)}
                      className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}

              {m.id && m.mode !== "answered" && (
                <Handoff
                  sensitive={m.mode === "sensitive"}
                  sent={!!m.contactSent}
                  onSend={async (contact) => {
                    await sendJson(`/api/questions/${m.id}`, "PATCH", { contact });
                    update(i, { contactSent: true });
                  }}
                />
              )}

              {m.id && (
                <div className="flex items-center gap-1 pl-1 text-xs text-stone-500">
                  {m.feedback ? (
                    <span>{m.feedback === "up" ? "Thanks for the feedback!" : "Thanks. We've let staff know this wasn't helpful."}</span>
                  ) : (
                    <>
                      <span>Was this helpful?</span>
                      {(["up", "down"] as const).map((f) => (
                        <button
                          key={f}
                          aria-label={f === "up" ? "Helpful" : "Not helpful"}
                          onClick={() => {
                            update(i, { feedback: f });
                            sendJson(`/api/questions/${m.id}`, "PATCH", { feedback: f });
                          }}
                          className="rounded-md px-1.5 py-1 text-base hover:bg-stone-100"
                        >
                          {f === "up" ? "👍" : "👎"}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ),
        )}

        {pending && (
          <div className="flex w-16 justify-center gap-1 rounded-2xl rounded-bl-md bg-stone-100 px-4 py-3.5">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="h-2 w-2 animate-bounce rounded-full bg-stone-400"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={bottom} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-end gap-2 border-t border-stone-200 px-3 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={MAX_LENGTH}
          placeholder="Ask the front desk…"
          aria-label="Your question"
          className="min-w-0 flex-1 rounded-full border border-stone-300 px-4 py-2.5 text-base outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || pending}
          className="rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>

      {openSource && (
        <div
          className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setOpenSource(null)}
        >
          <div
            className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-semibold">{openSource.title}</h2>
              <button onClick={() => setOpenSource(null)} className="text-sm text-stone-500">
                Close
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{openSource.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// The card under an unanswered or sensitive reply: tells the parent a person
// will follow up and lets them leave contact details if they want to.
function Handoff({
  sensitive,
  sent,
  onSend,
}: {
  sensitive: boolean;
  sent: boolean;
  onSend: (contact: string) => Promise<void>;
}) {
  const [contact, setContact] = useState("");
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm">
      <p className="font-medium text-amber-900">
        {sensitive ? "A staff member will follow up on this." : "Passed to the front desk."}
      </p>
      {sent ? (
        <p className="mt-1 text-amber-900">Got it. We&apos;ll be in touch.</p>
      ) : (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (contact.trim()) onSend(contact);
          }}
        >
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={200}
            placeholder="Name and phone or email (optional)"
            aria-label="How can we reach you?"
            className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-base outline-none"
          />
          <button type="submit" className="rounded-lg bg-amber-600 px-3 py-2 font-medium text-white">
            Send
          </button>
        </form>
      )}
      <p className="mt-2 text-xs text-amber-800">
        Urgent? Call {CENTER.phone}. In an emergency, call 911.
      </p>
    </div>
  );
}
