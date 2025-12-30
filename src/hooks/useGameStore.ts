import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Diagram, Node, Edge, BeadKind } from '../core/diagram';
import { createNode, createEdge, createDiagram, createPort, resetIdCounter } from '../core/diagram';
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

  const identity1 = createNode('identity', { x: 100, y: 150 });
  const delay1 = createNode('delay', { x: 200, y: 100 });
  const split1 = createNode('split', { x: 300, y: 150 });
  const merge1 = createNode('merge', { x: 450, y: 150 });
  const identity2 = createNode('identity', { x: 550, y: 150 });

  const edges = [
    createEdge(identity1.id, identity1.outputs[0].id, delay1.id, delay1.inputs[0].id),
    createEdge(delay1.id, delay1.outputs[0].id, split1.id, split1.inputs[0].id),
    createEdge(split1.id, split1.outputs[0].id, merge1.id, merge1.inputs[0].id),
    createEdge(split1.id, split1.outputs[1].id, merge1.id, merge1.inputs[1].id),
    createEdge(merge1.id, merge1.outputs[0].id, identity2.id, identity2.inputs[0].id),
  ];

  const boundaryInput = createPort('signal', 'input');
  const boundaryOutput = createPort('signal', 'output');

  return createDiagram(
    [identity1, delay1, split1, merge1, identity2],
    edges,
    [boundaryInput],
    [boundaryOutput]
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
