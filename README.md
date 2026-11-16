# 📄 Chat with PDF (RAG)

Upload a PDF, ask questions in plain language, and get answers that come **only from your document**, with the page each answer came from.

Built with **Retrieval-Augmented Generation (RAG)**: Sentence Transformers embeddings, ChromaDB vector search and OpenAI, with a FastAPI backend and a React + Tailwind CSS frontend.

## ✨ Features

- **Drag-and-drop upload** with live indexing progress
- **Answers with citations:** click `[1]` to jump to the exact passage, file and page
- **Explain any page:** pick a page number for a plain-language explanation of everything on it
- **Ask about one page** or the whole document
- **Quick actions:** summarize, key points, numbers & dates, suggested questions
- **Honest answers:** if the document doesn't contain the answer, it says so instead of guessing
- Streaming responses, follow-up questions, multiple PDFs, dark mode, mobile layout

## 🧠 How it works

```
 INDEXING (on upload)
 PDF ─► extract text per page (pypdf)
     ─► split into overlapping chunks (~1000 chars, 200 overlap)
     ─► embed each chunk (Sentence Transformers: all-MiniLM-L6-v2, runs locally)
     ─► store vectors + {file, page} in ChromaDB (on disk)

 ASKING
 question ─► embed ─► retrieve the 5 most similar chunks from ChromaDB
          ─► prompt = rules + numbered chunks + question
          ─► OpenAI (gpt-5-mini) streams an answer citing [1], [2] …
```

"Explain page N" skips similarity search and uses every chunk of that exact page.

## 🛠️ Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Vite |
| Backend | FastAPI, Server-Sent Events streaming |
| PDF parsing | pypdf |
| Embeddings | Sentence Transformers (`all-MiniLM-L6-v2`, local, free) |
| Vector database | ChromaDB (persistent) |
| LLM | OpenAI (`gpt-5-mini` by default) |

## 🚀 Setup

**Requirements:** Python 3.10+, Node.js 18+, an OpenAI API key.

```bash
git clone https://github.com/Linganagouda18/Chat-with-PDF-RAG-.git
cd Chat-with-PDF-RAG-

# 1. Your API key
cp .env.example .env          # then put your OPENAI_API_KEY in .env

# 2. Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# 3. Frontend
cd frontend && npm install && cd ..

# 4. Run both (backend :8001, frontend :5174)
./dev.sh
```

Open **http://localhost:5174** and upload a PDF. A sample is included: `samples/nimbus_handbook.pdf`.

The embedding model (~90 MB) downloads automatically on first start and is saved to `models/`.

<details>
<summary>Run backend and frontend separately (e.g. on Windows)</summary>

```bash
# Terminal 1
cd backend
uvicorn api:app --reload --port 8001

# Terminal 2
cd frontend
npm run dev
```
</details>

## 📁 Project structure

```
├── backend/
│   ├── rag.py            # pipeline: extract → chunk → embed → store → retrieve → answer
│   ├── api.py            # FastAPI: upload, list, delete, streaming chat
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx                   # routing between landing page and document page
│       └── components/
│           ├── Landing.jsx           # hero, upload, document cards, how it works
│           ├── DocView.jsx           # document info, page picker, quick actions, chat
│           ├── Message.jsx           # answers with clickable citations and source cards
│           └── Background.jsx        # animated background
├── data/                 # uploaded PDFs and vector database (not committed)
├── samples/              # sample PDF for testing
├── .env.example
└── dev.sh                # starts backend + frontend
```

## 🔌 API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents` | Upload and index a PDF |
| `GET` | `/api/documents` | List indexed PDFs |
| `GET` | `/api/documents/{id}` | One document's info |
| `GET` | `/api/documents/{id}/file` | The original PDF |
| `DELETE` | `/api/documents/{id}` | Remove a PDF and its vectors |
| `POST` | `/api/chat` | Ask a question (streams `sources`, `text_delta`, `usage`, `done`) |

## ⚠️ Limitations

- Scanned (image-only) PDFs have no extractable text and need OCR, which isn't supported yet.
- Each question sends the top 5 chunks to the model, even when some are weak matches.

## 🗺️ Roadmap

- Evaluation set (retrieval hit rate, answer accuracy)
- Hybrid search (keywords + vectors) and reranking
- OCR for scanned PDFs
- Agentic RAG: let the model decide what and how often to search
