import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db/index.js';
import { createEvaluationRun } from '../evaluation/orchestrator.js';
import { serializeResult, serializeRun } from '../evaluation/serialize.js';

export const router = Router();
const REPORTS_DIR = path.join(process.cwd(), 'reports');

function reportAvailable(runId) {
  return fs.existsSync(path.join(REPORTS_DIR, `${runId}.html`));
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM evaluation_runs ORDER BY started_at DESC').all();
  res.json(rows.map((r) => ({ ...serializeRun(r), reportAvailable: reportAvailable(r.id) })));
});

router.get('/:id', (req, res) => {
  const run = db.prepare('SELECT * FROM evaluation_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Evaluation run not found' });
  const results = db.prepare('SELECT * FROM evaluation_results WHERE run_id = ? ORDER BY rowid').all(run.id);
  res.json({ ...serializeRun(run), reportAvailable: reportAvailable(run.id), results: results.map(serializeResult) });
});

router.get('/:id/report', (req, res) => {
  const filePath = path.join(REPORTS_DIR, `${req.params.id}.html`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found (run may still be running)' });
  res.sendFile(filePath);
});

// "Delete report" removes the whole run, not just the HTML file: the report, the run's results,
// and the run record itself. A run that's still in progress can't be deleted out from under the
// orchestrator still writing to it.
router.delete('/:id/report', (req, res) => {
  const run = db.prepare('SELECT id, status FROM evaluation_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Evaluation run not found' });
  if (run.status === 'pending' || run.status === 'running') {
    return res.status(409).json({ error: 'Cannot delete a run that is still in progress' });
  }
  const filePath = path.join(REPORTS_DIR, `${req.params.id}.html`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM evaluation_results WHERE run_id = ?').run(req.params.id);
  db.prepare('DELETE FROM evaluation_runs WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.post('/', (req, res) => {
  const { benchmarkIds, maxConcurrency } = req.body;
  if (!Array.isArray(benchmarkIds) || benchmarkIds.length === 0) {
    return res.status(400).json({ error: 'A non-empty benchmarkIds array is required' });
  }
  if (maxConcurrency != null && (!Number.isFinite(maxConcurrency) || maxConcurrency <= 0)) {
    return res.status(400).json({ error: 'maxConcurrency must be a positive number when provided' });
  }
  const id = createEvaluationRun(benchmarkIds, maxConcurrency);
  res.status(202).json({ id });
});
