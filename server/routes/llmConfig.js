import { Router } from 'express';
import { db } from '../db/index.js';
import { chat } from '../gateway/client.js';

export const router = Router();
const ROLES = ['judge', 'reporter'];

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM llm_config').all();
  res.json(rows);
});

router.put('/:role', (req, res) => {
  const { role } = req.params;
  const { model } = req.body;
  if (!ROLES.includes(role)) return res.status(400).json({ error: `role must be one of ${ROLES.join(', ')}` });
  if (!model) return res.status(400).json({ error: 'model is required' });
  db.prepare('INSERT INTO llm_config (role, model) VALUES (?, ?) ON CONFLICT(role) DO UPDATE SET model = excluded.model').run(role, model);
  res.json({ role, model });
});

router.post('/:role/test', async (req, res) => {
  const { role } = req.params;
  if (!ROLES.includes(role)) return res.status(400).json({ error: `role must be one of ${ROLES.join(', ')}` });

  const started = Date.now();
  try {
    const response = await chat(role, [
      { role: 'user', content: 'Reply with exactly one word: pong' },
    ]);
    res.json({ ok: true, response, latencyMs: Date.now() - started });
  } catch (err) {
    res.json({ ok: false, error: err.message, latencyMs: Date.now() - started });
  }
});
