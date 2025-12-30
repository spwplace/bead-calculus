import type { Diagram, Node, BeadKind, Edge, PainterConfig, FilterConfig } from './diagram';
import { findNode, findEdgesFromPort, findTracePairByTraceOut } from './diagram';

export interface CollectedBeads {
  byPort: Map<string, BeadKind[]>;
  total: number;
}

export interface Bead {
  id: string;
  kind: BeadKind;
  position: BeadPosition;
  velocity: number;
  state: 'moving' | 'waiting' | 'processed';
}

export type BeadPosition =
  | { type: 'on-edge'; edgeId: string; progress: number }
  | { type: 'at-node'; nodeId: string; portId: string }
  | { type: 'in-feedback'; tracePairId: string; progress: number };

export interface SimulationState {
  beads: Bead[];
  time: number;
  paused: boolean;
  speed: number;
  collectedBeads: Map<string, BeadKind[]>;
}

let beadIdCounter = 0;

export function createBead(
  kind: BeadKind,
  edgeId: string,
  progress: number = 0
): Bead {
  return {
    id: `bead_${++beadIdCounter}`,
    kind,
    position: { type: 'on-edge', edgeId, progress },
    velocity: 0.002,
    state: 'moving',
  };
}

export function createFeedbackBead(
  kind: BeadKind,
  tracePairId: string
): Bead {
  return {
    id: `bead_${++beadIdCounter}`,
    kind,
    position: { type: 'in-feedback', tracePairId, progress: 0 },
    velocity: 0.003,
    state: 'moving',
  };
}

export function createSimulationState(): SimulationState {
  return {
    beads: [],
    time: 0,
    paused: true,
    speed: 1,
    collectedBeads: new Map(),
  };
}

export function injectBead(
  state: SimulationState,
  kind: BeadKind,
  edgeId: string
): SimulationState {
  const bead = createBead(kind, edgeId, 0);
  return {
    ...state,
    beads: [...state.beads, bead],
  };
}

function getEdgeEndNode(diagram: Diagram, edgeId: string): { node: Node; portId: string } | null {
  const edge = diagram.edges.find(e => e.id === edgeId);
  if (!edge) return null;
  const node = findNode(diagram, edge.to.nodeId);
  if (!node) return null;
  return { node, portId: edge.to.portId };
}

function getNodeOutputEdges(
  diagram: Diagram,
  nodeId: string,
  inputPortId: string
): Edge[] {
  const node = findNode(diagram, nodeId);
  if (!node) return [];

  switch (node.type) {
    case 'identity':
    case 'delay':
    case 'trace-in': {
      if (node.outputs.length > 0) {
        return findEdgesFromPort(diagram, nodeId, node.outputs[0].id);
      }
      return [];
    }

    case 'trace-out': {
      if (node.outputs.length > 0) {
        return findEdgesFromPort(diagram, nodeId, node.outputs[0].id);
      }
      return [];
    }

    case 'swap': {
      const inputIndex = node.inputs.findIndex(p => p.id === inputPortId);
      const outputIndex = inputIndex === 0 ? 1 : 0;
      if (node.outputs[outputIndex]) {
        return findEdgesFromPort(diagram, nodeId, node.outputs[outputIndex].id);
      }
      return [];
    }

    case 'split':
    case 'cup': {
      const edges: Edge[] = [];
      for (const output of node.outputs) {
        edges.push(...findEdgesFromPort(diagram, nodeId, output.id));
      }
      return edges;
    }

    case 'merge': {
      if (node.outputs.length > 0) {
        return findEdgesFromPort(diagram, nodeId, node.outputs[0].id);
      }
      return [];
    }

    case 'unit': {
      if (node.outputs.length > 0) {
        return findEdgesFromPort(diagram, nodeId, node.outputs[0].id);
      }
      return [];
    }

    case 'counit':
    case 'cap': {
      return [];
    }

    case 'painter': {
      if (node.outputs.length > 0) {
        return findEdgesFromPort(diagram, nodeId, node.outputs[0].id);
      }
      return [];
    }

    case 'filter': {
      return [];
    }

    default:
      return [];
  }
}

interface NodeProcessingResult {
  outputBeads: Array<{ edgeId: string; kind: BeadKind }>;
  feedbackBeads: Array<{ tracePairId: string; kind: BeadKind }>;
  consumed: boolean;
  delay?: number;
}

