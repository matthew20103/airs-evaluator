import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { seedBenchmarks, seedLlmConfigIfEmpty } from './db/index.js';
import { router as benchmarksRouter } from './routes/benchmarks.js';
import { router as llmConfigRouter } from './routes/llmConfig.js';
import { router as settingsRouter } from './routes/settings.js';
import { router as evaluationsRouter } from './routes/evaluations.js';

const seedPath = path.join(process.cwd(), 'data', 'benchmarks.json');
seedBenchmarks(JSON.parse(fs.readFileSync(seedPath, 'utf-8')));
seedLlmConfigIfEmpty();

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/benchmarks', benchmarksRouter);
app.use('/api/llm-config', llmConfigRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/evaluations', evaluationsRouter);

const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

const port = process.env.PORT || 8000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`Prisma AIRS Runtime Security Evaluator listening on port ${port}`));
}

export default app;
