import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import app from '../server/index.js';
import { db } from '../server/db/index.js';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

describe('API smoke tests', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /api/health responds ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('GET /api/benchmarks includes the seeded benchmarks', async () => {
    const res = await request(app).get('/api/benchmarks');
    expect(res.status).toBe(200);
    const ids = res.body.map((b) => b.id);
    expect(ids).toContain('qxcv/tensor-trust');
    expect(ids).toContain('walledai/CyberSecEval');
    expect(ids).toContain('rubend18/ChatGPT-Jailbreak-Prompts');
    expect(ids).toContain('S-Labs/prompt-injection-dataset');
    expect(ids).toContain('cgoosen/prompt_injection_password_or_secret');
    expect(ids).toContain('Dhanjo/ai-agent-security-dataset');
    expect(ids).toContain('rishitchugh/successful_adversarial_prompts#gcg');
    expect(ids).toContain('rishitchugh/successful_adversarial_prompts#pez');
    expect(ids).toContain('rishitchugh/successful_adversarial_prompts#gbda');
    expect(ids).toContain('harpreetsahota/adversarial-prompts');
    expect(ids).toContain('Lakera/b3-agent-security-benchmark-weak');
    expect(ids).toContain('itsVentie/llm-red-teaming-corpus');
    expect(ids).toContain('ai-safety-institute/AgentHarm');
    expect(ids).toContain('thu-coai/Agent-SafetyBench');

    // Every out-of-the-box benchmark ships a non-empty description of what it tests and how to
    // use the results, shown on the Benchmarks page.
    for (const b of res.body) {
      expect(typeof b.description).toBe('string');
      expect(b.description.length).toBeGreaterThan(0);
    }
  });

  it('seedBenchmarks backfills a description onto an already-seeded row that has none, without touching one that does', async () => {
    const { seedBenchmarks } = await import('../server/db/index.js');
    db.prepare('UPDATE benchmarks SET description = ? WHERE id = ?').run('', 'qxcv/tensor-trust');

    seedBenchmarks({
      out_of_the_box_benchmarks: [
        { id: 'qxcv/tensor-trust', name: 'irrelevant', description: 'Backfilled description.', source: { type: 'hf-file', repo: 'x', path: 'y', format: 'jsonl', promptField: 'z' } },
      ],
    });
    let row = db.prepare('SELECT description FROM benchmarks WHERE id = ?').get('qxcv/tensor-trust');
    expect(row.description).toBe('Backfilled description.');

    // A second seed pass with a different description must NOT clobber the one just backfilled.
    seedBenchmarks({
      out_of_the_box_benchmarks: [
        { id: 'qxcv/tensor-trust', name: 'irrelevant', description: 'A different description.', source: { type: 'hf-file', repo: 'x', path: 'y', format: 'jsonl', promptField: 'z' } },
      ],
    });
    row = db.prepare('SELECT description FROM benchmarks WHERE id = ?').get('qxcv/tensor-trust');
    expect(row.description).toBe('Backfilled description.');

    // Restore the real description so this test doesn't leak state into others.
    const realBenchmarks = JSON.parse(await fs.readFile('data/benchmarks.json', 'utf-8'));
    const real = realBenchmarks.out_of_the_box_benchmarks.find((b) => b.id === 'qxcv/tensor-trust');
    db.prepare('UPDATE benchmarks SET description = ? WHERE id = ?').run(real.description, 'qxcv/tensor-trust');
  });

  it('seedBenchmarks is idempotent: re-seeding adds new entries without duplicating or overwriting existing/custom ones', async () => {
    const { seedBenchmarks } = await import('../server/db/index.js');
    const before = db.prepare('SELECT COUNT(*) AS n FROM benchmarks').get().n;

    db.prepare('INSERT OR IGNORE INTO benchmarks (id, name, source_json, enabled) VALUES (?, ?, ?, 1)').run(
      'custom/my-benchmark', 'My custom benchmark',
      JSON.stringify({ type: 'hf-file', repo: 'x/y', path: 'z', format: 'jsonl', promptField: 'p' })
    );

    seedBenchmarks({
      out_of_the_box_benchmarks: [
        { id: 'qxcv/tensor-trust', name: 'should not overwrite existing name', source: { type: 'hf-file', repo: 'x', path: 'y', format: 'jsonl', promptField: 'z' } },
        { id: 'brand-new/benchmark', name: 'Brand new benchmark', source: { type: 'hf-file', repo: 'a/b', path: 'c', format: 'jsonl', promptField: 'd' } },
      ],
    });

    const after = db.prepare('SELECT COUNT(*) AS n FROM benchmarks').get().n;
    expect(after).toBe(before + 2); // the custom one + the one genuinely new entry; no duplicate of the existing seed

    const tensorTrust = db.prepare('SELECT name FROM benchmarks WHERE id = ?').get('qxcv/tensor-trust');
    expect(tensorTrust.name).toBe('Tensor Trust - Extraction Robustness'); // untouched, not overwritten

    db.exec("DELETE FROM benchmarks WHERE id IN ('custom/my-benchmark', 'brand-new/benchmark')");
  });

  it('GET /api/benchmarks/:id/count returns the prompt count for a benchmark with a slash in its id', async () => {
    const id = 'count-test/jsonl-bench';
    db.prepare('INSERT INTO benchmarks (id, name, source_json, enabled) VALUES (?, ?, ?, 1)').run(
      id, 'Count test benchmark',
      JSON.stringify({ type: 'hf-file', repo: id, path: 'data.jsonl', format: 'jsonl', promptField: 'attack' })
    );

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => '{"attack":"first"}\n{"attack":"second"}\n{"attack":"third"}\n',
    })));

    // The id contains a "/", so the client must URL-encode it for Express's single-segment
    // :id param to match at all -- this exercises that encoding end to end.
    const res = await request(app).get(`/api/benchmarks/${encodeURIComponent(id)}/count`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);

    db.exec(`DELETE FROM benchmarks WHERE id = '${id}'`);
    await fs.rm(path.join(CACHE_DIR, `${id.replace(/\//g, '__')}.json`), { force: true });
  });

  it('GET /api/benchmarks/:id/count 404s for an unknown benchmark', async () => {
    const res = await request(app).get('/api/benchmarks/does-not-exist/count');
    expect(res.status).toBe(404);
  });

  it('DELETE /api/benchmarks/:id works for an id containing a slash when URL-encoded', async () => {
    const id = 'delete-test/with-a-slash';
    db.prepare('INSERT INTO benchmarks (id, name, source_json, enabled) VALUES (?, ?, ?, 1)').run(
      id, 'Delete test benchmark', JSON.stringify({ type: 'hf-file', repo: id, path: 'x', format: 'jsonl', promptField: 'y' })
    );

    const res = await request(app).delete(`/api/benchmarks/${encodeURIComponent(id)}`);
    expect(res.status).toBe(204);
    expect(db.prepare('SELECT * FROM benchmarks WHERE id = ?').get(id)).toBeUndefined();
  });

  it('PUT then GET /api/llm-config/:role persists the model', async () => {
    const put = await request(app).put('/api/llm-config/judge').send({ model: 'gpt-4o-mini' });
    expect(put.status).toBe(200);
    const list = await request(app).get('/api/llm-config');
    const judge = list.body.find((r) => r.role === 'judge');
    expect(judge.model).toBe('gpt-4o-mini');
  });

  it('rejects an unknown llm-config role', async () => {
    const res = await request(app).put('/api/llm-config/nope').send({ model: 'x' });
    expect(res.status).toBe(400);
  });

  it('rejects the removed "attacker" and "adapter_builder" roles', async () => {
    for (const role of ['attacker', 'adapter_builder']) {
      const res = await request(app).put(`/api/llm-config/${role}`).send({ model: 'x' });
      expect(res.status).toBe(400);
    }
    const list = await request(app).get('/api/llm-config');
    expect(list.body.some((r) => r.role === 'attacker' || r.role === 'adapter_builder')).toBe(false);
  });

  it('PUT /api/settings stores the gateway config without echoing the raw key back', async () => {
    await request(app).put('/api/settings').send({ gatewayBaseUrl: 'https://aigw.portkey.ai/v1', gatewayApiKey: 'sk-abcd1234' });
    const get = await request(app).get('/api/settings');
    expect(get.body.gatewayBaseUrl).toBe('https://aigw.portkey.ai/v1');
    expect(get.body.gatewayApiKeySet).toBe(true);
    expect(get.body.gatewayApiKeyPreview).toBe('••••1234');
    expect(get.body.gatewayApiKey).toBeUndefined();
  });

  it('PUT /api/settings with a blank api key leaves the stored key unchanged', async () => {
    await request(app).put('/api/settings').send({ gatewayBaseUrl: 'https://a', gatewayApiKey: 'keep-me' });
    await request(app).put('/api/settings').send({ gatewayBaseUrl: 'https://b', gatewayApiKey: '' });
    const get = await request(app).get('/api/settings');
    expect(get.body.gatewayBaseUrl).toBe('https://b');
    expect(get.body.gatewayApiKeyPreview).toBe('••••p-me');
  });

  it('PUT /api/settings stores Prisma AIRS config and masks the header value like the gateway key', async () => {
    await request(app).put('/api/settings').send({
      prismaAirsUrl: 'https://service.api.aisecurity.paloaltonetworks.com/v1/scan/sync/request',
      prismaAirsMethod: 'POST',
      prismaAirsHeaderName: 'x-pan-token',
      prismaAirsHeaderValue: 'pan-token-abcd1234',
      prismaAirsProfileName: 'secure-ai-profile',
    });
    const get = await request(app).get('/api/settings');
    expect(get.body.prismaAirsUrl).toBe('https://service.api.aisecurity.paloaltonetworks.com/v1/scan/sync/request');
    expect(get.body.prismaAirsMethod).toBe('POST');
    expect(get.body.prismaAirsHeaderName).toBe('x-pan-token');
    expect(get.body.prismaAirsHeaderValueSet).toBe(true);
    expect(get.body.prismaAirsHeaderValuePreview).toBe('••••1234');
    expect(get.body.prismaAirsHeaderValue).toBeUndefined();
    expect(get.body.prismaAirsProfileName).toBe('secure-ai-profile');
  });

  it('PUT /api/settings with a blank Prisma AIRS header value leaves the stored token unchanged', async () => {
    await request(app).put('/api/settings').send({ prismaAirsHeaderValue: 'keep-this-token' });
    await request(app).put('/api/settings').send({ prismaAirsUrl: 'https://new-url.example', prismaAirsHeaderValue: '' });
    const get = await request(app).get('/api/settings');
    expect(get.body.prismaAirsUrl).toBe('https://new-url.example');
    expect(get.body.prismaAirsHeaderValuePreview).toBe('••••oken');
  });

  it('POST /api/settings/test-prisma-airs confirms connectivity', async () => {
    await request(app).put('/api/settings').send({
      prismaAirsUrl: 'https://prisma.invalid/v1/scan/sync/request',
      prismaAirsHeaderName: 'x-pan-token',
      prismaAirsHeaderValue: 'pan-token-test',
      prismaAirsProfileName: 'secure-ai-profile',
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ action: 'allow', category: 'benign', error: false, errors: [], prompt_detected: {} }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )));
    const res = await request(app).post('/api/settings/test-prisma-airs');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.action).toBe('allow');
    expect(res.body.category).toBe('benign');
    expect(typeof res.body.latencyMs).toBe('number');
  });

  it('POST /api/settings/test-prisma-airs surfaces a clear error when not configured', async () => {
    db.exec("DELETE FROM settings WHERE key LIKE 'prisma_airs%'");
    const res = await request(app).post('/api/settings/test-prisma-airs');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/Prisma AIRS is not configured yet/);
  });

  it('POST /api/llm-config/:role/test calls the gateway and returns its reply', async () => {
    await request(app).put('/api/settings').send({ gatewayBaseUrl: 'https://example.invalid/v1', gatewayApiKey: 'sk-test' });
    await request(app).put('/api/llm-config/judge').send({ model: 'gpt-4o-mini' });

    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )));

    const res = await request(app).post('/api/llm-config/judge/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.response).toBe('pong');
    expect(typeof res.body.latencyMs).toBe('number');
  });

  it('POST /api/llm-config/:role/test surfaces a clear error when the model is unset', async () => {
    db.exec("DELETE FROM llm_config WHERE role = 'reporter'");
    db.prepare('INSERT INTO llm_config (role, model) VALUES (@role, @model)').run({ role: 'reporter', model: '' });

    const res = await request(app).post('/api/llm-config/reporter/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/No model configured for role "reporter"/);
  });
});
