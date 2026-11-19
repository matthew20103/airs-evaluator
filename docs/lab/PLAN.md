# Vibe Coding Lab — Instructor Plan

**Audience:** Security engineers practicing AI-assisted development (“vibe coding”)  
**Artifact under study:** [Prisma AIRS Runtime Security Evaluator](../../CLAUDE.md)  
**Mode for this draft:** documentation only — no application/Terraform code changes required to run the lab design itself.

---

## 1. Why this project works as a lab

The repo is a self-contained, end-to-end product with three pillars that map cleanly to security-engineering + vibe-coding practice:

| Pillar | What exists in the repo | Why it teaches vibe coding |
|---|---|---|
| **1. Deploy** | `terraform/` → GCP Ubuntu VM, VPC, IP-scoped firewall, SSH key outputs | Prompting for infra-as-code, least privilege, verifying AI claims against `system_requirements.md` |
| **2. Benchmarks** | HuggingFace loaders + `data/benchmarks.json` seed catalog | Teaching the AI to respect a schema, handle flaky external APIs, cache safely |
| **3. Evaluate & report** | Judge LLM vs Prisma AIRS + offline HTML report | Multi-service integration, comparable metrics, constraint-preserving UI/report work |

Students practice **directing** an AI coding assistant on a real security tool — not building from a blank folder — which is closer to how teams actually ship with agents.

---

## 2. Lab learning outcomes (overall)

By the end, each student should be able to:

1. **Brief an AI assistant** with goals, constraints, and file-level context (not vague “make it work”).
2. **Ground the agent** in an existing codebase (`CLAUDE.md`, tests, schemas) before asking for changes.
3. **Security-review AI output** (secrets, firewall CIDRs, outbound trust, prompt/data handling).
4. **Use tests and connectivity checks** as the acceptance criteria for AI-generated work.
5. **Recover when the agent is wrong** (narrow the prompt, cite failing tests, ask for a diff rationale).
6. **Ship a measurable security eval** (benchmark → dual detector run → HTML report) and explain what the numbers mean.

---

## 3. Suggested format

| Item | Recommendation |
|---|---|
| Duration | Half-day (≈ 3.5–4 hours) or full-day with Module 5 + capstone |
| Group size | 8–20; pairs encouraged |
| Tooling | Cursor (or Claude Code / Copilot Chat) + this repo |
| Prerequisites | GCP project access, Prisma AIRS API credentials (or instructor-shared sandbox), OpenAI-compatible AI Gateway key, Node 22.5+, Terraform + `gcloud` |
| Working style | Students **may** change code in later modules; Modules 0–4 can stay mostly “operate + observe + critique” |

---

## 4. Module map (aligned to product pillars)

| # | Module | Primary vibe-coding skill | Product focus | Est. time |
|---|---|---|---|---|
| 0 | Orientation & briefing hygiene | Context engineering; anti-patterns | Read `CLAUDE.md`, architecture tour | 25 min |
| 1 | Deploy the lab VM | Spec → IaC; security review of AI infra | `terraform/` on GCP | 45–60 min |
| 2 | Bring the evaluator up | Config via UI, not secrets-in-chat; connectivity tests | App install, LLM Config | 30–40 min |
| 3 | Ingest security benchmarks | Schema-faithful prompting; external API resilience | HuggingFace → cache → Benchmarks tab | 35–45 min |
| 4 | Run Judge vs Prisma AIRS + report | Constraint preservation; metrics literacy | Evaluation run + HTML download | 40–50 min |
| 5 | Guided vibe-coding challenges *(optional / full-day)* | Incremental change under tests | Small feature / fix with AI | 60–90 min |
| C | Capstone debrief | Critique & communication | Short write-up or lightning talk | 20–30 min |

Full student instructions live in [`LAB_GUIDE.md`](./LAB_GUIDE.md). Challenge cards for Module 5 are in [`CHALLENGES.md`](./CHALLENGES.md).

---

## 5. What “good vibe coding” looks like in this lab

**Encourage**

- Pasting or `@`-referencing `CLAUDE.md`, the relevant source file, and the failing test.
- Stating **non-goals** (“do not redesign the dashboard”; “report footer must remain …”).
- Asking the agent to **explain before editing**, then verifying against the repo.
- Running `npm test` / connectivity tests after every meaningful change.
- Treating malicious benchmark prompts as **data**, not instructions to follow.

**Discourage / catch in review**

- Dumping API keys into the chat or committing them.
- Accepting Terraform that opens `0.0.0.0/0` “so it works.”
- Letting the agent rewrite large unrelated areas (“while we’re here…”).
- Trusting HuggingFace / LLM / AIRS responses without checking HTTP status and schema.
- Confusing the leftover `define-custom-adapter/` skill with this product’s Evaluation workflow (it is **out of scope** for the core lab — useful only as a bonus on “writing skills for agents”).

---

## 6. Instructor prep checklist

- [ ] Fork or share repo URL; confirm students clone the intended branch/tag.
- [ ] Provision or document GCP project(s); enable Compute Engine; confirm org policies allow custom VPC + public IP.
- [ ] Prepare a shared AI Gateway (OpenAI-compatible) and Prisma AIRS profile for the cohort, **or** clear BYO instructions.
- [ ] Smoke-test once: `terraform apply` → install Node → `npm start` → LLM Config tests → one small Evaluation run → HTML report opens offline.
- [ ] Decide whether Module 5 is in-scope; print or link challenge cards.
- [ ] Prepare debrief prompts (see Capstone in the student guide).

---

## 7. Rubric (lightweight)

Score each student/pair 1–4 on:

| Dimension | 1 | 4 |
|---|---|---|
| Brief quality | Vague chat; no constraints | Goals, constraints, files, acceptance checks |
| Grounding | Blind trust of agent narrative | Cross-checks `CLAUDE.md` / code / tests |
| Security judgment | Leaks secrets; opens firewall wide | Least privilege; secrets only in UI/TF vars locally |
| Verification | “It looks fine” | Tests / connectivity / sample report evidence |
| Recovery | Stuck or restart-from-scratch | Narrowed prompt; used failure output as context |

---

## 8. Out of scope for v1 of the lab

- Building a new red-team target adapter (`define-custom-adapter/` is historical / adjacent).
- Production hardening (HTTPS termination, IAM federation, Cloud Armor, etc.) — mention as stretch only.
- Changing Prisma AIRS product behavior — students only **call** the configured API.

---

## 9. Document set

| File | Audience |
|---|---|
| [`PLAN.md`](./PLAN.md) (this file) | Facilitators |
| [`LAB_GUIDE.md`](./LAB_GUIDE.md) | Students |
| [`CHALLENGES.md`](./CHALLENGES.md) | Students (Module 5+) |
| [`FACILITATOR_NOTES.md`](./FACILITATOR_NOTES.md) | Facilitators (timing, pitfalls, answer keys at high level) |
