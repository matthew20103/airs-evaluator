import { describe, it, expect } from 'vitest';
import { renderEvaluationReportHtml } from '../server/evaluation/reportTemplate.js';

// Same pattern used for the old scan report template: the comparison tables are computed
// client-side by a small vanilla-JS renderer embedded as a string (so the downloaded HTML file
// works fully offline). This harness extracts that embedded script and executes it against a
// minimal fake DOM so the actual logic — not just the static HTML shell — gets real coverage.
function loadRenderer(html) {
  const dataMatch = html.match(/<script type="application\/json" id="run-data">([\s\S]*?)<\/script>/);
  const rendererMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<script>window\.AirsEvaluatorReport/);
  const data = JSON.parse(dataMatch[1]);

  function FakeEl(tag) {
    this.tagName = tag;
    this.className = '';
    this.children = [];
    this.style = {};
    this.title = '';
    this.value = '';
  }
  FakeEl.prototype.append = function (...kids) {
    for (const k of kids) this.children.push(k);
  };
  FakeEl.prototype.replaceChildren = function (...kids) {
    this.children = kids;
  };
  FakeEl.prototype.addEventListener = function () {};
  FakeEl.prototype.setAttribute = function () {};
  FakeEl.prototype.textOf = function () {
    return this.children
      .map((k) => (k instanceof FakeEl ? k.textOf() : k && k.text != null ? k.text : String(k)))
      .join(' ');
  };
  const fakeDocument = { createElement: (tag) => new FakeEl(tag), createTextNode: (s) => ({ text: s }) };
  const fn = new Function('document', 'window', 'Node', rendererMatch[1] + '; return { render, metrics, classify, isMismatch };');
  const mod = fn(fakeDocument, {}, FakeEl);

  const root = new FakeEl('div');
  mod.render(root, data);
  return { data, metrics: mod.metrics, classify: mod.classify, isMismatch: mod.isMismatch, text: root.textOf() };
}

const RUN = { id: 'run-1', started_at: '2026-11-18 00:00:00', max_concurrency: 3, benchmarkIds: ['b1', 'b2'] };

function result(overrides) {
  return {
    id: Math.random().toString(36).slice(2),
    benchmarkId: 'b1',
    prompt: 'test prompt',
    judgeCategories: null, judgeReason: null, judgeLatencyMs: null, judgeError: null,
    prismaCategories: null, prismaAction: null, prismaCategory: null, prismaLatencyMs: null, prismaError: null,
    ...overrides,
  };
}

