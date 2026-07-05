# Stratum — Strategic Ground Truth

<div align="center">

### Your strategy is a hypothesis. Your assumptions are invisible.

You have OKRs. Dashboards. Risk registers. Compliance checklists.  
A beautiful deck from Q1 that everyone already forgot.

**But nobody tracks what must be TRUE for any of it to work.**

"We'll win mid-market on simplicity."  
*Based on what belief?*  
"EU customers will pay a sovereignty premium."  
*When did we last validate that? Who owns it?*

**Six months later the bet fails — and nobody can name the assumption that broke.**

That's not bad execution. That's flying blind on beliefs you never wrote down.

---

**Stratum is the layer corporations never built.**

A living system of record for **strategic assumptions**, **dependencies**, and **decision-ground-truth** — the connective tissue between quarterly planning and what your team actually does on Tuesday.

- Assumption graph — what depends on what  
- Drift radar — beliefs going stale before they break you  
- Signal feed — evidence that contradicts what you still "know"  
- Alignment matrix — where teams secretly disagree  
- Board brief — assumption health, not vanity metrics  

Clone it. Plug your API key. **60 seconds. Free. Local.**

[Quick start](#quick-start) · [The 3 APIs](#the-3-apis) · [Features](#features)

</div>

---

## Sound familiar?

- ✅ Strategy deck from January → **nobody can list the 5 beliefs it depends on**
- ✅ Product ships X, Sales promises Y → **same company, different reality**
- ✅ Post-mortem: *"we assumed churn was about price"* → **never validated, never logged**
- ✅ Board asks "what's our biggest strategic risk?" → **you list KPIs, not assumptions**
- ✅ You have GRC, OKRs, ERP → **no system of record for what must be true to win**

Nodded twice? **Your house has mess. Stratum is the flashlight.**

---

## Quick Start

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Python** | 3.10+ | `python --version` |
| **Node.js** | 18+ (for npm scripts) | `node -v` |

### 1. Clone & configure

```bash
git clone https://github.com/Sunradiance/stratum.git
cd stratum

cp .env.example .env
# Edit .env — add your 3 API keys (see below)
```

### 2. Install & run

```bash
npm run setup    # installs Python deps
npm run dev      # starts Stratum
```

Open **http://localhost:8791**

---

## The 3 APIs

| # | Key | What it powers | Get a key |
|---|-----|----------------|-----------|
| 1 | `LLM_API_KEY` | AI analysis, premortems, blind spots, brief enhancement, assumption extraction | [Groq](https://console.groq.com/) (recommended) |
| 2 | `TAVILY_API_KEY` | Live web signal scanning against your assumptions | [Tavily](https://tavily.com/) |
| 3 | `SERPER_API_KEY` | Supplementary Google search for contradicting evidence | [Serper](https://serper.dev/) |

**Minimum to start:** `LLM_API_KEY` alone enables all AI features. Add Tavily + Serper for web signal scanning.

### Example `.env` (Groq + Tavily + Serper)

```env
LLM_API_KEY=gsk_...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL_NAME=qwen/qwen3-32b

TAVILY_API_KEY=tvly-...
SERPER_API_KEY=...
```

Any OpenAI-compatible LLM works — change `LLM_BASE_URL` and `LLM_MODEL_NAME` for OpenAI, Together, DeepSeek, etc.

---

## Features

- **Command Center** — org assumption health score, drift radar, cascade risk
- **Research Thesis** — synthesis of enterprise research on the strategy-execution gap
- **Strategy Pillars** — link bets to the assumptions they stand on
- **Assumption Graph** — dependency + contradiction visualization
- **Signal Feed** — contradicting evidence (manual + AI web scan)
- **Decision Trace** — major calls linked to assumptions
- **Premortem Lab** — AI-generated failure scenarios
- **Alignment Matrix** — cross-team belief disagreements
- **Board Brief** — exportable markdown + AI enhancement

All data is **local-first** (IndexedDB in your browser). API keys stay on your machine in `.env` — never sent to a Stratum server.

---

## Project structure

```
stratum/
├── .env.example          # Copy to .env
├── index.html            # Frontend SPA
├── css/ js/              # UI
├── backend/
│   ├── run.py            # Start here
│   ├── requirements.txt
│   └── app/
│       ├── api/          # REST endpoints
│       └── services/     # LLM + search
└── package.json          # npm run dev
```

---

## API endpoints (backend)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Check which APIs are configured |
| POST | `/api/ai/premortem` | Generate premortem scenario |
| POST | `/api/ai/blind-spot` | Generate blind-spot question |
| POST | `/api/ai/analyze` | Analyze org assumption health |
| POST | `/api/ai/enhance-brief` | AI-enhance board brief |
| POST | `/api/ai/extract-assumptions` | Extract assumptions from strategy text |
| POST | `/api/signals/scan` | Web scan for contradicting signals |

---

## The stack

| App | Port | Layer |
|-----|------|-------|
| **Stratum** | 8791 | What must be **true** to win |
| [Keepline](https://github.com/Sunradiance/keepline) | 8792 | What you're **committed to pay** |
| [Whyline](https://github.com/Sunradiance/whyline) | 8793 | What was **decided and why** |

---

## License

MIT — use it, fork it, stop flying blind on beliefs.

---

<div align="center">

**Stratum** — illuminate what you depend on but never tracked.

</div>