export type BeadKind = 'red' | 'blue' | 'green' | 'signal';

export const BEAD_COLORS: Record<BeadKind, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
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
  | 'trace-out';

export const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  'identity': { width: 40, height: 40 },
  'swap': { width: 60, height: 60 },
  'delay': { width: 50, height: 50 },
  'split': { width: 50, height: 60 },
  'merge': { width: 50, height: 60 },
  'trace-in': { width: 50, height: 50 },
  'trace-out': { width: 50, height: 50 },
};

export const NODE_NAMES: Record<NodeType, string> = {
  'identity': 'Wire',
  'swap': 'Swap',
  'delay': 'Delay',
  'split': 'Split',
  'merge': 'Merge',
  'trace-in': 'Loop In',
  'trace-out': 'Loop Out',
};

export interface Node {
  id: string;
  type: NodeType;
  inputs: Port[];
  outputs: Port[];
  position: { x: number; y: number };
}

export interface Edge {
  id: string;
  from: { nodeId: string; portId: string };
  to: { nodeId: string; portId: string };
}

export interface Diagram {
  nodes: Node[];
  edges: Edge[];
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
    default:
      return { inputs: [], outputs: [] };
  }
}

export function createNode(
  type: NodeType,
  position: { x: number; y: number },
  portConfig?: { inputs?: BeadKind[]; outputs?: BeadKind[] }
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

export function createDiagram(
  nodes: Node[] = [],
  edges: Edge[] = [],
  boundaryInputs: Port[] = [],
  boundaryOutputs: Port[] = []
): Diagram {
  return {
    nodes,
    edges,
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

export interface ValidationError {
  type: 'type-mismatch' | 'disconnected-port' | 'cycle' | 'multiple-inputs';
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
  return JSON.parse(json) as Diagram;
}
