import type { Diagram, BeadKind } from './diagram';
import type { Bead } from './simulation';

export type InvariantType = 
  | 'bead-conservation'
  | 'no-simultaneous-arrival'
  | 'frequency-ratio'
  | 'phase-alignment';

export interface Invariant {
  type: InvariantType;
  description: string;
  params?: Record<string, unknown>;
}

export interface InvariantStatus {
  invariant: Invariant;
  satisfied: boolean;
  message: string;
}

export interface InvariantContext {
  diagram: Diagram;
  beads: Bead[];
  beadHistory: BeadEvent[];
}

export interface BeadEvent {
  time: number;
  type: 'enter' | 'exit' | 'split' | 'merge' | 'loop';
  nodeId: string;
  beadKind: BeadKind;
}

export function createBeadConservationInvariant(
  expectedExitCount: number,
  kind: BeadKind = 'signal'
): Invariant {
  return {
    type: 'bead-conservation',
    description: `Exactly ${expectedExitCount} ${kind} bead(s) must exit`,
    params: { expectedExitCount, kind },
  };
}

export function createNoSimultaneousArrivalInvariant(): Invariant {
  return {
    type: 'no-simultaneous-arrival',
    description: 'No two beads may arrive at the same node simultaneously',
  };
}

export function createFrequencyRatioInvariant(ratio: number): Invariant {
  return {
    type: 'frequency-ratio',
    description: `Output frequency = ${ratio}× input frequency`,
    params: { ratio },
  };
}

export function checkInvariant(
  invariant: Invariant,
  context: InvariantContext
): InvariantStatus {
  switch (invariant.type) {
    case 'bead-conservation':
      return checkBeadConservation(invariant, context);
    case 'no-simultaneous-arrival':
      return checkNoSimultaneousArrival(invariant, context);
    case 'frequency-ratio':
      return checkFrequencyRatio(invariant, context);
    default:
      return {
        invariant,
        satisfied: true,
        message: 'Unknown invariant type',
      };
  }
}

function checkBeadConservation(
  invariant: Invariant,
  context: InvariantContext
): InvariantStatus {
  const expectedCount = invariant.params?.expectedExitCount as number;
  const kind = invariant.params?.kind as BeadKind;
  
  const exitEvents = context.beadHistory.filter(
    e => e.type === 'exit' && e.beadKind === kind
  );
  
  const actualCount = exitEvents.length;
  const satisfied = actualCount === expectedCount;
  
  return {
    invariant,
    satisfied,
    message: satisfied 
      ? `Conservation satisfied: ${actualCount}/${expectedCount} ${kind} beads exited`
      : `Conservation violated: ${actualCount}/${expectedCount} ${kind} beads exited`,
  };
}

function checkNoSimultaneousArrival(
  invariant: Invariant,
  context: InvariantContext
): InvariantStatus {
  const arrivalTimes = new Map<string, number[]>();
  
  for (const event of context.beadHistory) {
    if (event.type === 'enter' || event.type === 'merge') {
      const times = arrivalTimes.get(event.nodeId) ?? [];
      times.push(event.time);
      arrivalTimes.set(event.nodeId, times);
    }
  }
  
  for (const [nodeId, times] of arrivalTimes) {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      if (Math.abs(times[i] - times[i - 1]) < 10) {
        return {
          invariant,
          satisfied: false,
          message: `Simultaneous arrival detected at node ${nodeId}`,
        };
      }
    }
  }
  
  return {
    invariant,
    satisfied: true,
    message: 'No simultaneous arrivals detected',
  };
}

function checkFrequencyRatio(
  invariant: Invariant,
  context: InvariantContext
): InvariantStatus {
  const ratio = invariant.params?.ratio as number;
  
  const inputEvents = context.beadHistory.filter(e => e.type === 'enter');
  const outputEvents = context.beadHistory.filter(e => e.type === 'exit');
  
  if (inputEvents.length < 2 || outputEvents.length < 2) {
    return {
      invariant,
      satisfied: true,
      message: 'Insufficient data to check frequency ratio',
    };
  }
  
  const inputPeriod = (inputEvents[inputEvents.length - 1].time - inputEvents[0].time) / (inputEvents.length - 1);
  const outputPeriod = (outputEvents[outputEvents.length - 1].time - outputEvents[0].time) / (outputEvents.length - 1);
  
  const actualRatio = inputPeriod / outputPeriod;
  const tolerance = 0.1;
  const satisfied = Math.abs(actualRatio - ratio) < tolerance;
  
  return {
    invariant,
    satisfied,
    message: satisfied 
      ? `Frequency ratio satisfied: ${actualRatio.toFixed(2)}x`
      : `Frequency ratio violated: expected ${ratio}x, got ${actualRatio.toFixed(2)}x`,
  };
}

export function countBeadsByKind(beads: Bead[]): Map<BeadKind, number> {
  const counts = new Map<BeadKind, number>();
  for (const bead of beads) {
    counts.set(bead.kind, (counts.get(bead.kind) ?? 0) + 1);
  }
  return counts;
}

export function countActiveBeads(beads: Bead[]): number {
  return beads.filter(b => b.state === 'moving' || b.state === 'waiting').length;
}

export function getBeadsByLocation(
  beads: Bead[],
  _diagram: Diagram
): Map<string, Bead[]> {
  const byLocation = new Map<string, Bead[]>();
  
  for (const bead of beads) {
    let locationKey: string;
    
    if (bead.position.type === 'on-edge') {
      locationKey = `edge:${bead.position.edgeId}`;
    } else if (bead.position.type === 'at-node') {
      locationKey = `node:${bead.position.nodeId}`;
    } else {
      locationKey = `feedback:${bead.position.tracePairId}`;
    }
    
    const list = byLocation.get(locationKey) ?? [];
    list.push(bead);
    byLocation.set(locationKey, list);
  }
  
  return byLocation;
}
