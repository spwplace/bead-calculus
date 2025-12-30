import { useCallback, useRef } from 'react';
import type { Diagram, Node } from '../core/diagram';
import { NODE_DIMENSIONS } from '../core/diagram';
import type { RewriteMatch } from '../core/rewrite';
import { findAllRewriteMatches } from '../core/rewrite';

interface GestureState {
  startNodeId: string | null;
  startPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  gestureType: 'drag' | 'pinch' | null;
  pinchStartDistance: number | null;
}

interface GestureResult {
  type: 'slide' | 'straighten' | 'none';
  match: RewriteMatch | null;
}

export function useGestureRewrite(
  diagram: Diagram,
  onApplyRewrite: (match: RewriteMatch) => void
) {
  const gestureState = useRef<GestureState>({
    startNodeId: null,
    startPosition: null,
    currentPosition: null,
    gestureType: null,
    pinchStartDistance: null,
  });

  const findNodeAtPosition = useCallback((x: number, y: number): Node | null => {
    for (const node of [...diagram.nodes].reverse()) {
      const dims = NODE_DIMENSIONS[node.type];
      if (
        x >= node.position.x &&
        x <= node.position.x + dims.width &&
        y >= node.position.y &&
        y <= node.position.y + dims.height
      ) {
        return node;
      }
    }
    return null;
  }, [diagram.nodes]);

  const detectGesture = useCallback((): GestureResult => {
    const state = gestureState.current;
    if (!state.startPosition || !state.currentPosition || !state.startNodeId) {
      return { type: 'none', match: null };
    }

    const dx = state.currentPosition.x - state.startPosition.x;
    const dy = state.currentPosition.y - state.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const availableRewrites = findAllRewriteMatches(diagram);

    if (state.gestureType === 'pinch') {
      const straightenMatch = availableRewrites.find(m => m.rule === 'straighten');
      if (straightenMatch) {
        return { type: 'straighten', match: straightenMatch };
      }
    }

    if (state.gestureType === 'drag' && distance > 50) {
      const isHorizontal = Math.abs(dx) > Math.abs(dy);
      
      if (isHorizontal) {
        const slideMatch = availableRewrites.find(m => 
          m.rule === 'slide' && m.nodeIds.includes(state.startNodeId!)
        );
        if (slideMatch) {
          return { type: 'slide', match: slideMatch };
        }
      }
    }

    return { type: 'none', match: null };
  }, [diagram]);

  const handleGestureStart = useCallback((x: number, y: number, isPinch = false) => {
    const node = findNodeAtPosition(x, y);
    gestureState.current = {
      startNodeId: node?.id ?? null,
      startPosition: { x, y },
      currentPosition: { x, y },
      gestureType: isPinch ? 'pinch' : 'drag',
      pinchStartDistance: null,
    };
  }, [findNodeAtPosition]);

  const handleGestureMove = useCallback((x: number, y: number) => {
    gestureState.current.currentPosition = { x, y };
  }, []);

  const handleGestureEnd = useCallback(() => {
    const result = detectGesture();
    
    if (result.match) {
      onApplyRewrite(result.match);
    }

    gestureState.current = {
      startNodeId: null,
      startPosition: null,
      currentPosition: null,
      gestureType: null,
      pinchStartDistance: null,
    };

    return result;
  }, [detectGesture, onApplyRewrite]);

  const handlePinchStart = useCallback((distance: number, centerX: number, centerY: number) => {
    gestureState.current = {
      startNodeId: null,
      startPosition: { x: centerX, y: centerY },
      currentPosition: { x: centerX, y: centerY },
      gestureType: 'pinch',
      pinchStartDistance: distance,
    };
  }, []);

  const handlePinchMove = useCallback((distance: number, centerX: number, centerY: number) => {
    const startDist = gestureState.current.pinchStartDistance;
    if (startDist && distance < startDist * 0.7) {
      const availableRewrites = findAllRewriteMatches(diagram);
      const straightenMatch = availableRewrites.find(m => m.rule === 'straighten');
      if (straightenMatch) {
        onApplyRewrite(straightenMatch);
        gestureState.current.pinchStartDistance = distance;
      }
    }
    gestureState.current.currentPosition = { x: centerX, y: centerY };
  }, [diagram, onApplyRewrite]);

  return {
    handleGestureStart,
    handleGestureMove,
    handleGestureEnd,
    handlePinchStart,
    handlePinchMove,
    gestureState: gestureState.current,
  };
}

export function getGestureHint(diagram: Diagram): string | null {
  const rewrites = findAllRewriteMatches(diagram);
  
  if (rewrites.some(r => r.rule === 'slide')) {
    return 'Drag nodes horizontally to slide';
  }
  if (rewrites.some(r => r.rule === 'straighten')) {
    return 'Pinch to straighten the loop';
  }
  if (rewrites.some(r => r.rule === 'thread')) {
    return 'Available: thread move';
  }
  
  return null;
}
