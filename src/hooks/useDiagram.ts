import { create } from 'zustand';
import type { Diagram, Node, Edge } from '../core/diagram';
import { createNode, createEdge, createDiagram, createPort, resetIdCounter } from '../core/diagram';

interface DiagramState {
  diagram: Diagram;
  selectedNodeIds: Set<string>;
  setDiagram: (diagram: Diagram) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  moveNode: (nodeId: string, x: number, y: number) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string, additive?: boolean) => void;
  clearSelection: () => void;
  loadLevel: (diagram: Diagram) => void;
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

export const useDiagramStore = create<DiagramState>((set) => ({
  diagram: createInitialDiagram(),
  selectedNodeIds: new Set(),

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

  loadLevel: (diagram) =>
    set({
      diagram,
      selectedNodeIds: new Set(),
    }),
}));
