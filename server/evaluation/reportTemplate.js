// Self-contained HTML report shell for an Evaluation run: static head/footer + one inline JSON
// data blob + a small dependency-free vanilla-JS renderer (hand-rolled CSS bar chart/histogram,
// no chart lib) — same "offline file, no network access" structure as the Lakera samples in
// data/*.html. Compares the Judge Agent's category classification against Prisma AIRS Runtime
// Security's detection on the same prompts; the numbers here match the in-app Evaluation page
// exactly (same computeMetrics logic, just in vanilla JS for an offline file).

const CATEGORIES_JS = `[
  { key: 'injection', label: 'Prompt Injection Detection' },
  { key: 'maliciousUrl', label: 'Malicious URL Detection' },
  { key: 'sensitiveData', label: 'Sensitive Data Detection' },
  { key: 'maliciousCode', label: 'Malicious Code Detection' },
  { key: 'agentProtection', label: 'AI Agent Protection' },
  { key: 'toxicContent', label: 'Toxic Content Detection' },
]`;

const RENDERER_JS = `
const CATEGORIES = ${CATEGORIES_JS};

function h(tag, cls, ...kids) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const k of kids) {
    if (k == null) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

function pct(n) { return n == null ? '–' : (n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0) + '%'; }
function ms(n) { return n == null ? '—' : Math.round(n).toLocaleString() + ' ms'; }
function short(s, n) { return !s ? '' : (s.length > n ? s.slice(0, n) + '…' : s); }

function tile(label, value, detail) {
  return h('div', 'tile', h('div', 'v', value), h('div', 'l', label), detail ? h('div', 'd', detail) : null);
}

function bars(rows) {
  if (!rows.length) return h('div', 'muted', 'No data to chart.');
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  return h('div', 'bars', ...rows.map((r) => {
    const fill = h('div', 'bar-fill');
    fill.style.width = ((r.value || 0) / max * 100) + '%';
    return h('div', 'bar-row',
      h('div', 'bar-label', r.label),
      h('div', 'bar-track', fill),
      h('div', 'bar-value', pct(r.value) + ' (' + r.n + '/' + r.of + ')'));
  }));
}

// Horizontal bars (same row layout as the rate-based bars() above, just count-based rather
// than percentage-based) so every bucket's ms range and case count are always legible text,
// not just a hover tooltip on a column — and the bar width/row height never overflows its card.
function countBars(rows) {
  if (!rows.length) return h('div', 'muted', 'No data to chart.');
  const max = Math.max(1, ...rows.map((r) => r.n || 0));
  return h('div', 'bars', ...rows.map((r) => {
    const fill = h('div', 'bar-fill');
    fill.style.width = ((r.n || 0) / max * 100) + '%';
    return h('div', 'bar-row',
      h('div', 'bar-label', r.label),
      h('div', 'bar-track', fill),
      h('div', 'bar-value', r.n + (r.n === 1 ? ' case' : ' cases')));
  }));
}

function histogram(values, title) {
  if (!values.length) return h('div', null, h('h4', null, title), h('div', 'muted', 'No latency data to chart.'));
  const buckets = 8;
  const top = Math.max(...values, 1);
  const step = top / buckets || 1;
  const counts = new Array(buckets).fill(0);
  for (const v of values) counts[Math.min(buckets - 1, Math.floor(v / step))]++;
  const rows = counts.map((c, i) => ({
    label: Math.round(i * step).toLocaleString() + '–' + Math.round((i + 1) * step).toLocaleString() + ' ms',
    n: c,
  }));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return h('div', null, h('h4', null, title), countBars(rows),
    h('div', 'muted', 'Avg ' + ms(avg) + ' · max ' + ms(Math.max(...values)) + ' · ' + values.length + ' calls.'));
}

function caseRow(r, i) {
  const pill = (ok, labelOk, labelBad, labelNull) =>
    h('span', 'pill ' + (ok == null ? 'warn' : ok ? 'good' : 'bad'), ok == null ? labelNull : ok ? labelOk : labelBad);

  const judgeCell = r.judgeCategories
    ? h('div', null, Object.entries(r.judgeCategories).filter(([, v]) => v).map(([k]) => (CATEGORIES.find((c) => c.key === k) || {}).label || k).join(', ') || h('span', 'muted', 'none'))
    : h('span', 'muted', r.judgeError || 'not judged');
  const prismaCell = r.prismaCategories
    ? h('div', null, Object.entries(r.prismaCategories).filter(([, v]) => v).map(([k]) => (CATEGORIES.find((c) => c.key === k) || {}).label || k).join(', ') || h('span', 'muted', 'none'))
    : h('span', 'muted', r.prismaError || 'not scanned');

  const details = h('details', null,
    h('summary', null, short(r.prompt, 160)),
    h('div', 'kv', h('b', null, 'Prompt'), h('pre', null, r.prompt)),
    h('div', 'kv', h('b', null, 'Judge reason'), h('pre', null, r.judgeReason || '(none)')),
    h('div', 'kv', h('b', null, 'Prisma AIRS action/category'), h('pre', null, (r.prismaAction || '–') + ' / ' + (r.prismaCategory || '–'))));

  return h('tr', null,
    h('td', 'num', i + 1),
    h('td', 'src', r.benchmarkId),
    h('td', 'p', details),
    h('td', null, judgeCell, h('div', 'muted', ms(r.judgeLatencyMs))),
    h('td', null, prismaCell, h('div', 'muted', ms(r.prismaLatencyMs))));
}

function confusionTable(c) {
  const cell = (n, label, cls) => h('td', 'num' + (cls ? ' ' + cls : ''), h('b', null, n), h('div', 'muted', label));
  return h('div', 'tw', h('table', 'cm',
    h('thead', null, h('tr', null, h('th'), h('th', 'num', 'Prisma AIRS: flagged'), h('th', 'num', 'Prisma AIRS: not flagged'))),
    h('tbody', null,
      h('tr', null, h('th', null, 'Judge: attack'), cell(c.tp, 'true positive'), cell(c.fn, 'confirmed miss', 'warn')),
      h('tr', null, h('th', null, 'Judge: clean'), cell(c.fp, 'false positive', 'warn'), cell(c.tn, 'true negative')))));
}

function caseTable(rows, limit) {
  const table = h('table', null,
    h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, 'Benchmark'), h('th', null, 'Prompt'), h('th', null, 'Judge'), h('th', null, 'Prisma AIRS'))),
    h('tbody', null, ...rows.slice(0, limit).map((r, i) => caseRow(r, i))));
  return h('div', null, h('div', 'tw', table), rows.length > limit ? h('div', 'muted', 'Showing ' + limit + ' of ' + rows.length + '.') : null);
}

// A prompt counts as "flagged" by a side once it flags ANY of the 6 categories — used to tell a
// genuine miss (nothing flagged at all) apart from a mere category-classification mismatch
// (something was flagged, just not the same category the judge picked).
function anyCat(cats) { return !!cats && CATEGORIES.some((c) => cats[c.key]); }

// Overall attack/clean classification per prompt, judge-as-ground-truth, Prisma AIRS as the
// detector under test. 'tp'/'fp'/'fn'/'tn' drive the confusion matrix and headline rates below.
function classify(r) {
  if (!r.judgeCategories || !r.prismaCategories) return 'error';
  const judgeMal = anyCat(r.judgeCategories), prismaMal = anyCat(r.prismaCategories);
  if (judgeMal && prismaMal) return 'tp';
  if (judgeMal && !prismaMal) return 'fn';
  if (!judgeMal && prismaMal) return 'fp';
  return 'tn';
}

// A "true positive" where the two sides nonetheless flagged a different set of categories —
// Prisma AIRS caught the prompt, it just filed it under a different category than the judge did.
function isMismatch(r) {
  if (classify(r) !== 'tp') return false;
  return CATEGORIES.some((c) => !!r.judgeCategories[c.key] !== !!r.prismaCategories[c.key]);
}

function metrics(results) {
  const judgeOk = results.filter((r) => r.judgeCategories);
  const prismaOk = results.filter((r) => r.prismaCategories);
  const bothOk = results.filter((r) => r.judgeCategories && r.prismaCategories);
  const rate = (n, d) => (d ? n / d : null);

  const perCategory = CATEGORIES.map(({ key, label }) => {
    const judgeDetected = bothOk.filter((r) => r.judgeCategories[key]);
    const prismaDetected = bothOk.filter((r) => r.prismaCategories[key]);
    const agree = bothOk.filter((r) => r.judgeCategories[key] === r.prismaCategories[key]);
    // A real miss: the judge flagged this category and Prisma AIRS flagged NOTHING on the prompt
    // at all. If Prisma AIRS flagged a different category instead, that's a classification
    // mismatch, not a miss — it's excluded here and surfaced via the "Category mismatch" filter
    // in the All cases table instead.
    const confirmedMisses = bothOk.filter((r) => r.judgeCategories[key] && !r.prismaCategories[key] && !anyCat(r.prismaCategories));
    return {
      key, label,
      judgeRate: rate(judgeDetected.length, bothOk.length), judgeCount: judgeDetected.length,
      prismaRate: rate(prismaDetected.length, bothOk.length), prismaCount: prismaDetected.length,
      agreementRate: rate(agree.length, bothOk.length),
      confirmedMisses,
    };
  });

  const byDataset = {};
  for (const r of bothOk) {
    byDataset[r.benchmarkId] ??= { total: 0, judge: 0, prisma: 0 };
    byDataset[r.benchmarkId].total++;
    if (CATEGORIES.some((c) => r.judgeCategories[c.key])) byDataset[r.benchmarkId].judge++;
    if (CATEGORIES.some((c) => r.prismaCategories[c.key])) byDataset[r.benchmarkId].prisma++;
  }
  const judgeByDataset = Object.entries(byDataset).map(([label, v]) => ({ label, n: v.judge, of: v.total, value: rate(v.judge, v.total) }));
  const prismaByDataset = Object.entries(byDataset).map(([label, v]) => ({ label, n: v.prisma, of: v.total, value: rate(v.prisma, v.total) }));

  const judgeLatencies = judgeOk.map((r) => r.judgeLatencyMs).filter((v) => v != null);
  const prismaLatencies = prismaOk.map((r) => r.prismaLatencyMs).filter((v) => v != null);
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  // Overall (not per-category) confusion matrix: "attack" = judge flagged any category,
  // "flagged" = Prisma AIRS flagged any category, regardless of which one.
  const confusion = { tp: 0, fn: 0, fp: 0, tn: 0 };
  let mismatchCount = 0;
  for (const r of bothOk) {
    confusion[classify(r)]++;
    if (isMismatch(r)) mismatchCount++;
  }
  const mal = confusion.tp + confusion.fn;
  const clean = confusion.fp + confusion.tn;

  return {
    total: results.length,
    judgedCount: judgeOk.length, judgeErrors: results.filter((r) => r.judgeError).length,
    prismaCount: prismaOk.length, prismaErrors: results.filter((r) => r.prismaError).length,
    bothOkCount: bothOk.length,
    perCategory, judgeByDataset, prismaByDataset,
    judgeLatency: { avg: avg(judgeLatencies), max: judgeLatencies.length ? Math.max(...judgeLatencies) : null, n: judgeLatencies.length, values: judgeLatencies },
    prismaLatency: { avg: avg(prismaLatencies), max: prismaLatencies.length ? Math.max(...prismaLatencies) : null, n: prismaLatencies.length, values: prismaLatencies },
    confusion, mal, clean, mismatchCount,
    asr: rate(confusion.fn, mal), recall: rate(confusion.tp, mal),
    precision: rate(confusion.tp, confusion.tp + confusion.fp), fpr: rate(confusion.fp, clean), fnr: rate(confusion.fn, mal),
  };
}

function render(root, data) {
  const { run, results } = data;
  const m = metrics(results);

  const wrap = h('div', 'rpt');
  wrap.append(
    h('h2', null, 'Evaluation Report: Judge vs Prisma AIRS Runtime Security'),
    h('div', 'sub', 'Run ' + run.id + ' · ' + (run.started_at || '') + ' · judge model: ' + (run.judge_model || 'unknown') +
      ' · max concurrent: ' + (run.max_concurrency || 1) + ' · benchmarks: ' + (run.benchmarkIds || []).join(', ')),
    h('div', 'tiles',
      tile('Prompts screened', m.total.toLocaleString(), m.bothOkCount + ' judged by both systems'),
      tile('Judge errors', m.judgeErrors, m.judgedCount + ' judged ok'),
      tile('Prisma AIRS errors', m.prismaErrors, m.prismaCount + ' scanned ok'),
      tile('Judge avg/max latency', ms(m.judgeLatency.avg) + ' / ' + ms(m.judgeLatency.max)),
      tile('Prisma AIRS avg/max latency', ms(m.prismaLatency.avg) + ' / ' + ms(m.prismaLatency.max))));

  wrap.append(h('div', 'tiles',
    tile('Attack Success Rate', pct(m.asr), m.confusion.fn + ' of ' + m.mal + ' judge-confirmed attacks got past Prisma AIRS entirely'),
    tile('Attack Recall', pct(m.recall), m.confusion.tp + ' of ' + m.mal + ' judge-confirmed attacks detected by Prisma AIRS'),
    tile('Precision', pct(m.precision), m.confusion.tp + ' of ' + (m.confusion.tp + m.confusion.fp) + ' Prisma AIRS detections were judge-confirmed attacks'),
    tile('False Positive Rate', pct(m.fpr), m.confusion.fp + ' of ' + m.clean + ' judge-clean prompts flagged by Prisma AIRS'),
    tile('False Negative Rate', pct(m.fnr), m.confusion.fn + ' of ' + m.mal + ' judge-confirmed attacks not flagged by Prisma AIRS')));

  wrap.append(h('div', 'card',
    h('h3', null, 'Judge vs Prisma AIRS'),
    h('p', 'sub', 'Judge classification is treated as ground truth. "Flagged" = Prisma AIRS detected any of the 6 categories on the prompt, regardless of which one. ' +
      m.mismatchCount + ' of ' + m.confusion.tp + ' mutual detections flagged a different category on each side — counted here as a catch, not a miss.'),
    confusionTable(m.confusion)));

  if (data.narrative) wrap.append(h('div', 'card note', h('b', null, 'Summary: '), data.narrative));

  wrap.append(h('div', 'card',
    h('h3', null, 'Detection rate by category'),
    h('p', 'sub', 'Share of prompts (judged by both systems) where each detector flagged that category'),
    h('div', 'tw',
      h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Category'), h('th', 'num', 'Judge'), h('th', 'num', 'Prisma AIRS'), h('th', 'num', 'Agreement'))),
        h('tbody', null, ...m.perCategory.map((c) => h('tr', null,
          h('td', null, c.label),
          h('td', 'num', pct(c.judgeRate) + ' (' + c.judgeCount + '/' + m.bothOkCount + ')'),
          h('td', 'num', pct(c.prismaRate) + ' (' + c.prismaCount + '/' + m.bothOkCount + ')'),
          h('td', 'num', pct(c.agreementRate)))))))));

  wrap.append(h('div', 'card',
    h('h3', null, 'Confirmed misses (Judge flagged a category, Prisma AIRS detected nothing at all)'),
    h('p', 'sub', 'Cases where Prisma AIRS flagged a different category instead are not counted here — see "Category mismatch" in All cases below.'),
    ...m.perCategory.map((c) => h('details', null,
      h('summary', null, c.label + ' — ' + c.confirmedMisses.length + ' confirmed miss' + (c.confirmedMisses.length === 1 ? '' : 'es')),
      c.confirmedMisses.length ? caseTable(c.confirmedMisses, 200) : h('div', 'muted', 'None.')))));

  wrap.append(h('div', 'two',
    h('div', 'card', h('h3', null, 'Detection rate by dataset — Judge'), bars(m.judgeByDataset)),
    h('div', 'card', h('h3', null, 'Detection rate by dataset — Prisma AIRS'), bars(m.prismaByDataset))));

  wrap.append(h('div', 'two',
    h('div', 'card', histogram(m.judgeLatency.values, 'Judge latency')),
    h('div', 'card', histogram(m.prismaLatency.values, 'Prisma AIRS latency'))));

  // All cases, with filters.
  const sources = [...new Set(results.map((r) => r.benchmarkId))];
  const fStatus = h('select'), fCategory = h('select'), fSource = h('select'), fText = h('input');
  const STATUS_OPTIONS = [
    ['', 'All'],
    ['tp', 'True positive (both flagged)'],
    ['mismatch', 'Category mismatch (both flagged, different category)'],
    ['fn', 'Confirmed miss (Judge flagged, Prisma AIRS missed entirely)'],
    ['fp', 'False positive (Prisma AIRS flagged, Judge clean)'],
    ['tn', 'True negative (both clean)'],
    ['error', 'Errors'],
  ];
  for (const [v, t] of STATUS_OPTIONS) { const o = h('option', null, t); o.value = v; fStatus.append(o); }
  const oAllCat = h('option', null, 'All categories'); oAllCat.value = ''; fCategory.append(oAllCat);
  for (const c of CATEGORIES) { const o = h('option', null, c.label); o.value = c.key; fCategory.append(o); }
  const oAllSrc = h('option', null, 'All benchmarks'); oAllSrc.value = ''; fSource.append(oAllSrc);
  for (const s of sources) { const o = h('option', null, s); o.value = s; fSource.append(o); }
  fText.placeholder = 'Search prompts';
  fText.setAttribute('aria-label', 'Search prompts');

  const out = h('div');
  const refilter = () => {
    const q = (fText.value || '').toLowerCase();
    const list = results.filter((r) => {
      if (fSource.value && r.benchmarkId !== fSource.value) return false;
      if (q && !(r.prompt || '').toLowerCase().includes(q)) return false;
      if (fCategory.value && !((r.judgeCategories && r.judgeCategories[fCategory.value]) || (r.prismaCategories && r.prismaCategories[fCategory.value]))) return false;
      if (fStatus.value === 'mismatch') return isMismatch(r);
      if (fStatus.value) return classify(r) === fStatus.value;
      return true;
    });
    out.replaceChildren(caseTable(list, 500));
  };
  for (const c of [fStatus, fCategory, fSource]) c.addEventListener('change', refilter);
  fText.addEventListener('input', refilter);
  refilter();

  wrap.append(h('div', 'card', h('h3', null, 'All cases · ' + m.total),
    h('div', 'filters',
      h('label', null, 'Status', fStatus),
      h('label', null, 'Category', fCategory),
      h('label', null, 'Benchmark', fSource),
      h('label', null, 'Search', fText)),
    out));

  root.append(wrap);
}

window.AirsEvaluatorReport = { render, metrics };
`;

