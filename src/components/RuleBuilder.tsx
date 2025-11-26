import { useState, useCallback, useRef, useEffect } from 'react';
import type { RuleOperator } from '../types';

interface RuleBuilderProps {
  existingConditions: string[];
  existingValues: (string | number | boolean)[];
  onAdd: (condition: string, operator: RuleOperator, value: string | number | boolean) => void;
  onCancel: () => void;
}

const OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
];

export default function RuleBuilder({ 
  existingConditions, 
  existingValues,
  onAdd, 
  onCancel 
}: RuleBuilderProps) {
  const [condition, setCondition] = useState('');
  const [operator, setOperator] = useState<RuleOperator>('is');
  const [value, setValue] = useState('');
  const [showConditionSuggestions, setShowConditionSuggestions] = useState(false);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);
  
  const conditionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    conditionInputRef.current?.focus();
  }, []);

  const filteredConditions = existingConditions.filter(c => 
    c.toLowerCase().includes(condition.toLowerCase())
  );

  const filteredValues = existingValues
    .map(v => String(v))
    .filter(v => v.toLowerCase().includes(value.toLowerCase()));

  const handleSubmit = useCallback(() => {
    if (!condition.trim() || !value.trim()) return;
    
    // Try to parse value as boolean or number
    let parsedValue: string | number | boolean = value.trim();
    if (parsedValue === 'true') parsedValue = true;
    else if (parsedValue === 'false') parsedValue = false;
    else if (!isNaN(Number(parsedValue)) && parsedValue !== '') {
      parsedValue = Number(parsedValue);
    }
    
    onAdd(condition.trim(), operator, parsedValue);
  }, [condition, operator, value, onAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }, [handleSubmit, onCancel]);

  return (
    <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 border border-[var(--border-subtle)]">
      <div className="flex flex-col gap-2">
        {/* Condition input */}
        <div className="relative">
          <label className="block text-[var(--text-muted)] text-xs mb-1">Condition</label>
          <input
            ref={conditionInputRef}
            type="text"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            onFocus={() => setShowConditionSuggestions(true)}
            onBlur={() => setTimeout(() => setShowConditionSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., role, is_author"
            className="
              w-full px-2 py-1.5 rounded
              bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
              text-[var(--text-primary)] text-sm
              placeholder-[var(--text-muted)]
              focus:outline-none focus:border-[var(--accent)]
            "
          />
          {showConditionSuggestions && filteredConditions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded shadow-lg max-h-32 overflow-y-auto">
              {filteredConditions.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  onMouseDown={() => {
                    setCondition(c);
                    setShowConditionSuggestions(false);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Operator select */}
        <div>
          <label className="block text-[var(--text-muted)] text-xs mb-1">Operator</label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as RuleOperator)}
            className="
              w-full px-2 py-1.5 rounded
              bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
              text-[var(--text-primary)] text-sm
              focus:outline-none focus:border-[var(--accent)]
              cursor-pointer
            "
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        {/* Value input */}
        <div className="relative">
          <label className="block text-[var(--text-muted)] text-xs mb-1">Value</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setShowValueSuggestions(true)}
            onBlur={() => setTimeout(() => setShowValueSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., editor, true, 5"
            className="
              w-full px-2 py-1.5 rounded
              bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
              text-[var(--text-primary)] text-sm
              placeholder-[var(--text-muted)]
              focus:outline-none focus:border-[var(--accent)]
            "
          />
          {showValueSuggestions && filteredValues.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded shadow-lg max-h-32 overflow-y-auto">
              {filteredValues.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  onMouseDown={() => {
                    setValue(v);
                    setShowValueSuggestions(false);
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={handleSubmit}
            disabled={!condition.trim() || !value.trim()}
            className="
              flex-1 px-3 py-1.5 rounded
              bg-[var(--accent)] text-white text-sm font-medium
              hover:bg-[var(--accent-hover)]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            Add Rule
          </button>
          <button
            onClick={onCancel}
            className="
              px-3 py-1.5 rounded
              bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm
              hover:text-[var(--text-primary)]
              transition-colors
            "
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

