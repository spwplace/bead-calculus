export type BeadKind = 
  | 'red' 
  | 'blue' 
  | 'green' 
  | 'yellow' 
  | 'purple' 
  | 'orange' 
  | 'cyan' 
  | 'white' 
  | 'black'
  | 'signal';

export const BEAD_COLORS: Record<BeadKind, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  cyan: '#06b6d4',
  white: '#f8fafc',
  black: '#1e293b',
  signal: '#f59e0b',
};

export interface Port {
  id: string;
  kind: BeadKind;
  direction: 'input' | 'output';
}

export type NodeType =
  | 'identity'
  | 'swap'
  | 'delay'
  | 'split'
  | 'merge'
  | 'trace-in'
  | 'trace-out'
  | 'unit'
  | 'counit'
  | 'cup'
  | 'cap'
  | 'painter'
  | 'filter';

export interface PainterConfig {
  targetColor: BeadKind;
}

export interface FilterConfig {
  matchColor: BeadKind;
}

export type NodeConfig = PainterConfig | FilterConfig;

export const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  'identity': { width: 40, height: 40 },
  'swap': { width: 60, height: 60 },
  'delay': { width: 50, height: 50 },
  'split': { width: 50, height: 60 },
  'merge': { width: 50, height: 60 },
  'trace-in': { width: 50, height: 50 },
  'trace-out': { width: 50, height: 50 },
  'unit': { width: 40, height: 40 },
  'counit': { width: 40, height: 40 },
  'cup': { width: 60, height: 50 },
  'cap': { width: 60, height: 50 },
  'painter': { width: 60, height: 50 },
  'filter': { width: 60, height: 70 },
};

export const NODE_NAMES: Record<NodeType, string> = {
  'identity': 'Wire',
  'swap': 'Swap',
  'delay': 'Delay',
  'split': 'Split',
  'merge': 'Merge',
  'trace-in': 'Loop In',
  'trace-out': 'Loop Out',
  'unit': 'Source',
  'counit': 'Sink',
  'cup': 'Cup',
  'cap': 'Cap',
  'painter': 'Painter',
  'filter': 'Filter',
};

export interface Node {
  id: string;
  type: NodeType;
  inputs: Port[];
  outputs: Port[];
  position: { x: number; y: number };
  config?: NodeConfig;
}

export interface Edge {
  id: string;
  from: { nodeId: string; portId: string };
  to: { nodeId: string; portId: string };
}

export interface TracePair {
  id: string;
  traceInNodeId: string;
  traceOutNodeId: string;
  kind: BeadKind;
}

export interface CupCapPair {
  id: string;
  cupNodeId: string;
  capNodeId: string;
  kind: BeadKind;
}

export interface Diagram {
  nodes: Node[];
  edges: Edge[];
  tracePairs: TracePair[];
  cupCapPairs: CupCapPair[];
  boundaryInputs: Port[];
  boundaryOutputs: Port[];
}

let idCounter = 0;

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function createPort(kind: BeadKind, direction: 'input' | 'output'): Port {
  return {
    id: generateId('port'),
    kind,
    direction,
  };
}

function getDefaultPorts(type: NodeType): { inputs: BeadKind[]; outputs: BeadKind[] } {
  switch (type) {
    case 'identity':
      return { inputs: ['signal'], outputs: ['signal'] };
    case 'swap':
      return { inputs: ['signal', 'signal'], outputs: ['signal', 'signal'] };
    case 'delay':
      return { inputs: ['signal'], outputs: ['signal'] };
    case 'split':
      return { inputs: ['signal'], outputs: ['signal', 'signal'] };
    case 'merge':
      return { inputs: ['signal', 'signal'], outputs: ['signal'] };
    case 'trace-in':
      return { inputs: ['signal'], outputs: ['signal'] };
    case 'trace-out':
      return { inputs: ['signal'], outputs: ['signal'] };
    case 'unit':
      return { inputs: [], outputs: ['signal'] };
    case 'counit':
      return { inputs: ['signal'], outputs: [] };
    case 'cup':
      return { inputs: [], outputs: ['signal', 'signal'] };
    case 'cap':
      return { inputs: ['signal', 'signal'], outputs: [] };
    case 'painter':
      return { inputs: ['signal'], outputs: ['signal'] };
    case 'filter':
      return { inputs: ['signal'], outputs: ['signal', 'signal'] };
    default:
      return { inputs: [], outputs: [] };
  }
}

export function createNode(
  type: NodeType,
  position: { x: number; y: number },
  portConfig?: { inputs?: BeadKind[]; outputs?: BeadKind[] },
  config?: NodeConfig
): Node {
  const defaultPorts = getDefaultPorts(type);
  const inputKinds = portConfig?.inputs ?? defaultPorts.inputs;
  const outputKinds = portConfig?.outputs ?? defaultPorts.outputs;

  return {
    id: generateId('node'),
    type,
    inputs: inputKinds.map(kind => createPort(kind, 'input')),
    outputs: outputKinds.map(kind => createPort(kind, 'output')),
    position,
    config,
  };
}

