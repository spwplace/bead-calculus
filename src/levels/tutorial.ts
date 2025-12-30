import type { Diagram, NodeType } from '../core/diagram';
import { createNode, createEdge, createDiagram, createPort, createTracePair, resetIdCounter } from '../core/diagram';
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

  const delay1 = createNode('delay', { x: 100, y: 100 });
  const identity1 = createNode('identity', { x: 200, y: 100 });
  
  const delay2 = createNode('delay', { x: 100, y: 220 });
  const identity2 = createNode('identity', { x: 200, y: 220 });

  const edges = [
    createEdge(delay1.id, delay1.outputs[0].id, identity1.id, identity1.inputs[0].id),
    createEdge(delay2.id, delay2.outputs[0].id, identity2.id, identity2.inputs[0].id),
  ];

  const initial = createDiagram(
    [delay1, identity1, delay2, identity2],
    edges,
    [createPort('signal', 'input'), createPort('signal', 'input')],
    [createPort('signal', 'output'), createPort('signal', 'output')],
    []
  );

  return {
    id: 'tutorial-1',
    name: 'Slide (Interchange)',
    description: 'Independent tensor factors can swap. The delay on track 1 and identity on track 2 are independent - slide them past each other.',
    mode: 'rewrite',
    initial,
    availableMoves: ['slide'],
  };
}

export function createLevel2_Straighten(): Level {
  resetIdCounter();

  const input = createNode('identity', { x: 80, y: 150 });
  const traceIn = createNode('trace-in', { x: 180, y: 150 });
  const traceOut = createNode('trace-out', { x: 280, y: 150 });
  const output = createNode('identity', { x: 380, y: 150 });

  const tracePair = createTracePair(traceIn.id, traceOut.id, 'signal');

  const edges = [
    createEdge(input.id, input.outputs[0].id, traceIn.id, traceIn.inputs[0].id),
    createEdge(traceIn.id, traceIn.outputs[0].id, traceOut.id, traceOut.inputs[0].id),
    createEdge(traceOut.id, traceOut.outputs[0].id, output.id, output.inputs[0].id),
  ];

  const initial = createDiagram(
    [input, traceIn, traceOut, output],
    edges,
    [createPort('signal', 'input')],
    [createPort('signal', 'output')],
    [tracePair]
  );

  return {
    id: 'tutorial-2',
    name: 'Straighten (Yanking)',
    description: 'Empty trace loops can be yanked away: Tr(id) = id. This loop has no computation inside - pull it taut until it vanishes.',
    mode: 'rewrite',
    initial,
    availableMoves: ['straighten'],
  };
}

export function createLevel3_Thread(): Level {
  resetIdCounter();

  const input = createNode('identity', { x: 50, y: 150 });
  const traceIn = createNode('trace-in', { x: 150, y: 150 });
  const delay = createNode('delay', { x: 250, y: 150 });
  const traceOut = createNode('trace-out', { x: 350, y: 150 });
  const output = createNode('identity', { x: 450, y: 150 });

  const tracePair = createTracePair(traceIn.id, traceOut.id, 'signal');

  const edges = [
    createEdge(input.id, input.outputs[0].id, traceIn.id, traceIn.inputs[0].id),
    createEdge(traceIn.id, traceIn.outputs[0].id, delay.id, delay.inputs[0].id),
    createEdge(delay.id, delay.outputs[0].id, traceOut.id, traceOut.inputs[0].id),
    createEdge(traceOut.id, traceOut.outputs[0].id, output.id, output.inputs[0].id),
  ];

  const initial = createDiagram(
    [input, traceIn, delay, traceOut, output],
    edges,
    [createPort('signal', 'input')],
    [createPort('signal', 'output')],
    [tracePair]
  );

  return {
    id: 'tutorial-3',
    name: 'Thread (Dinaturality)',
    description: 'A morphism can be threaded out of a trace loop via dinaturality. Thread the delay out, then straighten the empty loop.',
    mode: 'rewrite',
    initial,
    availableMoves: ['thread', 'straighten'],
  };
}

