import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Diagram, Node, Edge, BeadKind } from '../core/diagram';
import { createNode, createEdge, createDiagram, createPort, createTracePair, resetIdCounter } from '../core/diagram';
import type { Bead, SimulationState } from '../core/simulation';
import { stepSimulation, createBead } from '../core/simulation';

/**
 * TransientState is mutated directly (not via set()) to avoid React re-renders at 60fps.
 * This is intentional - see Zustand docs on "transient updates for frequent state changes".
 */
interface TransientState {
  beads: Bead[];
  time: number;
}

interface GameState {
  diagram: Diagram;
  selectedNodeIds: Set<string>;
  paused: boolean;
  speed: number;
  _transient: TransientState;
  
  setDiagram: (diagram: Diagram) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  moveNode: (nodeId: string, x: number, y: number) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string, additive?: boolean) => void;
  clearSelection: () => void;
  loadLevel: (diagram: Diagram) => void;
  togglePause: () => void;
  setSpeed: (speed: number) => void;
  injectBead: (edgeId: string, kind: BeadKind) => void;
  clearBeads: () => void;
  getBeads: () => Bead[];
  getTime: () => number;
  stepSimulation: (deltaTime: number) => void;
}

function createInitialDiagram(): Diagram {
  resetIdCounter();

  const input = createNode('identity', { x: 50, y: 150 });
  const traceIn = createNode('trace-in', { x: 150, y: 150 });
  const delay = createNode('delay', { x: 250, y: 150 });
  const split = createNode('split', { x: 350, y: 150 });
  const traceOut = createNode('trace-out', { x: 450, y: 100 });
  const output = createNode('identity', { x: 450, y: 220 });

  const tracePair = createTracePair(traceIn.id, traceOut.id, 'signal');

  const edges = [
    createEdge(input.id, input.outputs[0].id, traceIn.id, traceIn.inputs[0].id),
    createEdge(traceIn.id, traceIn.outputs[0].id, delay.id, delay.inputs[0].id),
    createEdge(delay.id, delay.outputs[0].id, split.id, split.inputs[0].id),
    createEdge(split.id, split.outputs[0].id, traceOut.id, traceOut.inputs[0].id),
    createEdge(split.id, split.outputs[1].id, output.id, output.inputs[0].id),
  ];

  const boundaryInput = createPort('signal', 'input');
  const boundaryOutput = createPort('signal', 'output');

  return createDiagram(
    [input, traceIn, delay, split, traceOut, output],
    edges,
    [boundaryInput],
    [boundaryOutput],
    [tracePair]
  );
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    diagram: createInitialDiagram(),
    selectedNodeIds: new Set(),
    paused: true,
    speed: 1,
    _transient: { beads: [], time: 0 },

    setDiagram: (diagram) => set({ diagram }),

    addNode: (node) =>
      set((state) => ({
        diagram: {
          ...state.diagram,
          nodes: [...state.diagram.nodes, node],
        },
      })),

    removeNode: (nodeId) =>
      set((state) => ({
        diagram: {
          ...state.diagram,
          nodes: state.diagram.nodes.filter((n) => n.id !== nodeId),
          edges: state.diagram.edges.filter(
            (e) => e.from.nodeId !== nodeId && e.to.nodeId !== nodeId
          ),
          tracePairs: state.diagram.tracePairs.filter(
            (tp) => tp.traceInNodeId !== nodeId && tp.traceOutNodeId !== nodeId
          ),
        },
      })),

    moveNode: (nodeId, x, y) =>
      set((state) => ({
        diagram: {
          ...state.diagram,
          nodes: state.diagram.nodes.map((n) =>
            n.id === nodeId ? { ...n, position: { x, y } } : n
          ),
        },
      })),

    addEdge: (edge) =>
      set((state) => ({
        diagram: {
          ...state.diagram,
          edges: [...state.diagram.edges, edge],
        },
      })),

    removeEdge: (edgeId) =>
      set((state) => ({
        diagram: {
          ...state.diagram,
          edges: state.diagram.edges.filter((e) => e.id !== edgeId),
        },
      })),

    selectNode: (nodeId, additive = false) =>
      set((state) => {
        const newSelection = new Set(additive ? state.selectedNodeIds : []);
        if (newSelection.has(nodeId)) {
          newSelection.delete(nodeId);
        } else {
          newSelection.add(nodeId);
        }
        return { selectedNodeIds: newSelection };
      }),

    clearSelection: () => set({ selectedNodeIds: new Set() }),

    loadLevel: (diagram) => {
      get()._transient.beads = [];
      get()._transient.time = 0;
      set({
        diagram,
        selectedNodeIds: new Set(),
        paused: true,
      });
    },

    togglePause: () => set((state) => ({ paused: !state.paused })),
    
    setSpeed: (speed) => set({ speed: Math.max(0.1, Math.min(3, speed)) }),

    injectBead: (edgeId, kind) => {
      const bead = createBead(kind, edgeId, 0);
      get()._transient.beads.push(bead);
    },

    clearBeads: () => {
      get()._transient.beads = [];
      get()._transient.time = 0;
    },

    getBeads: () => get()._transient.beads,
    getTime: () => get()._transient.time,

    stepSimulation: (deltaTime) => {
      const state = get();
      if (state.paused) return;

      const simState: SimulationState = {
        beads: state._transient.beads,
        time: state._transient.time,
        paused: state.paused,
        speed: state.speed,
      };

      const newSimState = stepSimulation(simState, state.diagram, deltaTime);
      
      state._transient.beads = newSimState.beads;
      state._transient.time = newSimState.time;
    },
  }))
);
