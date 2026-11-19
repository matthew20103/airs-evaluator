# Prisma AIRS Runtime Security Evaluator

## Project Overview
This project's sole purpose is comparing the effectiveness of two independent detectors of
malicious prompts, side by side on the same open-source security benchmark datasets:
1. **Prisma AIRS Runtime Security** — a real external API product.
2. **An LLM acting as judge** — classifying each prompt into the same detection categories.

There is no target-agent/scan testing in this project — that earlier workflow was removed
entirely; the Evaluation feature is the only thing the dashboard does.

## Architecture
Built on Node.js:
1. **Judge Agent** (`server/agents/judge.js`): `classifyPrompt(prompt)` categorizes a benchmark
   prompt via the AI Gateway into the same 6 categories Prisma AIRS reports on.
2. **Prisma AIRS client** (`server/agents/prismaAirs.js`): calls the configured Prisma AIRS
   Runtime Security API with the same prompt the judge classifies, mapping its `prompt_detected`
   flags onto the same 6 category keys the judge uses, for direct comparison.
3. **Evaluation orchestrator** (`server/evaluation/orchestrator.js`): runs every prompt from the
   selected benchmarks through both the Judge and Prisma AIRS concurrently (bounded by a
   configurable max-concurrency — see `server/lib/concurrency.js`), storing both verdicts +
   latencies per prompt.
4. **Evaluation report** (`server/evaluation/reporter.js`, `server/evaluation/reportTemplate.js`):
   gathers a completed run's results into a self-contained, downloadable HTML report (same
   structural pattern as the Lakera samples in `data/*.html` — static shell, inline JSON data,
   dependency-free vanilla-JS renderer) with per-category detection rate / agreement / confirmed
   misses / latency breakdowns. Generated once at run completion and served from `reports/`.
5. **Web Interface (Dashboard)** (`frontend/`, React + Vite, served by Express), 3 tabs:
   - **Benchmarks**: add/manage benchmarks (including out-of-the-box datasets).
   - **Evaluation**: select benchmarks, run the Judge-vs-Prisma-AIRS comparison, view per-category
     tables in-app, and download the full HTML report once a run completes.
   - **LLM Config**: the shared AI Gateway + judge/reporter models, and the Prisma AIRS API (URL,
     HTTP method, auth header name/value, security profile name) with a one-click connectivity
     test for each.

## Stack
- **Backend**: Node.js + Express (`server/`), SQLite via the built-in `node:sqlite` module (no native build step — requires the `--experimental-sqlite` flag, already wired into the `start`/`test` scripts).
- **Frontend**: React + Vite (`frontend/`), built to `frontend/dist` and served as static assets by Express; API lives under `/api/*`.
- **LLM access**: the judge/reporter roles call a single OpenAI-compatible AI Gateway. Its base URL and API key, plus the model per role, are configured entirely through the dashboard's LLM Config page (stored in the `settings` and `llm_config` tables) — not in `.env`. `.env` (copy from `env.example`) only holds `PORT` and `DB_PATH`.
- **Prisma AIRS access**: configured the same way, via `settings` (`prisma_airs_*` keys) on the LLM Config page — not an LLM, a direct REST call (see `server/agents/prismaAirs.js`).
- **Benchmark ingestion**: `server/benchmarks/loader.js` fetches seed benchmarks directly from HuggingFace (raw file download or the `datasets-server` rows API — see `data/benchmarks.json` for the source descriptor schema) and caches them under `data/cache/`.
- IMPORTANT: The report footer MUST read: "Prisma AIRS Runtime Security Evaluator".

## Custom Commands
- run: npm start
- test: npm test
- build frontend: npm run build