export function createLevel4_FeedbackLoop(): Level {
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

  const initial = createDiagram(
    [input, traceIn, delay, split, traceOut, output],
    edges,
    [createPort('signal', 'input')],
    [createPort('signal', 'output')],
    [tracePair]
  );

  return {
    id: 'tutorial-4',
    name: 'Feedback Oscillator',
    description: 'A proper feedback loop! Drop a bead and watch it oscillate through the delay. This is Tr^X(delay ∘ split) - beads loop back from trace-out to trace-in.',
    mode: 'build',
    initial,
    availableMoves: [],
  };
}

export function createLevel5_Combined(): Level {
  resetIdCounter();

  const id1 = createNode('identity', { x: 50, y: 100 });
  const delay1 = createNode('delay', { x: 150, y: 100 });
  
  const id2 = createNode('identity', { x: 50, y: 250 });
  const traceIn = createNode('trace-in', { x: 150, y: 250 });
  const delay2 = createNode('delay', { x: 250, y: 250 });
  const traceOut = createNode('trace-out', { x: 350, y: 250 });
  const id3 = createNode('identity', { x: 450, y: 250 });

  const tracePair = createTracePair(traceIn.id, traceOut.id, 'signal');

  const edges = [
    createEdge(id1.id, id1.outputs[0].id, delay1.id, delay1.inputs[0].id),
    createEdge(id2.id, id2.outputs[0].id, traceIn.id, traceIn.inputs[0].id),
    createEdge(traceIn.id, traceIn.outputs[0].id, delay2.id, delay2.inputs[0].id),
    createEdge(delay2.id, delay2.outputs[0].id, traceOut.id, traceOut.inputs[0].id),
    createEdge(traceOut.id, traceOut.outputs[0].id, id3.id, id3.inputs[0].id),
  ];

  const initial = createDiagram(
    [id1, delay1, id2, traceIn, delay2, traceOut, id3],
    edges,
    [createPort('signal', 'input'), createPort('signal', 'input')],
    [createPort('signal', 'output'), createPort('signal', 'output')],
    [tracePair]
  );

  return {
    id: 'tutorial-5',
    name: 'Combined Laws',
    description: 'Use all rewrite moves: slide independent factors, thread the delay out of the loop, then straighten. Reach the simplest form!',
    mode: 'rewrite',
    initial,
    availableMoves: ['slide', 'thread', 'straighten'],
  };
}

export function createLevel6_Superpose(): Level {
  resetIdCounter();

  const traceIn = createNode('trace-in', { x: 150, y: 100 });
  const traceOut = createNode('trace-out', { x: 250, y: 100 });
  const tracePair = createTracePair(traceIn.id, traceOut.id, 'signal');

  const delay = createNode('delay', { x: 150, y: 220 });
  const identity = createNode('identity', { x: 250, y: 220 });

  const edges = [
    createEdge(traceIn.id, traceIn.outputs[0].id, traceOut.id, traceOut.inputs[0].id),
    createEdge(delay.id, delay.outputs[0].id, identity.id, identity.inputs[0].id),
  ];

  const initial = createDiagram(
    [traceIn, traceOut, delay, identity],
    edges,
    [createPort('signal', 'input'), createPort('signal', 'input')],
    [createPort('signal', 'output'), createPort('signal', 'output')],
    [tracePair]
  );

  return {
    id: 'tutorial-6',
    name: 'Superpose',
    description: 'The superposing law: Tr(f) ⊗ g = Tr(f ⊗ g). The delay runs parallel to an empty trace. Absorb it into the trace, making Tr(id ⊗ delay).',
    mode: 'rewrite',
    initial,
    availableMoves: ['superpose', 'straighten'],
  };
}

export const TUTORIAL_LEVELS: Level[] = [
  createLevel1_Slide(),
  createLevel2_Straighten(),
  createLevel3_Thread(),
  createLevel4_FeedbackLoop(),
  createLevel5_Combined(),
  createLevel6_Superpose(),
];

export function getLevelById(id: string): Level | undefined {
  return TUTORIAL_LEVELS.find(l => l.id === id);
}
