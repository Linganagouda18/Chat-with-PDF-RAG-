// Page 2: one PDF. Document info, "explain a page" picker, quick actions, and chat.
import { useEffect, useRef, useState } from "react";
import { streamChat } from "../api.js";
import Message from "./Message.jsx";

const QUICK = [
  { label: "📝 Summarize", q: "Summarize this document in 5 clear bullet points." },
  { label: "🔑 Key points", q: "What are the most important points in this document?" },
  { label: "🔢 Numbers & dates", q: "List the important numbers, dates and deadlines mentioned, with what each one means." },
  { label: "❓ What can I ask?", q: "Suggest 5 useful questions I could ask about this document." },
];

export default function DocView({ doc, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(null); // page the next question is about (null = whole document)
  const [showSide, setShowSide] = useState(false);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const pages = Array.from({ length: doc.pages }, (_, i) => i + 1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const updateLast = (fn) => setMessages((ms) => [...ms.slice(0, -1), fn(ms.at(-1))]);

  async function send(text, forPage = page) {
    const question = text.trim();
    if (!question || busy) return;
    const history = messages.filter((m) => m.content).map((m) => ({ role: m.role, content: m.content }));
    setInput("");
    setBusy(true);
    setShowSide(false);
    setMessages((ms) => [
      ...ms,
      { role: "user", content: question, page: forPage },
      { role: "assistant", content: "", sources: [], status: "streaming", page: forPage },
    ]);
    abortRef.current = new AbortController();
    try {
      await streamChat(
        { question, history, docIds: [doc.doc_id], page: forPage },
        (e) =>
          updateLast((m) => {
            if (e.type === "sources") return { ...m, sources: e.sources };
            if (e.type === "text_delta") return { ...m, content: m.content + e.delta };
            if (e.type === "usage") return { ...m, usage: e };
            if (e.type === "done") return { ...m, status: "done" };
            if (e.type === "error") return { ...m, status: "done", error: e.message };
            return m;
          }),
        abortRef.current.signal,
      );
    } catch (e) {
      updateLast((m) => ({ ...m, status: "done", error: e.name === "AbortError" ? "Stopped." : e.message }));
    } finally {
      setBusy(false);
    }
  }

  const explainPage = (p) => send(`Explain page ${p} in simple terms. Cover everything on the page.`, p);

  const side = (
    <div className="space-y-5">
      {/* Document info */}
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600 dark:bg-red-950/50">
            PDF
          </span>
          <div className="min-w-0">
            <p className="font-semibold break-words">{doc.filename}</p>
            <a
              href={`/api/documents/${doc.doc_id}/file`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Open PDF ↗
            </a>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/40">
            <dt className="text-[11px] text-zinc-500 uppercase">Pages</dt>
            <dd className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{doc.pages}</dd>
          </div>
          <div className="rounded-xl bg-sky-50 p-2 dark:bg-sky-950/40">
            <dt className="text-[11px] text-zinc-500 uppercase">Chunks</dt>
            <dd className="text-2xl font-bold text-sky-700 dark:text-sky-400">{doc.chunks}</dd>
          </div>
        </dl>
      </div>

      {/* Explain a page */}
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <p className="text-sm font-semibold">Which page should I explain?</p>
        <p className="mt-0.5 text-xs text-zinc-500">Click a page for a plain-language explanation of everything on it.</p>
        <div className="mt-3 grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto">
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => explainPage(p)}
              disabled={busy}
              className="rounded-lg border border-zinc-200 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-emerald-950/40"
            >
              {p}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          Ask my next question about page
          <select
            value={page ?? ""}
            onChange={(e) => setPage(e.target.value ? Number(e.target.value) : null)}
            className="rounded-md border border-zinc-300 bg-white px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">any (whole PDF)</option>
            {pages.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <p className="text-sm font-semibold">Quick actions</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK.map((a) => (
            <button
              key={a.label}
              onClick={() => send(a.q, null)}
              disabled={busy}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-emerald-950/40"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200/70 bg-white/70 px-4 py-3 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-900/70">
        <button
          onClick={onBack}
          className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ← All PDFs
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{doc.filename}</h1>
          <p className="truncate text-xs text-zinc-500">
            {doc.pages} {doc.pages === 1 ? "page" : "pages"} · {doc.chunks} chunks indexed
          </p>
        </div>
        <button
          onClick={() => setShowSide(!showSide)}
          className="ml-auto shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs lg:hidden dark:border-zinc-700"
        >
          Pages & actions
        </button>
        <button
          onClick={() => setMessages([])}
          className="hidden shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 lg:ml-auto lg:block dark:border-zinc-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
        >
          New chat
        </button>
        <button
          onClick={onBack}
          className="shrink-0 rounded-lg bg-gradient-to-r from-emerald-600 to-sky-600 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:from-emerald-500 hover:to-sky-500 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95"
          title="Back to the landing page"
        >
          🏠 Home
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-zinc-200/70 p-4 lg:block dark:border-zinc-800/70">
          {side}
        </aside>
        {showSide && (
          <div className="animate-fade-in fixed inset-x-0 top-[57px] bottom-0 z-20 overflow-y-auto bg-zinc-50/95 p-4 backdrop-blur lg:hidden dark:bg-zinc-950/95">
            {side}
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
              {messages.length === 0 && (
                <div className="animate-fade-up pt-8 text-center">
                  <div className="animate-float mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-2xl shadow-lg">
                    💬
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">Ready! Ask anything about this PDF</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Try a quick action, pick a page to explain, or type your own question.
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {QUICK.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => send(a.q, null)}
                        className="rounded-xl border border-zinc-200 bg-white/80 p-3 text-left text-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80"
                      >
                        <span className="font-medium">{a.label}</span>
                        <span className="mt-0.5 block text-xs text-zinc-500">{a.q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className="animate-fade-up">
                  <Message message={m} msgIndex={i} />
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-zinc-200/70 bg-white/70 p-3 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-900/70"
          >
            <div className="mx-auto max-w-3xl">
              {page && (
                <div className="animate-fade-in mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Asking about page {page}
                  <button type="button" onClick={() => setPage(null)} className="font-bold" title="Ask about the whole PDF">
                    ✕
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder={page ? `Ask about page ${page}…` : `Ask about ${doc.filename}…`}
                  title="Enter to send, Shift+Enter for a new line"
                  className="max-h-40 min-h-11 flex-1 resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950"
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="h-11 rounded-xl bg-red-100 px-4 text-sm font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 px-5 text-sm font-medium text-white shadow-md transition hover:shadow-lg disabled:opacity-40"
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
