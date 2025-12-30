import type { BeadKind } from './diagram';

export interface OutputSpec {
  portId: string;
  expected: BeadKind[];
}

export interface ColorCountSpec {
  color: BeadKind;
  count: number;
}

export type WinConditionType = 'exact-sequence' | 'exact-count' | 'any-order';

export interface WinCondition {
  type: WinConditionType;
  outputs?: OutputSpec[];
  colorCounts?: ColorCountSpec[];
  constraints?: {
    maxGates?: number;
    maxTime?: number;
    noWaste?: boolean;
  };
}

export interface WinCheckResult {
  won: boolean;
  progress: number;
  message?: string;
  details?: {
    portId: string;
    expected: BeadKind[];
    actual: BeadKind[];
    match: boolean;
  }[];
}

export function checkWinCondition(
  condition: WinCondition,
  collectedBeads: Map<string, BeadKind[]>
): WinCheckResult {
  switch (condition.type) {
    case 'exact-sequence':
      return checkExactSequence(condition, collectedBeads);
    case 'exact-count':
      return checkExactCount(condition, collectedBeads);
    case 'any-order':
      return checkAnyOrder(condition, collectedBeads);
    default:
      return { won: false, progress: 0, message: 'Unknown win condition type' };
  }
}

function checkExactSequence(
  condition: WinCondition,
  collectedBeads: Map<string, BeadKind[]>
): WinCheckResult {
  if (!condition.outputs || condition.outputs.length === 0) {
    return { won: true, progress: 1 };
  }

  const details: WinCheckResult['details'] = [];
  let totalExpected = 0;
  let totalMatched = 0;

  for (const spec of condition.outputs) {
    const actual = collectedBeads.get(spec.portId) ?? [];
    const expected = spec.expected;
    totalExpected += expected.length;

    let matchCount = 0;
    for (let i = 0; i < expected.length && i < actual.length; i++) {
      if (expected[i] === actual[i]) {
        matchCount++;
      } else {
        break;
      }
    }
    totalMatched += matchCount;

    const match = actual.length === expected.length && matchCount === expected.length;
    details.push({
      portId: spec.portId,
      expected,
      actual,
      match,
    });
  }

  const progress = totalExpected > 0 ? totalMatched / totalExpected : 1;
  const won = details.every(d => d.match);

  return {
    won,
    progress,
    message: won ? 'Perfect!' : `${Math.round(progress * 100)}% complete`,
    details,
  };
}

function checkExactCount(
  condition: WinCondition,
  collectedBeads: Map<string, BeadKind[]>
): WinCheckResult {
  if (!condition.colorCounts || condition.colorCounts.length === 0) {
    return { won: true, progress: 1 };
  }

  const allBeads: BeadKind[] = [];
  for (const beads of collectedBeads.values()) {
    allBeads.push(...beads);
  }

  const counts = new Map<BeadKind, number>();
  for (const bead of allBeads) {
    counts.set(bead, (counts.get(bead) ?? 0) + 1);
  }

  let totalExpected = 0;
  let totalCollected = 0;

  for (const spec of condition.colorCounts) {
    const actual = counts.get(spec.color) ?? 0;
    totalExpected += spec.count;
    totalCollected += Math.min(actual, spec.count);
  }

  const progress = totalExpected > 0 ? totalCollected / totalExpected : 1;
  const won = condition.colorCounts.every(spec => {
    const actual = counts.get(spec.color) ?? 0;
    return actual >= spec.count;
  });

  return {
    won,
    progress,
    message: won ? 'Perfect!' : `${Math.round(progress * 100)}% complete`,
  };
}

function checkAnyOrder(
  condition: WinCondition,
  collectedBeads: Map<string, BeadKind[]>
): WinCheckResult {
  if (!condition.outputs || condition.outputs.length === 0) {
    return { won: true, progress: 1 };
  }

  const details: WinCheckResult['details'] = [];
  let totalExpected = 0;
  let totalMatched = 0;

  for (const spec of condition.outputs) {
    const actual = collectedBeads.get(spec.portId) ?? [];
    const expected = spec.expected;
    totalExpected += expected.length;

    const sortedExpected = [...expected].sort();
    const sortedActual = [...actual].sort();

    let matchCount = 0;
    let expectedIdx = 0;
    let actualIdx = 0;

    while (expectedIdx < sortedExpected.length && actualIdx < sortedActual.length) {
      if (sortedExpected[expectedIdx] === sortedActual[actualIdx]) {
        matchCount++;
        expectedIdx++;
        actualIdx++;
      } else if (sortedExpected[expectedIdx] < sortedActual[actualIdx]) {
        expectedIdx++;
      } else {
        actualIdx++;
      }
    }

    totalMatched += matchCount;

    const match = sortedActual.length === sortedExpected.length &&
      sortedActual.every((v, i) => v === sortedExpected[i]);

    details.push({
      portId: spec.portId,
      expected,
      actual,
      match,
    });
  }

  const progress = totalExpected > 0 ? totalMatched / totalExpected : 1;
  const won = details.every(d => d.match);

  return {
    won,
    progress,
    message: won ? 'Perfect!' : `${Math.round(progress * 100)}% complete`,
    details,
  };
}

export function createExactSequenceCondition(
  outputs: OutputSpec[]
): WinCondition {
  return {
    type: 'exact-sequence',
    outputs,
  };
}

export function createColorCountCondition(
  colorCounts: ColorCountSpec[]
): WinCondition {
  return {
    type: 'exact-count',
    colorCounts,
  };
}
