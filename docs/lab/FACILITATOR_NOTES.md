# Facilitator Notes

Companion to [`PLAN.md`](./PLAN.md) and [`LAB_GUIDE.md`](./LAB_GUIDE.md).  
High-level answer keys and pitfall watch-outs — not a script students should read first.

---

## Timing cheatsheet

| Block | Half-day | Full-day |
|---|---|---|
| 0 Orientation | 25m | 25m |
| 1 Terraform | 50m | 60m |
| 2 Config / boot | 35m | 40m |
| 3 Benchmarks | 40m | 45m |
| 4 Eval + report | 45m | 50m |
| Breaks | 15m | 30m |
| 5 Challenges | skip or 20m discuss | 75m |
| Capstone | 20m | 30m |

If GCP is slow or org-policy blocked, demote Module 1 to **plan-only + instructor demo apply**, and run the app on laptops for Modules 2–4.

---

## Module 0 — what “good” looks like

Students should surface:

- Product compares **Judge LLM** vs **Prisma AIRS** on the same prompts.  
- Tabs: Benchmarks / Evaluation / LLM Config.  
- Config for gateway + AIRS is in **DB/settings via UI**, not `.env`.  
- `define-custom-adapter/` is **not** the Evaluation pipeline.

Common agent fail: inventing a “target agent under test” workflow that `CLAUDE.md` explicitly says was removed.

---

## Module 1 — pitfalls

| Symptom | Likely cause | Coaching |
|---|---|---|
| Default VPC errors | Org disables default networks | Point at existing custom VPC resources in `main.tf` — already handled |
| API not enabled | Compute Engine API | `google_project_service.compute` should enable; still need IAM |
| Can’t SSH | IP changed (café Wi-Fi) | Re-apply so `my_public_ip` data source refreshes; or tunnel |
| Agent suggests `0.0.0.0/0` | “Make demo easy” | Hard reject; teach constraint prompting |
| Key committed | Agent wrote outside gitignore | Stop, rotate, fix ignore |

**Answer shape for runbook:** `tfvars` → `init` → `plan` → `apply` → use `ssh_command` output → optional `dashboard_tunnel_command`.

---

## Module 2 — pitfalls

| Symptom | Likely cause | Coaching |
|---|---|---|
| SQLite / start fail | Node &lt; 22.5 | Enforce engines field |
| “Where do I put OPENAI_API_KEY in .env?” | Outdated mental model | Point at `env.example` comments + LLM Config |
| Connectivity test red | Wrong URL/header/profile | Stay in UI; don’t paste secrets into chat for debugging |
| Agent rewrites gateway client | Over-eager fix | Require read-only until tests prove a code bug |

**Six keys to listen for:** `injection`, `maliciousUrl`, `sensitiveData`, `maliciousCode`, `agentProtection`, `toxicContent`.  
Mapping live in `prismaAirs.js` (`url_cats` → `maliciousUrl`, `dlp` → `sensitiveData`, etc.).

---

## Module 3 — pitfalls

| Symptom | Likely cause | Coaching |
|---|---|---|
| 502 / 429 from HF | datasets-server flakiness | Loader already retries; wait / smaller set; don’t rewrite |
| Empty prompts | Wrong `promptField` | Inspect one raw row; fix descriptor |
| Huge dataset | Student picked massive split | Assign a specific id from `benchmarks.json` |
| Agent adds new `source.type` | Scope creep | Challenge A forbids unless necessary |

**Good assigned defaults:**  
`S-Labs/prompt-injection-dataset` (benign + injection) or `rubend18/ChatGPT-Jailbreak-Prompts` (if size acceptable) — adjust per cohort bandwidth.

---

## Module 4 — pitfalls

| Symptom | Likely cause | Coaching |
|---|---|---|
| Run forever / huge bill | Full large benchmark | Cap scope; teach cost as a security-engineering concern |
| Judge JSON parse errors | Model ignored schema | Check judge model; read `judge.js` system prompt |
| AIRS errors on every row | Profile / token / URL | Fix config before code changes |
| Agent “improves” report with Chart.js CDN | Shiny UI bias | Enforce offline + footer constraint |
| Students over-trust judge as ground truth | Method confusion | Debrief: judge is a **peer detector**, not gospel labels |

**Footer check:** exact string `Prisma AIRS Runtime Security Evaluator`.

---

## Module 5 — assigning challenges

| Challenge | Best for | Watch for |
|---|---|---|
| A Benchmark descriptor | App / data folks | Schema drift |
| B Terraform | Cloud / infra folks | Ingress widening |
| C Report/UX | Frontend-leaning | Footer / CDN |
| D Test-first | Strong engineers | Skipping red state |
| E Skill addendum | Writing / enablement | Conflating workflows |

Have pairs swap PRs for a **10-minute peer security review** using the rubric in `PLAN.md`.

---

## Capstone facilitation prompts

- “Show the prompt that prevented a bad change.”  
- “What did you refuse to let the model do?”  
- “Which number in the report is most misleading without context?”  
- “Where should a human always remain in the loop in this pipeline?”

---

## Suggested cohort assets (not in repo)

- Shared slide: vibe-coding loop (brief → ground → edit → verify → review)  
- Disposable GCP project + budget alert  
- Shared AI Gateway project with per-student keys  
- Prisma AIRS lab profile with logging enabled  
- Break-glass: pre-built VM image or instructor tunnel if Terraform fails  

---

## After the lab — optional repo follow-ups

These are **not** required for this documentation PR; track as future product work if the cohort asks:

1. First-run wizard for LLM Config  
2. Evaluation “sample N prompts” control to protect students from huge bills  
3. `terraform/README.md` operator guide  
4. Archive or clearly label `define-custom-adapter/` as out-of-band skill material  

---

## Document maintenance

When the product architecture changes, update in this order:

1. `CLAUDE.md`  
2. `LAB_GUIDE.md` module tasks that cite paths  
3. `CHALLENGES.md` briefs  
4. This notes file’s pitfall tables  
