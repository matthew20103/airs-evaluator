import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

function hfUrl(repo) {
  return `https://huggingface.co/datasets/${repo}`;
}

export default function Benchmarks() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState(null);

  function refresh() {
    api.getBenchmarks()
      .then((rows) => {
        setBenchmarks(rows);
        for (const b of rows) {
          setCounts((c) => ({ ...c, [b.id]: { loading: true } }));
          api.getBenchmarkCount(b.id)
            .then((res) => setCounts((c) => ({ ...c, [b.id]: { count: res.count } })))
            .catch((e) => setCounts((c) => ({ ...c, [b.id]: { error: e.message } })));
        }
      })
      .catch((e) => setError(e.message));
  }

  useEffect(refresh, []);

  async function handleDelete(id) {
    await api.deleteBenchmark(id);
    refresh();
  }

  return (
    <div>
      <h2>Benchmarks</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th className="num">Prompts</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((b) => {
              const c = counts[b.id];
              return (
                <tr key={b.id}>
                  <td>
                    <div>{b.name}</div>
                    {b.description && <div className="muted" style={{ marginTop: 2, maxWidth: 480 }}>{b.description}</div>}
                  </td>
                  <td className="muted">
                    {b.source.repo ? (
                      <a href={hfUrl(b.source.repo)} target="_blank" rel="noreferrer">
                        {b.source.repo}
                      </a>
                    ) : (
                      b.source.repo
                    )}
                  </td>
                  <td className="num">
                    {!c && '…'}
                    {c?.loading && '…'}
                    {c && 'count' in c && c.count.toLocaleString()}
                    {c?.error && <span className="error" title={c.error}>error</span>}
                  </td>
                  <td>
                    <button onClick={() => handleDelete(b.id)}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
