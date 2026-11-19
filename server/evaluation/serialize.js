// Shared row -> API/report shape mapping, used by both the evaluations route (API responses)
// and the orchestrator (feeding the downloadable HTML report), so both stay in sync.
export function serializeResult(r) {
  return {
    id: r.id,
    runId: r.run_id,
    benchmarkId: r.benchmark_id,
    prompt: r.prompt,
    judgeCategories: r.judge_categories_json ? JSON.parse(r.judge_categories_json) : null,
    judgeReason: r.judge_reason,
    judgeLatencyMs: r.judge_latency_ms,
    judgeError: r.judge_error,
    prismaCategories: r.prisma_categories_json ? JSON.parse(r.prisma_categories_json) : null,
    prismaAction: r.prisma_action,
    prismaCategory: r.prisma_category,
    prismaLatencyMs: r.prisma_latency_ms,
    prismaError: r.prisma_error,
  };
}

export function serializeRun(r) {
  return { ...r, benchmarkIds: JSON.parse(r.benchmark_ids_json) };
}
