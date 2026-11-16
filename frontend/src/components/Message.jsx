// A question, or an answer with its sources. [1], [2] in the answer link to the source cards.
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function SourceCard({ source, index, highlighted }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      id={source.anchor}
      className={`rounded-lg border p-2.5 text-xs transition ${
        highlighted
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-zinc-900 px-1.5 font-mono text-white dark:bg-zinc-700">{index + 1}</span>
        <a
          href={`/api/documents/${source.doc_id}/file#page=${source.page}`}
          target="_blank"
          rel="noreferrer"
          className="truncate font-medium hover:underline"
        >
          {source.filename} · page {source.page}
        </a>
        <span className="ml-auto shrink-0 text-zinc-500" title="Cosine similarity to your question">
          {source.score >= 1 ? "whole page" : `match ${Math.round(source.score * 100)}%`}
        </span>
      </div>
      <p className={`mt-1.5 text-zinc-600 dark:text-zinc-400 ${open ? "" : "line-clamp-2"}`}>{source.text}</p>
      <button onClick={() => setOpen(!open)} className="mt-1 text-emerald-700 hover:underline dark:text-emerald-400">
        {open ? "Show less" : "Show full chunk"}
      </button>
    </div>
  );
}

export default function Message({ message, msgIndex }) {
  const [highlight, setHighlight] = useState(null);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600 px-4 py-2.5 text-sm whitespace-pre-wrap text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const sources = (message.sources || []).map((s, i) => ({ ...s, anchor: `m${msgIndex}-s${i + 1}` }));
  // Turn [1] into a link that scrolls to and highlights source card 1
  const text = (message.content || "").replace(/\[(\d+)\]/g, (m, n) =>
    Number(n) <= sources.length ? `[\\[${n}\\]](#m${msgIndex}-s${n})` : m,
  );

  return (
    <div className="space-y-3">
      {message.status === "streaming" && !message.content && (
        <p className="animate-pulse text-sm text-zinc-500">
          {sources.length ? `Found ${sources.length} relevant passages. Writing answer…` : "Searching documents…"}
        </p>
      )}
      {message.content && (
        <div className="prose prose-sm prose-zinc max-w-none rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200 dark:prose-invert dark:bg-zinc-900 dark:ring-zinc-800">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) =>
                href?.startsWith("#") ? (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "center" });
                      setHighlight(href.slice(1));
                    }}
                    className="font-semibold text-emerald-700 no-underline dark:text-emerald-400"
                  >
                    {children}
                  </a>
                ) : (
                  <a href={href} target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      )}
      {message.error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {message.error}
        </p>
      )}
      {sources.length > 0 && message.status !== "streaming" && (
        <details className="group" open>
          <summary className="cursor-pointer text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Sources ({sources.length})
          </summary>
          <div className="mt-2 grid gap-2">
            {sources.map((s, i) => (
              <SourceCard key={s.anchor} source={s} index={i} highlighted={highlight === s.anchor} />
            ))}
          </div>
        </details>
      )}
      {message.usage && (
        <p className="text-xs text-zinc-500">
          {message.usage.input_tokens.toLocaleString()} in / {message.usage.output_tokens.toLocaleString()} out tokens
        </p>
      )}
    </div>
  );
}
