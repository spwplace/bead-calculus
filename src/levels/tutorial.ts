import type { Diagram, NodeType, BeadKind } from '../core/diagram';
import { createNode, createEdge, createDiagram, createPort, createTracePair, resetIdCounter } from '../core/diagram';
import type { RewriteRuleName } from '../core/rewrite';
import type { WinCondition } from '../core/winCondition';

export interface InputBeadSpec {
  edgeIndex: number;
  color: BeadKind;
  delay?: number;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  mode: 'build' | 'rewrite' | 'play';
  initial: Diagram;
  target?: Diagram;
  availableMoves: RewriteRuleName[];
  palette?: NodeType[];
  inputBeads?: InputBeadSpec[];
  winCondition?: WinCondition;
}

export function createLevel0_1_FirstDrop(): Level {
  resetIdCounter();

  const input = createNode('unit', { x: 100, y: 150 });
  const wire = createNode('identity', { x: 200, y: 150 });
  const output = createNode('counit', { x: 300, y: 150 });

  const edges = [
    createEdge(input.id, input.outputs[0].id, wire.id, wire.inputs[0].id),
    createEdge(wire.id, wire.outputs[0].id, output.id, output.inputs[0].id),
  ];

  const initial = createDiagram(
    [input, wire, output],
    edges,
    [],
    [],
    []
  );

  return {
    id: 'bead-0-1',
    name: 'First Drop',
    description: 'Drop a red bead and watch it travel to the output. Press Play, then click "Drop Bead" to start!',
    mode: 'play',
    initial,
    availableMoves: [],
    inputBeads: [{ edgeIndex: 0, color: 'red' }],
    winCondition: {
      type: 'exact-sequence',
      outputs: [{ portId: output.inputs[0].id, expected: ['red'] }],
    },
  };
}

export function createLevel0_2_PaintItBlue(): Level {
  resetIdCounter();

  const input = createNode('unit', { x: 80, y: 150 });
  const painter = createNode('painter', { x: 180, y: 150 }, undefined, { targetColor: 'blue' });
  const output = createNode('counit', { x: 300, y: 150 });

  const edges = [
    createEdge(input.id, input.outputs[0].id, painter.id, painter.inputs[0].id),
    createEdge(painter.id, painter.outputs[0].id, output.id, output.inputs[0].id),
  ];

  const initial = createDiagram(
    [input, painter, output],
    edges,
    [],
    [],
    []
  );

  return {
    id: 'bead-0-2',
    name: 'Paint It Blue',
    description: 'The Painter gate transforms any bead to its target color. Drop a red bead and watch it become blue!',
    mode: 'play',
    initial,
    availableMoves: [],
    inputBeads: [{ edgeIndex: 0, color: 'red' }],
    winCondition: {
      type: 'exact-sequence',
      outputs: [{ portId: output.inputs[0].id, expected: ['blue'] }],
    },
  };
}

export function createLevel0_3_TheSorter(): Level {
  resetIdCounter();

  const input = createNode('unit', { x: 50, y: 150 });
  const filter = createNode('filter', { x: 150, y: 150 }, undefined, { matchColor: 'red' });
  const outputA = createNode('counit', { x: 280, y: 100 });
  const outputB = createNode('counit', { x: 280, y: 200 });

  const edges = [
    createEdge(input.id, input.outputs[0].id, filter.id, filter.inputs[0].id),
    createEdge(filter.id, filter.outputs[0].id, outputA.id, outputA.inputs[0].id),
    createEdge(filter.id, filter.outputs[1].id, outputB.id, outputB.inputs[0].id),
  ];

  const initial = createDiagram(
    [input, filter, outputA, outputB],
    edges,
    [],
    [],
    []
  );

  return {
    id: 'bead-0-3',
    name: 'The Sorter',
    description: 'The Filter gate sorts beads by color. Red beads go to output A (top), everything else goes to output B (bottom).',
    mode: 'play',
    initial,
    availableMoves: [],
    inputBeads: [
      { edgeIndex: 0, color: 'red', delay: 0 },
      { edgeIndex: 0, color: 'blue', delay: 800 },
      { edgeIndex: 0, color: 'red', delay: 1600 },
    ],
    winCondition: {
      type: 'exact-sequence',
      outputs: [
        { portId: outputA.inputs[0].id, expected: ['red', 'red'] },
        { portId: outputB.inputs[0].id, expected: ['blue'] },
      ],
    },
  };
}

