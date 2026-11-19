import OpenAI from 'openai';
import { db, getSetting } from '../db/index.js';

let client;
let clientConfigKey;

function getClient() {
  const baseURL = getSetting('gateway_base_url');
  const apiKey = getSetting('gateway_api_key');
  if (!baseURL || !apiKey) {
    throw new Error('AI Gateway is not configured yet — set the base URL and API key in LLM Config first.');
  }

  const configKey = `${baseURL}::${apiKey}`;
  if (!client || clientConfigKey !== configKey) {
    // Resolve fetch dynamically (rather than passing a captured reference) so tests
    // can stub globalThis.fetch after this module has already been imported.
    client = new OpenAI({ baseURL, apiKey, fetch: (...args) => globalThis.fetch(...args) });
    clientConfigKey = configKey;
  }
  return client;
}

export function getModelForRole(role) {
  const row = db.prepare('SELECT model FROM llm_config WHERE role = ?').get(role);
  if (!row?.model) throw new Error(`No model configured for role "${role}" — set it in LLM Config first.`);
  return row.model;
}

export async function chat(role, messages, options = {}) {
  const model = getModelForRole(role);
  const response = await getClient().chat.completions.create({
    model,
    messages,
    ...options,
  });
  return response.choices[0]?.message?.content ?? '';
}
