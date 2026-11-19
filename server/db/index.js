import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DB_PATH || './data/airs-evaluator.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS benchmarks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_json TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS llm_config (
    role TEXT PRIMARY KEY,
    model TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS evaluation_runs (
    id TEXT PRIMARY KEY,
    benchmark_ids_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    max_concurrency INTEGER,
    started_at TEXT,
    finished_at TEXT,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS evaluation_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES evaluation_runs(id),
    benchmark_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    judge_categories_json TEXT,
    judge_reason TEXT,
    judge_latency_ms REAL,
    judge_error TEXT,
    prisma_categories_json TEXT,
    prisma_action TEXT,
    prisma_category TEXT,
    prisma_raw_json TEXT,
    prisma_latency_ms REAL,
    prisma_error TEXT
  );
`);

function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('benchmarks', 'description', "TEXT NOT NULL DEFAULT ''");
// Captured at run creation, not read live from llm_config, so a report always shows the model
// that actually produced its judge verdicts — even after the configured model is later changed.
addColumnIfMissing('evaluation_runs', 'judge_model', "TEXT NOT NULL DEFAULT ''");

// Idempotent per-entry seeding (not "only if the table is empty") so that adding new
// out-of-the-box benchmarks to data/benchmarks.json and redeploying actually makes them show
// up, without touching benchmarks a user has already added, edited, or removed.
export function seedBenchmarks(benchmarksJson) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO benchmarks (id, name, source_json, description, enabled) VALUES (@id, @name, @source_json, @description, 1)'
  );
  // Backfill a description onto an already-seeded row only while it has none yet — covers
  // installs that were seeded before this field existed, without clobbering a future user edit.
  const backfillDescription = db.prepare(
    "UPDATE benchmarks SET description = @description WHERE id = @id AND (description IS NULL OR description = '')"
  );
  for (const item of benchmarksJson.out_of_the_box_benchmarks) {
    const description = item.description || '';
    insert.run({ id: item.id, name: item.name, source_json: JSON.stringify(item.source), description });
    if (description) backfillDescription.run({ id: item.id, description });
  }
}

export function seedLlmConfigIfEmpty() {
  const insert = db.prepare('INSERT OR IGNORE INTO llm_config (role, model) VALUES (@role, @model)');
  for (const role of ['judge', 'reporter']) {
    insert.run({ role, model: '' });
  }
  // One-time cleanup: "attacker" (pure pass-through, never used an LLM) and "adapter_builder"
  // (Custom Adapter Generator, removed along with Target Agent) are gone — drop any stale config
  // left over from an already-deployed database.
  db.exec("DELETE FROM llm_config WHERE role IN ('attacker', 'adapter_builder')");
}

export function getSetting(key) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || '';
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run({ key, value });
}
