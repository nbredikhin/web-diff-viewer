export type Theme = 'dark';

export type ChangeType = 'add' | 'modify' | 'delete' | 'rename' | 'binary';

export interface DiffLine {
  type: 'add' | 'del' | 'normal';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffFile {
  id: string;
  oldPath: string;
  newPath: string;
  changeType: ChangeType;
  hunks: DiffHunk[];
  isBinary: boolean;
}

export interface DiffState {
  rawText: string;
  files: DiffFile[];
  selectedFileId: string;
  scrollByFileId: Record<string, number>;
  theme: Theme;
}
