// Page 1: what the app is, how it works, upload a PDF, open previous ones.
import { useEffect, useRef, useState } from "react";

const STEPS = [
  { icon: "📂", title: "Extract", text: "Text is read from every page of your PDF." },
  { icon: "✂️", title: "Chunk", text: "Pages are split into small overlapping passages." },
  { icon: "🧠", title: "Embed", text: "Each passage becomes a vector that captures its meaning." },
  { icon: "🔎", title: "Answer", text: "The best-matching passages answer your question, with page citations." },
];
const UPLOAD_STAGES = ["Reading pages…", "Splitting into chunks…", "Creating embeddings…", "Saving to the vector database…"];

export default function Landing({ docs, onUpload, onOpen, onDelete, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(null); // file name while indexing
  const [stage, setStage] = useState(0);

  // Step through the indexing stages while the upload runs (they finish together on the server)
  useEffect(() => {
    if (!uploading) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, UPLOAD_STAGES.length - 1)), 900);
    return () => clearInterval(t);
  }, [uploading]);

  async function handle(file) {
    if (!file || uploading) return;
    setUploading(file.name);
    try {
      await onUpload(file);
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="min-h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="animate-fade-up text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs font-medium text-emerald-800 backdrop-blur dark:border-emerald-900 dark:bg-zinc-900/70 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            RAG · Sentence Transformers · ChromaDB · OpenAI
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Chat with your <span className="text-gradient">PDF</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
            Upload a document and ask questions in plain language. Every answer comes from the document itself, with
            the page it came from, so you can always check it.
          </p>
        </div>

        {/* Upload */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handle(e.dataTransfer.files[0]);
          }}
          className={`animate-fade-up mx-auto mt-10 max-w-2xl cursor-pointer rounded-3xl border-2 border-dashed bg-white/70 p-10 text-center shadow-xl shadow-emerald-900/5 backdrop-blur-md transition [animation-delay:150ms] dark:bg-zinc-900/70 ${
            dragging
              ? "scale-[1.02] border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40"
              : "border-zinc-300 hover:border-emerald-400 hover:shadow-emerald-900/10 dark:border-zinc-700"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              handle(e.target.files[0]);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="animate-fade-in">
              <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
              <p className="mt-4 font-semibold">{uploading}</p>
              <ol className="mx-auto mt-3 max-w-xs space-y-1 text-left text-sm">
                {UPLOAD_STAGES.map((s, i) => (
                  <li key={s} className={i <= stage ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-400"}>
                    {i < stage ? "✓" : i === stage ? "›" : "·"} {s}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <>
              <div className="animate-float mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-3xl shadow-lg">
                📄
              </div>
              <p className="mt-4 text-lg font-semibold">Drop your PDF here</p>
              <p className="text-sm text-zinc-500">
                or <span className="font-medium text-emerald-700 dark:text-emerald-400">browse files</span> · up to 25 MB
              </p>
            </>
          )}
        </div>
        {error && (
          <p className="animate-fade-in mx-auto mt-4 max-w-2xl rounded-lg bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Previous documents */}
        {docs.length > 0 && (
          <section className="animate-fade-up mt-12 [animation-delay:250ms]">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Your documents</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((d) => (
                <div
                  key={d.doc_id}
                  className="group relative rounded-2xl border border-zinc-200 bg-white/80 p-4 backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/80"
                >
                  <button onClick={() => onOpen(d.doc_id)} className="flex w-full items-start gap-3 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600 dark:bg-red-950/50">
                      PDF
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium" title={d.filename}>
                        {d.filename}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {d.pages} {d.pages === 1 ? "page" : "pages"} · {d.chunks} chunks
                      </span>
                      <span className="mt-2 block text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Open and ask →
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => onDelete(d)}
                    className="absolute top-3 right-3 rounded p-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-600 focus:opacity-100"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="animate-fade-up mt-14 [animation-delay:350ms]">
          <h2 className="text-center text-sm font-semibold tracking-wide text-zinc-500 uppercase">How it works</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border border-zinc-200 bg-white/70 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-xs font-semibold text-zinc-400">STEP {i + 1}</span>
                </div>
                <p className="mt-2 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
