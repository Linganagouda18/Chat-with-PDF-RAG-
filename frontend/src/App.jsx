// Two screens: the landing/upload page, and one page per PDF (#/doc/<id>, so reload keeps you there).
import { useEffect, useState } from "react";
import { BACKEND_DOWN, deleteDocument, listDocuments, uploadDocument } from "./api.js";
import Background from "./components/Background.jsx";
import DocView from "./components/DocView.jsx";
import Landing from "./components/Landing.jsx";

const docIdFromHash = () => window.location.hash.match(/^#\/doc\/(\w+)/)?.[1] ?? null;

export default function App() {
  const [docs, setDocs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState(docIdFromHash());
  const [backendDown, setBackendDown] = useState(false);
  const [error, setError] = useState(null);

  // Load the document list; retry every 3 s while the backend is down
  useEffect(() => {
    let timer;
    const load = () =>
      listDocuments()
        .then((d) => {
          setDocs(d);
          setLoaded(true);
          setBackendDown(false);
        })
        .catch(() => {
          setBackendDown(true);
          timer = setTimeout(load, 3000);
        });
    load();
    return () => clearTimeout(timer);
  }, []);

  // Browser back/forward buttons move between the two screens
  useEffect(() => {
    const onHash = () => setOpenId(docIdFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const open = (id) => {
    window.location.hash = id ? `/doc/${id}` : "";
    setOpenId(id);
  };

  async function upload(file) {
    setError(null);
    try {
      const info = await uploadDocument(file);
      setDocs(await listDocuments());
      open(info.doc_id); // go straight to the question page
    } catch (e) {
      setError(`${file.name}: ${e.message}`);
    }
  }

  async function remove(doc) {
    if (!window.confirm(`Delete ${doc.filename}?`)) return;
    await deleteDocument(doc.doc_id);
    setDocs(await listDocuments());
  }

  const doc = docs.find((d) => d.doc_id === openId);

  return (
    <div className="relative h-full text-zinc-900 dark:text-zinc-100">
      <Background />
      {backendDown && (
        <div role="alert" className="relative z-30 bg-amber-100 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {BACKEND_DOWN}. This page reconnects automatically.
        </div>
      )}
      {openId && doc ? (
        <DocView key={doc.doc_id} doc={doc} onBack={() => open(null)} />
      ) : openId && loaded ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p className="font-medium">That document no longer exists.</p>
          <button onClick={() => open(null)} className="text-sm text-emerald-700 underline">
            Back to all PDFs
          </button>
        </div>
      ) : (
        <Landing docs={docs} onUpload={upload} onOpen={open} onDelete={remove} error={error} />
      )}
    </div>
  );
}
