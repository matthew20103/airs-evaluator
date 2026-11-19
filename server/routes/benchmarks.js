import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { loadBenchmarkPrompts } from '../benchmarks/loader.js';

export const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM benchmarks').all();
  res.json(
    rows.map(({ source_json, ...r }) => ({ ...r, source: JSON.parse(source_json) }))
  );
});

router.get('/:id/count', async (req, res) => {
  const bm = db.prepare('SELECT * FROM benchmarks WHERE id = ?').get(req.params.id);
  if (!bm) return res.status(404).json({ error: 'Benchmark not found' });
  try {
    const prompts = await loadBenchmarkPrompts(bm.id, JSON.parse(bm.source_json));
    res.json({ count: prompts.length });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  const { name, source, description } = req.body;
  if (!name || !source) return res.status(400).json({ error: 'name and source are required' });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO benchmarks (id, name, source_json, description, enabled) VALUES (?, ?, ?, ?, 1)').run(
    id,
    name,
    JSON.stringify(source),
    description || ''
  );
  res.status(201).json({ id, name, source, description: description || '' });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM benchmarks WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
