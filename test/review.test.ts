import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parseDiff, touches } from '../src/diff';
import type { Runner } from '../src/exec';
import { reviewGate } from '../src/gate';
import { migrationCollisions, migrationNumber } from '../src/migrations';
import { renderReport } from '../src/report';
import { findSiblings } from '../src/siblings';
import { designTokens, evaluate, type Finding } from '../src/verdict';

const DIFF = `diff --git a/web/Banner.tsx b/web/Banner.tsx
index 1111111..2222222 100644
--- a/web/Banner.tsx
+++ b/web/Banner.tsx
@@ -10,3 +10,4 @@ export function Banner() {
   const style = {
-    color: tokens.gold,
+    color: '#d4a853',
+    padding: 8,
   };
diff --git a/migrations/0042_add_reviews_index.sql b/migrations/0042_add_reviews_index.sql
new file mode 100644
--- /dev/null
+++ b/migrations/0042_add_reviews_index.sql
@@ -0,0 +1,2 @@
+CREATE INDEX CONCURRENTLY idx_reviews_product
+  ON reviews (product_id);
`;

const ghReturning = (json: object): Runner => vi.fn(async () => JSON.stringify(json));
const finding = (category: Finding['category']): Finding => ({
  convention: 'x',
  category,
  file: 'a.go',
  line: 1,
  evidence: '',
});

describe('review gate', () => {
  it('keeps everything on an open, undecided PR', async () => {
    const gate = await reviewGate(ghReturning({ state: 'OPEN', reviewDecision: 'REVIEW_REQUIRED' }), 12);

    expect(gate.decided).toBe(false);
    expect(gate.keep(finding('style'))).toBe(true);
  });

  it('keeps only severe findings once a PR is approved or merged', async () => {
    for (const json of [
      { state: 'OPEN', reviewDecision: 'APPROVED' },
      { state: 'MERGED', reviewDecision: null },
    ]) {
      const gate = await reviewGate(ghReturning(json), 12);
      expect(gate.decided).toBe(true);
      expect(gate.keep(finding('style'))).toBe(false);
      expect(gate.keep(finding('security'))).toBe(true);
    }
  });

  it('calls gh with an argument list and rejects bad PR numbers', async () => {
    const gh = ghReturning({ state: 'OPEN', reviewDecision: null });
    await reviewGate(gh, 7);

    expect(gh).toHaveBeenCalledWith(['pr', 'view', '7', '--json', 'state,reviewDecision']);
    await expect(reviewGate(gh, Number('7; rm -rf /'))).rejects.toThrow('Invalid PR number');
  });
});

describe('diff parsing', () => {
  const files = parseDiff(DIFF);

  it('finds files, status and new-file line numbers', () => {
    expect(files.map((f) => [f.path, f.status])).toEqual([
      ['web/Banner.tsx', 'modified'],
      ['migrations/0042_add_reviews_index.sql', 'added'],
    ]);
    expect(files[0]?.added).toEqual([
      { line: 11, text: "    color: '#d4a853'," },
      { line: 12, text: '    padding: 8,' },
    ]);
    expect(touches(files, 'web/Banner.tsx', 11)).toBe(true);
    expect(touches(files, 'web/Banner.tsx', 10)).toBe(false);
  });
});

describe('verdicts', () => {
  it('gives every convention an explicit verdict, findings anchored to a line', () => {
    const noCss = { ...designTokens, id: 'css-only', appliesTo: (f: { path: string }) => f.path.endsWith('.css') };
    const verdicts = evaluate([designTokens, noCss], parseDiff(DIFF));

    expect(verdicts.get('css-only')).toEqual({ kind: 'not_applicable' });
    expect(verdicts.get('design-tokens')).toEqual({
      kind: 'finding',
      findings: [
        {
          convention: 'design-tokens',
          category: 'style',
          file: 'web/Banner.tsx',
          line: 11,
          evidence: "color: '#d4a853',",
        },
      ],
    });
  });

  it('is compliant when the convention applies and nothing breaks it', () => {
    const clean = parseDiff(DIFF.replace("'#d4a853'", 'tokens.gold'));

    expect(evaluate([designTokens], clean).get('design-tokens')).toEqual({ kind: 'compliant' });
  });
});

describe('sibling search', () => {
  it('reports copies of a fixed pattern outside the diff, in this and other repos', async () => {
    const search = vi.fn(async () => [
      { repo: 'web', file: 'web/Banner.tsx', line: 11 }, // fixed by this PR
      { repo: 'web', file: 'web/Footer.tsx', line: 4 },
      { repo: 'admin', file: 'admin/Banner.tsx', line: 11 }, // sister codebase
    ]);

    const found = await findSiblings(
      [{ summary: 'error message chosen outside the field component', oldPattern: 'pickError(' }],
      parseDiff(DIFF),
      search,
      'web',
    );

    expect(found[0]?.unfixed).toEqual([
      { repo: 'web', file: 'web/Footer.tsx', line: 4 },
      { repo: 'admin', file: 'admin/Banner.tsx', line: 11 },
    ]);
  });
});

describe('migration numbering', () => {
  it('flags a number that already exists on main as it is now', async () => {
    const git = vi.fn<Runner>(async (args) =>
      args[0] === 'ls-tree' ? 'migrations/0041_reviews.sql\nmigrations/0042_payments.sql\n' : '',
    );

    const findings = await migrationCollisions(git, parseDiff(DIFF));

    expect(git.mock.calls[0]?.[0]).toEqual(['fetch', 'origin', 'main']);
    expect(findings).toEqual([
      {
        convention: 'migration-numbering',
        category: 'data-integrity',
        file: 'migrations/0042_add_reviews_index.sql',
        line: 1,
        evidence: '0042 already exists on main',
      },
    ]);
  });

  it('reads migration numbers from paths', () => {
    expect(migrationNumber('migrations/0042_add_index.sql')).toBe('0042');
    expect(migrationNumber('migrations/README.md')).toBeNull();
  });
});

describe('report', () => {
  it('says nothing was posted and withholds minor findings on decided PRs', async () => {
    const gate = await reviewGate(ghReturning({ state: 'OPEN', reviewDecision: 'APPROVED' }), 12);
    const report = renderReport(12, gate, evaluate([designTokens], parseDiff(DIFF)));

    expect(report).toContain('already decided');
    expect(report).toContain('1 lower-severity finding(s) withheld');
    expect(report).toContain('Nothing has been posted.');
  });
});

describe('skill', () => {
  it('keeps the brakes in the workflow', () => {
    const skill = readFileSync(new URL('../.claude/skills/review-pr/SKILL.md', import.meta.url), 'utf8');

    expect(skill).toMatch(/already approved, \*\*stop\*\*/);
    expect(skill).toMatch(/Do not post anything/);
    expect(skill).toMatch(/Read `conventions\/conventions.md` from disk on every run/);
  });
});
