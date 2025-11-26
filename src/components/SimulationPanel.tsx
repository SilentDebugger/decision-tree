import { useCallback } from 'react';
import type { ConditionSchema, SimulationState } from '../types';

interface SimulationPanelProps {
  conditions: ConditionSchema[];
  state: SimulationState;
  isActive: boolean;
  onToggle: () => void;
  onUpdateValue: (condition: string, value: string | number | boolean) => void;
  onReset: () => void;
}

export default function SimulationPanel({
  conditions,
  state,
  isActive,
  onToggle,
  onUpdateValue,
  onReset,
}: SimulationPanelProps) {
  const handleValueChange = useCallback((
    condition: string,
    rawValue: string,
    type: ConditionSchema['type']
  ) => {
    let parsedValue: string | number | boolean = rawValue;
    
    if (type === 'boolean') {
      parsedValue = rawValue === 'true';
    } else if (type === 'number') {
      parsedValue = Number(rawValue);
    }
    
    onUpdateValue(condition, parsedValue);
  }, [onUpdateValue]);

  if (conditions.length === 0) {
    return (
      <div className="absolute top-4 right-4 z-30">
        <div className="
          px-3 py-2 rounded-lg
          bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
          text-[var(--text-muted)] text-sm
        ">
          Add rules to edges to enable simulation
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-30">
      <div className="
        bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
        rounded-lg shadow-lg shadow-black/20
        overflow-hidden
        min-w-[240px]
      ">
        {/* Header */}
        <div className="
          flex items-center justify-between gap-3
          px-3 py-2 border-b border-[var(--border-subtle)]
        ">
          <div className="flex items-center gap-2">
            <div className={`
              w-2 h-2 rounded-full
              ${isActive ? 'bg-green-500 animate-pulse' : 'bg-[var(--text-muted)]'}
            `} />
            <span className="text-[var(--text-primary)] text-sm font-medium">
              Simulation
            </span>
          </div>
          <button
            onClick={onToggle}
            className={`
              px-2 py-1 rounded text-xs font-medium
              transition-colors
              ${isActive 
                ? 'bg-[var(--accent)] text-white' 
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            {isActive ? 'Active' : 'Start'}
          </button>
        </div>

        {/* Conditions */}
        <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
          {conditions.map((condition) => (
            <div key={condition.name} className="space-y-1">
              <label className="block text-[var(--text-secondary)] text-xs font-medium">
                {condition.name}
              </label>
              
              {condition.type === 'boolean' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateValue(condition.name, true)}
                    className={`
                      flex-1 px-2 py-1.5 rounded text-xs font-medium
                      transition-colors
                      ${state[condition.name] === true
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }
                    `}
                  >
                    true
                  </button>
                  <button
                    onClick={() => onUpdateValue(condition.name, false)}
                    className={`
                      flex-1 px-2 py-1.5 rounded text-xs font-medium
                      transition-colors
                      ${state[condition.name] === false
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }
                    `}
                  >
                    false
                  </button>
                </div>
              ) : condition.type === 'enum' ? (
                <select
                  value={String(state[condition.name] ?? '')}
                  onChange={(e) => handleValueChange(condition.name, e.target.value, condition.type)}
                  className="
                    w-full px-2 py-1.5 rounded
                    bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]
                    text-[var(--text-primary)] text-sm
                    focus:outline-none focus:border-[var(--accent)]
                    cursor-pointer
                  "
                >
                  <option value="">-- Select --</option>
                  {condition.options.map((opt) => (
                    <option key={String(opt)} value={String(opt)}>
                      {String(opt)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={state[condition.name] !== undefined ? String(state[condition.name]) : ''}
                  onChange={(e) => handleValueChange(condition.name, e.target.value, condition.type)}
                  placeholder="Enter value"
                  className="
                    w-full px-2 py-1.5 rounded
                    bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]
                    text-[var(--text-primary)] text-sm
                    placeholder-[var(--text-muted)]
                    focus:outline-none focus:border-[var(--accent)]
                  "
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {isActive && (
          <div className="px-3 py-2 border-t border-[var(--border-subtle)]">
            <button
              onClick={onReset}
              className="
                w-full px-2 py-1.5 rounded
                text-[var(--text-muted)] text-xs
                hover:text-[var(--text-secondary)]
                transition-colors
              "
            >
              Reset Values
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

