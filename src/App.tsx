import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Diff, Hunk, tokenize } from 'react-diff-view';
import refractor from 'refractor';
import type { DiffFile } from './types';
import { parseDiffText, type DiffViewHunk } from './utils/diff';

const STORAGE_KEYS = {
  rawText: 'diff-viewer:raw-text',
  selectedFileId: 'diff-viewer:selected-file',
  scrollPositions: 'diff-viewer:scroll-positions',
  fileTreeScrollTop: 'diff-viewer:file-tree-scroll',
  theme: 'diff-viewer:theme',
} as const;

const CHANGE_BADGES: Record<DiffFile['changeType'], string> = {
  add: 'A',
  modify: 'M',
  delete: 'D',
  rename: 'R',
  binary: 'B',
};

const getDisplayPath = (file: DiffFile) => file.newPath || file.oldPath;

const languageByExtension: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  html: 'html',
  yml: 'yaml',
  yaml: 'yaml',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  sh: 'bash',
};

const getLanguageFromPath = (path: string) => {
  const match = path.split('.').pop()?.toLowerCase();
  if (!match) {
    return 'text';
  }
  return languageByExtension[match] ?? 'text';
};

const readStoredScrollPositions = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.scrollPositions);
  if (!stored) {
    return {} as Record<string, number>;
  }
  try {
    const parsed = JSON.parse(stored) as Record<string, number>;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    return {} as Record<string, number>;
  }
  return {} as Record<string, number>;
};

const storeScrollPositions = (positions: Record<string, number>) => {
  localStorage.setItem(STORAGE_KEYS.scrollPositions, JSON.stringify(positions));
};

