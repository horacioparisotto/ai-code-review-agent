import type { FileDiff } from './diff';

export type Category = 'security' | 'data-integrity' | 'financial' | 'style' | 'process';

export interface Finding {
  convention: string; // why it was flagged
  category: Category;
  file: string; // always anchored
  line: number;
  evidence: string; // the line that breaks it
}

export type Verdict =
  | { kind: 'not_applicable' }
  | { kind: 'compliant' }
  | { kind: 'finding'; findings: Finding[] };

/**
 * A convention the agent checks. In the real agent the LLM does the judgment
 * for most conventions, guided by the knowledge base; the ones that can be
 * decided mechanically are code, like the example below.
 */
export interface Convention {
  id: string;
  category: Category;
  appliesTo(file: FileDiff): boolean;
  check(file: FileDiff): Array<Omit<Finding, 'convention' | 'category' | 'file'>>;
}

/** Every convention gets an explicit verdict. Silence is not a verdict. */
export function evaluate(conventions: Convention[], diff: FileDiff[]): Map<string, Verdict> {
  const verdicts = new Map<string, Verdict>();
  for (const c of conventions) {
    const files = diff.filter((f) => f.status !== 'deleted' && c.appliesTo(f));
    if (files.length === 0) {
      verdicts.set(c.id, { kind: 'not_applicable' });
      continue;
    }
    const findings = files.flatMap((f) =>
      c.check(f).map((hit) => ({ ...hit, convention: c.id, category: c.category, file: f.path })),
    );
    verdicts.set(c.id, findings.length ? { kind: 'finding', findings } : { kind: 'compliant' });
  }
  return verdicts;
}

/** Example of a mechanical convention: colors come from design tokens. */
export const designTokens: Convention = {
  id: 'design-tokens',
  category: 'style',
  appliesTo: (f) => /\.(tsx|css)$/.test(f.path),
  check: (f) =>
    f.added
      .filter((a) => /#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/i.test(a.text))
      .map((a) => ({ line: a.line, evidence: a.text.trim() })),
};