export function createEdge(
  fromNodeId: string,
  fromPortId: string,
  toNodeId: string,
  toPortId: string
): Edge {
  return {
    id: generateId('edge'),
    from: { nodeId: fromNodeId, portId: fromPortId },
    to: { nodeId: toNodeId, portId: toPortId },
  };
}

export function createTracePair(
  traceInNodeId: string,
  traceOutNodeId: string,
  kind: BeadKind = 'signal'
): TracePair {
  return {
    id: generateId('trace'),
    traceInNodeId,
    traceOutNodeId,
    kind,
  };
}

export function createCupCapPair(
  cupNodeId: string,
  capNodeId: string,
  kind: BeadKind = 'signal'
): CupCapPair {
  return {
    id: generateId('cupcap'),
    cupNodeId,
    capNodeId,
    kind,
  };
}

export function createDiagram(
  nodes: Node[] = [],
  edges: Edge[] = [],
  boundaryInputs: Port[] = [],
  boundaryOutputs: Port[] = [],
  tracePairs: TracePair[] = [],
  cupCapPairs: CupCapPair[] = []
): Diagram {
  return {
    nodes,
    edges,
    tracePairs,
    cupCapPairs,
    boundaryInputs,
    boundaryOutputs,
  };
}

export function findNode(diagram: Diagram, nodeId: string): Node | undefined {
  return diagram.nodes.find(n => n.id === nodeId);
}

export function findPort(diagram: Diagram, nodeId: string, portId: string): Port | undefined {
  const node = findNode(diagram, nodeId);
  if (!node) return undefined;
  return [...node.inputs, ...node.outputs].find(p => p.id === portId);
}

export function findEdgesFromPort(diagram: Diagram, nodeId: string, portId: string): Edge[] {
  return diagram.edges.filter(
    e => e.from.nodeId === nodeId && e.from.portId === portId
  );
}

export function findEdgesToPort(diagram: Diagram, nodeId: string, portId: string): Edge[] {
  return diagram.edges.filter(
    e => e.to.nodeId === nodeId && e.to.portId === portId
  );
}

export function findTracePairByTraceIn(diagram: Diagram, traceInNodeId: string): TracePair | undefined {
  return diagram.tracePairs.find(tp => tp.traceInNodeId === traceInNodeId);
}

export function findTracePairByTraceOut(diagram: Diagram, traceOutNodeId: string): TracePair | undefined {
  return diagram.tracePairs.find(tp => tp.traceOutNodeId === traceOutNodeId);
}

export function getConnectedPorts(
  diagram: Diagram,
  nodeId: string,
  portId: string
): Array<{ nodeId: string; portId: string }> {
  const port = findPort(diagram, nodeId, portId);
  if (!port) return [];

  if (port.direction === 'output') {
    return findEdgesFromPort(diagram, nodeId, portId).map(e => e.to);
  } else {
    return findEdgesToPort(diagram, nodeId, portId).map(e => e.from);
  }
}

export function getNodeInputSources(diagram: Diagram, nodeId: string): Array<{ nodeId: string; portId: string }> {
  const sources: Array<{ nodeId: string; portId: string }> = [];
  for (const edge of diagram.edges) {
    if (edge.to.nodeId === nodeId) {
      sources.push(edge.from);
    }
  }
  return sources;
}

export function getNodeOutputTargets(diagram: Diagram, nodeId: string): Array<{ nodeId: string; portId: string }> {
  const targets: Array<{ nodeId: string; portId: string }> = [];
  for (const edge of diagram.edges) {
    if (edge.from.nodeId === nodeId) {
      targets.push(edge.to);
    }
  }
  return targets;
}

export function computeTensorFactors(diagram: Diagram): string[][] {
  const nodeIds = new Set(diagram.nodes.map(n => n.id));
  const adjacency = new Map<string, Set<string>>();
  
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, new Set());
  }
  
  for (const edge of diagram.edges) {
    adjacency.get(edge.from.nodeId)?.add(edge.to.nodeId);
    adjacency.get(edge.to.nodeId)?.add(edge.from.nodeId);
  }
  
  for (const tp of diagram.tracePairs) {
    adjacency.get(tp.traceInNodeId)?.add(tp.traceOutNodeId);
    adjacency.get(tp.traceOutNodeId)?.add(tp.traceInNodeId);
  }
  
  const visited = new Set<string>();
  const factors: string[][] = [];
  
  for (const nodeId of nodeIds) {
    if (visited.has(nodeId)) continue;
    
    const factor: string[] = [];
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      factor.push(current);
      
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    
    factors.push(factor);
  }
  
  return factors;
}

