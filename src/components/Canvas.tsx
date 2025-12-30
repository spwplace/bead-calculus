import { useRef, useEffect, useCallback, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import type { Diagram, Node } from '../core/diagram';
import { NODE_DIMENSIONS, BEAD_COLORS } from '../core/diagram';
import type { Bead } from '../core/simulation';
import { getPortPosition, bezierPoint, getEdgeControlPoints } from '../utils/geometry';
import { useGameStore } from '../hooks/useGameStore';
import { globalAnimationController, type Animation } from '../core/animation';

interface CanvasProps {
  viewMode: 'machine' | 'diagram';
  onNodeSelect: (nodeId: string, additive?: boolean) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onBackgroundClick: () => void;
}

interface BeadTrail {
  x: number;
  y: number;
  age: number;
}

const beadTrailsMap = new Map<string, BeadTrail[]>();
const MAX_TRAIL_LENGTH = 8;
const TRAIL_DECAY = 0.02;

export function Canvas({
  viewMode,
  onNodeSelect,
  onNodeMove,
  onBackgroundClick,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  
  const diagram = useGameStore((state) => state.diagram);
  const selectedNodeIds = useGameStore((state) => state.selectedNodeIds);
  const getBeads = useGameStore((state) => state.getBeads);
  const stepSimulation = useGameStore((state) => state.stepSimulation);

  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
          setCanvasSize({ width: rect.width, height: rect.height });
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;
    let animationId: number;

    const gameLoop = (currentTime: number) => {
      const deltaTime = lastTime === 0 ? 16 : Math.min(currentTime - lastTime, 50);
      lastTime = currentTime;

      stepSimulation(deltaTime);

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      ctx.save();
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.scale, viewport.scale);

      drawGrid(ctx, canvasSize.width / viewport.scale, canvasSize.height / viewport.scale);

      for (const edge of diagram.edges) {
        drawEdge(ctx, diagram, edge.id, viewMode);
      }

      for (const tracePair of diagram.tracePairs) {
        drawFeedbackArc(ctx, diagram, tracePair.traceInNodeId, tracePair.traceOutNodeId, viewMode);
      }

      const activeAnimations = globalAnimationController.getActiveAnimations();

      for (const node of diagram.nodes) {
        const nodeAnims = activeAnimations.filter(
          a => (a.type === 'node-move' || a.type === 'node-scale') && 
               (a.data as { nodeId?: string }).nodeId === node.id
        );
        drawNodeWithAnimations(ctx, node, selectedNodeIds.has(node.id), viewMode, nodeAnims);
      }

      const beads = getBeads();
      updateBeadTrails(beads, diagram, deltaTime);
      
      for (const bead of beads) {
        drawBeadWithTrail(ctx, diagram, bead);
      }

      drawParticles(ctx, activeAnimations);

      drawInvariantGlow(ctx, beads.length, canvasSize.width / viewport.scale, canvasSize.height / viewport.scale, currentTime);

      ctx.restore();
      ctx.restore();

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [diagram, viewMode, selectedNodeIds, canvasSize, viewport, stepSimulation, getBeads]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale,
    };
  }, [viewport]);

  const findNodeAtPosition = useCallback((worldX: number, worldY: number): Node | null => {
    for (const node of [...diagram.nodes].reverse()) {
      const dims = NODE_DIMENSIONS[node.type];
      if (
        worldX >= node.position.x &&
        worldX <= node.position.x + dims.width &&
        worldY >= node.position.y &&
        worldY <= node.position.y + dims.height
      ) {
        return node;
      }
    }
    return null;
  }, [diagram.nodes]);

  const bind = useGesture({
    onDrag: ({ xy: [x, y], first, last, memo, event }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenX = x - rect.left;
      const screenY = y - rect.top;
      const world = screenToWorld(screenX, screenY);

      if (first) {
        const node = findNodeAtPosition(world.x, world.y);
        if (node) {
          const newDragging = {
            nodeId: node.id,
            offsetX: world.x - node.position.x,
            offsetY: world.y - node.position.y,
          };
          setDragging(newDragging);
          onNodeSelect(node.id, event?.shiftKey ?? false);
          return newDragging;
        } else {
          onBackgroundClick();
          return null;
        }
      }

      const dragState = memo || dragging;
      if (dragState) {
        const newX = Math.max(0, world.x - dragState.offsetX);
        const newY = Math.max(0, world.y - dragState.offsetY);
        onNodeMove(dragState.nodeId, newX, newY);
      }

      if (last) {
        setDragging(null);
      }

      return dragState;
    },
    onPinch: ({ offset: [scale], origin: [ox, oy] }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenX = ox - rect.left;
      const screenY = oy - rect.top;
      
      const newScale = Math.min(Math.max(0.25, scale), 4);
      const scaleChange = newScale / viewport.scale;
      
      setViewport({
        scale: newScale,
        x: screenX - (screenX - viewport.x) * scaleChange,
        y: screenY - (screenY - viewport.y) * scaleChange,
      });
    },
    onWheel: ({ delta: [, dy], event }) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      
      const zoomFactor = dy > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(0.25, viewport.scale * zoomFactor), 4);
      const scaleChange = newScale / viewport.scale;
      
      setViewport({
        scale: newScale,
        x: screenX - (screenX - viewport.x) * scaleChange,
        y: screenY - (screenY - viewport.y) * scaleChange,
      });
    },
  }, {
    drag: { filterTaps: true },
    pinch: { scaleBounds: { min: 0.25, max: 4 } },
    wheel: { eventOptions: { passive: false } },
  });

  return (
    <div ref={containerRef} className="w-full h-full touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        {...bind()}
      />
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1;

  const gridSize = 40;
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawNodeWithAnimations(
  ctx: CanvasRenderingContext2D,
  node: Node,
  isSelected: boolean,
  viewMode: 'machine' | 'diagram',
  animations: Animation[]
) {
  const dims = NODE_DIMENSIONS[node.type];
  let { x, y } = node.position;
  let scale = 1;

  for (const anim of animations) {
    const progress = globalAnimationController.getProgress(anim);
    
    if (anim.type === 'node-move') {
      const data = anim.data as { fromX: number; fromY: number; toX: number; toY: number };
      x = data.fromX + (data.toX - data.fromX) * progress;
      y = data.fromY + (data.toY - data.fromY) * progress;
    } else if (anim.type === 'node-scale') {
      const data = anim.data as { fromScale: number; toScale: number };
      scale = data.fromScale + (data.toScale - data.fromScale) * progress;
    }
  }

  if (scale <= 0.01) return;

  ctx.save();
  ctx.translate(x + dims.width / 2, y + dims.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-(x + dims.width / 2), -(y + dims.height / 2));

  if (viewMode === 'machine') {
    drawMachineNode(ctx, node, dims, x, y, isSelected);
  } else {
    drawDiagramNode(ctx, node, dims, x, y, isSelected);
  }

  drawPorts(ctx, node, dims, x, y);

  ctx.restore();
}

function drawMachineNode(
  ctx: CanvasRenderingContext2D,
  node: Node,
  dims: { width: number; height: number },
  x: number,
  y: number,
  isSelected: boolean
) {
  if (isSelected) {
    ctx.shadowColor = '#6366f1';
    ctx.shadowBlur = 15;
  }

  ctx.fillStyle = isSelected ? '#4a4a6e' : '#2a2a4e';
  ctx.strokeStyle = isSelected ? '#6366f1' : '#3a3a5e';
  ctx.lineWidth = isSelected ? 3 : 2;

  ctx.beginPath();
  ctx.roundRect(x, y, dims.width, dims.height, 8);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const label = getNodeLabel(node.type);
  ctx.fillText(label, x + dims.width / 2, y + dims.height / 2);

  drawNodeDecoration(ctx, node, dims, x, y);
}

function drawDiagramNode(
  ctx: CanvasRenderingContext2D,
  node: Node,
  dims: { width: number; height: number },
  x: number,
  y: number,
  isSelected: boolean
) {
  ctx.fillStyle = '#0f0f1a';
  ctx.strokeStyle = isSelected ? '#6366f1' : '#64748b';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.rect(x, y, dims.width, dims.height);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const shortNames: Record<string, string> = {
    'identity': 'id',
    'swap': 'σ',
    'delay': 'δ',
    'split': 'Δ',
    'merge': '∇',
    'trace-in': 'Tr↓',
    'trace-out': 'Tr↑',
    'unit': 'η',
    'counit': 'ε',
    'cup': '∪',
    'cap': '∩',
  };
  
  ctx.fillText(shortNames[node.type] || node.type, x + dims.width / 2, y + dims.height / 2);
}

function drawNodeDecoration(
  ctx: CanvasRenderingContext2D,
  node: Node,
  dims: { width: number; height: number },
  x: number,
  y: number
) {
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;

  switch (node.type) {
    case 'delay': {
      ctx.beginPath();
      ctx.moveTo(x + 10, y + dims.height / 2);
      ctx.lineTo(x + 15, y + dims.height / 2 - 5);
      ctx.lineTo(x + 15, y + dims.height / 2 + 5);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'split': {
      ctx.beginPath();
      ctx.moveTo(x + 10, y + dims.height / 2);
      ctx.lineTo(x + dims.width - 10, y + 10);
      ctx.moveTo(x + 10, y + dims.height / 2);
      ctx.lineTo(x + dims.width - 10, y + dims.height - 10);
      ctx.stroke();
      break;
    }
    case 'merge': {
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 10);
      ctx.lineTo(x + dims.width - 10, y + dims.height / 2);
      ctx.moveTo(x + 10, y + dims.height - 10);
      ctx.lineTo(x + dims.width - 10, y + dims.height / 2);
      ctx.stroke();
      break;
    }
    case 'swap': {
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 15);
      ctx.lineTo(x + dims.width - 10, y + dims.height - 15);
      ctx.moveTo(x + 10, y + dims.height - 15);
      ctx.lineTo(x + dims.width - 10, y + 15);
      ctx.stroke();
      break;
    }
    case 'trace-in':
    case 'trace-out': {
      ctx.strokeStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(x + dims.width / 2, y + dims.height / 2, 12, 0, Math.PI * 2);
      ctx.stroke();
      
      if (node.type === 'trace-in') {
        ctx.beginPath();
        ctx.moveTo(x + dims.width / 2, y + dims.height / 2 - 6);
        ctx.lineTo(x + dims.width / 2, y + dims.height / 2 + 6);
        ctx.moveTo(x + dims.width / 2 - 4, y + dims.height / 2 + 2);
        ctx.lineTo(x + dims.width / 2, y + dims.height / 2 + 6);
        ctx.lineTo(x + dims.width / 2 + 4, y + dims.height / 2 + 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x + dims.width / 2, y + dims.height / 2 + 6);
        ctx.lineTo(x + dims.width / 2, y + dims.height / 2 - 6);
        ctx.moveTo(x + dims.width / 2 - 4, y + dims.height / 2 - 2);
        ctx.lineTo(x + dims.width / 2, y + dims.height / 2 - 6);
        ctx.lineTo(x + dims.width / 2 + 4, y + dims.height / 2 - 2);
        ctx.stroke();
      }
      break;
    }
    case 'cup': {
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + dims.width / 2, y + dims.height - 5, dims.width / 3, Math.PI, 0, true);
      ctx.stroke();
      break;
    }
    case 'cap': {
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + dims.width / 2, y + 5, dims.width / 3, 0, Math.PI, true);
      ctx.stroke();
      break;
    }
    case 'unit': {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(x + dims.width / 2, y + dims.height / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'counit': {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x + dims.width / 2, y + dims.height / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f0f1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + dims.width / 2 - 4, y + dims.height / 2 - 4);
      ctx.lineTo(x + dims.width / 2 + 4, y + dims.height / 2 + 4);
      ctx.moveTo(x + dims.width / 2 + 4, y + dims.height / 2 - 4);
      ctx.lineTo(x + dims.width / 2 - 4, y + dims.height / 2 + 4);
      ctx.stroke();
      break;
    }
  }
}

