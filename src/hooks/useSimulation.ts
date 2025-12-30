import { useReducer, useEffect, useCallback, useRef } from 'react';
import type { Diagram, BeadKind } from '../core/diagram';
import type { SimulationState } from '../core/simulation';
import { createSimulationState, stepSimulation, injectBead } from '../core/simulation';

type SimulationAction =
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'INJECT_BEAD'; edgeId: string; kind: BeadKind }
  | { type: 'CLEAR_BEADS' }
  | { type: 'STEP'; diagram: Diagram; deltaTime: number }
  | { type: 'RESET' };

function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'TOGGLE_PAUSE':
      return { ...state, paused: !state.paused };
    case 'SET_SPEED':
      return { ...state, speed: Math.max(0.1, Math.min(3, action.speed)) };
    case 'INJECT_BEAD':
      return injectBead(state, action.kind, action.edgeId);
    case 'CLEAR_BEADS':
      return { ...state, beads: [], time: 0 };
    case 'STEP':
      return stepSimulation(state, action.diagram, action.deltaTime);
    case 'RESET':
      return createSimulationState();
    default:
      return state;
  }
}

interface UseSimulationResult {
  state: SimulationState;
  dispatch: React.Dispatch<SimulationAction>;
  step: (deltaTime: number) => void;
}

export function useSimulation(diagram: Diagram): UseSimulationResult {
  const [state, dispatch] = useReducer(simulationReducer, null, createSimulationState);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  const step = useCallback((deltaTime: number) => {
    dispatch({ type: 'STEP', diagram, deltaTime });
  }, [diagram]);

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = Math.min(currentTime - lastTimeRef.current, 50);
      lastTimeRef.current = currentTime;

      step(deltaTime);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [step]);

  return { state, dispatch, step };
}
