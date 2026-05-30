<div align="center">

```
███████╗ ██████╗ ██████╗  ██████╗ ███████╗ ██████╗ ██████╗ ███████╗     █████╗ ██╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝██╔═══██╗██╔══██╗██╔════╝    ██╔══██╗██║
█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ██║   ██║██████╔╝███████╗    ███████║██║
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ██║   ██║██╔═══╝ ╚════██║    ██╔══██║██║
██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗╚██████╔╝██║     ███████║    ██║  ██║██║
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝     ╚══════╝    ╚═╝  ╚═╝╚═╝
```

**Mission-critical enterprise SRE command center.**  
Real-time incident automation · Vector SOP retrieval · AI-powered telemetry intelligence.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Railway-8B5CF6?style=for-the-badge&logo=railway)](https://forgeops-ai.up.railway.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

</div>

---

## What is ForgeOps AI?

ForgeOps AI is a **full-stack SRE (Site Reliability Engineering) command center** for multi-tenant enterprise environments. It handles the full operational lifecycle of production infrastructure — from real-time telemetry monitoring and manual fault injection, to AI-automated incident triage, vector-search SOP retrieval, and executive compliance report generation.

Three core ideas drive every design decision:

**1. Incidents get triaged before a human has to think.** When an engineer files an incident, Gemini AI immediately generates a root-cause analysis, a structured 7-section diagnostic report, and actionable mitigation steps — before the SRE even opens the runbook.

**2. Runbooks are retrieved, not remembered.** The RAG pipeline uses cosine similarity over L2-normalized term vectors (with Gemini embedding fallback) to surface the exact SOP section relevant to the active incident — not a search results page, but grounded, contextual guidance.

**3. Executives need synthesized signal, not raw data.** The report compiler aggregates 24 hours of live telemetry, active incident timelines, and SLA margins into a board-ready intelligence brief — one click, zero manual effort.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER CLIENT                                  │
│                                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   App.tsx   │  │ MetricCharts │  │ CopilotChat  │  │   RagManager     │  │
│  │             │  │              │  │              │  │                  │  │
│  │ Root state  │  │ SVG telemetry│  │ Persistent   │  │ SOP upload +     │  │
│  │ orchestrator│  │ line charts  │  │ AI sidebar   │  │ semantic search  │  │
│  │ + 5s poller │  │ (CPU/Mem/Net)│  │ RAG-grounded │  │ cosine retrieval │  │
│  └──────┬──────┘  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  IncidentSreRunbook — sliding drawer, status lifecycle, AI diagnosis │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  React 19 · TypeScript 5.8 · Vite 6 · Framer Motion · Tailwind CSS v4      │
│  5-second polling loop · mutable ref sync · multi-tenant state machine      │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │  REST /api/*  (JSON)
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                         BACKEND  —  server.ts                                │
│                                                                              │
│  GET  /api/tenants              org metadata (3 tenants, static)             │
│  GET  /api/metrics?orgId=       telemetry history (last 20 snapshots)        │
│  GET  /api/incidents?orgId=     incident list filtered by org                │
│  POST /api/incidents            create + AI-triage via Gemini                │
│  POST /api/incidents/:id/update status / assignee / timeline append         │
│  POST /api/incidents/:id/ai-diagnose  deep 7-section runbook generation     │
│  GET  /api/simulation/timeline  simulation alert feed                        │
│  POST /api/simulation/trigger   manual fault injection (3 scenarios)        │
│  GET  /api/knowledge            list uploaded SOP documents                  │
│  POST /api/knowledge/upload     chunk + embed + store SOP document           │
│  POST /api/copilot/chat         RAG retrieval + Gemini generation            │
│  POST /api/reports/generate     executive compliance brief                   │
│                                                                              │
│  Node.js · Express 4 · dotenv · esbuild (prod bundle) · tsx (dev)           │
│  Background ticker (10s) · in-memory state · org-scoped incident pressure   │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │  Google GenAI SDK (@google/genai)
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                           AI LAYER  —  Google Gemini                         │
│                                                                              │
│  ┌──────────────────────┐  ┌───────────────────────┐  ┌───────────────────┐ │
│  │  Incident triage     │  │  RAG pipeline         │  │  Report synthesis │ │
│  │                      │  │                       │  │                   │ │
│  │ POST /incidents      │  │ gemini-embedding-2    │  │ POST /reports/    │ │
│  │ → JSON schema prompt │  │ → cosine similarity   │  │ generate          │ │
│  │ → summary + actions  │  │ → top-3 SOP chunks    │  │ → exec brief JSON │ │
│  │                      │  │ → grounded Gemini res │  │                   │ │
│  └──────────────────────┘  └───────────────────────┘  └───────────────────┘ │
│                                                                              │
│  Graceful degradation: falls back to L2-normalized term-vector cosine       │
│  similarity when Gemini embedding API is unavailable                         │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                        INFRASTRUCTURE                                        │
│  Railway PaaS · GitHub auto-deploy · managed SSL · env var injection        │
│  Vite SPA build (dist/) · esbuild server bundle (dist/server.cjs)           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Engineering Decisions

### 1. Stale-closure-safe incident hot-reload

The incident drawer stays live with a mutable ref mirror:

```typescript
const selectedIncidentIdRef = useRef<string | null>(null);

useEffect(() => {
  selectedIncidentIdRef.current = selectedIncident ? selectedIncident.id : null;
}, [selectedIncident]);

// Inside the 5s polling interval:
const currentSelectedId = selectedIncidentIdRef.current;
if (currentSelectedId) {
  const fresh = incData.find((i: Incident) => i.id === currentSelectedId);
  if (fresh) setSelectedIncident(fresh);
}
```

Without this, `setInterval` closes over the initial `null` value of `selectedIncident` and never updates the open drawer. The ref breaks the closure without adding the incident to the interval's dependency array (which would restart the timer on every selection change).

### 2. Two-tier RAG retrieval with graceful degradation

The vector pipeline runs in two modes:

```
Primary:  Gemini Embedding API (gemini-embedding-2-preview)
          → high-dimensional semantic embedding
          → cosine similarity against stored chunks
          → top-3 matches as grounded context for Gemini generation

Fallback: L2-normalized term-frequency vector over 32-term operational vocabulary
          → same cosine similarity math, lower dimensional
          → zero API dependency, works offline
```

Every uploaded document is chunked at ~350 character sentence boundaries, embedded immediately on upload, and stored in-memory with its vector. The fallback ensures the RAG pipeline never silently fails — the operator always gets contextually grounded responses.

### 3. Metric pressure from active incidents

The background ticker (10s interval) dynamically adjusts simulated metrics based on the live incident state — not random noise:

```typescript
const cpuBump = cryCount * 25 + highCount * 12;   // CRITICAL = +25% CPU
const memBump = cryCount * 15 + highCount * 8;    // feeds memory pressure
let baseSla = tenant.slaTarget;
if (cryCount > 0) baseSla -= (0.15 * cryCount);  // SLA degrades realistically
```

This means resolving an incident actually changes the telemetry charts, making the simulation causally coherent rather than decorative.

### 4. Multi-tenant org isolation

Every API route filters by `orgId`. The three tenants (`org-aether`, `org-chronos`, `org-hyperion`) each have isolated incident pools, metric histories, and simulation feeds. Switching organizations in the header dropdown triggers a full sync without a page reload:

```typescript
useEffect(() => {
  syncServerData();  // re-fetches metrics, incidents, simulation feed
}, [activeOrgId]);
```

### 5. Structured AI outputs with schema enforcement

Incident triage and report generation use `responseMimeType: "application/json"` with an explicit schema in the prompt, preventing markdown-wrapped JSON or partial responses:

```typescript
config: { responseMimeType: "application/json" }
// prompt: "Return ONLY valid JSON matching this schema exactly: { summary, actions }"
```

The 7-section diagnostic prompt (Summary / Observed Signals / Potential Cause / Operational Impact / Recommended Actions / Risk Level / Confidence) enforces epistemic humility — Gemini is explicitly instructed never to state unverified facts as certainties.

---

## Features

### Real-time monitoring dashboard
- Live SVG telemetry charts: CPU, memory, network traffic, DB load
- 5-second auto-polling loop per active organization
- Scenario control rig: inject CRITICAL / HIGH / MEDIUM fault scenarios directly onto the telemetry feed
- Severity-coded operational activity stream (auto-ticked every 10s from background sim)

### Incident resolution ledger
- Create incidents with title, description, severity (CRITICAL / HIGH / MEDIUM / LOW), and category
- Gemini AI autopilot on every new incident: generates root-cause summary + 3 actionable mitigation steps
- Sliding SRE triage drawer with live hot-reload via mutable ref pattern
- Status lifecycle: OPEN → TRIAGED → INVESTIGATING → RESOLVING → CLOSED
- Deep AI diagnostic: on-demand 7-section structured runbook generation
- Manual timeline event logging with operator attribution

### Knowledge base (RAG)
- Upload SOP documents as plain text or paste content directly
- Automatic chunking (~350 chars at sentence boundaries) + embedding on upload
- Semantic search via cosine similarity — returns top-3 matching SOP sections with similarity scores
- All copilot responses are grounded in retrieved chunks before Gemini generation

### Intelligence reports
- One-click executive brief: SLA compliance, risk matrix, incident audit log
- AI-generated long-term preventative recommendations (Gemini-powered)
- Risk levels: CRITICAL / HIGH / ELEVATED / NOMINAL with system impact count

### AI Copilot sidebar
- Persistent collapsible chat panel scoped to active org + user role
- Full RAG retrieval context injected into every prompt: active incidents, recent alerts, SOP matches
- Three access clearance levels: Senior SRE, Principal FDE, Incident Commander
- `ragSources` tagged on every assistant message for traceability

---

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19 |
| Language | TypeScript | 5.8 |
| Build tool | Vite | 6.2 |
| Animation | Framer Motion (motion) | 12 |
| Icons | Lucide React | 0.546 |
| Styling | Tailwind CSS | 4.1 |
| Backend runtime | Node.js + Express | 4.21 |
| AI model | Google Gemini (`@google/genai`) | 2.4 |
| Embedding model | `gemini-embedding-2-preview` | — |
| Production bundler | esbuild | 0.25 |
| Dev server | tsx | 4.21 |

---

## Project structure

```
ForgeOps-AI/
├── src/
│   ├── components/
│   │   ├── CopilotChat.tsx          # AI sidebar — RAG-grounded chat, message history
│   │   ├── IncidentSreRunbook.tsx   # Sliding triage drawer — status, AI diagnosis, timeline
│   │   ├── MetricCharts.tsx         # SVG telemetry charts — CPU, mem, network, DB load
│   │   └── RagManager.tsx           # SOP upload, chunking, cosine semantic search UI
│   ├── App.tsx                      # Root — all state, polling loop, tab routing
│   ├── types.ts                     # Shared interfaces: Tenant, Incident, MetricSnapshot…
│   ├── main.tsx                     # React 19 entry point
│   └── index.css                    # Global styles (Tailwind directives)
│
├── server.ts                        # Express API + Gemini proxy + sim engine (900 lines)
├── index.html                       # App shell
├── vite.config.ts                   # Vite + Tailwind v4 + path aliases
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A Gemini API key (free tier works)

### Local development

```bash
# 1. Clone
git clone https://github.com/Abhishekai1/ForgeOps-AI.git
cd ForgeOps-AI

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env — set GEMINI_API_KEY to your key

# 4. Run (starts Express + Vite dev server together on port 3000)
npm run dev
```

Open `http://localhost:3000`. No separate frontend/backend process needed — `server.ts` boots both via Vite middleware.

### Build for production

```bash
npm run build   # Vite builds frontend → dist/  |  esbuild bundles server → dist/server.cjs
npm run start   # node dist/server.cjs
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Without it, the platform runs in local semantic fallback mode — all features work, AI responses use template outputs. |
| `APP_URL` | No | Base URL for self-referential links (defaults fine for local dev). |

### Deploy to Railway (one-time setup)

1. Push to GitHub
2. [New project → Deploy from GitHub repo](https://railway.app/new) in Railway
3. Set `GEMINI_API_KEY` in Railway → Variables tab
4. Railway auto-detects Node.js, runs `npm run build` then `npm run start`
5. Done — SSL and domain provisioned automatically

---

## How the RAG pipeline works

```
User query
    │
    ▼
Generate query vector
    ├── Primary: Gemini embedding API (gemini-embedding-2-preview)
    └── Fallback: L2-normalized term-frequency vector (32-term vocabulary)
    │
    ▼
Cosine similarity against all stored document chunks
    │
    ▼
Filter similarity > 0.08, sort descending, take top 3
    │
    ▼
Inject matched chunk texts as grounded context into Gemini prompt
    │
    ▼
Gemini generates response anchored to retrieved SOP content
    │
    ▼
Response tagged with ragSources[] for operator traceability
```

---

## Roadmap

- [ ] PostgreSQL / Prisma — replace in-memory state with persistent storage
- [ ] JWT authentication — session management, per-user audit trails
- [ ] PagerDuty / OpsGenie webhooks — ingest real incidents automatically
- [ ] Prometheus scraping — replace simulated metrics with real infra telemetry
- [ ] Exportable PDF reports
- [ ] WebSocket live push — replace 5s polling with event-driven updates
- [ ] Docker Compose — local multi-service dev environment

---

## Author

Built by **Abhishek** — full-stack engineer focused on AI-integrated SRE tooling and developer platforms.

[![GitHub](https://img.shields.io/badge/GitHub-Abhishekai1-181717?style=flat-square&logo=github)](https://github.com/Abhishekai1)
[![Live Demo](https://img.shields.io/badge/Demo-forgeops--ai.up.railway.app-00A3FF?style=flat-square)](https://forgeops-ai.up.railway.app)

---

## License

MIT — see [LICENSE](LICENSE) for details.