function drawPorts(
  ctx: CanvasRenderingContext2D,
  node: Node,
  dims: { width: number; height: number },
  overrideX?: number,
  overrideY?: number
) {
  const portRadius = 6;
  const x = overrideX ?? node.position.x;
  const y = overrideY ?? node.position.y;

  for (let i = 0; i < node.inputs.length; i++) {
    const port = node.inputs[i];
    const pos = getPortPosition(x, y, dims.width, dims.height, 'input', i, node.inputs.length);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, portRadius + 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = BEAD_COLORS[port.kind];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, portRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < node.outputs.length; i++) {
    const port = node.outputs[i];
    const pos = getPortPosition(x, y, dims.width, dims.height, 'output', i, node.outputs.length);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, portRadius + 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = BEAD_COLORS[port.kind];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, portRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  diagram: Diagram,
  edgeId: string,
  viewMode: 'machine' | 'diagram'
) {
  const edge = diagram.edges.find(e => e.id === edgeId);
  if (!edge) return;

  const fromNode = diagram.nodes.find(n => n.id === edge.from.nodeId);
  const toNode = diagram.nodes.find(n => n.id === edge.to.nodeId);
  if (!fromNode || !toNode) return;

  const fromDims = NODE_DIMENSIONS[fromNode.type];
  const toDims = NODE_DIMENSIONS[toNode.type];

  const fromPortIndex = fromNode.outputs.findIndex(p => p.id === edge.from.portId);
  const toPortIndex = toNode.inputs.findIndex(p => p.id === edge.to.portId);

  const fromPos = getPortPosition(
    fromNode.position.x,
    fromNode.position.y,
    fromDims.width,
    fromDims.height,
    'output',
    fromPortIndex,
    fromNode.outputs.length
  );

  const toPos = getPortPosition(
    toNode.position.x,
    toNode.position.y,
    toDims.width,
    toDims.height,
    'input',
    toPortIndex,
    toNode.inputs.length
  );

  const fromPort = fromNode.outputs[fromPortIndex];
  ctx.strokeStyle = viewMode === 'machine' ? BEAD_COLORS[fromPort?.kind ?? 'signal'] : '#e2e8f0';
  ctx.lineWidth = viewMode === 'machine' ? 3 : 2;

  const { p1, p2 } = getEdgeControlPoints(fromPos, toPos);

  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, toPos.x, toPos.y);
  ctx.stroke();
}

