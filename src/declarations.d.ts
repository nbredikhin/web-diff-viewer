declare module 'parse-diff' {
  export interface Change {
    type: 'normal' | 'add' | 'del';
    content: string;
    ln?: number;
    ln1?: number;
    ln2?: number;
  }

  export interface Chunk {
    content: string;
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    changes: Change[];
  }

  export interface File {
    chunks: Chunk[];
    from: string;
    to: string;
    deletions: number;
    additions: number;
    oldMode?: string;
    newMode?: string;
    newFileMode?: string;
    deletedFileMode?: string;
    renameFrom?: string;
    renameTo?: string;
    newFile?: boolean;
    deletedFile?: boolean;
    renamed?: boolean;
    binary?: boolean;
  }

  export default function parseDiff(input: string): File[];
}
