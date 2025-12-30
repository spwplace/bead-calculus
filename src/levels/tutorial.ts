import type { Diagram, NodeType } from '../core/diagram';
import { createNode, createEdge, createDiagram, createPort, resetIdCounter } from '../core/diagram';
import type { RewriteRuleName } from '../core/rewrite';

export interface Level {
  id: string;
  name: string;
  description: string;
  mode: 'build' | 'rewrite';
  initial: Diagram;
  target?: Diagram;
  availableMoves: RewriteRuleName[];
  palette?: NodeType[];
}

export function createLevel1_Slide(): Level {
  resetIdCounter();

  const node1 = createNode('identity', { x: 100, y: 100 });
  const node2 = createNode('delay', { x: 200, y: 100 });
  const node3 = createNode('identity', { x: 100, y: 200 });
  const node4 = createNode('delay', { x: 200, y: 200 });

  const edges = [
    createEdge(node1.id, node1.outputs[0].id, node2.id, node2.inputs[0].id),
    createEdge(node3.id, node3.outputs[0].id, node4.id, node4.inputs[0].id),
  ];

  const initial = createDiagram(
    [node1, node2, node3, node4],
    edges,
    [createPort('signal', 'input'), createPort('signal', 'input')],
    [createPort('signal', 'output'), createPort('signal', 'output')]
  );

  resetIdCounter();

  const tNode1 = createNode('delay', { x: 100, y: 100 });
  const tNode2 = createNode('identity', { x: 200, y: 100 });
  const tNode3 = createNode('delay', { x: 100, y: 200 });
  const tNode4 = createNode('identity', { x: 200, y: 200 });

  const targetEdges = [
    createEdge(tNode1.id, tNode1.outputs[0].id, tNode2.id, tNode2.inputs[0].id),
    createEdge(tNode3.id, tNode3.outputs[0].id, tNode4.id, tNode4.inputs[0].id),
  ];

  const target = createDiagram(
    [tNode1, tNode2, tNode3, tNode4],
    targetEdges,
    [createPort('signal', 'input'), createPort('signal', 'input')],
    [createPort('signal', 'output'), createPort('signal', 'output')]
  );

  return {
    id: 'tutorial-1',
    name: 'Slide',
    description: 'Independent modules can swap positions. Drag boxes past each other on parallel tracks.',
    mode: 'rewrite',
    initial,
    target,
    availableMoves: ['slide'],
  };
}

export function createLevel2_Straighten(): Level {
  resetIdCounter();

  const traceIn = createNode('trace-in', { x: 150, y: 150 });
  const traceOut = createNode('trace-out', { x: 250, y: 150 });

  const edges = [
    createEdge(traceIn.id, traceIn.outputs[0].id, traceOut.id, traceOut.inputs[0].id),
  ];

  const initial = createDiagram(
    [traceIn, traceOut],
    edges,
    [],
    []
  );

  const target = createDiagram([], [], [], []);

  return {
    id: 'tutorial-2',
    name: 'Straighten',
    description: 'Empty loops can be yanked away. Pull the trivial loop taut until it vanishes.',
    mode: 'rewrite',
    initial,
    target,
    availableMoves: ['straighten'],
  };
}

export function createLevel3_Thread(): Level {
  resetIdCounter();

  const traceIn = createNode('trace-in', { x: 100, y: 150 });
  const delay = createNode('delay', { x: 200, y: 150 });
  const traceOut = createNode('trace-out', { x: 300, y: 150 });

  const edges = [
    createEdge(traceIn.id, traceIn.outputs[0].id, delay.id, delay.inputs[0].id),
    createEdge(delay.id, delay.outputs[0].id, traceOut.id, traceOut.inputs[0].id),
  ];

  const initial = createDiagram(
    [traceIn, delay, traceOut],
    edges,
    [],
    []
  );

  return {
    id: 'tutorial-3',
    name: 'Thread',
    description: 'Move a module across a feedback loop when its interface matches. Thread the delay out of the loop.',
    mode: 'rewrite',
    initial,
    availableMoves: ['thread', 'straighten'],
  };
}

export function createLevel4_Combined(): Level {
  resetIdCounter();

  const id1 = createNode('identity', { x: 80, y: 100 });
  const delay1 = createNode('delay', { x: 180, y: 100 });
  const split = createNode('split', { x: 280, y: 130 });
  const merge = createNode('merge', { x: 380, y: 130 });
  const delay2 = createNode('delay', { x: 480, y: 130 });

  const edges = [
    createEdge(id1.id, id1.outputs[0].id, delay1.id, delay1.inputs[0].id),
    createEdge(delay1.id, delay1.outputs[0].id, split.id, split.inputs[0].id),
    createEdge(split.id, split.outputs[0].id, merge.id, merge.inputs[0].id),
    createEdge(split.id, split.outputs[1].id, merge.id, merge.inputs[1].id),
    createEdge(merge.id, merge.outputs[0].id, delay2.id, delay2.inputs[0].id),
  ];

  const initial = createDiagram(
    [id1, delay1, split, merge, delay2],
    edges,
    [createPort('signal', 'input')],
    [createPort('signal', 'output')]
  );

  return {
    id: 'tutorial-4',
    name: 'Combined',
    description: 'Use all rewrite moves to simplify this circuit. Can you reach the canonical form?',
    mode: 'rewrite',
    initial,
    availableMoves: ['slide', 'straighten', 'thread'],
  };
}

export const TUTORIAL_LEVELS: Level[] = [
  createLevel1_Slide(),
  createLevel2_Straighten(),
  createLevel3_Thread(),
  createLevel4_Combined(),
];

export function getLevelById(id: string): Level | undefined {
  return TUTORIAL_LEVELS.find(l => l.id === id);
}
