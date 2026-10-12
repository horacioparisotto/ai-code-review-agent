export interface AddedLine {
  line: number; // line number in the new file
  text: string;
}

export interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  added: AddedLine[];
}

/** Parses `gh pr diff` / `git diff` unified output into files and added lines. */
export function parseDiff(text: string): FileDiff[] {
  const files: FileDiff[] = [];
  let current: FileDiff | undefined;
  let newLine = 0;

  for (const raw of text.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      const path = raw.split(' b/').pop() ?? '';
      current = { path, status: 'modified', added: [] };
      files.push(current);
    } else if (!current) {
      continue;
    } else if (raw.startsWith('new file mode')) {
      current.status = 'added';
    } else if (raw.startsWith('deleted file mode')) {
      current.status = 'deleted';
    } else if (raw.startsWith('rename to ')) {
      current.status = 'renamed';
      current.path = raw.slice('rename to '.length);
    } else if (raw.startsWith('@@')) {
      const match = /\+(\d+)/.exec(raw);
      newLine = match ? Number(match[1]) : 0;
    } else if (raw.startsWith('+') && !raw.startsWith('+++')) {
      current.added.push({ line: newLine++, text: raw.slice(1) });
    } else if (raw.startsWith(' ')) {
      newLine++;
    }
  }
  return files;
}

/** Does the diff add or change this file and line? */
export function touches(files: FileDiff[], path: string, line: number): boolean {
  return files.some((f) => f.path === path && f.added.some((a) => a.line === line));
}
