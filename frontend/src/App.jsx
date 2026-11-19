import { useState } from 'react';
import Benchmarks from './pages/Benchmarks.jsx';
import Evaluation from './pages/Evaluation.jsx';
import LlmConfig from './pages/LlmConfig.jsx';

const TABS = [
  { key: 'benchmarks', label: 'Benchmarks', Component: Benchmarks },
  { key: 'evaluation', label: 'Evaluation', Component: Evaluation },
  { key: 'llm', label: 'LLM Config', Component: LlmConfig },
];

export default function App() {
  const [active, setActive] = useState('benchmarks');
  const ActiveComponent = TABS.find((t) => t.key === active).Component;

  return (
    <div className="app">
      <h1>Prisma AIRS Runtime Security Evaluator</h1>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === active ? 'active' : ''} onClick={() => setActive(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
      <ActiveComponent />
    </div>
  );
}
