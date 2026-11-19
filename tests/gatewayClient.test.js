import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../server/db/index.js';
import { getModelForRole, chat } from '../server/gateway/client.js';

describe('getModelForRole', () => {
  beforeEach(() => {
    db.exec("DELETE FROM llm_config");
  });

  it('throws a clear error when no model is configured for the role', () => {
    db.prepare('INSERT INTO llm_config (role, model) VALUES (@role, @model)').run({ role: 'judge', model: '' });
    expect(() => getModelForRole('judge')).toThrow(/No model configured for role "judge"/);
  });

  it('returns the configured model for the role', () => {
    db.prepare('INSERT INTO llm_config (role, model) VALUES (@role, @model)').run({ role: 'judge', model: 'gpt-4o-mini' });
    expect(getModelForRole('judge')).toBe('gpt-4o-mini');
  });
});

describe('chat', () => {
  beforeEach(() => {
    db.exec("DELETE FROM llm_config");
    db.exec("DELETE FROM settings");
  });

  it('throws a clear error when the AI Gateway is not configured yet', async () => {
    db.prepare('INSERT INTO llm_config (role, model) VALUES (@role, @model)').run({ role: 'judge', model: 'gpt-4o-mini' });
    await expect(chat('judge', [])).rejects.toThrow(/AI Gateway is not configured/);
  });
});
