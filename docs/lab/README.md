# Vibe Coding Lab Materials

Lab design for security engineers practicing AI-assisted development on this repository.

| Doc | Audience | Purpose |
|---|---|---|
| [PLAN.md](./PLAN.md) | Facilitators | Outcomes, module map, rubric, prep checklist |
| [LAB_GUIDE.md](./LAB_GUIDE.md) | Students | Step-by-step modules 0–4 + capstone |
| [ONE_PAGER.md](./ONE_PAGER.md) | Students | Printable cheat sheet (brief template, checklist, commands) |
| [CHALLENGES.md](./CHALLENGES.md) | Students | Module 5 copy-paste challenge briefs |
| [STARTERS.md](./STARTERS.md) | Students | Per-challenge pre-flight + hand-in template |
| [SLIDES.md](./SLIDES.md) | Facilitators | Marp-compatible slide deck |
| [RUN_OF_SHOW.md](./RUN_OF_SHOW.md) | Facilitators | Minute-by-minute delivery script |
| [FACILITATOR_NOTES.md](./FACILITATOR_NOTES.md) | Facilitators | Timing, pitfalls, answer-key style hints |

**Scope of this addition:** documentation only. Application, Terraform, and test code are unchanged.

### Suggested student path

1. Skim [`ONE_PAGER.md`](./ONE_PAGER.md)  
2. Follow [`LAB_GUIDE.md`](./LAB_GUIDE.md) Modules 0–4  
3. *(Optional)* Pick a card in [`CHALLENGES.md`](./CHALLENGES.md) + kit in [`STARTERS.md`](./STARTERS.md)  

### Suggested facilitator path

1. [`PLAN.md`](./PLAN.md) → prep checklist  
2. Present [`SLIDES.md`](./SLIDES.md) (Marp or any Markdown slide preview)  
3. Drive the day from [`RUN_OF_SHOW.md`](./RUN_OF_SHOW.md)  
4. Coach from [`FACILITATOR_NOTES.md`](./FACILITATOR_NOTES.md)

**Product pillars exercised in the lab**

1. GCP VM deployment (`terraform/`)  
2. HuggingFace security benchmark retrieval (`data/benchmarks.json`, `server/benchmarks/`)  
3. LLM judge vs Prisma AIRS comparison + offline HTML report (`server/evaluation/`, `reports/`)
