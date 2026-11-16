#!/usr/bin/env bash
# Start backend (port 8001) and frontend (port 5174) together. Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")"
[ -d .venv ] || { echo "No .venv found. See README: Setup."; exit 1; }
source .venv/bin/activate
[ -d frontend/node_modules ] || (cd frontend && npm install)
trap 'trap - EXIT INT TERM; kill 0 2>/dev/null' EXIT INT TERM
(cd backend && uvicorn api:app --reload --port 8001) &
(cd frontend && npx vite --port 5174 --strictPort) &
echo "Open http://localhost:5174   (Ctrl+C to stop both)"
wait -n
