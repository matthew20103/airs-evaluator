import fs from 'node:fs';
import fs_promises from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// HuggingFace's datasets-server intermittently returns transient 5xx errors (observed: the exact
// same request succeeding on one call and 502ing on the next, for an otherwise healthy dataset).
// Retry those with exponential backoff; 4xx errors (bad path, dataset genuinely missing, etc.)
// fail immediately since waiting won't fix them.
async function fetchWithRetry(url, { retries = 5, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      lastErr = err;
      if (attempt === retries) throw lastErr;
      await sleep(baseDelayMs * 2 ** attempt);
      continue;
    }
    if (res.ok) return res;
    // 429 (rate limited) and 5xx are transient on HuggingFace's datasets-server; other 4xx
    // (bad path, dataset genuinely missing, etc.) fail immediately since retrying won't help.
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === retries) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    lastErr = new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    const retryAfterMs = res.status === 429 ? Number(res.headers?.get?.('retry-after')) * 1000 : NaN;
    await sleep(Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : baseDelayMs * 2 ** attempt);
  }
  throw lastErr;
}

function parseJsonl(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

// A single file holding one JSON array of records (as opposed to one-record-per-line jsonl) —
// some datasets (e.g. thu-coai/Agent-SafetyBench) ship this way instead.
function parseJsonArray(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Expected the JSON file to contain an array of records');
  return data;
}

// Minimal RFC4180-style CSV parser (handles quoted fields with commas/newlines/escaped quotes).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...dataRows] = rows.filter((r) => r.length > 1 || r[0] !== '');
  return dataRows.map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ''])));
}

async function fetchHfFile(source) {
  const url = `https://huggingface.co/datasets/${source.repo}/resolve/main/${source.path}`;
  const res = await fetchWithRetry(url);
  const text = await res.text();
  if (source.format === 'jsonl') return parseJsonl(text);
  if (source.format === 'csv') return parseCsv(text);
  if (source.format === 'json') return parseJsonArray(text);
  throw new Error(`Unsupported hf-file format: ${source.format}`);
}

async function fetchHfRows(source) {
  const rows = [];
  const pageSize = 100;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(source.repo)}&config=${encodeURIComponent(source.config)}&split=${encodeURIComponent(source.split)}&offset=${offset}&length=${pageSize}`;
    const res = await fetchWithRetry(url);
    const body = await res.json();
    const pageRows = body.rows ?? [];
    for (const r of pageRows) rows.push(r.row);
    if (pageRows.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

/**
 * Loads and caches the raw records for a benchmark, returning a flat list of prompt strings.
 */
export async function loadBenchmarkPrompts(benchmarkId, source) {
  const cachePath = path.join(CACHE_DIR, `${benchmarkId.replace(/\//g, '__')}.json`);

  let records;
  if (fs.existsSync(cachePath)) {
    records = JSON.parse(await fs_promises.readFile(cachePath, 'utf-8'));
  } else {
    if (source.type === 'hf-file') {
      records = await fetchHfFile(source);
    } else if (source.type === 'hf-rows') {
      records = await fetchHfRows(source);
    } else {
      throw new Error(`Unsupported benchmark source type: ${source.type}`);
    }
    await fs_promises.mkdir(CACHE_DIR, { recursive: true });
    await fs_promises.writeFile(cachePath, JSON.stringify(records));
  }

  return records
    .map((r) => r[source.promptField])
    .filter((p) => typeof p === 'string' && p.length > 0);
}
