# Stratum — Strategic Ground Truth

**The layer corporations never built:** a living system of record for strategic assumptions, dependencies, and decision-ground-truth.

Corporations track KPIs, OKRs, risks, and compliance. They rarely track the *beliefs* those systems depend on — until one breaks. Stratum fixes that.

Clone it, plug in 3 API keys, and go. Works offline without keys; AI + web scanning unlock with `.env`.

---

## Quick Start

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Python** | 3.10+ | `python --version` |
| **Node.js** | 18+ (for npm scripts) | `node -v` |

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/stratum.git
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

## Push to GitHub (public, free)

```bash
cd stratum
git init
git add .
git commit -m "Initial commit: Stratum strategic ground truth"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stratum.git
git push -u origin main
```

Never commit `.env` — it's in `.gitignore`.

---

## License

MIT — use it, fork it, ship it.