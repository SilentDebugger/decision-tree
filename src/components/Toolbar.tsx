import { useRef, useCallback } from 'react';
import type { FlowGraph } from '../types';
import { exportToJson, importFromJson } from '../utils/exportImport';

interface ToolbarProps {
  onAddRootNode: () => void;
  onExport: () => FlowGraph;
  onImport: (graph: FlowGraph) => void;
  onSave: () => void;
  onClear: () => void;
  hasNodes: boolean;
}

export default function Toolbar({ onAddRootNode, onExport, onImport, onSave, onClear, hasNodes }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const graph = onExport();
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToJson(graph, `feature-flow-${timestamp}.json`);
  }, [onExport]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const graph = await importFromJson(file);
      onImport(graph);
    } catch (error) {
      alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [onImport]);

  const handleClear = useCallback(() => {
    if (hasNodes && confirm('Are you sure you want to clear all features? This cannot be undone.')) {
      onClear();
    }
  }, [hasNodes, onClear]);

  return (
    <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
      {/* Logo / Title */}
      <div className="flex items-center gap-2 mr-2 pr-4 border-r border-[var(--border-subtle)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle cx="12" cy="5" r="3" />
            <circle cx="5" cy="19" r="3" />
            <circle cx="19" cy="19" r="3" />
            <line x1="12" y1="8" x2="5" y2="16" />
            <line x1="12" y1="8" x2="19" y2="16" />
          </svg>
        </div>
        <span className="text-[var(--text-primary)] font-semibold text-sm hidden sm:block">
          Feature Flow
        </span>
      </div>

      {/* Add Root Node */}
      <button
        onClick={onAddRootNode}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-[var(--accent)] text-white text-sm font-medium
          hover:bg-[var(--accent-hover)]
          transition-colors
        "
        title="Add a new root feature (or double-click on canvas)"
      >
        <span className="text-lg leading-none">+</span>
        <span className="hidden sm:inline">Add Feature</span>
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-[var(--border-subtle)]" />

      {/* Import */}
      <button
        onClick={handleImportClick}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
          text-[var(--text-secondary)] text-sm
          hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]
          transition-colors
        "
        title="Import from JSON file"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="hidden sm:inline">Import</span>
      </button>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={!hasNodes}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
          text-[var(--text-secondary)] text-sm
          hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--text-secondary)] disabled:hover:border-[var(--border-subtle)]
          transition-colors
        "
        title="Save to browser (auto-saves, but click for peace of mind)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        <span className="hidden sm:inline">Save</span>
      </button>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={!hasNodes}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
          text-[var(--text-secondary)] text-sm
          hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--text-secondary)] disabled:hover:border-[var(--border-subtle)]
          transition-colors
        "
        title="Export to JSON file"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="hidden sm:inline">Export</span>
      </button>

      {/* Clear */}
      {hasNodes && (
        <button
          onClick={handleClear}
          className="
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
            text-[var(--text-muted)] text-sm
            hover:text-[var(--danger)] hover:border-[var(--danger)]/50
            transition-colors
          "
          title="Clear all features"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span className="hidden sm:inline">Clear</span>
        </button>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

