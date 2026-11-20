# Module 5 — Vibe Coding Challenge Cards

Each card is a **copy-paste brief** for your AI assistant. Complete **one** (or more if time allows).  
Afterward: run `npm test`, security-review the diff, and record what you changed in the prompt vs what the agent invented.

---

## Challenge A — Add a HuggingFace benchmark descriptor

### Vibe-coding skill

Schema-faithful extension: teach the agent to **append** to an existing catalog without breaking loaders.

### Goal

Add one new entry to `data/benchmarks.json` for a public HuggingFace dataset that is useful for prompt-injection, jailbreak, agent abuse, or malicious-code evaluation.

### Brief (paste to assistant)

```text
Goal: Add one out-of-the-box benchmark descriptor to data/benchmarks.json.
Context: Read data/benchmarks.json and server/benchmarks/loader.js first.
Constraints:
- Match the existing descriptor schema exactly (id, name, description, source).
- source.type must be hf-file or hf-rows with the fields those loaders already support.
- description must tell an evaluator WHY this dataset is useful (detection angle), not just what it is.
- Do not change loader.js unless a test proves the schema cannot express this dataset.
Acceptance:
- npm test passes (especially loader-related tests).
- Explain how to load it from the Benchmarks UI.
Non-goals: Do not redesign the UI; do not add new source types in this challenge.
```

### Human checks

- [ ] `promptField` really exists on sample rows/files  
- [ ] Dataset license / ToS acceptable for your org’s lab use  
- [ ] No API tokens embedded in the JSON  

---

## Challenge B — Harden or clarify Terraform for the next cohort

### Vibe-coding skill

Infra change under **explicit security constraints**; reject convenience that widens exposure.

### Goal

Improve operator clarity or safety of `terraform/` **without** opening ingress to the world.

Examples (pick one):

- Document required GCP APIs / org-policy gotchas in a short `terraform/README.md`  
- Add a variable for allowed CIDRs (default still single detected IP) with validation  
- Add tags/labels for cost tracking  

### Brief (paste to assistant)

```text
Goal: <your chosen improvement>.
Context: Read terraform/*.tf, terraform.tfvars.example, system_requirements.md.
Constraints:
- SSH and dashboard ingress must remain IP-scoped; never 0.0.0.0/0.
- Do not commit private keys; keep gitignore behavior.
- Prefer minimal diff; no unrelated refactors.
Acceptance: terraform validate succeeds; explain plan impact in plain language.
Non-goals: No Kubernetes, no HTTPS load balancer in this challenge.
```

### Human checks

- [ ] `terraform validate` / `plan` reviewed  
- [ ] Default posture is still least privilege  

---

## Challenge C — Evaluation UX or report clarity (small)

### Vibe-coding skill

Constraint-preserving UI/report edits; keep the offline report contract intact.

### Goal

Make one small clarity improvement, for example:

- Clearer empty state on Evaluation when nothing is configured  
- Show concurrency or run warnings before starting a huge benchmark  
- Ensure report footer still exactly: `Prisma AIRS Runtime Security Evaluator`  

### Brief (paste to assistant)

```text
Goal: <one UX/report clarity improvement>.
Context: Read CLAUDE.md, frontend/src/pages/Evaluation.jsx, server/evaluation/reportTemplate.js.
Constraints:
- Report footer MUST remain exactly: Prisma AIRS Runtime Security Evaluator
- Keep the report offline-capable (no new CDN/chart library).
- Match existing frontend patterns; no new UI framework.
Acceptance: npm test passes; describe how to verify in the browser.
Non-goals: No redesign of the whole dashboard visual system.
```

### Human checks

- [ ] HTML report still opens offline  
- [ ] Footer string unchanged  
- [ ] Tests around `evaluationReportTemplate` still pass  

---

## Challenge D — Make a failing test the agent’s boss

### Vibe-coding skill

Test-first vibe coding: encode the requirement in a test, then let the agent implement.

### Goal

Introduce a focused failing test for a real gap you noticed (examples below), then implement the smallest fix.

Example gaps students often find:

- Clearer error when Prisma AIRS JSON is missing `prompt_detected`  
- Loader rejects descriptors missing `promptField` with a readable error  
- Settings route refuses to persist empty Prisma profile name  

### Brief (paste to assistant)

```text
Goal: Add a failing unit/API test for <gap>, then implement the minimal fix.
Context: Read tests/ and the module under test before editing.
Constraints:
- One behavior only; no drive-by refactors.
- Prefer extending an existing test file over creating a large new harness.
Acceptance: the new test fails before the fix and passes after; full npm test passes.
Non-goals: No snapshot sprawl; no network calls in unit tests if existing tests mock/avoid them.
```

### Human checks

- [ ] You saw the test fail first (or can explain why bisect proves it)  
- [ ] Fix matches the test, not a broader rewrite  

---

## Challenge E — “Agent skill” literacy (bonus)

### Vibe-coding skill

Distinguish **product code** from **agent skill docs**; write instructions an agent can follow safely.

### Goal

Read `define-custom-adapter/SKILL.md` and produce a **one-page lab addendum** (markdown only) that teaches a junior engineer:

- When this skill applies vs when to use this repo’s Evaluation flow  
- Three failure modes if an agent ignores the skill’s “golden rules”  

### Brief (paste to assistant)

```text
Goal: Draft docs/lab/ADDENDUM_ADAPTER_SKILL.md (markdown only).
Context: define-custom-adapter/SKILL.md and CLAUDE.md.
Constraints:
- Do not modify application runtime code.
- Clearly state this adapter skill is NOT what the Evaluation tab runs today.
- Include a safe example of how a human should brief an agent using the skill.
Acceptance: A new student can tell Evaluation vs adapter workflows apart after reading.
```

### Human checks

- [ ] No implication that adapters are wired into `npm start`  
- [ ] Security notes about secrets in `context.secrets` preserved  

---

## After any challenge — reflection box

Copy into your notes:

| Prompt | Your answer |
|---|---|
| Files the agent touched | |
| Files you expected | |
| Test command + result | |
| Security concern reviewed | |
| What you would prompt differently next time | |
