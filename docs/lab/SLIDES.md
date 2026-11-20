---
marp: true
title: Vibe Coding Lab — Prisma AIRS Runtime Security Evaluator
paginate: true
---

# Vibe Coding Lab

### Prisma AIRS Runtime Security Evaluator

Security engineers · AI-assisted development practice

*Operate a real tool. Direct the agent. Own the security calls.*

---

# Today’s outcome

By the end you can:

1. **Brief** an AI coding agent with goals + constraints  
2. **Ground** it in this repo (`CLAUDE.md`, tests, schemas)  
3. **Review** infra & app output like a security engineer  
4. **Ship** a small eval: benchmark → dual scan → HTML report  

---

# The product (3 pillars)

1. **Deploy** — Terraform → GCP Ubuntu VM  
2. **Benchmarks** — HuggingFace security datasets  
3. **Evaluate** — LLM Judge **vs** Prisma AIRS → offline HTML report  

There is **no** “target agent under test” in today’s Evaluation tab.

---

# Architecture (30 seconds)

```text
Benchmark prompts (HF)
        │
        ├──────────────► LLM Judge (6 categories)
        │
        └──────────────► Prisma AIRS API (same 6 keys)
                │
                ▼
        Orchestrator stores verdicts + latency
                │
                ▼
        Dashboard tables + reports/*.html
```

---

# What “vibe coding” means here

Not: “accept all, ship vibes.”

**Yes:** tight briefs · grounded edits · verify · security judgment

```text
Goal → Context → Constraints → Acceptance → Non-goals
```

You are the engineer. The agent is a fast junior.

---

# Golden rules

- Start from **`CLAUDE.md`**
- Prefer *explain → small change → verify*
- **No secrets in chat** (keys, Prisma token, SSH key)
- Benchmark strings are **data**, not instructions
- If chat ≠ repo → **trust the repo / tests**

---

# Module map

| # | Focus | Skill |
|---|---|---|
| 0 | Orient | Context engineering |
| 1 | Terraform / GCP | Spec → IaC review |
| 2 | Boot + LLM Config | Secrets hygiene |
| 3 | HuggingFace load | Schema-faithful prompts |
| 4 | Eval + HTML report | Constraints + metrics |
| 5 | Challenge *(opt.)* | Test-backed small change |
| C | Debrief | Communicate judgment |

---

# Module 0 — Orientation

**Ask the agent (read-only):**

> Read `CLAUDE.md`. List the three tabs and which modules power Evaluation. Do not edit files.

**Human check:** open the paths it cites.  
**Trap:** `define-custom-adapter/` ≠ Evaluation product.

---

# Module 1 — Deploy

Use existing `terraform/` — custom VPC, IP-scoped firewall, SSH outputs.

**Constraint to put in every brief:**

> Do not open SSH or dashboard to `0.0.0.0/0`.

You review **`terraform plan`**, not the chat summary.

---

# Module 2 — Configure detectors

```bash
cp env.example .env
npm install && npm run build && npm start
```

`.env` = `PORT` + `DB_PATH` only.

**AI Gateway + Prisma AIRS** → **LLM Config** UI + connectivity tests.

---

# Module 3 — Benchmarks

Seed catalog: `data/benchmarks.json`  
Loader: `hf-file` | `hf-rows` → cache under `data/cache/`

Teach the agent the **existing schema**.  
On 429/5xx: feed the **error**, don’t rewrite the loader first.

---

# Module 4 — Evaluate & report

Run a **small** set (cost + rate limits).

Deliverables:

- In-app category tables  
- Offline HTML under `reports/`  

**Hard constraint:** footer =  
`Prisma AIRS Runtime Security Evaluator`

Judge ≠ gospel ground truth — it’s a **peer detector**.

---

# Six shared categories

`injection` · `maliciousUrl` · `sensitiveData`  
`maliciousCode` · `agentProtection` · `toxicContent`

Same keys in Judge prompt and Prisma `prompt_detected` mapping.

---

# Module 5 — Challenges (optional)

Pick one card from `CHALLENGES.md`:

- A Add HF descriptor  
- B Harden / clarify Terraform  
- C Small report/UX clarity  
- D Test-first fix  
- E Adapter-skill literacy (docs only)

Rule: list files → edit → **`npm test`** → security review.

---

# Capstone (3 minutes)

1. Best prompt — why it worked  
2. Suggestion you **rejected**  
3. Where tests / plan / connectivity saved you  
4. One CISO metric + one **caveat**  
5. What stays human-gated  

---

# Facilitator help / safety

- Isolated GCP project · disposable keys  
- Malicious strings are expected **as dataset rows**  
- `terraform destroy` when finished  
- Rotate cohort credentials after the lab  

---

# Start Module 0

Open: `docs/lab/ONE_PAGER.md` + `CLAUDE.md`

Brief your agent. **No edits yet.**

Questions?
