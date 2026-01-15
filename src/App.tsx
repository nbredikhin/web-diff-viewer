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
  diffFontScale: 'diff-viewer:diff-font-scale',
  diffWordWrap: 'diff-viewer:diff-word-wrap',
} as const;

const CHANGE_BADGES: Record<DiffFile['changeType'], string> = {
  add: 'A',
  modify: 'M',
  delete: 'D',
  rename: 'R',
  binary: 'B',
};

const getDisplayPath = (file: DiffFile) => file.newPath || file.oldPath;
const getDisplayName = (file: DiffFile) => {
  const displayPath = getDisplayPath(file) || 'Untitled file';
  const parts = displayPath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? displayPath;
};

type FileTreeNode = {
  name: string;
  path: string;
  children: Map<string, FileTreeNode>;
  files: DiffFile[];
};

const buildFileTree = (files: DiffFile[]) => {
  const root: FileTreeNode = { name: '', path: '', children: new Map(), files: [] };

  files.forEach((file) => {
    const displayPath = getDisplayPath(file) || 'Untitled file';
    const parts = displayPath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      root.files.push(file);
      return;
    }
    let current = root;
    let currentPath = '';
    parts.slice(0, -1).forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: currentPath,
          children: new Map(),
          files: [],
        });
      }
      current = current.children.get(part) as FileTreeNode;
    });
    current.files.push(file);
  });

  return root;
};

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

