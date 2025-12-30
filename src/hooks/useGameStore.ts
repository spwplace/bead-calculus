import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Diagram, Node, Edge, BeadKind, NodeType } from '../core/diagram';
import { createNode, createEdge, createDiagram, createPort, createTracePair, resetIdCounter, cloneDiagram } from '../core/diagram';
import type { Bead, SimulationState } from '../core/simulation';
import { stepSimulation, createBead } from '../core/simulation';
import { globalAnimationController } from '../core/animation';
import type { WinCondition } from '../core/winCondition';
import { checkWinCondition } from '../core/winCondition';

interface TransientState {
  beads: Bead[];
  time: number;
  collectedBeads: Map<string, BeadKind[]>;
}

type GameMode = 'rewrite' | 'build' | 'sandbox' | 'play';

interface GameState {
  diagram: Diagram;
  targetDiagram: Diagram | null;
  selectedNodeIds: Set<string>;
  paused: boolean;
  speed: number;
  mode: GameMode;
  undoStack: Diagram[];
  redoStack: Diagram[];
  winCondition: WinCondition | null;
  hasWon: boolean;
  _transient: TransientState;
  
  setDiagram: (diagram: Diagram, addToUndo?: boolean) => void;
  setTargetDiagram: (diagram: Diagram | null) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  moveNode: (nodeId: string, x: number, y: number) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string, additive?: boolean) => void;
  clearSelection: () => void;
  loadLevel: (diagram: Diagram, target?: Diagram | null, mode?: GameMode, winCondition?: WinCondition | null) => void;
  togglePause: () => void;
  setSpeed: (speed: number) => void;
  setMode: (mode: GameMode) => void;
  injectBead: (edgeId: string, kind: BeadKind) => void;
  clearBeads: () => void;
  getBeads: () => Bead[];
  getTime: () => number;
  getCollectedBeads: () => Map<string, BeadKind[]>;
  stepSimulation: (deltaTime: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addNodeAtPosition: (type: NodeType, x: number, y: number) => void;
  setWinCondition: (condition: WinCondition | null) => void;
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

const MAX_UNDO_STACK = 50;

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    diagram: createInitialDiagram(),
    targetDiagram: null,
    selectedNodeIds: new Set(),
    paused: true,
    speed: 1,
    mode: 'rewrite' as GameMode,
    undoStack: [],
    redoStack: [],
    winCondition: null,
    hasWon: false,
    _transient: { beads: [], time: 0, collectedBeads: new Map() },

    setDiagram: (diagram, addToUndo = true) => {
      if (addToUndo) {
        set((state) => ({
          diagram,
          undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), state.diagram],
          redoStack: [],
        }));
      } else {
        set({ diagram });
      }
    },

    setTargetDiagram: (targetDiagram) => set({ targetDiagram }),

    addNode: (node) =>
      set((state) => ({
        diagram: {
          ...state.diagram,
          nodes: [...state.diagram.nodes, node],
        },
        undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), state.diagram],
        redoStack: [],
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
        undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), state.diagram],
        redoStack: [],
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
        undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), state.diagram],
        redoStack: [],
      })),

    removeEdge: (edgeId) =>
      set((state) => ({
        diagram: {
          ...state.diagram,
          edges: state.diagram.edges.filter((e) => e.id !== edgeId),
        },
        undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), state.diagram],
        redoStack: [],
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

    loadLevel: (diagram, target = null, mode = 'rewrite', winCondition = null) => {
      get()._transient.beads = [];
      get()._transient.time = 0;
      get()._transient.collectedBeads = new Map();
      globalAnimationController.clear();
      set({
        diagram: cloneDiagram(diagram),
        targetDiagram: target ? cloneDiagram(target) : null,
        selectedNodeIds: new Set(),
        paused: true,
        mode,
        undoStack: [],
        redoStack: [],
        winCondition,
        hasWon: false,
      });
    },

    togglePause: () => set((state) => ({ paused: !state.paused })),
    
    setSpeed: (speed) => set({ speed: Math.max(0.1, Math.min(3, speed)) }),

    setMode: (mode) => set({ mode }),

    injectBead: (edgeId, kind) => {
      const bead = createBead(kind, edgeId, 0);
      get()._transient.beads.push(bead);
    },

    clearBeads: () => {
      get()._transient.beads = [];
      get()._transient.time = 0;
      get()._transient.collectedBeads = new Map();
      set({ hasWon: false });
    },

    getBeads: () => get()._transient.beads,
    getTime: () => get()._transient.time,
    getCollectedBeads: () => get()._transient.collectedBeads,

    stepSimulation: (deltaTime) => {
      const state = get();
      if (state.paused) return;

      const simState: SimulationState = {
        beads: state._transient.beads,
        time: state._transient.time,
        paused: state.paused,
        speed: state.speed,
        collectedBeads: state._transient.collectedBeads,
      };

      const newSimState = stepSimulation(simState, state.diagram, deltaTime);
      
      state._transient.beads = newSimState.beads;
      state._transient.time = newSimState.time;
      state._transient.collectedBeads = newSimState.collectedBeads;

      if (state.winCondition && !state.hasWon) {
        const result = checkWinCondition(state.winCondition, newSimState.collectedBeads);
        if (result.won) {
          set({ hasWon: true });
        }
      }

      globalAnimationController.update(deltaTime);
    },

    undo: () => {
      const state = get();
      if (state.undoStack.length === 0) return;

      const previous = state.undoStack[state.undoStack.length - 1];
      set({
        diagram: previous,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.diagram],
      });
    },

    redo: () => {
      const state = get();
      if (state.redoStack.length === 0) return;

      const next = state.redoStack[state.redoStack.length - 1];
      set({
        diagram: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.diagram],
      });
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    addNodeAtPosition: (type, x, y) => {
      const node = createNode(type, { x, y });
      get().addNode(node);
    },

    setWinCondition: (condition) => set({ winCondition: condition }),
  }))
);
