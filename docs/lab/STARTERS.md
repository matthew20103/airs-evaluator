# Challenge Starters

Procedural “starter kits” for Module 5 so pairs can begin without waiting on custom git branches.  
**Still docs-only** relative to `main` — students create their own working branch when they code.

Recommended student branch pattern:

```bash
git checkout main
git pull
git checkout -b lab/<challenge-letter>-<yourname>
```

Example: `lab/a-jiang`, `lab/d-patel`.

---

## Pre-flight (everyone)

```bash
node -v          # >= 22.5
npm install
npm test         # establish green baseline before any challenge edit
```

Record baseline: date/time + test result in your notes.

---

## Starter A — New HuggingFace benchmark descriptor

**Read first**

- `data/benchmarks.json` (copy one similar entry as a template)  
- `server/benchmarks/loader.js` (`hf-file` vs `hf-rows`)  
- `tests/loader.test.js`

**Decide before prompting**

| Field | Your choice |
|---|---|
| Dataset repo id | |
| Why it’s useful for security eval (1 sentence) | |
| `hf-file` or `hf-rows` | |
| `promptField` (verified on a sample row/file) | |
| config / split / path | |

**First agent ask (read-only)**

> Given this dataset &lt;url&gt;, which existing `benchmarks.json` entry is the closest template and which `source` fields would we need? Do not edit yet.

**Then** paste Challenge A brief from `CHALLENGES.md`.

**Done when**

- [ ] Descriptor validates against loader expectations  
- [ ] `npm test` green  
- [ ] You can load it from Benchmarks UI (or document why UI load was skipped)

---

## Starter B — Terraform clarity / harden

**Read first**

- `terraform/main.tf`, `security_group.tf`, `variables.tf`, `outputs.tf`  
- `terraform/terraform.tfvars.example`  
- `system_requirements.md`

**Pick exactly one improvement** (circle one)

1. Operator `terraform/README.md` (APIs, org-policy, apply/destroy)  
2. Variable for extra allowed CIDRs (default = detected `/32` only)  
3. Cost labels/tags on the VM / VPC  

**First agent ask (read-only)**

> Summarize current ingress posture and where CIDRs are set. Propose a minimal diff for &lt;chosen improvement&gt;. No edits yet.

**Hard constraint in every follow-up**

> Never allow `0.0.0.0/0` for SSH or dashboard.

**Done when**

- [ ] `terraform validate` OK  
- [ ] You can explain `plan` impact in two sentences  
- [ ] Default remains least privilege  

---

## Starter C — Evaluation / report clarity

**Read first**

- `frontend/src/pages/Evaluation.jsx`  
- `server/evaluation/reportTemplate.js`  
- `tests/evaluationReportTemplate.test.js`  
- Footer requirement in `CLAUDE.md`

**Pick exactly one UX gap** (examples)

- Empty state when gateway/AIRS not configured  
- Warning before very large benchmark runs  
- Report section wording that confuses “judge” with ground truth  

**First agent ask (read-only)**

> Where would we add &lt;gap&gt; with the smallest diff? Confirm the report footer string and offline constraints.

**Done when**

- [ ] Footer still exactly `Prisma AIRS Runtime Security Evaluator`  
- [ ] No new CDN / chart library  
- [ ] `npm test` green; browser check noted  

---

## Starter D — Test-first fix

**Read first**

- `tests/*.test.js` matching the area you care about  
- The implementation file under `server/`

**Write the gap in one sentence**

> When &lt;condition&gt;, the system should &lt;behavior&gt;, but today it &lt;wrong behavior&gt;.

**Sequence (do not skip)**

1. Ask agent to **add only the failing test**.  
2. Run `npm test` — confirm red.  
3. Ask agent for **minimal fix**.  
4. Run `npm test` — confirm green.  
5. Diff review: no unrelated files.

**Done when**

- [ ] Evidence of red → green (paste snippets in notes)  
- [ ] Fix scope matches the test  

---

## Starter E — Adapter skill literacy (docs only)

**Read first**

- `define-custom-adapter/SKILL.md`  
- `CLAUDE.md` (Evaluation-only product statement)

**Output file**

`docs/lab/ADDENDUM_ADAPTER_SKILL.md` (create in your branch)

**Must teach**

1. When Evaluation flow applies vs when the adapter skill applies  
2. Three golden-rule violations and what breaks  
3. A safe human→agent brief example that keeps secrets in `context.secrets`

**Done when**

- [ ] A newcomer would not think adapters run under `npm start`  
- [ ] No runtime code modified  

---

## Facilitator option: cut real starter branches later

If you want GitHub branches instead of this doc:

```bash
# from a clean main
for c in a b c d e; do
  git checkout main
  git checkout -b lab/starter-$c
  # optional: add an empty STARTER_HINT.md per branch
  git push -u origin lab/starter-$c
done
```

Keep starters **empty of broken code** — the learning is in briefing and verifying, not recovering from sabotaged trees (unless you explicitly run a “debug the agent’s mess” advanced track).

---

## Hand-in template (paste into PR / notes)

```text
Challenge: <A–E>
Branch: lab/...
Baseline tests: <pass/fail>
Final tests: <pass/fail>
Files changed: <list>
Security review notes: <ingress / secrets / footer / scope>
Prompt that worked best: <link or quote>
Agent suggestion rejected: <what + why>
```