const readStoredFileTreeScrollTop = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.fileTreeScrollTop);
  if (!stored) {
    return 0;
  }
  const parsed = Number.parseFloat(stored);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function App() {
  const [rawText, setRawText] = useState('');
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [viewHunksById, setViewHunksById] = useState<Record<string, DiffViewHunk[]>>({});
  const [selectedFileId, setSelectedFileId] = useState('');
  const [showTree, setShowTree] = useState(true);
  const [error, setError] = useState('');
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [pasteValue, setPasteValue] = useState('');
  const [uploadValue, setUploadValue] = useState('');
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileTreeRef = useRef<HTMLElement>(null);
  const fileTreeScrollTopRef = useRef(0);

  useEffect(() => {
    const storedRaw = localStorage.getItem(STORAGE_KEYS.rawText);
    const storedFileId = localStorage.getItem(STORAGE_KEYS.selectedFileId);
    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);

    if (!storedTheme) {
      localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    }

    if (!storedRaw) {
      return;
    }

    try {
      const parsed = parseDiffText(storedRaw);
      if (parsed.files.length === 0) {
        return;
      }
      setRawText(storedRaw);
      setFiles(parsed.files);
      setViewHunksById(parsed.viewHunksById);
      const initialFileId = storedFileId && parsed.files.some((file) => file.id === storedFileId)
        ? storedFileId
        : parsed.files[0].id;
      setSelectedFileId(initialFileId);
      setShowTree(false);
      setScrollPositions(readStoredScrollPositions());
      fileTreeScrollTopRef.current = readStoredFileTreeScrollTop();
    } catch (parseError) {
      console.error(parseError);
    }
  }, []);

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;

  const loadDiff = useCallback((text: string) => {
    setError('');
    if (!text.trim()) {
      setError('Add a diff before loading.');
      return;
    }
    try {
      const parsed = parseDiffText(text);
      if (parsed.files.length === 0) {
        setError('No file patches found. Paste a GitLab unified diff.');
        return;
      }
      setRawText(text);
      setFiles(parsed.files);
      setViewHunksById(parsed.viewHunksById);
      setSelectedFileId(parsed.files[0].id);
      setShowTree(true);
      const positions = {} as Record<string, number>;
      setScrollPositions(positions);
      storeScrollPositions(positions);
      fileTreeScrollTopRef.current = 0;
      localStorage.setItem(STORAGE_KEYS.fileTreeScrollTop, '0');
      localStorage.setItem(STORAGE_KEYS.rawText, text);
      localStorage.setItem(STORAGE_KEYS.selectedFileId, parsed.files[0].id);
    } catch (parseError) {
      console.error(parseError);
      setError('Unable to parse diff. Ensure it is a unified diff from GitLab.');
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    file
      .text()
      .then((text) => {
        setUploadValue(text);
      })
      .catch(() => {
        setError('Could not read the file.');
      });
  };

  const handlePasteLoad = () => {
    loadDiff(pasteValue.trim());
  };

  const handleUploadLoad = () => {
    loadDiff(uploadValue.trim());
  };

  const handleSelectFile = (file: DiffFile) => {
    setSelectedFileId(file.id);
    localStorage.setItem(STORAGE_KEYS.selectedFileId, file.id);
    setShowTree(false);
  };

  const handleBackToStart = () => {
    setRawText('');
    setFiles([]);
    setViewHunksById({});
    setSelectedFileId('');
    setShowTree(true);
    setError('');
    setScrollPositions({});
    setPasteValue('');
    setUploadValue('');
    localStorage.removeItem(STORAGE_KEYS.rawText);
    localStorage.removeItem(STORAGE_KEYS.selectedFileId);
    localStorage.removeItem(STORAGE_KEYS.scrollPositions);
    localStorage.removeItem(STORAGE_KEYS.fileTreeScrollTop);
  };

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !selectedFileId) {
      return;
    }
    setScrollPositions((prev) => {
      const nextPositions = {
        ...prev,
        [selectedFileId]: container.scrollTop,
      };
      storeScrollPositions(nextPositions);
      return nextPositions;
    });
  }, [selectedFileId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !selectedFileId) {
      return;
    }
    const stored = scrollPositions[selectedFileId] ?? 0;
    container.scrollTop = stored;
  }, [selectedFileId, scrollPositions]);

  const handleFileTreeScroll = useCallback(() => {
    const container = fileTreeRef.current;
    if (!container) {
      return;
    }
    const nextScrollTop = container.scrollTop;
    fileTreeScrollTopRef.current = nextScrollTop;
    localStorage.setItem(STORAGE_KEYS.fileTreeScrollTop, `${nextScrollTop}`);
  }, []);

  useEffect(() => {
    if (!showTree) {
      return;
    }
    const container = fileTreeRef.current;
    if (!container) {
      return;
    }
    const target = readStoredFileTreeScrollTop();
    fileTreeScrollTopRef.current = target;
    if (target <= 0) {
      container.scrollTop = 0;
      return;
    }
    const restore = () => {
      container.scrollTop = target;
    };
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }, [showTree, files.length]);

  useEffect(() => {
    if (!showTree) {
      return;
    }
    const container = fileTreeRef.current;
    if (!container) {
      return;
    }
    if (fileTreeScrollTopRef.current > 0) {
      return;
    }
    const activeButton = container.querySelector<HTMLButtonElement>('.file-item--active');
    if (!activeButton) {
      return;
    }
    const scrollToActive = () => {
      activeButton.scrollIntoView({ block: 'nearest' });
    };
    requestAnimationFrame(() => {
      scrollToActive();
      requestAnimationFrame(scrollToActive);
    });
  }, [showTree, selectedFileId]);

  const diffType = selectedFile?.changeType === 'binary' ? 'modify' : selectedFile?.changeType ?? 'modify';

  const diffHunks = useMemo(() => {
    if (!selectedFile) {
      return [] as DiffViewHunk[];
    }
    return viewHunksById[selectedFile.id] ?? [];
  }, [selectedFile, viewHunksById]);

  const diffTokens = useMemo(() => {
    if (!selectedFile || selectedFile.isBinary) {
      return null;
    }
    const language = getLanguageFromPath(getDisplayPath(selectedFile));
    try {
      return tokenize(diffHunks, { highlight: true, refractor, language });
    } catch {
      try {
        return tokenize(diffHunks, { highlight: true, refractor, language: 'text' });
      } catch {
        return null;
      }
    }
  }, [diffHunks, selectedFile]);

  if (!rawText) {
    return (
      <div className="app app--startup">
        <div className="startup">
          <header className="startup__header">
            <h1>Web Diff Viewer</h1>
            <p>Load a GitLab unified diff to review changes.</p>
          </header>
          <div className="tabs">
            <button
              type="button"
              className={inputTab === 'upload' ? 'tab tab--active' : 'tab'}
              onClick={() => setInputTab('upload')}
            >
              Upload
            </button>
            <button
              type="button"
              className={inputTab === 'paste' ? 'tab tab--active' : 'tab'}
              onClick={() => setInputTab('paste')}
            >
              Paste
            </button>
          </div>
          <div className="tab-panel">
            {inputTab === 'upload' ? (
              <div className="upload-panel">
                <input type="file" accept=".diff,.patch" onChange={handleFileUpload} />
                <button
                  type="button"
                  className="primary"
                  onClick={handleUploadLoad}
                  disabled={!uploadValue.trim()}
                >
                  Load diff
                </button>
              </div>
            ) : (
              <div className="paste-panel">
                <textarea
                  placeholder="Paste unified diff text..."
                  value={pasteValue}
                  onChange={(event) => setPasteValue(event.target.value)}
                />
                <button type="button" className="primary" onClick={handlePasteLoad}>
                  Load diff
                </button>
              </div>
            )}
          </div>
          {error ? <div className="error">{error}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="viewer">
        {showTree && (
          <aside className="file-tree" ref={fileTreeRef} onScroll={handleFileTreeScroll}>
            <div className="file-tree__header">
              <h2>Files</h2>
              <div className="file-tree__actions">
                <button type="button" className="ghost" onClick={() => setShowTree(false)}>
                  Hide
                </button>
                <button type="button" className="ghost" onClick={handleBackToStart}>
                  New Diff
                </button>
              </div>
            </div>
            <ul className="file-tree__list">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    className={file.id === selectedFileId ? 'file-item file-item--active' : 'file-item'}
                    onClick={() => handleSelectFile(file)}
                  >
                    <span className={`badge badge--${file.changeType}`}>{CHANGE_BADGES[file.changeType]}</span>
                    <span className="file-path">{getDisplayPath(file) || 'Untitled file'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
        <div className="code-viewer" ref={scrollRef} onScroll={handleScroll}>
          {selectedFile ? (
            selectedFile.isBinary ? (
              <div className="binary-placeholder">
                <h3>{getDisplayPath(selectedFile)}</h3>
                <p>Binary file changed.</p>
              </div>
            ) : (
              <Diff
                viewType="unified"
                diffType={diffType as 'add' | 'delete' | 'modify' | 'rename'}
                hunks={diffHunks}
                className="diff"
                tokens={diffTokens}
              >
                {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
              </Diff>
            )
          ) : (
            <div className="empty-state">Select a file to view its diff.</div>
          )}
        </div>
        {!showTree && (
          <button type="button" className="floating-button" onClick={() => setShowTree(true)}>
            Files
          </button>
        )}
      </div>
    </div>
  );
}
