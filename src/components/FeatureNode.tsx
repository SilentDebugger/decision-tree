import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FeatureNode as FeatureNodeType } from '../types';
import { useFlowContext } from '../context/FlowContext';

function FeatureNodeComponent({ id, data, selected }: NodeProps<FeatureNodeType>) {
  const { 
    onAddChild, 
    onSelectNode, 
    onUpdateLabel, 
    selectedNodeId, 
    isSimulating, 
    reachableNodes,
    isTraceMode,
    onNodeHover,
    traceHighlightedNodes,
  } = useFlowContext();
  
  // Check if node is reachable (root nodes are always reachable)
  const isReachable = !isSimulating || reachableNodes.size === 0 || reachableNodes.has(id);
  
  // Check if node is highlighted in trace mode
  const isTraceHighlighted = isTraceMode && traceHighlightedNodes.has(id);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNewNode = useRef(data.label === 'New Feature');

  // Auto-edit mode for new nodes
  useEffect(() => {
    if (isNewNode.current) {
      setIsEditing(true);
      setEditValue('');
      isNewNode.current = false;
    }
  }, []);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync editValue when data.label changes externally (e.g., from panel)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(data.label);
    }
  }, [data.label, isEditing]);

  const saveAndExit = useCallback(() => {
    const trimmedValue = editValue.trim();
    const finalValue = trimmedValue || 'Untitled';
    
    setIsEditing(false);
    setEditValue(finalValue);
    
    if (finalValue !== data.label) {
      onUpdateLabel(id, finalValue);
    }
  }, [editValue, data.label, id, onUpdateLabel]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndExit();
    } else if (e.key === 'Escape') {
      setEditValue(data.label);
      setIsEditing(false);
    }
  }, [saveAndExit, data.label]);

  const handleAddChild = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddChild(id);
  }, [id, onAddChild]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isEditing) {
      e.stopPropagation();
      onSelectNode(id);
    }
  }, [id, onSelectNode, isEditing]);

  const handleMouseEnter = useCallback(() => {
    if (isTraceMode) {
      onNodeHover(id);
    }
  }, [id, isTraceMode, onNodeHover]);

  const handleMouseLeave = useCallback(() => {
    if (isTraceMode) {
      onNodeHover(null);
    }
  }, [isTraceMode, onNodeHover]);

  const isSelected = selected || selectedNodeId === id;

  // Determine node styling based on mode
  const getNodeClass = () => {
    // Base classes
    let classes = 'group relative w-[160px] bg-[var(--bg-node)] rounded-lg border-2 transition-all duration-300 ease-out';
    
    // Selection state
    if (isSelected) {
      classes += ' border-[var(--accent)] shadow-lg shadow-[var(--accent)]/20';
    } else {
      classes += ' border-[var(--border-subtle)] hover:border-[var(--text-muted)]';
    }
    
    // Trace mode
    if (isTraceMode) {
      if (isTraceHighlighted) {
        classes += ' !border-[var(--accent)] shadow-lg shadow-[var(--accent)]/30 scale-105 z-10';
      } else if (traceHighlightedNodes.size > 0) {
        classes += ' opacity-30';
      }
    }
    // Simulation mode (only if not in trace mode)
    else if (isSimulating) {
      if (isReachable) {
        classes += ' border-[var(--accent)] shadow-md shadow-[var(--accent)]/10';
      } else {
        classes += ' opacity-30 scale-95';
      }
    }
    
    return classes;
  };

  return (
    <div
      className={getNodeClass()}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-[var(--border-subtle)] !border-[var(--bg-node)]"
      />

      {/* Node content */}
      <div className="px-4 py-3 text-center h-[42px] flex flex-col justify-center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveAndExit}
            onKeyDown={handleInputKeyDown}
            className="
              w-full bg-transparent border-none outline-none
              text-[var(--text-primary)] text-sm font-medium text-center leading-5
              placeholder-[var(--text-muted)]
            "
            placeholder="Enter feature name..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-[var(--text-primary)] text-sm font-medium truncate leading-5">
            {data.label}
          </div>
        )}
        
        {data.description && !isEditing && (
          <div className="text-[var(--text-muted)] text-xs mt-1 truncate">
            {data.description}
          </div>
        )}
      </div>

      {/* Add child button */}
      <button
        onClick={handleAddChild}
        className="
          absolute -bottom-3 left-1/2 -translate-x-1/2
          w-6 h-6 rounded-full
          bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]
          text-[var(--text-muted)] hover:text-[var(--accent)]
          hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          transition-all duration-150
          text-lg leading-none
        "
        title="Add child feature"
      >
        +
      </button>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-[var(--border-subtle)] !border-[var(--bg-node)] !bottom-0"
      />
    </div>
  );
}

export default memo(FeatureNodeComponent);
