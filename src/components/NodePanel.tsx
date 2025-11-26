import { useState, useEffect, useCallback } from 'react';
import type { FeatureNode } from '../types';

interface NodePanelProps {
  node: FeatureNode | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<FeatureNode['data']>) => void;
  onDelete: (nodeId: string) => void;
}

export default function NodePanel({ node, onClose, onUpdate, onDelete }: NodePanelProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  // Sync local state with node data
  useEffect(() => {
    if (node) {
      setLabel(node.data.label);
      setDescription(node.data.description || '');
    }
  }, [node]);

  const handleSave = useCallback(() => {
    if (node && label.trim()) {
      onUpdate(node.id, {
        label: label.trim(),
        description: description.trim() || undefined,
      });
    }
  }, [node, label, description, onUpdate]);

  const handleDelete = useCallback(() => {
    if (node && confirm('Are you sure you want to delete this feature?')) {
      onDelete(node.id);
      onClose();
    }
  }, [node, onDelete, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!node) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="
          fixed right-0 top-0 h-full w-80 z-50
          bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)]
          shadow-2xl shadow-black/50
          animate-slide-in
        "
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-[var(--text-primary)] font-semibold">Edit Feature</h2>
          <button
            onClick={onClose}
            className="
              w-8 h-8 rounded-lg
              flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-tertiary)]
              transition-colors
            "
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Label input */}
          <div>
            <label className="block text-[var(--text-secondary)] text-sm mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleSave}
              className="
                w-full px-3 py-2 rounded-lg
                bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]
                text-[var(--text-primary)] text-sm
                placeholder-[var(--text-muted)]
                focus:outline-none focus:border-[var(--accent)]
                transition-colors
              "
              placeholder="Feature name"
            />
          </div>

          {/* Description textarea */}
          <div>
            <label className="block text-[var(--text-secondary)] text-sm mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              rows={4}
              className="
                w-full px-3 py-2 rounded-lg resize-none
                bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]
                text-[var(--text-primary)] text-sm
                placeholder-[var(--text-muted)]
                focus:outline-none focus:border-[var(--accent)]
                transition-colors
              "
              placeholder="Add a description..."
            />
          </div>

          {/* Node ID (read-only info) */}
          <div>
            <label className="block text-[var(--text-muted)] text-xs mb-1">
              Node ID
            </label>
            <div className="text-[var(--text-secondary)] text-xs font-mono bg-[var(--bg-tertiary)] px-2 py-1 rounded">
              {node.id}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={handleDelete}
            className="
              w-full px-4 py-2 rounded-lg
              bg-[var(--danger)]/10 border border-[var(--danger)]/30
              text-[var(--danger)] text-sm font-medium
              hover:bg-[var(--danger)]/20 hover:border-[var(--danger)]/50
              transition-colors
            "
          >
            Delete Feature
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

