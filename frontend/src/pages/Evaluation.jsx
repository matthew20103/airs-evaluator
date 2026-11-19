import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

const CATEGORIES = [
  { key: 'injection', label: 'Prompt Injection Detection' },
  { key: 'maliciousUrl', label: 'Malicious URL Detection' },
  { key: 'sensitiveData', label: 'Sensitive Data Detection' },
  { key: 'maliciousCode', label: 'Malicious Code Detection' },
  { key: 'agentProtection', label: 'AI Agent Protection' },
  { key: 'toxicContent', label: 'Toxic Content Detection' },
];

function pct(n) {
  return n == null ? '–' : `${Math.round(n * 100)}%`;
}

function ms(n) {
  return n == null ? '–' : `${Math.round(n).toLocaleString()} ms`;
}

// A prompt counts as "flagged" by a side once it flags ANY of the 6 categories — used to tell a
// genuine miss (nothing flagged at all) apart from a mere category-classification mismatch
// (something was flagged, just not the same category the judge picked).
function anyCategory(categories) {
  return categories ? CATEGORIES.some(({ key }) => categories[key]) : false;
}

function computeMetrics(results) {
  const judged = results.filter((r) => r.judgeCategories);
  const prismaOk = results.filter((r) => r.prismaCategories);
  const bothOk = results.filter((r) => r.judgeCategories && r.prismaCategories);

  const perCategory = CATEGORIES.map(({ key, label }) => {
    const judgeDetected = bothOk.filter((r) => r.judgeCategories[key]);
    const prismaDetected = bothOk.filter((r) => r.prismaCategories[key]);
    const agree = bothOk.filter((r) => r.judgeCategories[key] === r.prismaCategories[key]);
    // A real miss: the judge flagged this category and Prisma AIRS flagged NOTHING on the prompt
    // at all. If Prisma AIRS flagged a different category instead, that's a classification
    // mismatch, not a miss.
    const confirmedMisses = bothOk.filter((r) => r.judgeCategories[key] && !r.prismaCategories[key] && !anyCategory(r.prismaCategories));
    return {
      key,
      label,
      judgeRate: bothOk.length ? judgeDetected.length / bothOk.length : null,
      judgeCount: judgeDetected.length,
      prismaRate: bothOk.length ? prismaDetected.length / bothOk.length : null,
      prismaCount: prismaDetected.length,
      agreementRate: bothOk.length ? agree.length / bothOk.length : null,
      confirmedMisses,
    };
  });

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const max = (arr) => (arr.length ? Math.max(...arr) : null);
  const judgeLatencies = judged.map((r) => r.judgeLatencyMs).filter((v) => v != null);
  const prismaLatencies = prismaOk.map((r) => r.prismaLatencyMs).filter((v) => v != null);

  // Overall (not per-category) confusion matrix: "attack" = judge flagged any category,
  // "flagged" = Prisma AIRS flagged any category, regardless of which one.
  const confusion = { tp: 0, fn: 0, fp: 0, tn: 0 };
  let mismatchCount = 0;
  for (const r of bothOk) {
    const judgeMal = anyCategory(r.judgeCategories);
    const prismaMal = anyCategory(r.prismaCategories);
    if (judgeMal && prismaMal) {
      confusion.tp++;
      if (CATEGORIES.some(({ key }) => !!r.judgeCategories[key] !== !!r.prismaCategories[key])) mismatchCount++;
    } else if (judgeMal && !prismaMal) confusion.fn++;
    else if (!judgeMal && prismaMal) confusion.fp++;
    else confusion.tn++;
  }
  const mal = confusion.tp + confusion.fn;
  const clean = confusion.fp + confusion.tn;
  const rate = (n, d) => (d ? n / d : null);

  return {
    total: results.length,
    judgedCount: judged.length,
    judgeErrors: results.filter((r) => r.judgeError).length,
    prismaCount: prismaOk.length,
    prismaErrors: results.filter((r) => r.prismaError).length,
    bothOkCount: bothOk.length,
    perCategory,
    judgeLatency: { avg: avg(judgeLatencies), max: max(judgeLatencies), n: judgeLatencies.length },
    prismaLatency: { avg: avg(prismaLatencies), max: max(prismaLatencies), n: prismaLatencies.length },
    confusion,
    mal,
    clean,
    mismatchCount,
    asr: rate(confusion.fn, mal),
    recall: rate(confusion.tp, mal),
    precision: rate(confusion.tp, confusion.tp + confusion.fp),
    fpr: rate(confusion.fp, clean),
    fnr: rate(confusion.fn, mal),
  };
}

