# Kubernetes AI Agent 🤖

An AI-powered Kubernetes troubleshooting platform that investigates your cluster, correlates evidence, and returns root cause + kubectl fix commands — in under 60 seconds.

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white)
![Stack](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)
![Stack](https://img.shields.io/badge/OpenRouter-FF6B35?style=flat)
![Stack](https://img.shields.io/badge/InsForge-4F46E5?style=flat)

**Repository:** [github.com/abhi002shek/Kubernetes-AI-Agent](https://github.com/abhi002shek/Kubernetes-AI-Agent)

---

## What it does

1. Connects to your live Kubernetes cluster via `kubectl`
2. Collects evidence — pods, logs, events, deployments, networking, nodes, PVCs
3. Feeds structured evidence to an LLM (via OpenRouter)
4. Returns root cause, explanation, kubectl fix commands, and prevention advice
5. Saves investigation history (with per-step progress) and optional Slack alerts

**Supported failure patterns (and anything the LLM can reason about):**
- CrashLoopBackOff, ImagePullBackOff, OOMKilled, Pending pods
- Service selector mismatch, rollout failures, Node NotReady, PVC issues
- Any other issue — the LLM reasons from raw evidence

---

## Architecture

```
Browser (Next.js + InsForge Auth)
      │
      │ POST /investigate  { investigation_id, user_id, context, namespace }
      ▼
FastAPI Backend
      ├── Kubernetes inspectors (kubectl)
      ├── OpenRouter LLM
      └── InsForge (DB + realtime progress)
      ▼
Dashboard + History detail pages
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, Tailwind CSS, InsForge SDK |
| Backend | FastAPI (Python), kubectl subprocess |
| AI | OpenRouter |
| Auth + DB + Realtime | [InsForge](https://insforge.dev) |
| Alerts | Slack webhooks (optional) |
| Containers | Docker Compose |

---

## Prerequisites

- `kubectl` configured (`~/.kube/config` or in-cluster ServiceAccount)
- Docker Desktop (optional, for Compose)
- Node.js 20+ and Python 3.11+ (local dev)
- [OpenRouter](https://openrouter.ai) API key
- [InsForge](https://insforge.dev) project

---

## Quick Start (local dev)

### 1. Clone

```bash
git clone https://github.com/abhi002shek/Kubernetes-AI-Agent.git
cd Kubernetes-AI-Agent
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in keys — never commit .env
uvicorn main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in InsForge URL + anon key
npm run dev
```

Open **http://localhost:3000**

---

## Docker Compose

Uses `frontend/.env.local` and `backend/.env` at runtime — **no secrets are baked into the image**.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Edit both files with your keys

docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | **http://localhost:3001** |
| Backend | http://localhost:8000 |

> **Port 3001** is intentional: Docker maps host `3001` → container `3000` so Compose does not conflict with a local `npm run dev` on port 3000.  
> **Do not run both** on the same machine unless you use different ports.

---

## InsForge setup

### 1. Database schema

Run `docs/insforge-schema.sql` in your InsForge SQL console (or via CLI). This creates:

| Table | Purpose |
|-------|---------|
| `investigations` | One row per run (diagnosis, cluster, namespace, status) |
| `investigation_progress` | One row per step (Checking Pods, AI Reasoning, …) |

Row Level Security (RLS) ensures users only see their own data.

### 2. Auth redirect URLs

Apply `insforge.toml` so OAuth and email flows work on localhost and your production domain:

```bash
npx @insforge/cli link          # if not linked yet
npx @insforge/cli config apply -y
```

Add your production URLs to `insforge.toml` under `[auth] allowed_redirect_urls` before deploying.

### 3. Keys

| Where | Variables |
|-------|-----------|
| `backend/.env` | `INSFORGE_URL`, `INSFORGE_API_KEY` (service/admin key for server writes) |
| `frontend/.env.local` | `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY` |

Get the anon key: `npx @insforge/cli secrets get ANON_KEY`

### 4. Authentication

- Email + password with 6-digit verification code
- Google / GitHub OAuth
- After sign-in, dashboard and history require a valid InsForge session

---

## Configuration reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key |
| `OPENROUTER_MODEL` | ✅ | e.g. `anthropic/claude-3.5-sonnet` (recommended for prod) |
| `INSFORGE_URL` | ✅ | InsForge project URL |
| `INSFORGE_API_KEY` | ✅ | InsForge admin/service API key |
| `SLACK_WEBHOOK_URL` | ❌ | Slack incoming webhook |
| `KUBECONFIG_PATH` | ❌ | Custom kubeconfig path |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | Backend URL (`http://localhost:8000` locally) |
| `NEXT_PUBLIC_INSFORGE_URL` | ✅ | InsForge project URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | ✅ | InsForge anon key |

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/clusters` | List kubectl contexts |
| GET | `/namespaces?context=<ctx>` | List namespaces |
| POST | `/investigate` | Run full investigation |

**POST /investigate body:**

```json
{
  "investigation_id": "uuid-from-frontend",
  "user_id": "insforge-user-uuid",
  "context": "kind-my-cluster",
  "namespace": "default"
}
```

`investigation_id` aligns realtime progress with the database row. `user_id` is optional but required to persist history.

---

## Testing with failure scenarios

```bash
kind create cluster --name k8s-demo
kubectl apply -f docs/failure-scenarios.yaml --context kind-k8s-demo
# Wait ~30s, then investigate in the UI
```

Scenarios: CrashLoopBackOff, ImagePullBackOff, OOMKilled, service selector mismatch.

---

## Production readiness checklist

Use this before exposing the app to real users or production clusters.

### Security (required)

- [ ] **Never commit** `.env`, `.env.local`, kubeconfig files, or API keys (see `.gitignore`)
- [ ] **Lock down CORS** in `backend/main.py` — replace `allow_origins=["*"]` with your frontend origin(s)
- [ ] **Protect `/investigate`** — today the backend trusts `user_id` from the client and does not verify JWTs. For production, validate the InsForge access token on each request or run the backend inside a private network
- [ ] **Rate limit** `/investigate` (e.g. `slowapi`) to prevent abuse and LLM cost spikes
- [ ] **HTTPS** everywhere (TLS termination at load balancer or ingress)
- [ ] **InsForge RLS** enabled on `investigations` and `investigation_progress` (included in schema SQL)
- [ ] **Apply `insforge.toml`** with production `allowed_redirect_urls` (not only localhost)
- [ ] Configure **Google/GitHub OAuth** redirect URIs in provider consoles to match InsForge callbacks

### Reliability

- [ ] Use a **paid / stable OpenRouter model** — free models hit rate limits under load
- [ ] Deploy backend **in-cluster** with a read-only ServiceAccount (see RBAC below) — preferred over mounting kubeconfig on a VM
- [ ] Set investigation **timeouts** appropriately (frontend uses 120s)
- [ ] Monitor `/health` and container logs

### Operations

- [ ] Store secrets in a secret manager (not plain env files on shared hosts)
- [ ] Run `next build` + `next start` for frontend in production (not `next dev`)
- [ ] Use `uvicorn` with multiple workers or a process manager behind a reverse proxy
- [ ] Optional: Slack alerts for critical diagnoses

### Kubeconfig / in-cluster RBAC

| Deployment | Authentication |
|------------|----------------|
| **In-cluster (recommended)** | ServiceAccount token — no kubeconfig file |
| **Outside cluster** | Kubeconfig from secret manager + `KUBECONFIG_PATH` |
| **Local dev** | `~/.kube/config` |

```yaml
# Read-only ClusterRole for the agent — see README history or kubeconfig.example.yaml
```

---

## Slack alerts

Set `SLACK_WEBHOOK_URL` in `backend/.env`. Create a webhook at [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks).

---

## Project structure

```
├── backend/
│   ├── main.py
│   ├── api/                    # investigate, clusters, namespaces
│   ├── kubernetes/             # inspectors (pods, logs, events, …)
│   ├── ai/                     # LLM prompt + OpenRouter client
│   └── services/               # investigation orchestrator, InsForge, Slack
├── frontend/
│   ├── app/
│   │   ├── dashboard/          # main UI + history/[id] detail page
│   │   ├── sign-in/ & sign-up/
│   └── context/AuthContext.tsx
├── docs/
│   ├── insforge-schema.sql
│   └── failure-scenarios.yaml
├── insforge.toml               # auth redirect URLs (config apply)
└── docker-compose.yml
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Docker frontend won't start | Port 3000 in use — stop local `npm run dev` or use **http://localhost:3001** |
| Email/password login loops to sign-in | Ensure `AuthContext.refreshUser()` runs after login (included in current code) |
| OTP invalid / expired | Use latest code, **Resend verification code**, codes expire quickly |
| OAuth redirect error | Run `npx @insforge/cli config apply -y` and add your URL to `insforge.toml` |
| No clusters in UI | Backend needs kubeconfig access; check `kubectl config get-contexts` |
| History empty | `user_id` must be sent on `/investigate`; check `INSFORGE_API_KEY` in backend `.env` |

---

## License

MIT
