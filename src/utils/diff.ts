import parseDiff, { Change, Chunk, File } from 'parse-diff';
import { DiffFile, DiffHunk, DiffLine } from '../types';

export interface DiffViewChange {
  type: 'insert' | 'delete' | 'normal';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffViewHunk {
  content: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: DiffViewChange[];
}

export interface ParsedDiffResult {
  files: DiffFile[];
  viewHunksById: Record<string, DiffViewHunk[]>;
}

const toLine = (change: Change): DiffLine => {
  const oldLineNumber = change.type === 'add' ? null : change.ln1 ?? change.ln ?? null;
  const newLineNumber = change.type === 'del' ? null : change.ln2 ?? change.ln ?? null;

  return {
    type: change.type === 'add' ? 'add' : change.type === 'del' ? 'del' : 'normal',
    oldLineNumber,
    newLineNumber,
    content: change.content,
  };
};

const toViewChange = (change: Change): DiffViewChange => {
  const oldLineNumber = change.type === 'add' ? undefined : change.ln1 ?? change.ln;
  const newLineNumber = change.type === 'del' ? undefined : change.ln2 ?? change.ln;

  return {
    type: change.type === 'add' ? 'insert' : change.type === 'del' ? 'delete' : 'normal',
    content: change.content,
    oldLineNumber,
    newLineNumber,
  };
};

const toHunk = (chunk: Chunk): DiffHunk => ({
  oldStart: chunk.oldStart,
  oldLines: chunk.oldLines,
  newStart: chunk.newStart,
  newLines: chunk.newLines,
  lines: chunk.changes.map(toLine),
});

const toViewHunk = (chunk: Chunk): DiffViewHunk => ({
  content: chunk.content,
  oldStart: chunk.oldStart,
  oldLines: chunk.oldLines,
  newStart: chunk.newStart,
  newLines: chunk.newLines,
  changes: chunk.changes.map(toViewChange),
});

const getChangeType = (file: File): DiffFile['changeType'] => {
  if (file.binary) {
    return 'binary';
  }
  if (file.newFile || file.from === '/dev/null') {
    return 'add';
  }
  if (file.deletedFile || file.to === '/dev/null') {
    return 'delete';
  }
  if (file.renamed || file.renameFrom || file.renameTo) {
    return 'rename';
  }
  return 'modify';
};

const normalizePath = (path: string) => path.replace(/^a\//, '').replace(/^b\//, '');

const buildFileId = (file: File, index: number) => {
  const from = file.renameFrom ?? file.from ?? '';
  const to = file.renameTo ?? file.to ?? '';
  return `${index}-${from}-${to}`;
};

export const parseDiffText = (rawText: string): ParsedDiffResult => {
  const parsed = parseDiff(rawText);

  const viewHunksById: Record<string, DiffViewHunk[]> = {};
  const files = parsed.map((file, index) => {
    const id = buildFileId(file, index);
    const changeType = getChangeType(file);
    const oldPath = normalizePath(file.renameFrom ?? file.from ?? '');
    const newPath = normalizePath(file.renameTo ?? file.to ?? '');
    const hunks = file.chunks.map(toHunk);
    const viewHunks = file.chunks.map(toViewHunk);

    viewHunksById[id] = viewHunks;

    return {
      id,
      oldPath,
      newPath,
      changeType,
      hunks,
      isBinary: changeType === 'binary',
    } satisfies DiffFile;
  });

  return { files, viewHunksById };
};
