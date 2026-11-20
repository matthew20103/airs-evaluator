# Facilitator Run-of-Show

Minute-by-minute script for a **half-day (~3h45)** delivery.  
Stretch marks show where to expand into a **full day** with Module 5.

Pair with [`SLIDES.md`](./SLIDES.md), [`FACILITATOR_NOTES.md`](./FACILITATOR_NOTES.md), and the student [`ONE_PAGER.md`](./ONE_PAGER.md).

---

## T−1 day (prep)

| Action | Done |
|---|---|
| Share repo URL + branch/tag; confirm Node ≥ 22.5 guidance | ☐ |
| GCP project(s) ready; Compute API; budget alert | ☐ |
| AI Gateway + Prisma AIRS lab profile ready (or BYO doc) | ☐ |
| Instructor smoke: apply → start → config tests → tiny eval → HTML | ☐ |
| Decide: Module 1 full apply vs plan-only + demo | ☐ |
| Assign Module 3 default benchmark id(s) to avoid HF pile-on | ☐ |
| Print/link `ONE_PAGER.md`; open `SLIDES.md` in Marp or preview | ☐ |
| Full-day only: assign Challenge A–E so pairs don’t collide | ☐ |

---

## Half-day timeline

Times are elapsed from session start.

### 0:00–0:15 — Welcome + slides (pillars, vibe-coding rules)

- Show product pillars and architecture slide.  
- Stress: engineer owns security; agent is junior.  
- Hand out / open **one-pager**.  
- **Say out loud:** no secrets in chat; no `0.0.0.0/0`.

### 0:15–0:40 — Module 0 (orientation)

- Students run the read-only `CLAUDE.md` prompt.  
- Cold-call 2 pairs: “What are the three tabs?”  
- Call out `define-custom-adapter/` trap.  
- **Exit ticket:** 5–8 bullets in notes (deliverable).

### 0:40–1:30 — Module 1 (Terraform / GCP)

- Slide: IP-scoped firewall constraint.  
- Students: runbook from agent → `plan` → human review → `apply` (or plan-only).  
- Roam for: org-policy blocks, IP drift, agents suggesting open CIDRs.  
- **Exit ticket:** public IP / SSH note + “what I’d reject.”

*If blocked:* instructor shares demo VM; students continue Modules 2–4 locally.

### 1:30–1:40 — Break

### 1:40–2:15 — Module 2 (boot + LLM Config)

- Live demo once: `.env` vs UI config.  
- Students: install, build, start, connectivity tests.  
- Ban debugging keys in chat — use redacted errors only.  
- **Exit ticket:** both tests green (or documented failure).

### 2:15–2:50 — Module 3 (HuggingFace benchmarks)

- Assign dataset ids.  
- Students load one benchmark; ask agent about `promptField` (read-only).  
- On 502/429: coach “symptom → retry logic,” not rewrite.  
- **Exit ticket:** id, type, `promptField`, size.

### 2:50–3:35 — Module 4 (eval + report)

- Enforce **small** runs (cost slide / verbal warning).  
- Complete run → UI tables → open HTML offline.  
- Footer string check as a group.  
- 5–10 line analyst note (peer detector caveat).  
- **Exit ticket:** report file + analyst note.

### 3:35–3:55 — Capstone lightning

- 3 minutes per volunteer (3–5 people) **or** silent write-up if large room.  
- Use capstone prompts from one-pager.  
- Close: tear-down reminder (`terraform destroy`), rotate keys.

### 3:55–4:00 — Close / feedback

- Link to full guide + challenges for take-home.  
- Collect 1 thing to improve about the lab.

---

## Full-day insert (after Module 4)

### +0:00–0:15 — Challenge kickoff

- Assign A–E; show “list files → edit → `npm test`” rule.  
- Peer review pairs identified.

### +0:15–1:30 — Build

- Roam with rubric from `PLAN.md`.  
- Midpoint (≈45m): “show me the failing test or the plan diff.”

### +1:30–1:50 — Peer security review

- Swap PRs/patches; 10 minutes each direction.  
- Checklist: secrets, ingress, footer, scope creep.

### +1:50–2:10 — Capstone (richer)

- Include challenge reflection box from `CHALLENGES.md`.

---

## Live demo script (instructor, ~8 minutes)

Use if students are stuck on deploy or first boot.

1. `CLAUDE.md` — three tabs, Evaluation-only product.  
2. `terraform plan` excerpt — show `/32` source ranges.  
3. App start → LLM Config → click both connectivity tests.  
4. Benchmarks → load assigned dataset → show prompt count.  
5. Evaluation → tiny run → open HTML → point at footer + one category bar.

---

## Parking lot prompts (if discussion derails)

- “Capture it — Module 5 / take-home.”  
- Production HTTPS / IAM federation = stretch, not today’s blocker.  
- Adapter skill = bonus literacy, not Evaluation wiring.

---

## End-of-day instructor checklist

| Action | Done |
|---|---|
| Remind `terraform destroy` / stop VMs | ☐ |
| Revoke or rotate shared lab credentials | ☐ |
| Note HF rate-limit pain for next cohort | ☐ |
| File product follow-ups (sample-N prompts, tf README, etc.) separately | ☐ |
