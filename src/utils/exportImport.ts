import type { FlowGraph } from '../types';

export function exportToJson(graph: FlowGraph, filename: string = 'feature-flow.json'): void {
  const jsonString = JSON.stringify(graph, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importFromJson(file: File): Promise<FlowGraph> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const graph = JSON.parse(content) as FlowGraph;
        
        // Basic validation
        if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
          throw new Error('Invalid graph structure: missing nodes or edges array');
        }
        
        // Validate nodes have required fields
        for (const node of graph.nodes) {
          if (!node.id || !node.position || node.data?.label === undefined) {
            throw new Error('Invalid node structure: missing required fields');
          }
        }
        
        // Validate edges have required fields
        for (const edge of graph.edges) {
          if (!edge.id || !edge.source || !edge.target) {
            throw new Error('Invalid edge structure: missing required fields');
          }
        }
        
        resolve(graph);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse JSON'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

