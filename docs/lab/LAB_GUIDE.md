# Vibe Coding Lab Guide

## Prisma AIRS Runtime Security Evaluator

**For:** Security engineers practicing AI-assisted (“vibe”) coding  
**Repo purpose (the product you will operate):**

1. Deploy a GCP VM that can host this tool.  
2. Pull open-source security benchmarks from HuggingFace.  
3. Compare an **LLM judge** vs **Prisma AIRS Runtime Security** on the same prompts and produce a downloadable **HTML report**.

This guide is written so you can complete the lab with an AI coding assistant (Cursor, Claude Code, Copilot, etc.). **You** remain accountable for security decisions and for verifying what the model produces.

**Day-of sheet:** keep [`ONE_PAGER.md`](./ONE_PAGER.md) open.  
**Module 5 kits:** [`CHALLENGES.md`](./CHALLENGES.md) + [`STARTERS.md`](./STARTERS.md).

---

## How to use your AI assistant in this lab

Treat every request like a mini security ticket:

```text
Goal: <what success looks like>
Context: <files / CLAUDE.md sections to read first>
Constraints: <must not break X; no secrets in git; …>
Acceptance: <command to run, UI check, or metric>
Non-goals: <what not to refactor>
```

**Golden rules**

1. Start from `CLAUDE.md` — it is the project’s source of truth for architecture.  
2. Prefer *explain → propose → small change → verify* over *rewrite everything*.  
3. Never paste API keys, Prisma tokens, or SSH private keys into the chat.  
4. Benchmark prompts are **attack payloads as data**. Do not ask the assistant to “try” them against production systems outside this lab.  
5. If the assistant contradicts the repo, **trust the repo** (and failing tests) until proven otherwise.

---

## Prerequisites

| Need | Notes |
|---|---|
| This repository cloned | Work from a clean checkout |
| Node.js **≥ 22.5** + npm | Required for built-in `node:sqlite` |
| Terraform + Google Cloud SDK | For Module 1 |
| GCP project with Compute Engine | Billing enabled; permission to create VPC + VM |
| OpenAI-compatible AI Gateway | Base URL + API key (configured in the app UI, not `.env`) |
| Prisma AIRS Runtime Security API | URL, auth header, security profile name |
| AI coding assistant | Cursor recommended; any agent that can read the repo works |

Optional: pair with another engineer — one “driver” (prompts), one “navigator” (reviews diffs / security).

---

# Module 0 — Orientation & briefing hygiene

**Time:** ~25 minutes  

### Learning goal (vibe coding)

Practice **context engineering**: give an agent enough grounded context that it does not invent a different product.

### Product goal

Be able to explain, in your own words, what this repo does and does *not* do.

### Tasks

1. Open `CLAUDE.md` and skim the architecture list (Judge, Prisma AIRS client, orchestrator, report, dashboard tabs).  
2. Ask your assistant (do **not** let it edit yet):

   > Read `CLAUDE.md` and list the three dashboard tabs and which server modules power Evaluation. Do not modify any files.

3. Spot-check its answer against the tree:

   - `server/agents/judge.js`  
   - `server/agents/prismaAirs.js`  
   - `server/evaluation/`  
   - `frontend/src/pages/`  
   - `terraform/`  
   - `data/benchmarks.json`

4. Note the leftover folder `define-custom-adapter/`. Ask:

   > Is `define-custom-adapter/` part of the Evaluation product described in CLAUDE.md? Answer from the repo only.

   Expected insight: it is a **skill contract for a different / earlier red-teaming adapter workflow**, not what the dashboard Evaluation tab runs today.

### Deliverable

Write 5–8 bullet points: product purpose, two detectors, where config lives, where reports land, one thing that is *out of scope*.

### Skill checkpoint

□ You stopped the agent from editing before you understood the map.  
□ You caught at least one hallucination or over-claim by comparing to files.

---

# Module 1 — Deploy a GCP VM with Terraform

**Time:** ~45–60 minutes  
**Pillar:** Deploy for later hosting of the tool  

### Learning goal (vibe coding)

Practice **spec → IaC** and **security review of AI-generated infra**: the agent may suggest “open the firewall to the world”; you must not accept that.

### Product goal

Apply the provided Terraform so you have an Ubuntu VM, SSH access from *your* IP, and a path to run the app on the configured dashboard port.

### What the repo already gives you

Under `terraform/`:

- Custom VPC + subnet (no reliance on a default VPC)  
- Ubuntu 22.04 VM (`e2-standard-4` by default — see `system_requirements.md`)  
- Firewall rules scoped to **your detected public IP** (`/32`) for SSH and the app port  
- Generated SSH key material under `terraform/ssh_key` (gitignored)  
- Outputs: public IP, SSH command, optional SSH tunnel command  

