import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/** Runs a CLI with an argument list. Tests inject a fake. */
export type Runner = (args: string[]) => Promise<string>;

const run = promisify(execFile);

// An argument list, never a shell string: a PR number or a branch name can
// never be interpreted as a command.
export const gh: Runner = async (args) => (await run('gh', args)).stdout;
export const git: Runner = async (args) => (await run('git', args)).stdout;