function checkMergeReady(
  _diagram: Diagram,
  node: Node,
  beads: Bead[]
): boolean {
  const beadsAtInputs = node.inputs.filter(inputPort => {
    return beads.some(b =>
      b.state === 'waiting' &&
      b.position.type === 'at-node' &&
      b.position.nodeId === node.id &&
      b.position.portId === inputPort.id
    );
  });
  return beadsAtInputs.length === node.inputs.length;
}

function processNodeArrival(
  diagram: Diagram,
  node: Node,
  inputPortId: string,
  bead: Bead,
  allBeads: Bead[]
): NodeProcessingResult {
  const outputEdges = getNodeOutputEdges(diagram, node.id, inputPortId);

  switch (node.type) {
    case 'identity':
    case 'trace-in': {
      return {
        outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: bead.kind })),
        feedbackBeads: [],
        consumed: true,
      };
    }

    case 'trace-out': {
      const tracePair = findTracePairByTraceOut(diagram, node.id);
      if (tracePair) {
        return {
          outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: bead.kind })),
          feedbackBeads: [{ tracePairId: tracePair.id, kind: bead.kind }],
          consumed: true,
        };
      }
      return {
        outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: bead.kind })),
        feedbackBeads: [],
        consumed: true,
      };
    }

    case 'delay': {
      return {
        outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: bead.kind })),
        feedbackBeads: [],
        consumed: true,
        delay: 500,
      };
    }

    case 'swap': {
      return {
        outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: bead.kind })),
        feedbackBeads: [],
        consumed: true,
      };
    }

    case 'split': {
      return {
        outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: bead.kind })),
        feedbackBeads: [],
        consumed: true,
      };
    }

    case 'merge': {
      if (checkMergeReady(diagram, node, [...allBeads, { ...bead, state: 'waiting' as const }])) {
        return {
          outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: bead.kind })),
          feedbackBeads: [],
          consumed: true,
        };
      }
      return {
        outputBeads: [],
        feedbackBeads: [],
        consumed: false,
      };
    }

    case 'counit': {
      return {
        outputBeads: [],
        feedbackBeads: [],
        consumed: true,
      };
    }

    case 'cap': {
      if (checkCapReady(diagram, node, [...allBeads, { ...bead, state: 'waiting' as const }])) {
        return {
          outputBeads: [],
          feedbackBeads: [],
          consumed: true,
        };
      }
      return {
        outputBeads: [],
        feedbackBeads: [],
        consumed: false,
      };
    }

    case 'painter': {
      const config = node.config as PainterConfig | undefined;
      const outputColor = config?.targetColor ?? bead.kind;
      return {
        outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: outputColor })),
        feedbackBeads: [],
        consumed: true,
      };
    }

    case 'filter': {
      const config = node.config as FilterConfig | undefined;
      const matchColor = config?.matchColor ?? 'signal';
      const isMatch = bead.kind === matchColor;
      const outputIndex = isMatch ? 0 : 1;
      if (node.outputs[outputIndex]) {
        const edges = findEdgesFromPort(diagram, node.id, node.outputs[outputIndex].id);
        return {
          outputBeads: edges.map(e => ({ edgeId: e.id, kind: bead.kind })),
          feedbackBeads: [],
          consumed: true,
        };
      }
      return {
        outputBeads: [],
        feedbackBeads: [],
        consumed: true,
      };
    }

    default:
      return { outputBeads: [], feedbackBeads: [], consumed: true };
  }
}

function checkCapReady(
  _diagram: Diagram,
  node: Node,
  beads: Bead[]
): boolean {
  const beadsAtInputs = node.inputs.filter(inputPort => {
    return beads.some(b =>
      b.state === 'waiting' &&
      b.position.type === 'at-node' &&
      b.position.nodeId === node.id &&
      b.position.portId === inputPort.id
    );
  });
  return beadsAtInputs.length === node.inputs.length;
}

function processFeedbackArrival(
  diagram: Diagram,
  tracePairId: string,
  bead: Bead
): { outputBeads: Array<{ edgeId: string; kind: BeadKind }> } {
  const tracePair = diagram.tracePairs.find(tp => tp.id === tracePairId);
  if (!tracePair) return { outputBeads: [] };
  
  const traceInNode = findNode(diagram, tracePair.traceInNodeId);
  if (!traceInNode || traceInNode.outputs.length === 0) return { outputBeads: [] };
  
  const outputEdges = findEdgesFromPort(diagram, traceInNode.id, traceInNode.outputs[0].id);
  
  return {
    outputBeads: outputEdges.map(e => ({ edgeId: e.id, kind: bead.kind })),
  };
}

