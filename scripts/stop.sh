#!/usr/bin/env bash
# Stop all project services to free CPU/RAM. Safe to run anytime.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Stopping Docker Compose services..."
docker compose down

echo ""
echo "Done. Containers removed (images kept for fast restart)."
echo ""
echo "If you also ran local dev outside Docker, stop those manually:"
echo "  - Frontend: npm run dev on port 3000 (Ctrl+C in that terminal)"
echo "  - Backend:  uvicorn on port 8000 (Ctrl+C in that terminal)"
echo ""
echo "To start again: ./scripts/start.sh"