export function createLevel0_4_ColorSwap(): Level {
  resetIdCounter();

  const inputA = createNode('unit', { x: 50, y: 100 });
  const inputB = createNode('unit', { x: 50, y: 200 });
  const swap = createNode('swap', { x: 170, y: 130 });
  const outputA = createNode('counit', { x: 300, y: 100 });
  const outputB = createNode('counit', { x: 300, y: 200 });

  const edges = [
    createEdge(inputA.id, inputA.outputs[0].id, swap.id, swap.inputs[0].id),
    createEdge(inputB.id, inputB.outputs[0].id, swap.id, swap.inputs[1].id),
    createEdge(swap.id, swap.outputs[0].id, outputA.id, outputA.inputs[0].id),
    createEdge(swap.id, swap.outputs[1].id, outputB.id, outputB.inputs[0].id),
  ];

  const initial = createDiagram(
    [inputA, inputB, swap, outputA, outputB],
    edges,
    [],
    [],
    []
  );

  return {
    id: 'bead-0-4',
    name: 'Color Swap',
    description: 'The Swap gate crosses two paths. Red from top ends at bottom, blue from bottom ends at top!',
    mode: 'play',
    initial,
    availableMoves: [],
    inputBeads: [
      { edgeIndex: 0, color: 'red', delay: 0 },
      { edgeIndex: 1, color: 'blue', delay: 0 },
    ],
    winCondition: {
      type: 'exact-sequence',
      outputs: [
        { portId: outputA.inputs[0].id, expected: ['blue'] },
        { portId: outputB.inputs[0].id, expected: ['red'] },
      ],
    },
  };
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

export function createLevel7_SwapInvolution(): Level {
  resetIdCounter();

  const id1 = createNode('identity', { x: 50, y: 100 });
  const id2 = createNode('identity', { x: 50, y: 200 });
  const swap1 = createNode('swap', { x: 150, y: 130 });
  const swap2 = createNode('swap', { x: 250, y: 130 });
  const id3 = createNode('identity', { x: 350, y: 100 });
  const id4 = createNode('identity', { x: 350, y: 200 });

  const edges = [
    createEdge(id1.id, id1.outputs[0].id, swap1.id, swap1.inputs[0].id),
    createEdge(id2.id, id2.outputs[0].id, swap1.id, swap1.inputs[1].id),
    createEdge(swap1.id, swap1.outputs[0].id, swap2.id, swap2.inputs[0].id),
    createEdge(swap1.id, swap1.outputs[1].id, swap2.id, swap2.inputs[1].id),
    createEdge(swap2.id, swap2.outputs[0].id, id3.id, id3.inputs[0].id),
    createEdge(swap2.id, swap2.outputs[1].id, id4.id, id4.inputs[0].id),
  ];

  const initial = createDiagram(
    [id1, id2, swap1, swap2, id3, id4],
    edges,
    [createPort('signal', 'input'), createPort('signal', 'input')],
    [createPort('signal', 'output'), createPort('signal', 'output')],
    []
  );

  return {
    id: 'tutorial-7',
    name: 'Swap Involution',
    description: 'Swapping twice returns to the original: σ ∘ σ = id. Cancel the two consecutive swaps!',
    mode: 'rewrite',
    initial,
    availableMoves: ['swap-involution'],
  };
}

export function createLevel8_Snake(): Level {
  resetIdCounter();

  const cup = createNode('cup', { x: 150, y: 120 });
  const cap = createNode('cap', { x: 250, y: 120 });

  const edges = [
    createEdge(cup.id, cup.outputs[0].id, cap.id, cap.inputs[1].id),
    createEdge(cup.id, cup.outputs[1].id, cap.id, cap.inputs[0].id),
  ];

  const initial = createDiagram(
    [cup, cap],
    edges,
    [],
    [],
    [],
    []
  );

  return {
    id: 'tutorial-8',
    name: 'Snake Equation',
    description: 'The snake equation: ε ∘ (id ⊗ η) = id. A cup feeding crossed into a cap cancels completely - yank the snake straight!',
    mode: 'rewrite',
    initial,
    availableMoves: ['snake'],
  };
}

export function createLevel9_CompactClosed(): Level {
  resetIdCounter();

  const id1 = createNode('identity', { x: 50, y: 150 });
  const cup = createNode('cup', { x: 150, y: 100 });
  const swap = createNode('swap', { x: 250, y: 130 });
  const cap = createNode('cap', { x: 350, y: 100 });
  const id2 = createNode('identity', { x: 450, y: 150 });

  const edges = [
    createEdge(id1.id, id1.outputs[0].id, swap.id, swap.inputs[0].id),
    createEdge(cup.id, cup.outputs[0].id, swap.id, swap.inputs[1].id),
    createEdge(swap.id, swap.outputs[0].id, cap.id, cap.inputs[0].id),
    createEdge(cup.id, cup.outputs[1].id, cap.id, cap.inputs[1].id),
    createEdge(swap.id, swap.outputs[1].id, id2.id, id2.inputs[0].id),
  ];

  const initial = createDiagram(
    [id1, cup, swap, cap, id2],
    edges,
    [createPort('signal', 'input')],
    [createPort('signal', 'output')],
    [],
    []
  );

  return {
    id: 'tutorial-9',
    name: 'Compact Closed',
    description: 'Combine swap involution and snake equation to simplify this tangled diagram. The cup and cap with a swap in between is secretly just a wire!',
    mode: 'rewrite',
    initial,
    availableMoves: ['snake', 'swap-involution', 'slide'],
  };
}

export const TUTORIAL_LEVELS: Level[] = [
  createLevel0_1_FirstDrop(),
  createLevel0_2_PaintItBlue(),
  createLevel0_3_TheSorter(),
  createLevel0_4_ColorSwap(),
  createLevel1_Slide(),
  createLevel2_Straighten(),
  createLevel3_Thread(),
  createLevel4_FeedbackLoop(),
  createLevel5_Combined(),
  createLevel6_Superpose(),
  createLevel7_SwapInvolution(),
  createLevel8_Snake(),
  createLevel9_CompactClosed(),
];

export function getLevelById(id: string): Level | undefined {
  return TUTORIAL_LEVELS.find(l => l.id === id);
}