function drawFeedbackArc(
  ctx: CanvasRenderingContext2D,
  diagram: Diagram,
  traceInNodeId: string,
  traceOutNodeId: string,
  viewMode: 'machine' | 'diagram'
) {
  const traceIn = diagram.nodes.find(n => n.id === traceInNodeId);
  const traceOut = diagram.nodes.find(n => n.id === traceOutNodeId);
  if (!traceIn || !traceOut) return;

  const traceInDims = NODE_DIMENSIONS[traceIn.type];
  const traceOutDims = NODE_DIMENSIONS[traceOut.type];

  const startX = traceOut.position.x + traceOutDims.width / 2;
  const startY = traceOut.position.y;
  const endX = traceIn.position.x + traceInDims.width / 2;
  const endY = traceIn.position.y;

  const arcHeight = 50;
  const midY = Math.min(startY, endY) - arcHeight;

  ctx.strokeStyle = viewMode === 'machine' ? '#a855f7' : '#94a3b8';
  ctx.lineWidth = viewMode === 'machine' ? 3 : 2;
  ctx.setLineDash([8, 4]);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(
    startX, midY,
    endX, midY,
    endX, endY
  );
  ctx.stroke();

  ctx.setLineDash([]);

  const arrowSize = 6;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - arrowSize, endY - arrowSize * 1.5);
  ctx.lineTo(endX + arrowSize, endY - arrowSize * 1.5);
  ctx.closePath();
  ctx.fill();
}