export function stepSimulation(
  state: SimulationState,
  diagram: Diagram,
  deltaTime: number
): SimulationState {
  if (state.paused) return state;

  const dt = deltaTime * state.speed;
  let newBeads: Bead[] = [];
  const beadsToRemove = new Set<string>();
  const pendingNewBeads: Bead[] = [];
  const newCollectedBeads = new Map(state.collectedBeads);

  for (const bead of state.beads) {
    if (bead.state === 'processed') {
      beadsToRemove.add(bead.id);
      continue;
    }

    if (bead.position.type === 'on-edge') {
      const newProgress = bead.position.progress + bead.velocity * dt;

      if (newProgress >= 1) {
        const endInfo = getEdgeEndNode(diagram, bead.position.edgeId);
        if (endInfo) {
          const result = processNodeArrival(
            diagram,
            endInfo.node,
            endInfo.portId,
            bead,
            state.beads
          );

          if (result.consumed) {
            beadsToRemove.add(bead.id);

            if (endInfo.node.type === 'counit') {
              const portId = endInfo.portId;
              const existing = newCollectedBeads.get(portId) ?? [];
              newCollectedBeads.set(portId, [...existing, bead.kind]);
            }

            if (endInfo.node.type === 'merge') {
              const mergeWaitingBeads = state.beads.filter(b =>
                b.state === 'waiting' &&
                b.position.type === 'at-node' &&
                b.position.nodeId === endInfo.node.id
              );
              mergeWaitingBeads.forEach(b => beadsToRemove.add(b.id));
            }

            for (const output of result.outputBeads) {
              const newBead = createBead(output.kind, output.edgeId, 0);
              pendingNewBeads.push(newBead);
            }
            
            for (const fb of result.feedbackBeads) {
              const feedbackBead = createFeedbackBead(fb.kind, fb.tracePairId);
              pendingNewBeads.push(feedbackBead);
            }
          } else {
            newBeads.push({
              ...bead,
              position: { type: 'at-node', nodeId: endInfo.node.id, portId: endInfo.portId },
              state: 'waiting',
            });
          }
        } else {
          beadsToRemove.add(bead.id);
        }
      } else {
        newBeads.push({
          ...bead,
          position: { ...bead.position, progress: newProgress },
        });
      }
    } else if (bead.position.type === 'in-feedback') {
      const newProgress = bead.position.progress + bead.velocity * dt;
      
      if (newProgress >= 1) {
        beadsToRemove.add(bead.id);
        
        const result = processFeedbackArrival(diagram, bead.position.tracePairId, bead);
        for (const output of result.outputBeads) {
          const newBead = createBead(output.kind, output.edgeId, 0);
          pendingNewBeads.push(newBead);
        }
      } else {
        newBeads.push({
          ...bead,
          position: { ...bead.position, progress: newProgress },
        });
      }
    } else if (bead.position.type === 'at-node' && bead.state === 'waiting') {
      const node = findNode(diagram, bead.position.nodeId);
      if (node && node.type === 'merge') {
        if (checkMergeReady(diagram, node, state.beads)) {
          const outputEdges = getNodeOutputEdges(diagram, node.id, bead.position.portId);
          beadsToRemove.add(bead.id);
          for (const edge of outputEdges) {
            pendingNewBeads.push(createBead(bead.kind, edge.id, 0));
          }
        } else {
          newBeads.push(bead);
        }
      } else {
        newBeads.push(bead);
      }
    } else {
      newBeads.push(bead);
    }
  }

  newBeads = newBeads.filter(b => !beadsToRemove.has(b.id));
  newBeads.push(...pendingNewBeads);

  return {
    ...state,
    beads: newBeads,
    time: state.time + dt,
    collectedBeads: newCollectedBeads,
  };
}

export function togglePause(state: SimulationState): SimulationState {
  return { ...state, paused: !state.paused };
}

export function setSpeed(state: SimulationState, speed: number): SimulationState {
  return { ...state, speed: Math.max(0.1, Math.min(3, speed)) };
}

export function clearBeads(state: SimulationState): SimulationState {
  return { ...state, beads: [], time: 0, collectedBeads: new Map() };
}
