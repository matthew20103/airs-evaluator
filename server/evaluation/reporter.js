import fs from 'node:fs/promises';
import path from 'node:path';
import { chat } from '../gateway/client.js';
import { renderEvaluationReportHtml } from './reportTemplate.js';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

async function buildNarrative(run, results) {
  const bothOk = results.filter((r) => r.judgeCategories && r.prismaCategories);
  try {
    return await chat('reporter', [
      {
        role: 'system',
        content: 'You write a 2-3 sentence executive summary comparing two prompt-detection systems for a non-technical stakeholder. Be factual and concise.',
      },
      {
        role: 'user',
        content: `An evaluation run tested ${results.length} prompts, ${bothOk.length} judged by both the Judge Agent and Prisma AIRS Runtime Security. Write the summary based on how well the two systems agree and diverge.`,
      },
    ]);
  } catch {
    // Reporter role may not be configured yet — the report still works without a narrative.
    return null;
  }
}

export async function generateEvaluationReport(run, results) {
  const narrative = await buildNarrative(run, results);
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const html = renderEvaluationReportHtml({ run, results, narrative, generatedAt });

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, `${run.id}.html`);
  await fs.writeFile(filePath, html);
  return filePath;
}