export function areNodesInSameFactor(diagram: Diagram, nodeIdA: string, nodeIdB: string): boolean {
  const factors = computeTensorFactors(diagram);
  for (const factor of factors) {
    if (factor.includes(nodeIdA) && factor.includes(nodeIdB)) {
      return true;
    }
  }
  return false;
}

export function areNodesInIndependentFactors(diagram: Diagram, nodeIdA: string, nodeIdB: string): boolean {
  return !areNodesInSameFactor(diagram, nodeIdA, nodeIdB);
}

export interface ValidationError {
  type: 'type-mismatch' | 'disconnected-port' | 'cycle' | 'multiple-inputs' | 'invalid-trace-pair';
  message: string;
  location?: { nodeId: string; portId?: string };
}

export function validateDiagram(diagram: Diagram): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const edge of diagram.edges) {
    const fromPort = findPort(diagram, edge.from.nodeId, edge.from.portId);
    const toPort = findPort(diagram, edge.to.nodeId, edge.to.portId);

    if (!fromPort || !toPort) {
      errors.push({
        type: 'disconnected-port',
        message: `Edge ${edge.id} references non-existent port`,
      });
      continue;
    }

    if (fromPort.kind !== toPort.kind) {
      errors.push({
        type: 'type-mismatch',
        message: `Type mismatch on edge ${edge.id}: ${fromPort.kind} → ${toPort.kind}`,
        location: { nodeId: edge.from.nodeId, portId: edge.from.portId },
      });
    }

    if (fromPort.direction !== 'output') {
      errors.push({
        type: 'type-mismatch',
        message: `Edge ${edge.id} starts from non-output port`,
        location: { nodeId: edge.from.nodeId, portId: edge.from.portId },
      });
    }

    if (toPort.direction !== 'input') {
      errors.push({
        type: 'type-mismatch',
        message: `Edge ${edge.id} ends at non-input port`,
        location: { nodeId: edge.to.nodeId, portId: edge.to.portId },
      });
    }
  }

  for (const tp of diagram.tracePairs) {
    const traceIn = findNode(diagram, tp.traceInNodeId);
    const traceOut = findNode(diagram, tp.traceOutNodeId);
    
    if (!traceIn || traceIn.type !== 'trace-in') {
      errors.push({
        type: 'invalid-trace-pair',
        message: `TracePair ${tp.id} references invalid trace-in node`,
      });
    }
    
    if (!traceOut || traceOut.type !== 'trace-out') {
      errors.push({
        type: 'invalid-trace-pair',
        message: `TracePair ${tp.id} references invalid trace-out node`,
      });
    }
  }

  const inputCounts = new Map<string, number>();
  for (const edge of diagram.edges) {
    const key = `${edge.to.nodeId}:${edge.to.portId}`;
    inputCounts.set(key, (inputCounts.get(key) ?? 0) + 1);
  }
  
  for (const [key, count] of inputCounts) {
    if (count > 1) {
      const [nodeId, portId] = key.split(':');
      errors.push({
        type: 'multiple-inputs',
        message: `Port has ${count} incoming edges`,
        location: { nodeId, portId },
      });
    }
  }

  return errors;
}

export function serializeDiagram(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2);
}

export function deserializeDiagram(json: string): Diagram {
  const parsed = JSON.parse(json) as Diagram;
  if (!parsed.tracePairs) {
    parsed.tracePairs = [];
  }
  if (!parsed.cupCapPairs) {
    parsed.cupCapPairs = [];
  }
  return parsed;
}

export function cloneDiagram(diagram: Diagram): Diagram {
  return JSON.parse(JSON.stringify(diagram));
}

export function removeNode(diagram: Diagram, nodeId: string): Diagram {
  return {
    ...diagram,
    nodes: diagram.nodes.filter(n => n.id !== nodeId),
    edges: diagram.edges.filter(e => e.from.nodeId !== nodeId && e.to.nodeId !== nodeId),
    tracePairs: diagram.tracePairs.filter(
      tp => tp.traceInNodeId !== nodeId && tp.traceOutNodeId !== nodeId
    ),
    cupCapPairs: diagram.cupCapPairs.filter(
      cc => cc.cupNodeId !== nodeId && cc.capNodeId !== nodeId
    ),
  };
}

export function removeEdge(diagram: Diagram, edgeId: string): Diagram {
  return {
    ...diagram,
    edges: diagram.edges.filter(e => e.id !== edgeId),
  };
}

export function addEdge(diagram: Diagram, edge: Edge): Diagram {
  return {
    ...diagram,
    edges: [...diagram.edges, edge],
  };
}

export function removeTracePair(diagram: Diagram, tracePairId: string): Diagram {
  return {
    ...diagram,
    tracePairs: diagram.tracePairs.filter(tp => tp.id !== tracePairId),
  };
}
