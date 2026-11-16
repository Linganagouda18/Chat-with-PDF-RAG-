// Calls to the FastAPI backend (backend/api.py). /api is proxied to localhost:8001 by vite.config.js.

export const BACKEND_DOWN =
  "Can't reach the backend (port 8001). Start it with ./dev.sh, or: cd backend && " +
  "../.venv/bin/uvicorn api:app --reload --port 8001";

async function check(res) {
  if ([502, 503, 504].includes(res.status)) throw new Error(BACKEND_DOWN);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Server error ${res.status}`);
  }
  return res;
}

export const listDocuments = async () => (await check(await fetch("/api/documents"))).json();

export async function uploadDocument(file) {
  const form = new FormData();
  form.append("file", file);
  return (await check(await fetch("/api/documents", { method: "POST", body: form }))).json();
}

export const deleteDocument = async (id) => check(await fetch(`/api/documents/${id}`, { method: "DELETE" }));

/** Stream an answer. Events: sources, text_delta, usage, done, error. */
export async function streamChat({ question, history, docIds, page }, onEvent, signal) {
  const res = await check(
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history, doc_ids: docIds, page: page ?? null }),
      signal,
    }),
  );
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop();
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data: "));
      if (line) onEvent(JSON.parse(line.slice(6)));
    }
  }
}
