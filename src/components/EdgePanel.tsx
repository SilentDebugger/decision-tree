import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { FeatureEdge, FeatureNode, EdgeRule, RuleOperator } from '../types';
import { ruleToText, groupRules } from '../types';
import RuleBuilder from './RuleBuilder';

interface EdgePanelProps {
  edge: FeatureEdge;
  sourceNode: FeatureNode | undefined;
  targetNode: FeatureNode | undefined;
  existingConditions: string[];
  getValuesForCondition: (condition: string) => (string | number | boolean)[];
  onClose: () => void;
  onAddRule: (edgeId: string, rule: Omit<EdgeRule, 'id'>) => void;
  onUpdateRule: (edgeId: string, ruleId: string, updates: Partial<EdgeRule>) => void;
  onRemoveRule: (edgeId: string, ruleId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

// Inline rule editor component
interface RuleEditorProps {
  rule: EdgeRule;
  existingConditions: string[];
  existingValues: (string | number | boolean)[];
  onSave: (updates: Partial<EdgeRule>) => void;
  onCancel: () => void;
}

const OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
];

function RuleEditor({ rule, existingConditions, existingValues, onSave, onCancel }: RuleEditorProps) {
  const [condition, setCondition] = useState(rule.condition);
  const [operator, setOperator] = useState<RuleOperator>(rule.operator);
  const [value, setValue] = useState(String(rule.value));

  const handleSubmit = useCallback(() => {
    if (!condition.trim() || !value.trim()) return;
    
    let parsedValue: string | number | boolean = value.trim();
    if (parsedValue === 'true') parsedValue = true;
    else if (parsedValue === 'false') parsedValue = false;
    else if (!isNaN(Number(parsedValue)) && parsedValue !== '') {
      parsedValue = Number(parsedValue);
    }
    
    onSave({ condition: condition.trim(), operator, value: parsedValue });
  }, [condition, operator, value, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }, [handleSubmit, onCancel]);

  return (
    <div className="space-y-2 p-2 bg-[var(--bg-tertiary)] rounded-md border border-[var(--accent)]/30">
      <input
        type="text"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="condition"
        list="conditions-list"
        className="
          w-full px-2 py-1 rounded text-sm
          bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
          text-[var(--text-primary)] placeholder-[var(--text-muted)]
          focus:outline-none focus:border-[var(--accent)]
        "
        autoFocus
      />
      <datalist id="conditions-list">
        {existingConditions.map(c => <option key={c} value={c} />)}
      </datalist>
      
      <select
        value={operator}
        onChange={(e) => setOperator(e.target.value as RuleOperator)}
        className="
          w-full px-2 py-1 rounded text-sm
          bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
          text-[var(--text-primary)] cursor-pointer
          focus:outline-none focus:border-[var(--accent)]
        "
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="value"
        list="values-list"
        className="
          w-full px-2 py-1 rounded text-sm
          bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
          text-[var(--text-primary)] placeholder-[var(--text-muted)]
          focus:outline-none focus:border-[var(--accent)]
        "
      />
      <datalist id="values-list">
        {existingValues.map((v, i) => <option key={i} value={String(v)} />)}
      </datalist>
      
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!condition.trim() || !value.trim()}
          className="
            flex-1 px-2 py-1 rounded text-xs font-medium
            bg-[var(--accent)] text-white
            hover:bg-[var(--accent-hover)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="
            px-2 py-1 rounded text-xs
            text-[var(--text-secondary)] hover:text-[var(--text-primary)]
            transition-colors
          "
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function EdgePanel({
  edge,
  sourceNode,
  targetNode,
  existingConditions,
  getValuesForCondition,
  onClose,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onDeleteEdge,
}: EdgePanelProps) {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const rules = edge.data?.rules || [];
  const ruleGroups = groupRules(rules);
  const groupIds = Array.from(ruleGroups.keys());

  const handleAddRule = useCallback((
    condition: string, 
    operator: RuleOperator, 
    value: string | number | boolean
  ) => {
    if (!activeGroupId) return;
    onAddRule(edge.id, { condition, operator, value, groupId: activeGroupId });
    setActiveGroupId(null);
  }, [edge.id, onAddRule, activeGroupId]);

  const handleUpdateRule = useCallback((ruleId: string, updates: Partial<EdgeRule>) => {
    onUpdateRule(edge.id, ruleId, updates);
    setEditingRuleId(null);
  }, [edge.id, onUpdateRule]);

  const handleNewGroup = useCallback(() => {
    const newGroupId = nanoid(6);
    setActiveGroupId(newGroupId);
    setEditingRuleId(null);
  }, []);

  const handleAddToGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    setEditingRuleId(null);
  }, []);

  const handleEditRule = useCallback((ruleId: string) => {
    setEditingRuleId(ruleId);
    setActiveGroupId(null);
  }, []);

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
                {rules.length === 0 ? 'Always accessible' : `${groupIds.length} group${groupIds.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {/* Rule groups */}
            {groupIds.map((groupId, index) => (
              <div key={groupId}>
                {/* OR separator between groups */}
                {index > 0 && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                    <span className="text-[var(--accent)] text-xs font-medium px-2">OR</span>
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                  </div>
                )}

                {/* Group container */}
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 p-2 space-y-2">
                  {ruleGroups.get(groupId)!.map((rule, ruleIndex) => (
                    <div key={rule.id}>
                      {/* AND separator within group */}
                      {ruleIndex > 0 && (
                        <div className="text-[var(--text-muted)] text-xs text-center py-1">AND</div>
                      )}
                      
                      {editingRuleId === rule.id ? (
                        <RuleEditor
                          rule={rule}
                          existingConditions={existingConditions}
                          existingValues={allExistingValues}
                          onSave={(updates) => handleUpdateRule(rule.id, updates)}
                          onCancel={() => setEditingRuleId(null)}
                        />
                      ) : (
                        <div className="
                          flex items-center justify-between gap-2
                          px-3 py-2 rounded-md
                          bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
                          hover:border-[var(--accent)]/50 cursor-pointer
                          transition-colors group
                        "
                        onClick={() => handleEditRule(rule.id)}
                        title="Click to edit"
                        >
                          <span className="text-[var(--text-primary)] text-sm font-mono">
                            {ruleToText(rule)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--text-muted)] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              edit
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveRule(edge.id, rule.id);
                              }}
                              className="
                                text-[var(--text-muted)] hover:text-[var(--danger)]
                                transition-colors text-lg leading-none
                              "
                              title="Remove rule"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add to this group button (when not adding) */}
                  {activeGroupId !== groupId && !editingRuleId && (
                    <button
                      onClick={() => handleAddToGroup(groupId)}
                      className="
                        w-full px-2 py-1.5 rounded-md
                        text-[var(--text-muted)] text-xs
                        hover:text-[var(--accent)] hover:bg-[var(--bg-secondary)]
                        transition-colors
                      "
                    >
                      + Add condition to group
                    </button>
                  )}

                  {/* Rule builder for this group */}
                  {activeGroupId === groupId && (
                    <RuleBuilder
                      existingConditions={existingConditions}
                      existingValues={allExistingValues}
                      onAdd={handleAddRule}
                      onCancel={() => setActiveGroupId(null)}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* New group builder */}
            {activeGroupId && !groupIds.includes(activeGroupId) && (
              <>
                {groupIds.length > 0 && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                    <span className="text-[var(--accent)] text-xs font-medium px-2">OR</span>
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                  </div>
                )}
                <div className="rounded-lg border border-[var(--accent)]/30 border-dashed bg-[var(--bg-tertiary)]/50 p-2">
                  <RuleBuilder
                    existingConditions={existingConditions}
                    existingValues={allExistingValues}
                    onAdd={handleAddRule}
                    onCancel={() => setActiveGroupId(null)}
                  />
                </div>
              </>
            )}

            {/* Add new group button */}
            {!activeGroupId && !editingRuleId && (
              <button
                onClick={handleNewGroup}
                className="
                  w-full px-3 py-2 rounded-lg
                  border border-dashed border-[var(--border-subtle)]
                  text-[var(--text-muted)] text-sm
                  hover:border-[var(--accent)] hover:text-[var(--accent)]
                  transition-colors
                "
              >
                {rules.length === 0 ? '+ Add Rule' : '+ Add OR Group'}
              </button>
            )}

            {/* Help text */}
            <p className="text-[var(--text-muted)] text-xs mt-4">
              {rules.length === 0 
                ? 'Add rules to control when this path is accessible.'
                : 'Rules within a group must ALL match (AND). Any group passing grants access (OR). Click a rule to edit it.'
              }
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
