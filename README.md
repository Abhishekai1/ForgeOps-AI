# ForgeOps AI

> Mission-critical enterprise SRE platform — real-time incident automation, vector SOP retrieval, and AI-powered telemetry intelligence.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-forgeops--ai.up.railway.app-00A3FF?style=flat-square)](https://forgeops-ai.up.railway.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square)](https://ai.google.dev/)
[![Railway](https://img.shields.io/badge/Deployed%20on-Railway-8B5CF6?style=flat-square)](https://railway.app)

---

## What is ForgeOps AI?

ForgeOps AI is a full-stack SRE (Site Reliability Engineering) command center built for multi-tenant enterprise environments. It simulates and manages the operational lifecycle of production infrastructure — from live telemetry monitoring and fault injection to AI-automated incident triage, RAG-powered SOP retrieval, and executive compliance report generation.

It is designed around three core ideas:

1. **Incidents should be auto-triaged, not just logged.** When an engineer files an incident, Gemini AI immediately generates a root-cause analysis and SRE runbook — before a human has to think about it.
2. **Runbooks should be retrieved, not remembered.** The RAG knowledge pipeline surfaces the right SOP document from a vector store at the moment it's needed, not after a context switch to Confluence.
3. **Executives need synthesized signal, not raw data.** The report compiler turns 24 hours of live telemetry and incident timelines into a board-ready intelligence brief, automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT                           │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐  │
│  │ App.tsx  │  │ MetricCharts │  │CopilotChat│  │RagManager│  │
│  │Orchestr. │  │ Telemetry viz│  │AI sidebar │  │SOP store │  │
│  └────┬─────┘  └──────────────┘  └───────────┘  └──────────┘  │
│       │  React 18 + TypeScript + Framer Motion + Vite           │
│       │  5s polling loop · multi-tenant state · role-based UI   │
└───────┼─────────────────────────────────────────────────────────┘
        │ REST /api/*
┌───────▼─────────────────────────────────────────────────────────┐
│                       BACKEND  (server.ts)                      │
│                                                                 │
│  /api/tenants     /api/metrics      /api/incidents              │
│  org metadata     telemetry data    CRUD + AI triage            │
│                                                                 │
│  /api/simulation/trigger            /api/reports/generate       │
│  fault injection engine             executive brief compiler    │
│                                                                 │
│  /api/rag/*       vector chunk store · SOP retrieval proxy      │
└───────┬─────────────────────────────────────────────────────────┘
        │ Gemini API
┌───────▼─────────────────────────────────────────────────────────┐
│                         AI LAYER                                │
│                                                                 │
│  Incident triage       RAG retrieval        Report synthesis    │
│  Auto-generates        Semantic SOP search  Executive brief     │
│  root-cause + runbook  on vector chunks     from telemetry data │
└───────┬─────────────────────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                                │
│  Railway PaaS · GitHub auto-deploy · managed SSL · env vars     │
└─────────────────────────────────────────────────────────────────┘
```

### Key architectural decisions

**Multi-tenant isolation by `orgId`** — Every API route filters data by the active organization (`org-aether`, `org-chronos`, `org-hyperion`). Switching organizations in the UI triggers a full re-sync across metrics, incidents, and simulation feeds without a page reload.

**Stale-closure-safe incident hot-reload** — The selected incident panel stays in sync with live data using a `useRef` mirror of the selected incident ID. This prevents a classic React bug where a `setInterval` callback closes over a stale state value and fails to update the drawer after the interval fires.

**RAG pipeline for SOP retrieval** — Rather than prompting Gemini with a raw question, the RAG manager chunks and stores SOP documents in a vector store. Queries retrieve semantically similar chunks first, then pass those as grounded context to Gemini — reducing hallucination and keeping answers operationally relevant.

**Simulation fault injection** — The `/api/simulation/trigger` endpoint allows engineers to inject named failure scenarios (coolant surge, drive slip, sensor drift) directly into the telemetry feed. This lets teams validate SLA recovery logic and AI response quality without waiting for real incidents.

---

## Feature overview

### Real-time monitoring dashboard
- Live telemetry charts with auto-refreshing 5-second polling
- Multi-tenant organization selector with instant data re-sync
- Simulation control rig for manual fault injection (CRITICAL / HIGH / MEDIUM scenarios)
- Operational activity stream with severity-coded event feed

### Incident resolution ledger
- File incidents with title, description, severity, and category
- AI autopilot engagement on every new incident (Gemini generates root-cause and runbook)
- Sliding SRE triage drawer with hot-reload on live incident updates
- Severity-coded table with lifecycle status tracking (OPEN → INVESTIGATING → CLOSED)

### Knowledge base (RAG)
- Upload and manage SOP documents as vector chunks
- Semantic search across the knowledge base
- Grounded AI responses anchored to your actual runbooks

### Intelligence reports
- One-click executive brief compilation (Gemini-powered)
- SLA compliance assessment, risk matrix, and incident audit log
- AI-generated long-term preventative recommendations

### AI copilot sidebar
- Persistent collapsible chat panel scoped to the active organization and user role
- Role-aware context: Senior SRE, Principal FDE, Incident Commander

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Animation | Framer Motion |
| Icons | Lucide React |
| Backend | Node.js + Express (server.ts) |
| AI model | Google Gemini |
| Vector retrieval | RAG pipeline (custom chunking + retrieval) |
| Deployment | Railway (PaaS) |
| Styling | Tailwind CSS |

---

## Project structure

```
forgeops-ai/
├── src/
│   ├── components/
│   │   ├── CopilotChat.tsx        # Persistent AI sidebar chat
│   │   ├── IncidentSreRunbook.tsx # Sliding incident triage drawer
│   │   ├── MetricCharts.tsx       # Telemetry visualization
│   │   └── RagManager.tsx         # Knowledge base + SOP retrieval
│   ├── App.tsx                    # Root orchestrator, all state
│   ├── types.ts                   # Shared TypeScript types
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── server.ts                      # Express API + Gemini proxy
├── index.html                     # App shell
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A Google AI Studio API key ([get one here](https://aistudio.google.com/))

### Local development

```bash
# Clone the repository
git clone https://github.com/Abhishekai1/ForgeOps-AI.git
cd ForgeOps-AI

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Start the dev server (frontend + backend)
npm run dev
```

The app runs on `http://localhost:3000`.

### Environment variables

```env
GEMINI_API_KEY=your_google_ai_studio_key_here
PORT=3000
```

### Deploy to Railway

1. Push to GitHub
2. Connect the repo in [Railway](https://railway.app)
3. Set `GEMINI_API_KEY` in Railway environment variables
4. Railway auto-detects Node.js and deploys — no additional config needed

---

## Design philosophy

ForgeOps AI is styled as a **terminal-grade command center** — dark zinc background (`#09090B`), electric blue accents (`#00A3FF`), monospace labels, and severity-coded status indicators. Every UI decision is intentional: this is software that an on-call SRE opens at 3 AM during a P0 incident. It needs to surface critical information instantly, with zero cognitive overhead.

The collapsible AI copilot sidebar is always one click away but never forced — engineers in flow should not be distracted by an AI panel they didn't ask for.

---

## Roadmap

- [ ] Persistent database (PostgreSQL) to replace in-memory state
- [ ] JWT-based authentication and session management
- [ ] PagerDuty / OpsGenie webhook integration for real incident ingestion
- [ ] Prometheus metrics scraping for real telemetry (vs. simulated)
- [ ] Exportable PDF reports
- [ ] Audit log with user attribution per action

---

## Author

Built by **Abhishek** — full-stack engineer with a focus on AI-integrated developer tooling and SRE platforms.

[![GitHub](https://img.shields.io/badge/GitHub-Abhishekai1-181717?style=flat-square&logo=github)](https://github.com/Abhishekai1)

---

## License

MIT
