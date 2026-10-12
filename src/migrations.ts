import type { FileDiff } from './diff';
import type { Runner } from './exec';
import type { Finding } from './verdict';

/**
 * Convention "migration-numbering": two branches each add "the next" migration
 * number, both pass review, and the second one to merge collides. So the check
 * compares against the default branch as it is now, after a fresh fetch, not
 * as it was when the PR was opened.
 */
export async function migrationCollisions(git: Runner, diff: FileDiff[], base = 'main'): Promise<Finding[]> {
  await git(['fetch', 'origin', base]);
  const onMain = new Set(
    (await git(['ls-tree', '--name-only', `origin/${base}`, 'migrations/']))
      .split('\n')
      .map(migrationNumber)
      .filter((n): n is string => n !== null),
  );

  return diff
    .filter((f) => f.status === 'added' && f.path.startsWith('migrations/'))
    .filter((f) => {
      const n = migrationNumber(f.path);
      return n !== null && onMain.has(n);
    })
    .map((f) => ({
      convention: 'migration-numbering',
      category: 'data-integrity',
      file: f.path,
      line: 1,
      evidence: `${migrationNumber(f.path)} already exists on ${base}`,
    }));
}

/** "migrations/0042_add_index.sql" → "0042" */
export function migrationNumber(path: string): string | null {
  return /(?:^|\/)(\d+)_[^/]+$/.exec(path.trim())?.[1] ?? null;
}
