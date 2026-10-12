import type { Runner } from './exec';
import type { Category, Finding } from './verdict';

/** Issues worth raising even on a PR that is already decided. */
const ALWAYS_RAISE = new Set<Category>(['security', 'data-integrity', 'financial']);

export interface Gate {
  decided: boolean;
  keep(finding: Finding): boolean;
}

/**
 * Is this PR still open to influence? Feedback on a PR that is already
 * approved or merged is noise to its author, unless it's the kind of issue
 * worth raising anyway.
 *
 * This exists because of a real mistake: an early run posted valid findings on
 * a PR another reviewer had already approved, where they could no longer
 * change anything.
 */
export async function reviewGate(gh: Runner, pr: number): Promise<Gate> {
  if (!Number.isInteger(pr) || pr <= 0) throw new Error(`Invalid PR number: ${pr}`);

  const { state, reviewDecision } = JSON.parse(
    await gh(['pr', 'view', String(pr), '--json', 'state,reviewDecision']),
  ) as { state: string; reviewDecision: string | null };

  const decided = state !== 'OPEN' || reviewDecision === 'APPROVED';
  return {
    decided,
    keep: (f) => !decided || ALWAYS_RAISE.has(f.category),
  };
}
