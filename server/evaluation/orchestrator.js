import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { loadBenchmarkPrompts } from '../benchmarks/loader.js';
import { classifyPrompt } from '../agents/judge.js';
import { scanWithPrismaAirs } from '../agents/prismaAirs.js';
import { runConcurrent } from '../lib/concurrency.js';
import { generateEvaluationReport } from './reporter.js';
import { serializeResult, serializeRun } from './serialize.js';

const insertResult = db.prepare(`
  INSERT INTO evaluation_results (
    id, run_id, benchmark_id, prompt,
    judge_categories_json, judge_reason, judge_latency_ms, judge_error,
    prisma_categories_json, prisma_action, prisma_category, prisma_raw_json, prisma_latency_ms, prisma_error
  ) VALUES (
    @id, @run_id, @benchmark_id, @prompt,
    @judge_categories_json, @judge_reason, @judge_latency_ms, @judge_error,
    @prisma_categories_json, @prisma_action, @prisma_category, @prisma_raw_json, @prisma_latency_ms, @prisma_error
  )
`);

// Same conservative default used by the scan orchestrator — a first run against an
// unfamiliar Prisma AIRS endpoint shouldn't fire a burst of concurrent requests.
const DEFAULT_MAX_CONCURRENCY = 2;

export function createEvaluationRun(benchmarkIds, maxConcurrency) {
  const id = crypto.randomUUID();
  const resolvedConcurrency = Number.isFinite(maxConcurrency) && maxConcurrency > 0 ? Math.round(maxConcurrency) : DEFAULT_MAX_CONCURRENCY;
  // Captured now rather than read live later, so the report keeps showing the model that
  // actually judged this run even if the configured judge model changes afterward.
  const judgeModel = db.prepare('SELECT model FROM llm_config WHERE role = ?').get('judge')?.model || '';
  db.prepare(
    `INSERT INTO evaluation_runs (id, benchmark_ids_json, status, total, completed, max_concurrency, judge_model) VALUES (?, ?, 'pending', 0, 0, ?, ?)`
  ).run(id, JSON.stringify(benchmarkIds), resolvedConcurrency, judgeModel);
  // Fire and forget — progress is polled via GET /api/evaluations/:id.
  runEvaluation(id, benchmarkIds, resolvedConcurrency).catch((err) => {
    db.prepare(`UPDATE evaluation_runs SET status = 'failed', error = ?, finished_at = datetime('now') WHERE id = ?`).run(err.message, id);
  });
  return id;
}

async function processItem(runId, item) {
  const [judged, prisma] = await Promise.all([
    classifyPrompt(item.prompt),
    scanWithPrismaAirs(item.prompt).catch((err) => ({ categories: null, action: null, category: null, raw: null, latencyMs: null, error: err.message })),
  ]);

  insertResult.run({
    id: crypto.randomUUID(),
    run_id: runId,
    benchmark_id: item.benchmarkId,
    prompt: item.prompt,
    judge_categories_json: judged.categories ? JSON.stringify(judged.categories) : null,
    judge_reason: judged.reason,
    judge_latency_ms: judged.latencyMs,
    judge_error: judged.error,
    prisma_categories_json: prisma.categories ? JSON.stringify(prisma.categories) : null,
    prisma_action: prisma.action,
    prisma_category: prisma.category,
    prisma_raw_json: prisma.raw ? JSON.stringify(prisma.raw) : null,
    prisma_latency_ms: prisma.latencyMs,
    prisma_error: prisma.error,
  });

  db.prepare('UPDATE evaluation_runs SET completed = completed + 1 WHERE id = ?').run(runId);
}

async function runEvaluation(runId, benchmarkIds, maxConcurrency) {
  const benchmarks = db
    .prepare(`SELECT * FROM benchmarks WHERE id IN (${benchmarkIds.map(() => '?').join(',')})`)
    .all(...benchmarkIds);

  const work = [];
  for (const bm of benchmarks) {
    const prompts = await loadBenchmarkPrompts(bm.id, JSON.parse(bm.source_json));
    for (const prompt of prompts) work.push({ benchmarkId: bm.id, prompt });
  }

  db.prepare(`UPDATE evaluation_runs SET status = 'running', total = ?, started_at = datetime('now') WHERE id = ?`).run(work.length, runId);

  await runConcurrent(work, maxConcurrency, (item) => processItem(runId, item));

  const run = serializeRun(db.prepare('SELECT * FROM evaluation_runs WHERE id = ?').get(runId));
  const results = db.prepare('SELECT * FROM evaluation_results WHERE run_id = ? ORDER BY rowid').all(runId).map(serializeResult);
  await generateEvaluationReport(run, results);

  db.prepare(`UPDATE evaluation_runs SET status = 'completed', finished_at = datetime('now') WHERE id = ?`).run(runId);
}
