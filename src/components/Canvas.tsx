import { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  ConnectionLineType,
  SelectionMode,
} from '@xyflow/react';
import type { NodeTypes, EdgeTypes, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import FeatureNode from './FeatureNode';
import Toolbar from './Toolbar';
import NodePanel from './NodePanel';
import EdgePanel from './EdgePanel';
import SimulationPanel from './SimulationPanel';
import { useFlowGraph } from '../hooks/useFlowGraph';
import { FlowContext } from '../context/FlowContext';
import type { FeatureEdge } from '../types';

// Define nodeTypes outside component to prevent recreation
const nodeTypes: NodeTypes = {
  feature: FeatureNode,
};

// Custom edge component for styling based on rules
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
  style,
}: any) {
  // Create a smooth step path
  const midY = (sourceY + targetY) / 2;
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
  
  const hasRules = data?.rules && data.rules.length > 0;
  const isValid = data?._isValid !== false;
  const isSimulating = data?._isSimulating === true;
  const isTraceHighlighted = data?._isTraceHighlighted === true;
  const isTraceMode = data?._isTraceMode === true;

  // Determine edge styling
  const getEdgeClass = () => {
    if (selected) return '!stroke-[var(--accent)]';
    if (isTraceMode && isTraceHighlighted) return '!stroke-[var(--accent)] !stroke-[3px]';
    if (isTraceMode && !isTraceHighlighted) return '!opacity-20';
    if (isSimulating && !isValid) return '!stroke-[var(--danger)] !opacity-30';
    if (isSimulating && isValid) return '!stroke-[var(--accent)]';
    return '';
  };

  return (
    <>
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        className="react-flow__edge-interaction"
      />
      {/* Visible path */}
      <path
        id={id}
        d={path}
        fill="none"
        strokeWidth={isTraceHighlighted ? 3 : 2}
        className={`
          react-flow__edge-path
          transition-all duration-300
          ${getEdgeClass()}
        `}
        style={style}
        markerEnd="url(#arrow)"
      />
      {/* Rule indicator */}
      {hasRules && (
        <circle
          cx={(sourceX + targetX) / 2}
          cy={midY}
          r={6}
          className={`
            transition-all duration-300
            ${isTraceMode && isTraceHighlighted
              ? 'fill-[var(--accent)]'
              : isTraceMode && !isTraceHighlighted
                ? 'fill-[var(--bg-tertiary)] stroke-[var(--border-subtle)] opacity-20'
                : isSimulating && !isValid 
                  ? 'fill-[var(--danger)] opacity-50' 
                  : isSimulating && isValid
                    ? 'fill-[var(--accent)]'
                    : 'fill-[var(--bg-tertiary)] stroke-[var(--border-subtle)]'
            }
          `}
          strokeWidth={1}
        />
      )}
    </>
  );
}

const edgeTypes: EdgeTypes = {
  default: CustomEdge,
};

