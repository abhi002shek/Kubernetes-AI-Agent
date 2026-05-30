# Kubernetes AI Agent 🤖

An AI-powered Kubernetes troubleshooting platform that investigates your cluster, correlates evidence, and returns root cause + kubectl fix commands — in under 60 seconds.

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)
![Stack](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)
![Stack](https://img.shields.io/badge/OpenRouter-FF6B35?style=flat)
![Stack](https://img.shields.io/badge/InsForge-4F46E5?style=flat)

---

## What it does

1. Connects to your live Kubernetes cluster via `kubectl`
2. Collects evidence — pods, logs, events, deployments, networking, nodes, PVCs
3. Feeds structured evidence to an LLM (via OpenRouter)
4. Returns root cause, explanation, kubectl fix commands, and prevention advice
5. Saves investigation history and sends Slack alerts

**Supported failure patterns (and anything the LLM can reason about):**
- CrashLoopBackOff (missing env vars, bad startup commands)
- ImagePullBackOff / ErrImagePull (wrong image tag, missing registry credentials)
- OOMKilled (memory limits too low)
- Pending pods (resource pressure, node taints, PVC issues)
- Service selector mismatch (no endpoints)
- Deployment rollout failures
- Node NotReady
- PVC stuck in Pending/Lost
- Any other issue — the LLM reasons from raw evidence

---

## Architecture

```
Browser (Next.js)
      │
      │ POST /investigate  { context, namespace }
      ▼
FastAPI Backend
      │
      ├── Pod Inspector      → kubectl get pods
      ├── Logs Collector     → kubectl logs
      ├── Events Analyzer    → kubectl get events
      ├── Deployment Inspector → kubectl get deployments
      ├── Network Inspector  → kubectl get svc + endpoints
      ├── Node Inspector     → kubectl get nodes
      └── PVC Inspector      → kubectl get pvc
      │
      │ Structured JSON evidence
      ▼
LLM Reasoning Layer (OpenRouter)
      │ root_cause, fix, kubectl_commands, confidence
      ▼
InsForge
      ├── Auth (user login)
      ├── Database (investigation history)
      └── Realtime (live progress updates)
      │
      ▼
Frontend Dashboard
      └── Slack Alert (optional)
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 + Tailwind CSS | Fast, type-safe, great DX |
| Backend | FastAPI (Python) | Async, fast, great for orchestration |
| Kubernetes | kubectl (subprocess) | Universal — works with any cluster |
| AI / LLM | OpenRouter | Model-agnostic, supports free models |
| Auth + DB + Realtime | InsForge | All-in-one BaaS, Postgres-backed |
| Alerts | Slack Webhooks | Simple, widely used in DevOps |
| Containers | Docker + Docker Compose | Easy local + production deployment |

---

## Prerequisites

- `kubectl` installed and configured (`~/.kube/config`)
- Docker Desktop (for local KIND cluster testing)
- Node.js 18+
- Python 3.11+
- An [OpenRouter](https://openrouter.ai) account (free tier available)
- An [InsForge](https://insforge.dev) project

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/abhi002shek/Kubernetes-AI-Agent.git
cd Kubernetes-AI-Agent
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and fill in your keys
```

### 3. Frontend setup

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Edit .env.local and fill in your InsForge URL and anon key
```

### 4. Run locally

```bash
# Terminal 1 — Backend
cd backend && uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Docker Compose (recommended)

```bash
cp backend/.env.example backend/.env
# Fill in backend/.env

cp frontend/.env.local.example frontend/.env.local
# Fill in frontend/.env.local

docker-compose up --build
```

---

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | ✅ | Your OpenRouter API key |
| `OPENROUTER_MODEL` | ✅ | Model to use (e.g. `qwen/qwen3-235b-a22b:free`) |
| `INSFORGE_URL` | ✅ | Your InsForge project base URL |
| `INSFORGE_API_KEY` | ✅ | InsForge service role key |
| `SLACK_WEBHOOK_URL` | ❌ | Slack incoming webhook for alerts |
| `KUBECONFIG_PATH` | ❌ | Custom kubeconfig path (default: `~/.kube/config`) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | Backend URL (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_INSFORGE_URL` | ✅ | InsForge project URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | ✅ | InsForge anon key |

---

## InsForge Database Setup

Run this SQL in your InsForge project to create the investigations table:

```sql
CREATE TABLE investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  root_cause TEXT,
  confidence INTEGER,
  status TEXT DEFAULT 'completed',
  diagnosis JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own investigations"
  ON investigations FOR ALL
  USING (auth.uid() = user_id);
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/clusters` | List kubectl contexts from kubeconfig |
| GET | `/namespaces?context=<ctx>` | List namespaces in a cluster |
| POST | `/investigate` | Run full investigation |

**POST /investigate body:**
```json
{
  "user_id": "uuid",
  "context": "kind-my-cluster",
  "namespace": "default"
}
```

---

## Testing with failure scenarios

Deploy intentional failures to a local KIND cluster:

```bash
# Create cluster
kind create cluster --name k8s-demo

# Deploy failure scenarios
kubectl apply -f docs/failure-scenarios.yaml --context kind-k8s-demo

# Wait ~30s then investigate via the UI
```

Scenarios included:
- `crash-loop-demo` — CrashLoopBackOff (missing DATABASE_URL)
- `image-pull-demo` — ImagePullBackOff (invalid image tag)
- `oom-demo` — OOMKilled (10Mi memory limit)
- `selector-mismatch-demo` — Service selector mismatch

---

## Slack Alerts

Set `SLACK_WEBHOOK_URL` in `backend/.env`. Create a webhook at [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks).

Alert format:
```
🔴 Kubernetes Issue Detected — `kind-my-cluster` / namespace `default`
Root Cause: CrashLoopBackOff — missing DATABASE_URL environment variable
Fix: Add DATABASE_URL to the deployment's env or reference a Secret
Confidence: 94%
```

---

## Production Deployment

1. **Lock down CORS** — change `allow_origins=["*"]` in `main.py` to your frontend domain
2. **Add rate limiting** — use `slowapi` on the `/investigate` endpoint
3. **Secure kubeconfig** — mount as a Kubernetes Secret if deploying the agent inside a cluster
4. **Use a paid LLM model** — free models have rate limits; `anthropic/claude-3.5-sonnet` gives best results
5. **Set up RLS** in InsForge so users only see their own investigation history

---

## Project Structure

```
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── api/
│   │   ├── investigate.py         # POST /investigate
│   │   ├── clusters.py            # GET /clusters
│   │   └── namespaces.py          # GET /namespaces
│   ├── kubernetes/
│   │   ├── pod_inspector.py       # Pod health + status
│   │   ├── logs_collector.py      # Container logs
│   │   ├── events_analyzer.py     # K8s warning events
│   │   ├── deployment_inspector.py
│   │   ├── network_inspector.py   # Services + endpoints
│   │   ├── node_inspector.py      # Node health
│   │   └── pvc_inspector.py       # Persistent volume claims
│   ├── ai/
│   │   ├── analyzer.py            # Orchestrates LLM call
│   │   ├── prompt_builder.py      # Builds LLM prompt
│   │   └── llm_client.py          # OpenRouter HTTP client
│   └── services/
│       ├── investigation.py       # Investigation orchestrator
│       ├── insforge_client.py     # InsForge DB + realtime
│       └── slack.py               # Slack notifications
├── frontend/
│   ├── app/
│   │   ├── dashboard/page.tsx     # Main dashboard
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── context/AuthContext.tsx    # Auth state
│   └── lib/insforge.ts            # InsForge client
├── docs/
│   └── failure-scenarios.yaml    # Test failure deployments
└── docker-compose.yml
```

---

## License

MIT
