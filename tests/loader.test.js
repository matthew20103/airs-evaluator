import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadBenchmarkPrompts } from '../server/benchmarks/loader.js';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

async function cleanCache(id) {
  await fs.rm(path.join(CACHE_DIR, `${id.replace(/\//g, '__')}.json`), { force: true });
}

describe('loadBenchmarkPrompts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses a jsonl hf-file source and extracts the prompt field', async () => {
    const id = 'test/jsonl-bench';
    await cleanCache(id);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => '{"attack":"first attack"}\n{"attack":"second attack"}\n',
    })));

    const prompts = await loadBenchmarkPrompts(id, {
      type: 'hf-file',
      repo: 'test/jsonl-bench',
      path: 'data.jsonl',
      format: 'jsonl',
      promptField: 'attack',
    });

    expect(prompts).toEqual(['first attack', 'second attack']);
    await cleanCache(id);
  });

  it('parses a plain JSON-array hf-file source', async () => {
    const id = 'test/json-array-bench';
    await cleanCache(id);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify([{ instruction: 'first unsafe instruction' }, { instruction: 'second unsafe instruction' }]),
    })));

    const prompts = await loadBenchmarkPrompts(id, {
      type: 'hf-file',
      repo: 'test/json-array-bench',
      path: 'released_data.json',
      format: 'json',
      promptField: 'instruction',
    });

    expect(prompts).toEqual(['first unsafe instruction', 'second unsafe instruction']);
    await cleanCache(id);
  });

  it('rejects a JSON hf-file source whose top level is not an array', async () => {
    const id = 'test/json-object-bench';
    await cleanCache(id);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => JSON.stringify({ not: 'an array' }) })));

    await expect(
      loadBenchmarkPrompts(id, { type: 'hf-file', repo: 'test/json-object-bench', path: 'data.json', format: 'json', promptField: 'instruction' })
    ).rejects.toThrow(/array/);
    await cleanCache(id);
  });

  it('parses a quoted-csv hf-file source', async () => {
    const id = 'test/csv-bench';
    await cleanCache(id);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => 'Name,Prompt\nfoo,"hello, world"\nbar,"line with \ninternal newline"\n',
    })));

    const prompts = await loadBenchmarkPrompts(id, {
      type: 'hf-file',
      repo: 'test/csv-bench',
      path: 'dataset.csv',
      format: 'csv',
      promptField: 'Prompt',
    });

    expect(prompts).toEqual(['hello, world', 'line with \ninternal newline']);
    await cleanCache(id);
  });

  it('paginates an hf-rows source until a short page is returned', async () => {
    const id = 'test/rows-bench';
    await cleanCache(id);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: Array.from({ length: 100 }, (_, i) => ({ row: { prompt: `p${i}` } })) }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: [{ row: { prompt: 'p100' } }] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const prompts = await loadBenchmarkPrompts(id, {
      type: 'hf-rows',
      repo: 'test/rows-bench',
      config: 'default',
      split: 'train',
      promptField: 'prompt',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(prompts).toHaveLength(101);
    expect(prompts[0]).toBe('p0');
    expect(prompts[100]).toBe('p100');
    await cleanCache(id);
  });

  it('retries transient 502s from the datasets-server and succeeds once it recovers', async () => {
    const id = 'test/retry-bench';
    await cleanCache(id);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' })
      .mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: [{ row: { prompt: 'recovered' } }] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const promise = loadBenchmarkPrompts(id, {
      type: 'hf-rows',
      repo: 'test/retry-bench',
      config: 'default',
      split: 'train',
      promptField: 'prompt',
    });
    // Flush the backoff sleeps between retries.
    await vi.runAllTimersAsync();
    const prompts = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(prompts).toEqual(['recovered']);
    vi.useRealTimers();
    await cleanCache(id);
  });

  it('retries a 429 rate-limit response, honoring Retry-After when present', async () => {
    const id = 'test/rate-limit-bench';
    await cleanCache(id);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests', headers: { get: (h) => (h === 'retry-after' ? '1' : null) } })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: [{ row: { prompt: 'recovered' } }] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const promise = loadBenchmarkPrompts(id, {
      type: 'hf-rows',
      repo: 'test/rate-limit-bench',
      config: 'default',
      split: 'train',
      promptField: 'prompt',
    });
    await vi.runAllTimersAsync();
    const prompts = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(prompts).toEqual(['recovered']);
    vi.useRealTimers();
    await cleanCache(id);
  });

  it('does not retry a 4xx error', async () => {
    const id = 'test/no-retry-bench';
    await cleanCache(id);
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      loadBenchmarkPrompts(id, {
        type: 'hf-rows',
        repo: 'test/no-retry-bench',
        config: 'default',
        split: 'train',
        promptField: 'prompt',
      })
    ).rejects.toThrow(/404/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await cleanCache(id);
  });

  it('caches results so a second call does not re-fetch', async () => {
    const id = 'test/cache-bench';
    await cleanCache(id);
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => '{"attack":"only one"}\n' }));
    vi.stubGlobal('fetch', fetchMock);

    const source = { type: 'hf-file', repo: 'x', path: 'y.jsonl', format: 'jsonl', promptField: 'attack' };
    await loadBenchmarkPrompts(id, source);
    await loadBenchmarkPrompts(id, source);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await cleanCache(id);
  });
});
