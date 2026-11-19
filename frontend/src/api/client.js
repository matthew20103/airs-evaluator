async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getBenchmarks: () => request('/benchmarks'),
  addBenchmark: (data) => request('/benchmarks', { method: 'POST', body: JSON.stringify(data) }),
  deleteBenchmark: (id) => request(`/benchmarks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getBenchmarkCount: (id) => request(`/benchmarks/${encodeURIComponent(id)}/count`),

  getLlmConfig: () => request('/llm-config'),
  setLlmConfig: (role, model) => request(`/llm-config/${role}`, { method: 'PUT', body: JSON.stringify({ model }) }),
  testLlmConfig: (role) => request(`/llm-config/${role}/test`, { method: 'POST' }),

  getSettings: () => request('/settings'),
  setSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  testPrismaAirs: () => request('/settings/test-prisma-airs', { method: 'POST' }),

  getEvaluations: () => request('/evaluations'),
  getEvaluation: (id) => request(`/evaluations/${id}`),
  startEvaluation: (benchmarkIds, maxConcurrency) =>
    request('/evaluations', { method: 'POST', body: JSON.stringify({ benchmarkIds, maxConcurrency }) }),
  evaluationReportUrl: (id) => `/api/evaluations/${id}/report`,
  // Deletes the whole run: its report file, its per-prompt results, and the run record itself.
  deleteEvaluationRun: (id) => request(`/evaluations/${id}/report`, { method: 'DELETE' }),
};