const DEFAULT_DIFF_FONT_SCALE = 1;
const MIN_DIFF_FONT_SCALE = 0.7;
const MAX_DIFF_FONT_SCALE = 1.4;
const DIFF_FONT_SCALE_STEP = 0.1;
const DEFAULT_DIFF_WORD_WRAP = false;

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
  const [fileTreeView, setFileTreeView] = useState<'files' | 'settings'>('files');
  const [error, setError] = useState('');
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [pasteValue, setPasteValue] = useState('');
  const [uploadValue, setUploadValue] = useState('');
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({});
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});
  const [diffFontScale, setDiffFontScale] = useState(DEFAULT_DIFF_FONT_SCALE);
  const [diffWordWrap, setDiffWordWrap] = useState(DEFAULT_DIFF_WORD_WRAP);
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

  useEffect(() => {
    const storedScale = localStorage.getItem(STORAGE_KEYS.diffFontScale);
    if (storedScale) {
      const parsedScale = Number.parseFloat(storedScale);
      if (Number.isFinite(parsedScale)) {
        const clamped = Math.min(Math.max(parsedScale, MIN_DIFF_FONT_SCALE), MAX_DIFF_FONT_SCALE);
        setDiffFontScale(clamped);
      }
    }
    const storedWrap = localStorage.getItem(STORAGE_KEYS.diffWordWrap);
    if (storedWrap) {
      setDiffWordWrap(storedWrap === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.diffFontScale, `${diffFontScale}`);
  }, [diffFontScale]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.diffWordWrap, diffWordWrap ? 'true' : 'false');
  }, [diffWordWrap]);

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const fileTree = useMemo(() => buildFileTree(files), [files]);

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
      setFileTreeView('files');
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

  const handleToggleDir = useCallback((path: string) => {
    setCollapsedDirs((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  }, []);

  const handleDecreaseFont = () => {
    setDiffFontScale((prev) => {
      const next = Math.max(prev - DIFF_FONT_SCALE_STEP, MIN_DIFF_FONT_SCALE);
      return Number.parseFloat(next.toFixed(2));
    });
  };

  const handleIncreaseFont = () => {
    setDiffFontScale((prev) => {
      const next = Math.min(prev + DIFF_FONT_SCALE_STEP, MAX_DIFF_FONT_SCALE);
      return Number.parseFloat(next.toFixed(2));
    });
  };

  const handleToggleWordWrap = () => {
    setDiffWordWrap((prev) => !prev);
  };

  const handleBackToStart = () => {
    setRawText('');
    setFiles([]);
    setViewHunksById({});
    setSelectedFileId('');
    setShowTree(true);
    setFileTreeView('files');
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

  useEffect(() => {
    if (!selectedFile) {
      return;
    }
    const displayPath = getDisplayPath(selectedFile) || '';
    const parts = displayPath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      return;
    }
    setCollapsedDirs((prev) => {
      const next = { ...prev };
      let currentPath = '';
      parts.slice(0, -1).forEach((part) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (next[currentPath]) {
          next[currentPath] = false;
        }
      });
      return next;
    });
  }, [selectedFile]);

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


  const renderFileButton = (file: DiffFile) => {
    const displayPath = getDisplayPath(file) || 'Untitled file';
    return (
      <button
        type="button"
        className={file.id === selectedFileId ? 'file-item file-item--active' : 'file-item'}
        onClick={() => handleSelectFile(file)}
        title={displayPath}
      >
        <span className={`badge badge--${file.changeType}`}>{CHANGE_BADGES[file.changeType]}</span>
        <span className="file-name">{getDisplayName(file)}</span>
      </button>
    );
  };

  const renderDirectoryRow = (node: FileTreeNode) => {
    const isCollapsed = collapsedDirs[node.path] ?? false;
    return (
      <button
        key={node.path}
        type="button"
        className="dir-item"
        onClick={() => handleToggleDir(node.path)}
        aria-expanded={!isCollapsed}
      >
        <span className="dir-item__toggle" aria-hidden="true">
          <svg viewBox="0 0 16 16" className={isCollapsed ? 'chevron chevron--collapsed' : 'chevron'}>
            <path
              d="M5 3.5l6 4.5-6 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="dir-item__name">{node.path}/</span>
      </button>
    );
  };

  const buildFlatTreeRows = (node: FileTreeNode, rows: React.ReactNode[]) => {
    const sortedDirs = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
    const sortedFiles = [...node.files].sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
    sortedFiles.forEach((file) => {
      rows.push(
        <div key={file.id} className="file-tree__item">
          {renderFileButton(file)}
        </div>,
      );
    });
    sortedDirs.forEach((dir) => {
      rows.push(<div key={`${dir.path}-header`}>{renderDirectoryRow(dir)}</div>);
      if (collapsedDirs[dir.path]) {
        return;
      }
      buildFlatTreeRows(dir, rows);
    });
  };

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
              <h2>{fileTreeView === 'files' ? 'Files' : 'Settings'}</h2>
              <div className="file-tree__actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setFileTreeView(fileTreeView === 'files' ? 'settings' : 'files')}
                  aria-pressed={fileTreeView === 'settings'}
                >
                  {fileTreeView === 'files' ? 'Settings' : 'Files'}
                </button>
                <button type="button" className="ghost" onClick={handleBackToStart}>
                  New Diff
                </button>
              </div>
            </div>
            {fileTreeView === 'files' ? (
              <div className="file-tree__list">
                {(() => {
                  const rows: React.ReactNode[] = [];
                  buildFlatTreeRows(fileTree, rows);
                  return rows;
                })()}
              </div>
            ) : (
              <div className="settings-list">
                <div className="settings-item">
                  <div className="settings-item__label">Font size</div>
                  <div className="settings-item__controls">
                    <button
                      type="button"
                      className="settings-button"
                      onClick={handleDecreaseFont}
                      disabled={diffFontScale <= MIN_DIFF_FONT_SCALE}
                    >
                      Aa-
                    </button>
                    <span className="settings-item__value">{Math.round(diffFontScale * 100)}%</span>
                    <button
                      type="button"
                      className="settings-button"
                      onClick={handleIncreaseFont}
                      disabled={diffFontScale >= MAX_DIFF_FONT_SCALE}
                    >
                      Aa+
                    </button>
                  </div>
                </div>
                <div className="settings-item">
                  <div className="settings-item__label">Word wrap</div>
                  <div className="settings-item__controls">
                    <button
                      type="button"
                      className={diffWordWrap ? 'settings-toggle settings-toggle--active' : 'settings-toggle'}
                      onClick={handleToggleWordWrap}
                      aria-pressed={diffWordWrap}
                    >
                      {diffWordWrap ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
        <div
          className="code-viewer"
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ '--diff-font-size': `${diffFontScale}em` } as React.CSSProperties}
        >
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
                className={diffWordWrap ? 'diff diff--wrap' : 'diff'}
                tokens={diffTokens}
              >
                {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
              </Diff>
            )
          ) : (
            <div className="empty-state">Select a file to view its diff.</div>
          )}
        </div>
        <button
          type="button"
          className="floating-button"
          onClick={() => setShowTree((prev) => !prev)}
          aria-pressed={showTree}
          aria-label={showTree ? 'Hide files panel' : 'Show files panel'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="6.5" width="16" height="1.8" rx="0.9" />
            <rect x="4" y="11.1" width="16" height="1.8" rx="0.9" />
            <rect x="4" y="15.7" width="16" height="1.8" rx="0.9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
