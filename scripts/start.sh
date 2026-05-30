#!/usr/bin/env bash
# Start the full stack with Docker Compose (few-click resume).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f backend/.env ]]; then
  echo "Missing backend/.env — copy from backend/.env.example and fill in keys."
  exit 1
fi
if [[ ! -f frontend/.env.local ]]; then
  echo "Missing frontend/.env.local — copy from frontend/.env.local.example and fill in keys."
  exit 1
fi

echo "Starting AI Kubernetes Agent..."
docker compose up -d --build

echo ""
echo "Ready:"
echo "  Frontend  → http://localhost:3001"
echo "  Backend   → http://localhost:8000/health"
echo "  Sign in   → http://localhost:3001/sign-in"
echo ""
echo "Logs:  docker compose logs -f"
echo "Stop:  ./scripts/stop.sh"