const STYLE = `
body{font:14px/1.5 system-ui,sans-serif;color:#1c1b1a;background:#fff;margin:0}
.wrap{max-width:1000px;margin:0 auto;padding:24px 16px}
footer{max-width:1000px;margin:8px auto 24px;padding:0 16px;font:12px system-ui,sans-serif;color:#6f6e69}
.rpt h2{margin:0 0 4px}
.rpt h3{font-size:14px;margin:0 0 2px}
.rpt h4{font-size:13px;margin:12px 0 2px}
.rpt .sub{color:#6f6e69;margin-bottom:16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.tile{border:1px solid #e4e2dd;border-radius:8px;padding:12px}
.tile .v{font-size:20px;font-weight:600}
.tile .l{color:#6f6e69;font-size:12px}
.tile .d{color:#9b9a95;font-size:11px;margin-top:2px}
.card{border:1px solid #e4e2dd;border-radius:8px;padding:16px;margin-bottom:16px}
.card.note{background:#fdf6ec}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-bottom:16px}
.two .card{margin-bottom:0}
.bars .bar-row{display:grid;grid-template-columns:160px 1fr 110px;align-items:center;gap:8px;margin:4px 0}
.bar-track{background:#f1f0ec;border-radius:4px;height:10px;overflow:hidden}
.bar-fill{background:#c75146;height:100%}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top}
td.num,th.num{text-align:right;white-space:nowrap}
.tw{overflow-x:auto}
.pill{padding:2px 8px;border-radius:999px;font-size:12px;white-space:nowrap}
.pill.bad{background:#fbe7e5;color:#9b2b22}
.pill.good{background:#e6f4ea;color:#1e7b34}
.pill.warn{background:#fff3cd;color:#8a6500}
pre{white-space:pre-wrap;word-break:break-word;background:#faf9f7;padding:8px;border-radius:4px}
.muted{color:#9b9a95;font-size:12px;margin-bottom:8px}
table.cm td{font-size:16px}
table.cm th{font-size:12px;color:#6f6e69;font-weight:normal}
table.cm td.warn b{color:#c75146}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-bottom:8px}
.filters label{display:flex;flex-direction:column;gap:2px;font-size:12px;color:#6f6e69}
.filters select,.filters input{font:inherit;padding:5px 8px;border:1px solid #c3c2b7;border-radius:6px}
`;

export function renderEvaluationReportHtml({ run, results, narrative, generatedAt }) {
  const payload = JSON.stringify({ run, results, narrative });
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evaluation Report: Judge vs Prisma AIRS Runtime Security</title>
<style>${STYLE}</style>
</head><body>
<div class="wrap" id="root"><noscript>This report needs JavaScript to render.</noscript></div>
<footer>Exported from Prisma AIRS Runtime Security Evaluator · ${generatedAt} UTC · offline file, no network access needed</footer>
<script type="application/json" id="run-data">${payload}</script>
<script>${RENDERER_JS}</script>
<script>window.AirsEvaluatorReport.render(document.getElementById("root"), JSON.parse(document.getElementById("run-data").textContent));</script>
</body></html>`;
}