function Tile({ label, value, detail }) {
  return (
    <div style={{ border: '1px solid #e4e2dd', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
      <div style={{ color: '#6f6e69', fontSize: 12 }}>{label}</div>
      {detail && <div style={{ color: '#9b9a95', fontSize: 11, marginTop: 2 }}>{detail}</div>}
    </div>
  );
}

function RunResults({ run }) {
  const m = computeMetrics(run.results);

  return (
    <div className="card">
      <h3>Run {run.id.slice(0, 8)} — comparison</h3>
      <p className="muted">
        judge model: {run.judge_model || 'unknown'} · {m.total} prompts · {m.bothOkCount} judged by both systems ·{' '}
        {m.judgeErrors} judge errors · {m.prismaErrors} Prisma AIRS errors
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
        <Tile label="Prompts screened" value={m.total.toLocaleString()} />
        <Tile label="Judge avg latency" value={ms(m.judgeLatency.avg)} detail={`${m.judgeLatency.n} calls`} />
        <Tile label="Judge max latency" value={ms(m.judgeLatency.max)} />
        <Tile label="Prisma AIRS avg latency" value={ms(m.prismaLatency.avg)} detail={`${m.prismaLatency.n} calls`} />
        <Tile label="Prisma AIRS max latency" value={ms(m.prismaLatency.max)} />
      </div>

      <h4>Judge vs Prisma AIRS — attack detection (overall)</h4>
      <p className="muted">
        Judge classification is treated as ground truth. "Flagged" means Prisma AIRS detected any of the 6
        categories on the prompt, regardless of which one. {m.mismatchCount} of {m.confusion.tp} mutual detections
        flagged a different category on each side — counted here as a catch, not a miss.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
        <Tile label="Attack Success Rate" value={pct(m.asr)} detail={`${m.confusion.fn}/${m.mal} attacks got past Prisma AIRS entirely`} />
        <Tile label="Attack Recall" value={pct(m.recall)} detail={`${m.confusion.tp}/${m.mal} attacks detected`} />
        <Tile label="Precision" value={pct(m.precision)} detail={`${m.confusion.tp}/${m.confusion.tp + m.confusion.fp} detections were real attacks`} />
        <Tile label="False Positive Rate" value={pct(m.fpr)} detail={`${m.confusion.fp}/${m.clean} clean prompts flagged`} />
        <Tile label="False Negative Rate" value={pct(m.fnr)} detail={`${m.confusion.fn}/${m.mal} attacks not flagged`} />
      </div>
      <table style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th></th>
            <th className="num">Prisma AIRS: flagged</th>
            <th className="num">Prisma AIRS: not flagged</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Judge: attack</th>
            <td className="num">{m.confusion.tp}</td>
            <td className="num">{m.confusion.fn}</td>
          </tr>
          <tr>
            <th>Judge: clean</th>
            <td className="num">{m.confusion.fp}</td>
            <td className="num">{m.confusion.tn}</td>
          </tr>
        </tbody>
      </table>

      <h4>Detection rate by category</h4>
      <p className="muted">Share of prompts (judged by both systems) where each detector flagged that category.</p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th className="num">Judge</th>
            <th className="num">Prisma AIRS</th>
            <th className="num">Agreement</th>
          </tr>
        </thead>
        <tbody>
          {m.perCategory.map((c) => (
            <tr key={c.key}>
              <td>{c.label}</td>
              <td className="num">{pct(c.judgeRate)} ({c.judgeCount}/{m.bothOkCount})</td>
              <td className="num">{pct(c.prismaRate)} ({c.prismaCount}/{m.bothOkCount})</td>
              <td className="num">{pct(c.agreementRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ marginTop: 16 }}>Confirmed misses (Judge flagged a category, Prisma AIRS detected nothing at all)</h4>
      <p className="muted">Cases where Prisma AIRS flagged a different category instead are not counted here — that's a classification mismatch, not a miss.</p>
      {m.perCategory.map((c) => (
        <details key={c.key} style={{ marginBottom: 8 }}>
          <summary>{c.label} — {c.confirmedMisses.length} confirmed miss{c.confirmedMisses.length === 1 ? '' : 'es'}</summary>
          {c.confirmedMisses.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Benchmark</th>
                  <th>Prompt</th>
                  <th>Judge reason</th>
                </tr>
              </thead>
              <tbody>
                {c.confirmedMisses.slice(0, 100).map((r) => (
                  <tr key={r.id}>
                    <td className="muted">{r.benchmarkId}</td>
                    <td>{r.prompt.length > 160 ? `${r.prompt.slice(0, 160)}…` : r.prompt}</td>
                    <td className="muted">{r.judgeReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {c.confirmedMisses.length > 100 && <p className="muted">Showing 100 of {c.confirmedMisses.length}.</p>}
        </details>
      ))}
    </div>
  );
}

export default function Evaluation() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [counts, setCounts] = useState({});
  const [selectedBenchmarks, setSelectedBenchmarks] = useState([]);
  const [maxConcurrency, setMaxConcurrency] = useState(2);
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  function refreshRuns() {
    api.getEvaluations().then(setRuns).catch((e) => setError(e.message));
  }

  function benchmarkName(id) {
    return benchmarks.find((b) => b.id === id)?.name || id;
  }

  useEffect(() => {
    api.getBenchmarks().then((rows) => {
      setBenchmarks(rows);
      for (const b of rows) {
        setCounts((c) => ({ ...c, [b.id]: { loading: true } }));
        api.getBenchmarkCount(b.id)
          .then((res) => setCounts((c) => ({ ...c, [b.id]: { count: res.count } })))
          .catch((e) => setCounts((c) => ({ ...c, [b.id]: { error: e.message } })));
      }
    });
    refreshRuns();
  }, []);

  useEffect(() => {
    const anyRunning = runs.some((r) => r.status === 'pending' || r.status === 'running');
    if (anyRunning && !pollRef.current) {
      pollRef.current = setInterval(refreshRuns, 2000);
    } else if (!anyRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [runs]);

  useEffect(() => {
    if (!selectedRunId) return setSelectedRun(null);
    api.getEvaluation(selectedRunId).then(setSelectedRun).catch((e) => setError(e.message));
  }, [selectedRunId, runs]);

  function toggleBenchmark(id) {
    setSelectedBenchmarks((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleDeleteRun(id) {
    if (!window.confirm('Delete this run? Its report, results, and history entry will all be removed permanently.')) return;
    try {
      await api.deleteEvaluationRun(id);
      if (selectedRunId === id) setSelectedRunId(null);
      refreshRuns();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStart(e) {
    e.preventDefault();
    setError(null);
    try {
      const { id } = await api.startEvaluation(selectedBenchmarks, maxConcurrency ? Number(maxConcurrency) : null);
      setSelectedRunId(id);
      refreshRuns();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Evaluation: Judge vs Prisma AIRS Runtime Security</h2>
      <p className="muted">
        Sends the same benchmark prompts to both the Judge Agent and Prisma AIRS Runtime Security, and compares how
        each one categorizes them. Configure both under LLM Config first.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Run an evaluation</h3>
        {benchmarks.length === 0 && <p className="muted">No benchmarks available.</p>}
        <form onSubmit={handleStart}>
          <label>
            Benchmarks
            {' — '}
            <span className="muted">
              {selectedBenchmarks.reduce((sum, id) => sum + (counts[id]?.count ?? 0), 0).toLocaleString()} prompts selected
            </span>
          </label>
          {benchmarks.map((b) => {
            const c = counts[b.id];
            return (
              <div key={b.id}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={selectedBenchmarks.includes(b.id)}
                    onChange={() => toggleBenchmark(b.id)}
                  />
                  {b.name}
                  <span className="muted">
                    {!c && '…'}
                    {c?.loading && '…'}
                    {c && 'count' in c && `(${c.count.toLocaleString()} prompts)`}
                    {c?.error && <span className="error" title={c.error}>count unavailable</span>}
                  </span>
                </label>
              </div>
            );
          })}

          <label>Max concurrent prompts</label>
          <input
            type="number"
            min="1"
            step="1"
            value={maxConcurrency}
            onChange={(e) => setMaxConcurrency(e.target.value)}
            style={{ maxWidth: 160 }}
          />

          <button className="primary" type="submit" disabled={selectedBenchmarks.length === 0}>
            Start evaluation
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Run history</h3>
        {runs.length === 0 && <p className="muted">No evaluation runs yet.</p>}
        {runs.map((r) => {
          const p = r.total ? Math.round((r.completed / r.total) * 100) : 0;
          return (
            <div key={r.id} style={{ marginBottom: 12 }}>
              <div>
                <button onClick={() => setSelectedRunId(r.id)} style={{ fontWeight: selectedRunId === r.id ? 'bold' : 'normal' }}>
                  {r.id.slice(0, 8)}
                </button>{' '}
                — {r.status} ({r.completed}/{r.total})
                {' · '}
                <span className="muted">judge model: {r.judge_model || 'unknown'}</span>
                {' · '}
                <span className="muted">max concurrent: {r.max_concurrency || 1}</span>
                {' · '}
                <span className="muted">
                  benchmarks: {(r.benchmarkIds || []).map(benchmarkName).join(', ') || '–'}
                </span>
                {r.status === 'completed' && r.reportAvailable && (
                  <>
                    {' · '}
                    <a href={api.evaluationReportUrl(r.id)} target="_blank" rel="noreferrer">
                      Download HTML report
                    </a>
                  </>
                )}
                {r.status === 'completed' && !r.reportAvailable && (
                  <>
                    {' · '}
                    <span className="muted">(no report available)</span>
                  </>
                )}
                {(r.status === 'completed' || r.status === 'failed') && (
                  <>
                    {' · '}
                    <button onClick={() => handleDeleteRun(r.id)}>Delete run</button>
                  </>
                )}
              </div>
              <div className="progress">
                <div className="progress-fill" style={{ width: `${p}%` }} />
              </div>
              {r.error && <div className="error">{r.error}</div>}
            </div>
          );
        })}
      </div>

      {selectedRun && selectedRun.status === 'completed' && <RunResults run={selectedRun} />}
      {selectedRun && selectedRun.status !== 'completed' && (
        <p className="muted">Run {selectedRun.id.slice(0, 8)} is {selectedRun.status} — results will appear once it completes.</p>
      )}
    </div>
  );
}