function updateBeadTrails(beads: Bead[], diagram: Diagram, _deltaTime: number) {
  for (const bead of beads) {
    const pos = getBeadPosition(diagram, bead);
    if (!pos) continue;

    let trails = beadTrailsMap.get(bead.id);
    if (!trails) {
      trails = [];
      beadTrailsMap.set(bead.id, trails);
    }

    trails.unshift({ x: pos.x, y: pos.y, age: 0 });

    for (let i = 0; i < trails.length; i++) {
      trails[i].age += TRAIL_DECAY;
    }

    while (trails.length > MAX_TRAIL_LENGTH) {
      trails.pop();
    }
  }

  const activeBeadIds = new Set(beads.map(b => b.id));
  for (const id of beadTrailsMap.keys()) {
    if (!activeBeadIds.has(id)) {
      beadTrailsMap.delete(id);
    }
  }
}

function getBeadPosition(diagram: Diagram, bead: Bead): { x: number; y: number } | null {
  if (bead.position.type === 'on-edge') {
    const pos = bead.position;
    const edge = diagram.edges.find(e => e.id === pos.edgeId);
    if (!edge) return null;

    const fromNode = diagram.nodes.find(n => n.id === edge.from.nodeId);
    const toNode = diagram.nodes.find(n => n.id === edge.to.nodeId);
    if (!fromNode || !toNode) return null;

    const fromDims = NODE_DIMENSIONS[fromNode.type];
    const toDims = NODE_DIMENSIONS[toNode.type];
    const fromPortIndex = fromNode.outputs.findIndex(p => p.id === edge.from.portId);
    const toPortIndex = toNode.inputs.findIndex(p => p.id === edge.to.portId);

    const fromPos = getPortPosition(fromNode.position.x, fromNode.position.y, fromDims.width, fromDims.height, 'output', fromPortIndex, fromNode.outputs.length);
    const toPos = getPortPosition(toNode.position.x, toNode.position.y, toDims.width, toDims.height, 'input', toPortIndex, toNode.inputs.length);

    const { p1, p2 } = getEdgeControlPoints(fromPos, toPos);
    return bezierPoint(fromPos, p1, p2, toPos, pos.progress);
  } else if (bead.position.type === 'in-feedback') {
    const pos = bead.position;
    const tracePair = diagram.tracePairs.find(tp => tp.id === pos.tracePairId);
    if (!tracePair) return null;

    const traceOut = diagram.nodes.find(n => n.id === tracePair.traceOutNodeId);
    const traceIn = diagram.nodes.find(n => n.id === tracePair.traceInNodeId);
    if (!traceOut || !traceIn) return null;

    const traceOutDims = NODE_DIMENSIONS[traceOut.type];
    const traceInDims = NODE_DIMENSIONS[traceIn.type];

    const startX = traceOut.position.x + traceOutDims.width / 2;
    const startY = traceOut.position.y - 10;
    const endX = traceIn.position.x + traceInDims.width / 2;
    const endY = traceIn.position.y - 10;
    const midY = Math.min(startY, endY) - 40;

    const t = bead.position.progress;
    if (t < 0.33) {
      const segT = t / 0.33;
      return { x: startX, y: startY + (midY - startY) * segT };
    } else if (t < 0.67) {
      const segT = (t - 0.33) / 0.34;
      return { x: startX + (endX - startX) * segT, y: midY };
    } else {
      const segT = (t - 0.67) / 0.33;
      return { x: endX, y: midY + (endY - midY) * segT };
    }
  }
  return null;
}

