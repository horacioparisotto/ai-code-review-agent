import type { Gate } from './gate';
import type { Finding, Verdict } from './verdict';

/**
 * Renders the review as a report for a person to read. Nothing here writes to
 * GitHub: posting is a separate step that only runs after explicit
 * confirmation of which findings to post.
 */
export function renderReport(pr: number, gate: Gate, verdicts: Map<string, Verdict>): string {
  const findings: Finding[] = [...verdicts.values()].flatMap((v) => (v.kind === 'finding' ? v.findings : []));
  const kept = findings.filter((f) => gate.keep(f));
  const dropped = findings.length - kept.length;

  const lines = [`## Review of #${pr}`, ''];
  if (gate.decided) {
    lines.push('> This PR is already decided. Only security, data-integrity and financial findings are shown.', '');
  }
  for (const [id, v] of verdicts) {
    if (v.kind !== 'finding') lines.push(`- \`${id}\`: ${v.kind.replace('_', ' ')}`);
  }
  if (kept.length > 0) lines.push('', '### Findings', '');
  for (const f of kept) {
    lines.push(`- **${f.file}:${f.line}** · \`${f.convention}\` (${f.category})`, `  \`${f.evidence}\``);
  }
  if (dropped > 0) lines.push('', `_${dropped} lower-severity finding(s) withheld because the PR is decided._`);
  lines.push('', 'Nothing has been posted. Confirm which findings to post.');
  return lines.join('\n');
}