### Tasks

1. Read `system_requirements.md` and `terraform/terraform.tfvars.example`.  
2. Ask the assistant for a **runbook only** (still no code changes unless your facilitator allows fixes):

   > Using only files under `terraform/` and `system_requirements.md`, write step-by-step commands to deploy this VM on my GCP project. Call out every place a secret or credential appears. Do not weaken the firewall.

3. Copy `terraform.tfvars.example` → `terraform.tfvars`, set `project_id`, then:

   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

4. **Security review (human, mandatory):**

   - Are SSH and dashboard rules still limited to your IP?  
   - Is `ssh_key` listed in `.gitignore` / `terraform/.gitignore`?  
   - Did anything in the plan create `0.0.0.0/0`?

5. SSH in with the outputted command. Confirm you can reach the host.

6. *(Optional stretch)* Ask the agent how you would install Node 22.5+ and clone the app on the VM — then do it, or stay local for Modules 2–4 if the facilitator prefers laptop deploys.

### Deliverable

- Successful `terraform apply` (or documented blocker + `plan` output)  
- Screenshot or note of `instance_public_ip` / `ssh_command`  
- Two sentences: what you would reject if an AI “simplified” the firewall  

### Skill checkpoint

□ Brief included **constraints** (no `0.0.0.0/0`, no committing keys).  
□ You reviewed `terraform plan` yourself, not just the chat summary.

---

# Module 2 — Boot the evaluator & configure detectors

**Time:** ~30–40 minutes  

### Learning goal (vibe coding)

Practice **keeping secrets out of the agent channel** and using **built-in connectivity tests** as acceptance criteria.

### Product goal

Run the web app and prove both the AI Gateway and Prisma AIRS are reachable from **LLM Config**.

### Tasks

1. On your run host (laptop or VM):

   ```bash
   cp env.example .env
   npm install
   npm run build
   npm start
   ```

   Default: dashboard on port **8000** (`PORT` in `.env`). Only `PORT` and `DB_PATH` belong in `.env` — gateway and Prisma settings are **in the database via the UI**.

2. Open the dashboard → **LLM Config**.

3. Configure:

   - AI Gateway base URL + API key  
   - Models for **judge** (and reporter if shown)  
   - Prisma AIRS: URL, HTTP method, auth header name/value, security profile name  

4. Use the **one-click connectivity tests**. Do not ask the chat assistant to “try my key.”

5. Ask the assistant (read-only):

   > Where does the app store Prisma AIRS settings, and which module maps `prompt_detected` flags to the six category keys? Cite file paths.

   Verify against `server/agents/prismaAirs.js` and `server/routes/` / DB layer.

### Deliverable

Both connectivity tests green (or a clear failure note with HTTP-level evidence).  
List of the **six shared category keys** the judge and Prisma AIRS must agree on for comparison.

### Skill checkpoint

□ No secrets pasted into chat or committed.  
□ You used product tests, not “the model said it’s fine.”

---

# Module 3 — Retrieve security benchmarks from HuggingFace

**Time:** ~35–45 minutes  
**Pillar:** Benchmark ingestion for agent/prompt security eval  

### Learning goal (vibe coding)

Practice **schema-faithful prompting**: when an external catalog already defines a descriptor format, the agent must extend it — not invent a parallel one.

### Product goal

Load at least one out-of-the-box benchmark from HuggingFace into the app and understand how prompts are extracted.

### Background

- Seed catalog: `data/benchmarks.json` (`out_of_the_box_benchmarks`)  
- Loader: `server/benchmarks/loader.js`  
  - `hf-file` — raw file from a HF repo (jsonl/csv/json)  
  - `hf-rows` — HuggingFace `datasets-server` rows API  
- Cache: `data/cache/`  
- Retries: transient **429 / 5xx** with backoff; hard-fail on most **4xx**

### Tasks

1. Skim 2–3 entries in `data/benchmarks.json`. Note `source.type`, `promptField`, and why that dataset is useful (description text).  
2. In the UI **Benchmarks** tab, add/load an out-of-the-box dataset (facilitator may assign one to avoid rate limits).  
3. Ask the assistant:

   > Explain how `promptField` is used when loading `hf-rows` vs `hf-file`. Cite `loader.js`. No code changes.

4. **Failure drill:** If a fetch fails, paste only the **error message / status code** (not tokens) into the assistant and ask for a diagnosis against the retry logic. Prefer fixing network/config over rewriting the loader.

5. *(Observe)* Confirm cache files appear under `data/cache/` after a successful load.