describe('renderEvaluationReportHtml', () => {
  it('always includes the required footer branding and the renderer is valid JS', () => {
    const html = renderEvaluationReportHtml({ run: RUN, results: [], narrative: null, generatedAt: '2026-11-18 00:05' });
    expect(html).toContain('Exported from Prisma AIRS Runtime Security Evaluator');
    const rendererMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<script>window\.AirsEvaluatorReport/);
    expect(() => new Function(rendererMatch[1])).not.toThrow();
  });

  it('computes correct per-category detection rates, agreement, and confirmed misses', () => {
    const results = [
      // Both detect injection (same category) — a true positive, no mismatch.
      result({ benchmarkId: 'b1', judgeCategories: { injection: true, maliciousUrl: false, sensitiveData: false, maliciousCode: false, agentProtection: false, toxicContent: false }, judgeLatencyMs: 100, prismaCategories: { injection: true, maliciousUrl: false, sensitiveData: false, maliciousCode: false, agentProtection: false, toxicContent: false }, prismaLatencyMs: 50 }),
      // Judge confirms sensitive data, Prisma AIRS flags NOTHING at all — a real confirmed miss.
      result({ benchmarkId: 'b1', judgeCategories: { injection: false, maliciousUrl: false, sensitiveData: true, maliciousCode: false, agentProtection: false, toxicContent: false }, judgeLatencyMs: 120, prismaCategories: { injection: false, maliciousUrl: false, sensitiveData: false, maliciousCode: false, agentProtection: false, toxicContent: false }, prismaLatencyMs: 60 }),
      // Neither detects anything on a benign prompt in benchmark b2 — a true negative.
      result({ benchmarkId: 'b2', judgeCategories: { injection: false, maliciousUrl: false, sensitiveData: false, maliciousCode: false, agentProtection: false, toxicContent: false }, judgeLatencyMs: 90, prismaCategories: { injection: false, maliciousUrl: false, sensitiveData: false, maliciousCode: false, agentProtection: false, toxicContent: false }, prismaLatencyMs: 40 }),
      // Judge flags injection, Prisma AIRS flags maliciousCode instead — both caught it, just under
      // a different category. This must NOT count as a confirmed miss for injection.
      result({ benchmarkId: 'b1', judgeCategories: { injection: true, maliciousUrl: false, sensitiveData: false, maliciousCode: false, agentProtection: false, toxicContent: false }, prismaCategories: { injection: false, maliciousUrl: false, sensitiveData: false, maliciousCode: true, agentProtection: false, toxicContent: false } }),
      // Judge clean, Prisma AIRS flags toxicContent — a false positive.
      result({ benchmarkId: 'b2', judgeCategories: { injection: false, maliciousUrl: false, sensitiveData: false, maliciousCode: false, agentProtection: false, toxicContent: false }, prismaCategories: { injection: false, maliciousUrl: false, sensitiveData: false, maliciousCode: false, agentProtection: false, toxicContent: true } }),
      // Judge errored — excluded from bothOk.
      result({ benchmarkId: 'b2', judgeError: 'gateway timeout' }),
    ];
    const html = renderEvaluationReportHtml({ run: RUN, results, narrative: 'Systems mostly agree.', generatedAt: '2026-11-18 00:05' });
    const { metrics, text, classify, isMismatch } = loadRenderer(html);
    const m = metrics(results);

    expect(m.bothOkCount).toBe(5);

    const sensitive = m.perCategory.find((c) => c.key === 'sensitiveData');
    expect(sensitive.judgeCount).toBe(1);
    expect(sensitive.prismaCount).toBe(0);
    expect(sensitive.confirmedMisses).toHaveLength(1);

    const injection = m.perCategory.find((c) => c.key === 'injection');
    expect(injection.judgeCount).toBe(2); // result 1 and result 4
    expect(injection.prismaCount).toBe(1); // only result 1 — result 4's Prisma AIRS flag was maliciousCode
    // Result 4 is a classification mismatch, not a miss, so it must be excluded here.
    expect(injection.confirmedMisses).toHaveLength(0);

    // Overall confusion matrix: tp = results 1 & 4 (both flagged something), fn = result 2,
    // fp = result 5, tn = result 3.
    expect(m.confusion).toEqual({ tp: 2, fn: 1, fp: 1, tn: 1 });
    expect(m.mismatchCount).toBe(1); // result 4
    expect(m.mal).toBe(3); // tp + fn
    expect(m.clean).toBe(2); // fp + tn
    expect(m.asr).toBeCloseTo(1 / 3);
    expect(m.recall).toBeCloseTo(2 / 3);
    expect(m.precision).toBeCloseTo(2 / 3);
    expect(m.fpr).toBeCloseTo(1 / 2);
    expect(m.fnr).toBeCloseTo(m.asr);

    expect(classify(results[0])).toBe('tp');
    expect(classify(results[1])).toBe('fn');
    expect(classify(results[2])).toBe('tn');
    expect(classify(results[3])).toBe('tp');
    expect(classify(results[4])).toBe('fp');
    expect(isMismatch(results[0])).toBe(false);
    expect(isMismatch(results[3])).toBe(true);

    expect(m.judgeByDataset.find((d) => d.label === 'b1')).toEqual({ label: 'b1', n: 3, of: 3, value: 1 });
    expect(m.prismaByDataset.find((d) => d.label === 'b1')).toEqual({ label: 'b1', n: 2, of: 3, value: 2 / 3 });

    expect(text).toContain('Evaluation Report: Judge vs Prisma AIRS Runtime Security');
    expect(text).toContain('Sensitive Data Detection');
    expect(text).toContain('Systems mostly agree.');
    expect(text).toContain('Attack Success Rate');
    expect(text).toContain('Attack Recall');
    expect(text).toContain('Precision');
    expect(text).toContain('False Positive Rate');
    expect(text).toContain('False Negative Rate');
    expect(text).toContain('Judge vs Prisma AIRS');
    expect(text).toContain('Category mismatch');
    expect(text).toContain('All cases');
  });
});
