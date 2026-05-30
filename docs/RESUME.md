# Pause & resume (daily workflow)

## Stop for the day (save resources)

From the project root:

```bash
chmod +x scripts/stop.sh scripts/start.sh   # once
./scripts/stop.sh
```

This runs `docker compose down` and frees ports **3001** (frontend) and **8000** (backend).

If you started **local** dev (not Docker), stop those terminals too:

| Process | Port | How to stop |
|---------|------|-------------|
| `npm run dev` | 3000 | Ctrl+C in the terminal |
| `uvicorn main:app --reload` | 8000 | Ctrl+C in the terminal |

> Do not run Docker frontend and local `npm run dev` at the same time unless you use different ports.

---

## Resume in a few clicks

1. Open the project in your editor.
2. Run:

```bash
./scripts/start.sh
```

3. Open **http://localhost:3001** and sign in.

---

## First-time setup (only once per machine)

```bash
cp backend/.env.example backend/.env          # add OpenRouter + InsForge keys
cp frontend/.env.local.example frontend/.env.local
# InsForge: run docs/insforge-schema.sql + npx @insforge/cli config apply -y
chmod +x scripts/start.sh scripts/stop.sh
./scripts/start.sh
```

---

## Optional: local dev (no Docker)

```bash
# Terminal 1
cd backend && source .venv/bin/activate && uvicorn main:app --reload

# Terminal 2
cd frontend && npm run dev
# → http://localhost:3000
```

Use `./scripts/stop.sh` only for Docker; stop the two terminals manually for local dev.