### Deliverable

- One benchmark visible in the UI with a non-zero prompt count  
- Short note: dataset id, source type, `promptField`, approximate size  

### Skill checkpoint

□ You pointed the agent at the **existing descriptor schema**.  
□ On failure, you fed **symptoms**, not “HF is broken, rewrite everything.”

---

# Module 4 — Evaluate LLM judge vs Prisma AIRS + HTML report

**Time:** ~40–50 minutes  
**Pillar:** Comparison report  

### Learning goal (vibe coding)

Practice **constraint preservation** (“do not change the report contract”) and **metrics literacy** (what agreement / miss / latency mean).

### Product goal

Run an Evaluation on a **small** prompt subset (or a small benchmark), view in-app tables, and download the self-contained HTML report.

### Background

- Orchestrator runs Judge + Prisma AIRS **concurrently** (bounded concurrency).  
- Per prompt: both verdicts + latencies stored.  
- On completion, reporter writes a static HTML file under `reports/` (Lakera-style: inline JSON + vanilla JS; works offline).  
- **Hard product constraint:** report footer must read  
  `Prisma AIRS Runtime Security Evaluator`.

### Tasks

1. Open **Evaluation**, select your loaded benchmark(s). Prefer a **limited** run if the UI allows, or a smaller dataset — respect API rate limits and cost.  
2. Start the run; watch progress. If errors appear, capture the error string for the assistant — still no secrets.  
3. When complete:

   - Inspect per-category detection / agreement in the UI  
   - Download / open the HTML report from `reports/` (or the UI download control)

4. Ask the assistant (read-only):

   > Summarize how the HTML report is assembled (`reporter.js` / `reportTemplate.js`). What must stay true about the footer? Which metrics are charted?

5. **Analyst pass (security engineer hat):** Pick one category (e.g. `injection` or `sensitiveData`) and write 5–10 lines:

   - Did judge and AIRS agree?  
   - What would a “confirmed miss” mean for a deployment decision?  
   - What limitation does using an LLM-as-judge introduce (bias, non-determinism, cost)?

### Deliverable

- Completed run id / timestamp  
- Offline HTML report that opens without a network  
- Short analyst note (above)  

### Skill checkpoint

□ You treated the footer / report structure as a **constraint**, not optional polish.  
□ Your write-up critiques the **method**, not only the UI.

---

# Module 5 — Guided vibe-coding challenges *(optional / full-day)*

**Time:** ~60–90 minutes  

### Learning goal (vibe coding)

Practice **small, test-backed changes**: brief → agent edits → `npm test` → human security review → commit message that says *why*.

Pick **one** challenge from [`CHALLENGES.md`](./CHALLENGES.md). Rules:

1. Paste the challenge brief to your assistant **verbatim**, then add only your environment specifics.  
2. Require the agent to list files it will touch before editing.  
3. Run `npm test` after the change.  
4. Open a PR (or patch) with: summary, test result, security notes.

Facilitators may assign challenges so the room does not all hit the same HuggingFace dataset or Terraform state.

---

# Capstone — Debrief

**Time:** ~20–30 minutes  

### Learning goal (vibe coding)

Articulate **how you directed the agent** and where human judgment mattered.

### Prompt for your write-up or 3-minute talk

1. Best prompt you wrote — why it worked.  
2. Worst agent suggestion you rejected — security or correctness reason.  
3. One place tests / connectivity checks saved you.  
4. One metric from the HTML report you would show a CISO, and one caveat.  
5. What you would automate next with an agent vs keep human-gated.

---

## Quick reference — useful commands

```bash
# App
cp env.example .env
npm install
npm run build
npm start
npm test

# Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars   # then edit project_id
terraform init && terraform plan && terraform apply
```

## Quick reference — six comparison categories

Shared keys between Judge and Prisma AIRS mapping:

| Key | Meaning (approx.) |
|---|---|
| `injection` | Prompt injection / jailbreak / override |
| `maliciousUrl` | Malicious URL / link content |
| `sensitiveData` | Secrets / PII / DLP-style leakage attempts |
| `maliciousCode` | Malware / exploit / insecure code requests |
| `agentProtection` | Agent tool-misuse / agency / memory-style threats |
| `toxicContent` | Hate / violence / self-harm style content |

---

## Integrity & safety reminders

- Lab traffic may include **offensive or malicious strings** by design (jailbreaks, exploit-like prompts). Use isolated projects and disposable keys.  
- Do not exfiltrate employer data into benchmarks or prompts.  
- Tear down GCP resources when finished (`terraform destroy`) unless the facilitator says otherwise.  
- Rotate any credential that touched a shared cohort project.
