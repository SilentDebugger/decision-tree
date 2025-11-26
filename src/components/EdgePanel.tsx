import { useState, useCallback } from 'react';
import type { FeatureEdge, FeatureNode, EdgeRule, RuleOperator } from '../types';
import { ruleToText } from '../types';
import RuleBuilder from './RuleBuilder';

interface EdgePanelProps {
  edge: FeatureEdge;
  sourceNode: FeatureNode | undefined;
  targetNode: FeatureNode | undefined;
  existingConditions: string[];
  getValuesForCondition: (condition: string) => (string | number | boolean)[];
  onClose: () => void;
  onAddRule: (edgeId: string, rule: Omit<EdgeRule, 'id'>) => void;
  onRemoveRule: (edgeId: string, ruleId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export default function EdgePanel({
  edge,
  sourceNode,
  targetNode,
  existingConditions,
  getValuesForCondition,
  onClose,
  onAddRule,
  onRemoveRule,
  onDeleteEdge,
}: EdgePanelProps) {
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const rules = edge.data?.rules || [];

  const handleAddRule = useCallback((
    condition: string, 
    operator: RuleOperator, 
    value: string | number | boolean
  ) => {
    onAddRule(edge.id, { condition, operator, value });
    setShowRuleBuilder(false);
  }, [edge.id, onAddRule]);

  const handleDelete = useCallback(() => {
    if (confirm('Are you sure you want to delete this connection?')) {
      onDeleteEdge(edge.id);
      onClose();
    }
  }, [edge.id, onDeleteEdge, onClose]);

  // Get all existing values for autocomplete
  const allExistingValues = existingConditions.flatMap(c => getValuesForCondition(c));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="
        fixed right-0 top-0 h-full w-80 z-50
        bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)]
        shadow-2xl shadow-black/50
        animate-slide-in
        flex flex-col
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-[var(--text-primary)] font-semibold">Edit Path</h2>
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

        {/* Path info */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-primary)] font-medium truncate max-w-[100px]">
              {sourceNode?.data.label || 'Unknown'}
            </span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className="text-[var(--text-primary)] font-medium truncate max-w-[100px]">
              {targetNode?.data.label || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[var(--text-secondary)] text-sm font-medium">
                Rules
              </label>
              <span className="text-[var(--text-muted)] text-xs">
                {rules.length === 0 ? 'Always accessible' : `${rules.length} rule${rules.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {/* Existing rules */}
            {rules.length > 0 && (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="
                      flex items-center justify-between gap-2
                      px-3 py-2 rounded-lg
                      bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]
                    "
                  >
                    <span className="text-[var(--text-primary)] text-sm font-mono">
                      {ruleToText(rule)}
                    </span>
                    <button
                      onClick={() => onRemoveRule(edge.id, rule.id)}
                      className="
                        text-[var(--text-muted)] hover:text-[var(--danger)]
                        transition-colors text-lg leading-none
                      "
                      title="Remove rule"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Rule builder or add button */}
            {showRuleBuilder ? (
              <RuleBuilder
                existingConditions={existingConditions}
                existingValues={allExistingValues}
                onAdd={handleAddRule}
                onCancel={() => setShowRuleBuilder(false)}
              />
            ) : (
              <button
                onClick={() => setShowRuleBuilder(true)}
                className="
                  w-full px-3 py-2 rounded-lg
                  border border-dashed border-[var(--border-subtle)]
                  text-[var(--text-muted)] text-sm
                  hover:border-[var(--accent)] hover:text-[var(--accent)]
                  transition-colors
                "
              >
                + Add Rule
              </button>
            )}

            {/* Help text */}
            <p className="text-[var(--text-muted)] text-xs mt-4">
              Rules define when this path is accessible. All rules must match (AND logic). 
              If no rules are set, the path is always accessible.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
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
            Delete Connection
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

