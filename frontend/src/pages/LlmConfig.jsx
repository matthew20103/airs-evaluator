import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const ROLES = [
  { key: 'judge', label: 'Judge Agent' },
  { key: 'reporter', label: 'Report Agent' },
];

function RoleRow({ role, model, onChange, onSave, onTest, saved, result }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label>{role.label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" placeholder="e.g. gpt-4o-mini" value={model || ''} onChange={onChange} />
        <button onClick={onSave}>Save</button>
        <button onClick={onTest} disabled={!model || result?.loading}>
          Test
        </button>
      </div>
      {saved && <span className="success">Saved</span>}
      {result?.loading && <span className="muted">Testing…</span>}
      {result && !result.loading && result.ok && (
        <span className="success">✓ {result.latencyMs}ms — replied: {result.response}</span>
      )}
      {result && !result.loading && !result.ok && <span className="error">✕ {result.error}</span>}
    </div>
  );
}

export default function LlmConfig() {
  const [models, setModels] = useState({});
  const [saved, setSaved] = useState({});
  const [testResults, setTestResults] = useState({});

  const [gatewayBaseUrl, setGatewayBaseUrl] = useState('');
  const [gatewayApiKeyInput, setGatewayApiKeyInput] = useState('');
  const [gatewayApiKeyPreview, setGatewayApiKeyPreview] = useState('');
  const [gatewaySaved, setGatewaySaved] = useState(false);

  const [prismaUrl, setPrismaUrl] = useState('');
  const [prismaMethod, setPrismaMethod] = useState('POST');
  const [prismaHeaderName, setPrismaHeaderName] = useState('x-pan-token');
  const [prismaHeaderValueInput, setPrismaHeaderValueInput] = useState('');
  const [prismaHeaderValuePreview, setPrismaHeaderValuePreview] = useState('');
  const [prismaProfileName, setPrismaProfileName] = useState('');
  const [prismaSaved, setPrismaSaved] = useState(false);
  const [prismaTestResult, setPrismaTestResult] = useState(null);

  function refreshModels() {
    api.getLlmConfig().then((rows) => {
      setModels(Object.fromEntries(rows.map((r) => [r.role, r.model])));
    });
  }

  function refreshSettings() {
    api.getSettings().then((s) => {
      setGatewayBaseUrl(s.gatewayBaseUrl || '');
      setGatewayApiKeyPreview(s.gatewayApiKeyPreview || '');
      setPrismaUrl(s.prismaAirsUrl || '');
      setPrismaMethod(s.prismaAirsMethod || 'POST');
      setPrismaHeaderName(s.prismaAirsHeaderName || 'x-pan-token');
      setPrismaHeaderValuePreview(s.prismaAirsHeaderValuePreview || '');
      setPrismaProfileName(s.prismaAirsProfileName || '');
    });
  }

  useEffect(() => {
    refreshModels();
    refreshSettings();
  }, []);

  async function handleSaveModel(role) {
    await api.setLlmConfig(role, models[role] || '');
    setSaved((s) => ({ ...s, [role]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [role]: false })), 1500);
  }

  async function handleTestModel(role) {
    setTestResults((r) => ({ ...r, [role]: { loading: true } }));
    try {
      const result = await api.testLlmConfig(role);
      setTestResults((r) => ({ ...r, [role]: result }));
    } catch (err) {
      setTestResults((r) => ({ ...r, [role]: { ok: false, error: err.message } }));
    }
  }

  async function handleSaveGateway(e) {
    e.preventDefault();
    await api.setSettings({ gatewayBaseUrl, gatewayApiKey: gatewayApiKeyInput });
    setGatewayApiKeyInput('');
    refreshSettings();
    setGatewaySaved(true);
    setTimeout(() => setGatewaySaved(false), 1500);
  }

  async function handleSavePrisma(e) {
    e.preventDefault();
    await api.setSettings({
      prismaAirsUrl: prismaUrl,
      prismaAirsMethod: prismaMethod,
      prismaAirsHeaderName: prismaHeaderName,
      prismaAirsHeaderValue: prismaHeaderValueInput,
      prismaAirsProfileName: prismaProfileName,
    });
    setPrismaHeaderValueInput('');
    refreshSettings();
    setPrismaSaved(true);
    setTimeout(() => setPrismaSaved(false), 1500);
  }

  async function handleTestPrisma() {
    setPrismaTestResult({ loading: true });
    try {
      const result = await api.testPrismaAirs();
      setPrismaTestResult(result);
    } catch (err) {
      setPrismaTestResult({ ok: false, error: err.message });
    }
  }

  return (
    <div>
      <h2>LLM Provider Configuration</h2>

      <div className="card">
        <h3>AI Gateway</h3>
        <p className="muted">Shared by all three agent roles. Stored in the app's database, not in a server .env file.</p>
        <form onSubmit={handleSaveGateway}>
          <label>Gateway base URL</label>
          <input
            type="text"
            placeholder="https://aigw.portkey.ai/v1"
            value={gatewayBaseUrl}
            onChange={(e) => setGatewayBaseUrl(e.target.value)}
          />

          <label>API key {gatewayApiKeyPreview && <span className="muted">(currently {gatewayApiKeyPreview})</span>}</label>
          <input
            type="password"
            placeholder={gatewayApiKeyPreview ? 'Leave blank to keep current key' : 'sk-...'}
            value={gatewayApiKeyInput}
            onChange={(e) => setGatewayApiKeyInput(e.target.value)}
          />

          <button className="primary" type="submit">Save gateway settings</button>
          {gatewaySaved && <span className="success"> Saved</span>}
        </form>
      </div>

      <div className="card">
        <h3>Prisma AIRS Runtime Security</h3>
        <p className="muted">
          The external API compared against the Judge Agent in the Evaluation tab. Every prompt sent to the judge is
          also sent here, and their category detections are compared side by side.
        </p>
        <form onSubmit={handleSavePrisma}>
          <label>API URL</label>
          <input
            type="text"
            placeholder="https://service.api.aisecurity.paloaltonetworks.com/v1/scan/sync/request"
            value={prismaUrl}
            onChange={(e) => setPrismaUrl(e.target.value)}
          />

          <label>HTTP method</label>
          <select value={prismaMethod} onChange={(e) => setPrismaMethod(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
          </select>

          <label>Auth header name</label>
          <input
            type="text"
            placeholder="x-pan-token"
            value={prismaHeaderName}
            onChange={(e) => setPrismaHeaderName(e.target.value)}
            style={{ maxWidth: 240 }}
          />

          <label>
            Auth header value (token){' '}
            {prismaHeaderValuePreview && <span className="muted">(currently {prismaHeaderValuePreview})</span>}
          </label>
          <input
            type="password"
            placeholder={prismaHeaderValuePreview ? 'Leave blank to keep current token' : 'token value'}
            value={prismaHeaderValueInput}
            onChange={(e) => setPrismaHeaderValueInput(e.target.value)}
          />

          <label>AI security profile name</label>
          <input
            type="text"
            placeholder="secure-ai-profile"
            value={prismaProfileName}
            onChange={(e) => setPrismaProfileName(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" type="submit">Save Prisma AIRS settings</button>
            <button type="button" onClick={handleTestPrisma} disabled={prismaTestResult?.loading}>Test</button>
          </div>
          {prismaSaved && <span className="success"> Saved</span>}
          {prismaTestResult?.loading && <div className="muted">Testing…</div>}
          {prismaTestResult && !prismaTestResult.loading && prismaTestResult.ok && (
            <div className="success">✓ {prismaTestResult.latencyMs}ms — action: {prismaTestResult.action}, category: {prismaTestResult.category}</div>
          )}
          {prismaTestResult && !prismaTestResult.loading && !prismaTestResult.ok && (
            <div className="error">✕ {prismaTestResult.error}</div>
          )}
        </form>
      </div>

      <div className="card">
        <h3>Model per role</h3>
        {ROLES.map((r) => (
          <RoleRow
            key={r.key}
            role={r}
            model={models[r.key]}
            onChange={(e) => setModels((m) => ({ ...m, [r.key]: e.target.value }))}
            onSave={() => handleSaveModel(r.key)}
            onTest={() => handleTestModel(r.key)}
            saved={saved[r.key]}
            result={testResults[r.key]}
          />
        ))}
      </div>

    </div>
  );
}
