import { touches, type FileDiff } from './diff';

export interface FixedPattern {
  summary: string; // what the PR fixed, in words
  oldPattern: string; // the code shape it removed
}

export interface CodeHit {
  repo: string;
  file: string;
  line: number;
}

/** Searches one or more repositories (`gh search code` or `git grep`). */
export type CodeSearch = (pattern: string) => Promise<CodeHit[]>;

/**
 * When a PR fixes a pattern, the same mistake often lives in code the PR never
 * touched. A review limited to the diff can't see it by definition: with four
 * hand-written copies of the same logic, fixing three silently leaves the
 * fourth broken.
 */
export async function findSiblings(
  fixes: FixedPattern[],
  diff: FileDiff[],
  search: CodeSearch,
  thisRepo: string,
) {
  const findings: Array<{ fix: string; unfixed: CodeHit[] }> = [];
  for (const fix of fixes) {
    const hits = await search(fix.oldPattern);
    const unfixed = hits.filter((h) => h.repo !== thisRepo || !touches(diff, h.file, h.line));
    if (unfixed.length > 0) findings.push({ fix: fix.summary, unfixed });
  }
  return findings;
}
