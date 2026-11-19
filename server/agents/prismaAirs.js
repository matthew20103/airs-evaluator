import { getSetting } from '../db/index.js';

// Same 6 keys used by judge.js's classifyPrompt(), mapped from Prisma AIRS's
// `prompt_detected` object (per the Prisma AIRS Runtime Security API reference) so the two
// detectors' outputs are directly comparable.
function mapCategories(promptDetected = {}) {
  return {
    injection: Boolean(promptDetected.injection),
    maliciousUrl: Boolean(promptDetected.url_cats),
    sensitiveData: Boolean(promptDetected.dlp),
    maliciousCode: Boolean(promptDetected.malicious_code),
    agentProtection: Boolean(promptDetected.agent),
    toxicContent: Boolean(promptDetected.toxic_content),
  };
}

export function getPrismaAirsConfig() {
  return {
    url: getSetting('prisma_airs_url'),
    method: getSetting('prisma_airs_method') || 'POST',
    headerName: getSetting('prisma_airs_header_name') || 'x-pan-token',
    headerValue: getSetting('prisma_airs_header_value'),
    profileName: getSetting('prisma_airs_profile_name'),
  };
}

export async function scanWithPrismaAirs(prompt) {
  const cfg = getPrismaAirsConfig();
  if (!cfg.url || !cfg.headerValue || !cfg.profileName) {
    throw new Error('Prisma AIRS is not configured yet — set the API URL, auth header value, and profile name in LLM Config first.');
  }

  const started = Date.now();
  const res = await fetch(cfg.url, {
    method: cfg.method,
    headers: { 'Content-Type': 'application/json', [cfg.headerName]: cfg.headerValue },
    body: JSON.stringify({ ai_profile: { profile_name: cfg.profileName }, contents: [{ prompt }] }),
  });
  const latencyMs = Date.now() - started;
  const body = await res.json().catch(() => null);

  if (!res.ok || !body) {
    return { categories: null, action: null, category: null, raw: body, latencyMs, error: `Prisma AIRS returned HTTP ${res.status}` };
  }
  if (body.error) {
    return { categories: null, action: body.action ?? null, category: body.category ?? null, raw: body, latencyMs, error: `Prisma AIRS reported an error: ${JSON.stringify(body.errors ?? [])}` };
  }

  return {
    categories: mapCategories(body.prompt_detected),
    action: body.action ?? null,
    category: body.category ?? null,
    raw: body,
    latencyMs,
    error: null,
  };
}
