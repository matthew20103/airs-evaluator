# Vibe Coding Lab — Student One-Pager

Print or keep this tab open. Full steps: [`LAB_GUIDE.md`](./LAB_GUIDE.md).

---

## What you are building / operating

**Prisma AIRS Runtime Security Evaluator** compares two detectors on the same HuggingFace security prompts:

1. **LLM Judge** — classifies each prompt into 6 categories  
2. **Prisma AIRS Runtime Security** — scans the same prompt via API  

Then you download an **offline HTML report**. Optional path: deploy a **GCP VM** with Terraform to host the tool.

---

## Brief template (paste every time)

```text
Goal: <success looks like>
Context: Read CLAUDE.md and <files> first. Do not invent architecture.
Constraints: <must not break X; no 0.0.0.0/0; no secrets in git/chat>
Acceptance: <npm test | connectivity test | terraform plan review | UI check>
Non-goals: <what not to refactor>
```

---

## Golden rules

| Do | Don’t |
|---|---|
| Ground the agent in `CLAUDE.md` + real files | Blind-accept “while we’re here” rewrites |
| Keep keys in UI / local `tfvars` only | Paste API keys, Prisma tokens, or `ssh_key` into chat |
| Treat benchmark prompts as **data** | Ask the agent to attack real prod systems |
| Verify with tests / plan / connectivity | Trust chat summaries of infra or metrics |
| Reject wide-open firewalls | Merge `0.0.0.0/0` “for the demo” |

---

## Module checklist

| # | Done when… | Skill focus |
|---|---|---|
| 0 | You can name tabs, detectors, and one out-of-scope item | Context engineering |
| 1 | `terraform apply` (or reviewed `plan`) + IP-scoped ingress | Spec → IaC review |
| 2 | LLM Config connectivity tests green | Secrets out of chat |
| 3 | ≥1 HF benchmark loaded with prompt count &gt; 0 | Schema-faithful prompting |
| 4 | Eval finished + HTML report opens offline | Constraint + metrics literacy |
| 5 | *(optional)* One challenge + `npm test` green | Small test-backed change |
| C | 3-min debrief: best prompt, rejected suggestion, caveat | Human judgment |

---

## Commands

```bash
# App (laptop or VM)
cp env.example .env          # PORT + DB_PATH only
npm install && npm run build && npm start
npm test

# Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars   # set project_id
terraform init && terraform plan && terraform apply
# tear down when done:
terraform destroy
```

Dashboard default: **http://localhost:8000**  
Gateway + Prisma AIRS settings: **LLM Config tab** (not `.env`).

---

## Six comparison categories

`injection` · `maliciousUrl` · `sensitiveData` · `maliciousCode` · `agentProtection` · `toxicContent`

Report footer must read: **Prisma AIRS Runtime Security Evaluator**

---

## Where things live

| Concern | Path |
|---|---|
| Architecture truth | `CLAUDE.md` |
| HF seed catalog | `data/benchmarks.json` |
| Loader / cache | `server/benchmarks/loader.js`, `data/cache/` |
| Judge / AIRS | `server/agents/judge.js`, `prismaAirs.js` |
| Orchestrator / report | `server/evaluation/` → `reports/` |
| GCP VM | `terraform/` |
| Not Evaluation | `define-custom-adapter/` (separate skill doc) |

---

## Capstone prompts (prepare answers)

1. Best brief you wrote — why it worked  
2. Worst agent suggestion you rejected — why  
3. Where a test / connectivity check / `plan` saved you  
4. One report number for a CISO + one caveat  
5. What stays human-gated next time