function FlowCanvas() {
  const {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    selectedEdge,
    selectedEdgeId,
    conditions,
    allConditionNames,
    simulationState,
    isSimulating,
    edgeValidityMap,
    reachableNodes,
    isTraceMode,
    traceHighlight,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addChildNode,
    updateNodeData,
    deleteNode,
    deleteEdge,
    selectNode,
    selectEdge,
    addRuleToEdge,
    removeRule,
    getValuesForCondition,
    updateSimulationValue,
    toggleSimulation,
    resetSimulation,
    toggleTraceMode,
    setHoveredNodeId,
    exportGraph,
    importGraph,
    clearGraph,
  } = useFlowGraph();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Memoize context value to prevent unnecessary re-renders
  const flowContextValue = useMemo(() => ({
    onAddChild: addChildNode,
    onSelectNode: selectNode,
    onUpdateLabel: (nodeId: string, label: string) => updateNodeData(nodeId, { label }),
    selectedNodeId,
    isSimulating,
    reachableNodes,
    isTraceMode,
    onNodeHover: setHoveredNodeId,
    traceHighlightedNodes: traceHighlight.highlightedNodes,
  }), [addChildNode, selectNode, updateNodeData, selectedNodeId, isSimulating, reachableNodes, isTraceMode, setHoveredNodeId, traceHighlight.highlightedNodes]);

  // Process edges to include validity info for rendering
  const processedEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      type: 'default',
      data: {
        ...edge.data,
        _isValid: edgeValidityMap.get(edge.id) ?? true,
        _isSimulating: isSimulating,
        _isTraceHighlighted: traceHighlight.highlightedEdges.has(edge.id),
        _isTraceMode: isTraceMode,
      },
    }));
  }, [edges, edgeValidityMap, isSimulating, traceHighlight.highlightedEdges, isTraceMode]);

  // Double-click on canvas to add a new root node
  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    addNode('New Feature', position);
  }, [screenToFlowPosition, addNode]);

  // Add root node from toolbar (center of viewport)
  const handleAddRootNode = useCallback(() => {
    if (reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: bounds.width / 2,
        y: bounds.height / 3,
      });
      addNode('New Feature', position);
    }
  }, [screenToFlowPosition, addNode]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Don't trigger shortcuts when typing in an input
    if ((event.target as HTMLElement).tagName === 'INPUT' || 
        (event.target as HTMLElement).tagName === 'TEXTAREA' ||
        (event.target as HTMLElement).tagName === 'SELECT') {
      return;
    }
    
    // Delete selected elements
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedNodeId) {
        deleteNode(selectedNodeId);
      } else if (selectedEdgeId) {
        deleteEdge(selectedEdgeId);
      }
    }
    // Escape to deselect
    if (event.key === 'Escape') {
      selectNode(null);
      selectEdge(null);
    }
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, selectNode, selectEdge]);

  // Handle clicking on pane to deselect
  const handlePaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // Handle edge click
  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    selectEdge(edge.id);
  }, [selectEdge]);

  // Get source and target nodes for selected edge
  const sourceNode = selectedEdge ? nodes.find(n => n.id === selectedEdge.source) : undefined;
  const targetNode = selectedEdge ? nodes.find(n => n.id === selectedEdge.target) : undefined;

  return (
    <FlowContext.Provider value={flowContextValue}>
      <div
        ref={reactFlowWrapper}
        className="w-full h-full"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <ReactFlow
          nodes={nodes}
          edges={processedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={handlePaneClick}
          onDoubleClick={handlePaneDoubleClick}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          snapToGrid
          snapGrid={[20, 20]}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          selectNodesOnDrag={false}
          panOnDrag={[1, 2]}
          defaultEdgeOptions={{
            type: 'default',
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          proOptions={{ hideAttribution: true }}
        >
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-subtle)" />
            </marker>
          </defs>
          
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--border-subtle)"
          />
          <Controls
            showInteractive={false}
            position="bottom-right"
          />
          <MiniMap
            position="bottom-left"
            zoomable
            pannable
            nodeColor="var(--accent)"
          />
        </ReactFlow>

        <Toolbar
          onAddRootNode={handleAddRootNode}
          onExport={exportGraph}
          onImport={importGraph}
          onClear={clearGraph}
          hasNodes={nodes.length > 0}
        />

        <SimulationPanel
          conditions={conditions}
          state={simulationState}
          isActive={isSimulating}
          onToggle={toggleSimulation}
          onUpdateValue={updateSimulationValue}
          onReset={resetSimulation}
        />

        {/* Trace Mode Toggle - positioned below toolbar */}
        <div className="absolute top-16 left-4 z-20">
          <button
            onClick={toggleTraceMode}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg
              border transition-all duration-200
              ${isTraceMode 
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20' 
                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
              }
            `}
            title="Trace Mode: Hover over nodes to highlight their path to root"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-sm">Trace</span>
            {isTraceMode && (
              <span className="text-xs opacity-75">(hover nodes)</span>
            )}
          </button>
        </div>

        <NodePanel
          node={selectedNode}
          onClose={() => selectNode(null)}
          onUpdate={updateNodeData}
          onDelete={deleteNode}
        />

        {selectedEdge && (
          <EdgePanel
            edge={selectedEdge as FeatureEdge}
            sourceNode={sourceNode}
            targetNode={targetNode}
            existingConditions={allConditionNames}
            getValuesForCondition={getValuesForCondition}
            onClose={() => selectEdge(null)}
            onAddRule={addRuleToEdge}
            onRemoveRule={removeRule}
            onDeleteEdge={deleteEdge}
          />
        )}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-[var(--text-muted)] text-lg mb-2">
                No features yet
              </div>
              <div className="text-[var(--text-secondary)] text-sm">
                Click <span className="text-[var(--accent)] font-medium">+ Add Feature</span> or double-click anywhere to start
              </div>
            </div>
          </div>
        )}
      </div>
    </FlowContext.Provider>
  );
}

// Wrap with ReactFlowProvider
export default function Canvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
