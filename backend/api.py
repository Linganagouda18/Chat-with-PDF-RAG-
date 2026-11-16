"""FastAPI backend for Chat with your PDF.

Run (from backend/):  uvicorn api:app --reload --port 8001
"""

import json
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import iterate_in_threadpool, run_in_threadpool
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

import rag

app = FastAPI(title="Chat with your PDF")
MAX_MB = 25


@app.get("/api/health")
def health():
    return {"ok": True, "model": rag.LLM_MODEL, "chunks": rag.collection.count()}


@app.get("/api/documents")
def documents():
    return rag.list_documents()


@app.post("/api/documents")
async def upload(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)
    if tmp_path.stat().st_size > MAX_MB * 1024 * 1024:
        tmp_path.unlink()
        raise HTTPException(413, f"PDF is larger than {MAX_MB} MB.")
    try:
        info = await run_in_threadpool(rag.index_pdf, tmp_path, file.filename)  # embedding is CPU work
    except ValueError as e:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(422, str(e))
    except Exception as e:  # noqa: BLE001  e.g. corrupted or encrypted PDF
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(422, f"Couldn't read this PDF: {e}")
    shutil.move(tmp_path, rag.UPLOADS / f"{info['doc_id']}.pdf")
    return info


@app.get("/api/documents/{doc_id}")
def document(doc_id: str):
    d = rag.get_document(doc_id)
    if not d:
        raise HTTPException(404, "Document not found")
    return d


@app.delete("/api/documents/{doc_id}")
def delete(doc_id: str):
    rag.delete_document(doc_id)
    return {"ok": True}


@app.get("/api/documents/{doc_id}/file")
def pdf_file(doc_id: str):
    path = rag.UPLOADS / f"{Path(doc_id).name}.pdf"
    if not path.exists():
        raise HTTPException(404, "Not found")
    return FileResponse(path, media_type="application/pdf")


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[dict] = []          # previous {role, content} turns, sent by the browser
    doc_ids: list[str] | None = None  # limit search to these documents (None = all)
    page: int | None = None           # with one doc_id: use that whole page instead of searching


def sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest):
    history = [{"role": h["role"], "content": str(h["content"])} for h in req.history
               if h.get("role") in ("user", "assistant")]

    async def events():
        try:
            if req.page and req.doc_ids and len(req.doc_ids) == 1:
                sources = await run_in_threadpool(rag.page_chunks, req.doc_ids[0], req.page)
                if not sources:
                    yield sse({"type": "sources", "sources": []})
                    yield sse({"type": "text_delta", "delta": f"Page {req.page} has no extractable text."})
                    yield sse({"type": "done"})
                    return
            else:
                sources = await run_in_threadpool(rag.retrieve, req.question, rag.TOP_K, req.doc_ids or None)
            yield sse({"type": "sources", "sources": sources})
            if not sources:
                yield sse({"type": "text_delta", "delta": "No documents yet. Upload a PDF first."})
            else:
                async for event in iterate_in_threadpool(rag.stream_answer(req.question, sources, history)):
                    yield sse(event)
            yield sse({"type": "done"})
        except Exception as e:  # noqa: BLE001
            yield sse({"type": "error", "message": f"{type(e).__name__}: {e}"})

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})
