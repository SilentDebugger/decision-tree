import { createContext, useContext } from 'react';

interface FlowContextValue {
  onAddChild: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onUpdateLabel: (nodeId: string, label: string) => void;
  selectedNodeId: string | null;
  isSimulating: boolean;
  reachableNodes: Set<string>;
  isTraceMode: boolean;
  onNodeHover: (nodeId: string | null) => void;
  traceHighlightedNodes: Set<string>;
}

export const FlowContext = createContext<FlowContextValue | null>(null);

export function useFlowContext() {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlowContext must be used within FlowContext.Provider');
  }
  return context;
}