function drawBeadWithTrail(ctx: CanvasRenderingContext2D, diagram: Diagram, bead: Bead) {
  const trails = beadTrailsMap.get(bead.id) || [];
  const color = BEAD_COLORS[bead.kind];

  for (let i = trails.length - 1; i >= 0; i--) {
    const trail = trails[i];
    const alpha = Math.max(0, 1 - trail.age);
    const size = 8 * (1 - i / MAX_TRAIL_LENGTH) * 0.6;
    
    if (alpha > 0 && size > 1) {
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const pos = getBeadPosition(diagram, bead);
  if (!pos) return;

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(pos.x - 2, pos.y - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawParticles(ctx: CanvasRenderingContext2D, animations: Animation[]) {
  for (const anim of animations) {
    if (anim.type !== 'particle') continue;
    
    const progress = globalAnimationController.getProgress(anim);
    const data = anim.data as { x: number; y: number; color: string; count: number; velocities: Array<{ vx: number; vy: number }> };
    
    for (let i = 0; i < data.count; i++) {
      const v = data.velocities[i];
      const x = data.x + v.vx * progress;
      const y = data.y + v.vy * progress;
      const alpha = 1 - progress;
      const size = 4 * (1 - progress * 0.5);
      
      ctx.globalAlpha = alpha;
      ctx.fillStyle = data.color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function getNodeLabel(type: Node['type']): string {
  const labels: Record<Node['type'], string> = {
    'identity': 'id',
    'swap': 'X',
    'delay': 'D',
    'split': 'Y',
    'merge': 'A',
    'trace-in': 'Ti',
    'trace-out': 'To',
    'unit': 'I',
    'counit': '*',
    'cup': 'U',
    'cap': 'n',
  };
  return labels[type];
}

function drawInvariantGlow(
  ctx: CanvasRenderingContext2D, 
  beadCount: number, 
  width: number, 
  height: number,
  time: number
) {
  if (beadCount === 0) return;
  
  const pulse = Math.sin(time * 0.003) * 0.3 + 0.7;
  const glowColor = beadCount > 0 ? `rgba(34, 197, 94, ${0.15 * pulse})` : 'rgba(239, 68, 68, 0.15)';
  
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) / 2
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.7, 'transparent');
  gradient.addColorStop(1, glowColor);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
