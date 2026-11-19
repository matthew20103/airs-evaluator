import { Router } from 'express';
import { getSetting, setSetting } from '../db/index.js';
import { scanWithPrismaAirs } from '../agents/prismaAirs.js';

export const router = Router();

router.get('/', (req, res) => {
  const gatewayBaseUrl = getSetting('gateway_base_url');
  const gatewayApiKey = getSetting('gateway_api_key');
  const prismaAirsHeaderValue = getSetting('prisma_airs_header_value');
  res.json({
    gatewayBaseUrl,
    gatewayApiKeySet: Boolean(gatewayApiKey),
    gatewayApiKeyPreview: gatewayApiKey ? `••••${gatewayApiKey.slice(-4)}` : '',
    prismaAirsUrl: getSetting('prisma_airs_url'),
    prismaAirsMethod: getSetting('prisma_airs_method'),
    prismaAirsHeaderName: getSetting('prisma_airs_header_name'),
    prismaAirsHeaderValueSet: Boolean(prismaAirsHeaderValue),
    prismaAirsHeaderValuePreview: prismaAirsHeaderValue ? `••••${prismaAirsHeaderValue.slice(-4)}` : '',
    prismaAirsProfileName: getSetting('prisma_airs_profile_name'),
  });
});

router.put('/', (req, res) => {
  const { gatewayBaseUrl, gatewayApiKey, prismaAirsUrl, prismaAirsMethod, prismaAirsHeaderName, prismaAirsHeaderValue, prismaAirsProfileName } = req.body;
  if (typeof gatewayBaseUrl === 'string') {
    setSetting('gateway_base_url', gatewayBaseUrl);
  }
  // Only overwrite the key if a new non-empty value was submitted, so re-saving the
  // base URL (with the key field left blank in the UI) doesn't wipe out the stored key.
  if (typeof gatewayApiKey === 'string' && gatewayApiKey.length > 0) {
    setSetting('gateway_api_key', gatewayApiKey);
  }
  if (typeof prismaAirsUrl === 'string') setSetting('prisma_airs_url', prismaAirsUrl);
  if (typeof prismaAirsMethod === 'string') setSetting('prisma_airs_method', prismaAirsMethod);
  if (typeof prismaAirsHeaderName === 'string') setSetting('prisma_airs_header_name', prismaAirsHeaderName);
  if (typeof prismaAirsHeaderValue === 'string' && prismaAirsHeaderValue.length > 0) {
    setSetting('prisma_airs_header_value', prismaAirsHeaderValue);
  }
  if (typeof prismaAirsProfileName === 'string') setSetting('prisma_airs_profile_name', prismaAirsProfileName);
  res.json({ ok: true });
});

router.post('/test-prisma-airs', async (req, res) => {
  try {
    const result = await scanWithPrismaAirs('This is a harmless test prompt to confirm Prisma AIRS connectivity.');
    if (result.error) {
      return res.json({ ok: false, error: result.error, latencyMs: result.latencyMs });
    }
    res.json({ ok: true, action: result.action, category: result.category, latencyMs: result.latencyMs });
  } catch (err) {
    res.json({ ok: false, error: err.message, latencyMs: 0 });
  }
});
