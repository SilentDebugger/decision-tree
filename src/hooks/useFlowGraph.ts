import { useCallback, useState, useMemo, useEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import type { Connection } from '@xyflow/react';
import { nanoid } from 'nanoid';
import type { FeatureNode, FeatureEdge, FlowGraph, EdgeRule, SimulationState } from '../types';
import { discoverConditions, evaluateFlow } from '../types';

const STORAGE_KEY = 'feature-flow-graph';

// Load initial state from localStorage
function loadFromStorage(): { nodes: FeatureNode[]; edges: FeatureEdge[] } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
  return { nodes: [], edges: [] };
}

// Save state to localStorage
function saveToStorage(nodes: FeatureNode[], edges: FeatureEdge[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

const initialState = loadFromStorage();

export function useFlowGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FeatureNode>(initialState.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FeatureEdge>(initialState.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationState>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTraceMode, setIsTraceMode] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Auto-save to localStorage whenever nodes or edges change
  useEffect(() => {
    saveToStorage(nodes, edges);
  }, [nodes, edges]);

  // Auto-discover conditions from all edges
  const conditions = useMemo(() => discoverConditions(edges), [edges]);

  // Get all unique condition names (for autocomplete)
  const allConditionNames = useMemo(() => {
    return Array.from(new Set(conditions.map(c => c.name)));
  }, [conditions]);

  // Get all unique values for a condition (for autocomplete)
  const getValuesForCondition = useCallback((conditionName: string) => {
    const condition = conditions.find(c => c.name === conditionName);
    return condition?.options || [];
  }, [conditions]);

  // Calculate which edges and nodes are valid based on flow evaluation
  const flowEvaluation = useMemo(() => {
    if (!isSimulating) {
      return { 
        reachableNodes: new Set<string>(), 
        validEdges: new Map<string, boolean>() 
      };
    }
    return evaluateFlow(nodes, edges, simulationState);
  }, [nodes, edges, simulationState, isSimulating]);

  const edgeValidityMap = flowEvaluation.validEdges;
  const reachableNodes = flowEvaluation.reachableNodes;

  // Calculate ancestor nodes and edges for trace mode
  const traceHighlight = useMemo(() => {
    const highlightedNodes = new Set<string>();
    const highlightedEdges = new Set<string>();
    
    if (!isTraceMode || !hoveredNodeId) {
      return { highlightedNodes, highlightedEdges };
    }

    // Build incoming edges map
    const incomingEdges = new Map<string, FeatureEdge[]>();
    for (const edge of edges) {
      if (!incomingEdges.has(edge.target)) {
        incomingEdges.set(edge.target, []);
      }
      incomingEdges.get(edge.target)!.push(edge);
    }

    // BFS backwards to find all ancestors
    const queue = [hoveredNodeId];
    highlightedNodes.add(hoveredNodeId);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const incoming = incomingEdges.get(nodeId) || [];
      
      for (const edge of incoming) {
        highlightedEdges.add(edge.id);
        if (!highlightedNodes.has(edge.source)) {
          highlightedNodes.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    return { highlightedNodes, highlightedEdges };
  }, [isTraceMode, hoveredNodeId, edges]);

  // Toggle trace mode
  const toggleTraceMode = useCallback(() => {
    setIsTraceMode((prev) => !prev);
    if (isTraceMode) {
      setHoveredNodeId(null);
    }
  }, [isTraceMode]);

  // Add a new node
  const addNode = useCallback((
    label: string,
    position: { x: number; y: number },
    parentId?: string
  ) => {
    const newNodeId = nanoid(8);
    
    const newNode: FeatureNode = {
      id: newNodeId,
      type: 'feature',
      position,
      data: { label },
    };

    setNodes((nds) => [...nds, newNode]);

    // If there's a parent, create an edge
    if (parentId) {
      const newEdge: FeatureEdge = {
        id: `e-${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        data: { rules: [] },
      };
      setEdges((eds) => [...eds, newEdge]);
    }

    return newNodeId;
  }, [setNodes, setEdges]);

  // Add a child node to an existing node with smart positioning
  const addChildNode = useCallback((parentId: string) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    // Find existing children of this parent
    const childEdges = edges.filter((e) => e.source === parentId);
    const existingChildren = childEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter(Boolean) as FeatureNode[];

    const NODE_WIDTH = 160;
    const NODE_SPACING = 40;
    const VERTICAL_GAP = 100;

    let newChildPosition: { x: number; y: number };

    if (existingChildren.length === 0) {
      // First child: center it below parent
      newChildPosition = {
        x: parentNode.position.x,
        y: parentNode.position.y + VERTICAL_GAP,
      };
    } else {
      // Find the rightmost and leftmost child positions
      const childXPositions = existingChildren.map((c) => c.position.x).sort((a, b) => a - b);
      const leftmost = childXPositions[0];
      const rightmost = childXPositions[childXPositions.length - 1];
      const parentX = parentNode.position.x;

      // Determine which side has more room relative to parent center
      const spaceOnLeft = parentX - leftmost;
      const spaceOnRight = rightmost - parentX;

      // Place on the side with less coverage to balance the tree
      if (spaceOnRight >= spaceOnLeft) {
        // Add to the right
        newChildPosition = {
          x: rightmost + NODE_WIDTH + NODE_SPACING,
          y: existingChildren[0].position.y,
        };
      } else {
        // Add to the left
        newChildPosition = {
          x: leftmost - NODE_WIDTH - NODE_SPACING,
          y: existingChildren[0].position.y,
        };
      }
    }

    return addNode('New Feature', newChildPosition, parentId);
  }, [nodes, edges, addNode]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, data: Partial<FeatureNode['data']>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);

  // Delete a node and its connected edges
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [setNodes, setEdges, selectedNodeId]);

  // Delete multiple nodes and their connected edges
  const deleteNodes = useCallback((nodeIds: string[]) => {
    const idsSet = new Set(nodeIds);
    setNodes((nds) => nds.filter((node) => !idsSet.has(node.id)));
    setEdges((eds) => eds.filter((edge) => !idsSet.has(edge.source) && !idsSet.has(edge.target)));
    if (selectedNodeId && idsSet.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [setNodes, setEdges, selectedNodeId]);

  // Delete all selected nodes
  const deleteSelectedNodes = useCallback(() => {
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length > 0) {
      deleteNodes(selectedIds);
      return true;
    }
    return false;
  }, [nodes, deleteNodes]);

  // Delete an edge
  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
    }
  }, [setEdges, selectedEdgeId]);

  // Handle new connections
  const onConnect = useCallback((connection: Connection) => {
    const newEdge: FeatureEdge = {
      ...connection,
      id: nanoid(8),
      source: connection.source!,
      target: connection.target!,
      data: { rules: [] },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Select a node (for the detail panel)
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) setSelectedEdgeId(null); // Deselect edge when selecting node
  }, []);

  // Select an edge (for the rule panel)
  const selectEdge = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) setSelectedNodeId(null); // Deselect node when selecting edge
  }, []);

  // Get the currently selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Get the currently selected edge
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) || null;

  // Add a rule to an edge
  const addRuleToEdge = useCallback((edgeId: string, rule: Omit<EdgeRule, 'id'>) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                rules: [...(edge.data?.rules || []), { ...rule, id: nanoid(6) }],
              },
            }
          : edge
      )
    );
  }, [setEdges]);

  // Update a rule on an edge
  const updateRule = useCallback((edgeId: string, ruleId: string, updates: Partial<EdgeRule>) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                rules: (edge.data?.rules || []).map((rule) =>
                  rule.id === ruleId ? { ...rule, ...updates } : rule
                ),
              },
            }
          : edge
      )
    );
  }, [setEdges]);

  // Remove a rule from an edge
  const removeRule = useCallback((edgeId: string, ruleId: string) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                rules: (edge.data?.rules || []).filter((rule) => rule.id !== ruleId),
              },
            }
          : edge
      )
    );
  }, [setEdges]);

  // Update simulation state
  const updateSimulationValue = useCallback((condition: string, value: string | number | boolean) => {
    setSimulationState((prev) => ({ ...prev, [condition]: value }));
  }, []);

  // Clear a simulation value (toggle off)
  const clearSimulationValue = useCallback((condition: string) => {
    setSimulationState((prev) => {
      const next = { ...prev };
      delete next[condition];
      return next;
    });
  }, []);

  // Manual save (triggers the auto-save effect)
  const saveGraph = useCallback(() => {
    saveToStorage(nodes, edges);
  }, [nodes, edges]);

  // Toggle simulation mode
  const toggleSimulation = useCallback(() => {
    setIsSimulating((prev) => !prev);
  }, []);

  // Reset simulation state
  const resetSimulation = useCallback(() => {
    setSimulationState({});
  }, []);

  // Export graph data
  const exportGraph = useCallback((): FlowGraph => {
    return { nodes, edges };
  }, [nodes, edges]);

  // Import graph data
  const importGraph = useCallback((graph: FlowGraph) => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSimulationState({});
    setIsSimulating(false);
  }, [setNodes, setEdges]);

  // Clear all nodes and edges
  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSimulationState({});
    setIsSimulating(false);
  }, [setNodes, setEdges]);

  return {
    // State
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
    hoveredNodeId,
    traceHighlight,
    
    // Node operations
    onNodesChange,
    addNode,
    addChildNode,
    updateNodeData,
    deleteNode,
    deleteNodes,
    deleteSelectedNodes,
    selectNode,
    
    // Edge operations
    onEdgesChange,
    onConnect,
    deleteEdge,
    selectEdge,
    
    // Rule operations
    addRuleToEdge,
    updateRule,
    removeRule,
    getValuesForCondition,
    
    // Simulation operations
    updateSimulationValue,
    clearSimulationValue,
    toggleSimulation,
    resetSimulation,
    
    // Save operations
    saveGraph,
    
    // Trace mode operations
    toggleTraceMode,
    setHoveredNodeId,
    
    // Graph operations
    exportGraph,
    importGraph,
    clearGraph,
  };
}
