import type { Node, Edge } from '@xyflow/react';

// Rule operators
export type RuleOperator = 'is' | 'is_not' | 'greater_than' | 'less_than';

// A single rule on an edge
export interface EdgeRule {
  id: string;
  condition: string;      // e.g., "role", "exam_state", "is_author"
  operator: RuleOperator;
  value: string | number | boolean;
}

// Base data stored in each node
export interface FeatureNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
}

// React Flow Node with our custom data
export type FeatureNode = Node<FeatureNodeData, 'feature'>;

// Extended edge with rules
export interface FeatureEdge extends Edge {
  data?: {
    rules?: EdgeRule[];
  };
}

// Auto-discovered condition schema for simulation panel
export type ConditionType = 'boolean' | 'enum' | 'number';

export interface ConditionSchema {
  name: string;
  type: ConditionType;
  options: (string | number | boolean)[]; // All seen values
}

// Simulation state - current values for all conditions
export interface SimulationState {
  [conditionId: string]: string | number | boolean;
}

// The complete graph structure for export/import
export interface FlowGraph {
  nodes: FeatureNode[];
  edges: FeatureEdge[];
}

// Helper to display rule as text
export function ruleToText(rule: EdgeRule): string {
  const opText = {
    is: 'is',
    is_not: 'is not',
    greater_than: '>',
    less_than: '<',
  }[rule.operator];
  
  const valueText = typeof rule.value === 'boolean' 
    ? (rule.value ? 'true' : 'false')
    : String(rule.value);
    
  return `${rule.condition} ${opText} ${valueText}`;
}

// Check if a single rule passes
export function evaluateRule(rule: EdgeRule, state: SimulationState): boolean {
  const currentValue = state[rule.condition];
  if (currentValue === undefined) return true; // Undefined = no constraint
  
  switch (rule.operator) {
    case 'is':
      return currentValue === rule.value;
    case 'is_not':
      return currentValue !== rule.value;
    case 'greater_than':
      return typeof currentValue === 'number' && typeof rule.value === 'number' 
        && currentValue > rule.value;
    case 'less_than':
      return typeof currentValue === 'number' && typeof rule.value === 'number'
        && currentValue < rule.value;
    default:
      return true;
  }
}

// Check if all rules on an edge pass (just the rules, not flow)
export function evaluateEdgeRules(edge: FeatureEdge, state: SimulationState): boolean {
  const rules = edge.data?.rules || [];
  if (rules.length === 0) return true; // No rules = always valid
  return rules.every(rule => evaluateRule(rule, state));
}

// Flow-based evaluation result
export interface FlowEvaluationResult {
  reachableNodes: Set<string>;
  validEdges: Map<string, boolean>;
}

// Evaluate the entire flow - edges are only valid if their source is reachable
export function evaluateFlow(
  nodes: FeatureNode[],
  edges: FeatureEdge[],
  state: SimulationState
): FlowEvaluationResult {
  const reachableNodes = new Set<string>();
  const validEdges = new Map<string, boolean>();
  
  // Find root nodes (nodes with no incoming edges)
  const nodesWithIncoming = new Set(edges.map(e => e.target));
  const rootNodes = nodes.filter(n => !nodesWithIncoming.has(n.id));
  
  // All root nodes are reachable by default
  for (const root of rootNodes) {
    reachableNodes.add(root.id);
  }
  
  // Build adjacency list for traversal
  const outgoingEdges = new Map<string, FeatureEdge[]>();
  for (const edge of edges) {
    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge);
  }
  
  // BFS to propagate reachability
  const queue = [...rootNodes.map(n => n.id)];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const nodeEdges = outgoingEdges.get(nodeId) || [];
    
    for (const edge of nodeEdges) {
      // Edge is valid only if source is reachable AND rules pass
      const sourceReachable = reachableNodes.has(edge.source);
      const rulesPass = evaluateEdgeRules(edge, state);
      const edgeValid = sourceReachable && rulesPass;
      
      validEdges.set(edge.id, edgeValid);
      
      // If edge is valid, target becomes reachable
      if (edgeValid) {
        reachableNodes.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  
  // Mark any unvisited edges as invalid (disconnected parts)
  for (const edge of edges) {
    if (!validEdges.has(edge.id)) {
      validEdges.set(edge.id, false);
    }
  }
  
  return { reachableNodes, validEdges };
}

// Extract all unique conditions from edges
export function discoverConditions(edges: FeatureEdge[]): ConditionSchema[] {
  const conditionMap = new Map<string, Set<string | number | boolean>>();
  
  for (const edge of edges) {
    const rules = edge.data?.rules || [];
    for (const rule of rules) {
      if (!conditionMap.has(rule.condition)) {
        conditionMap.set(rule.condition, new Set());
      }
      conditionMap.get(rule.condition)!.add(rule.value);
    }
  }
  
  const conditions: ConditionSchema[] = [];
  
  for (const [name, values] of conditionMap) {
    const valueArray = Array.from(values);
    
    // Infer type from values
    let type: ConditionType = 'enum';
    if (valueArray.every(v => typeof v === 'boolean')) {
      type = 'boolean';
    } else if (valueArray.every(v => typeof v === 'number')) {
      type = 'number';
    }
    
    conditions.push({
      name,
      type,
      options: valueArray.sort((a, b) => String(a).localeCompare(String(b))),
    });
  }
  
  return conditions.sort((a, b) => a.name.localeCompare(b.name));
}
