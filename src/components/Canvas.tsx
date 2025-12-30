import { useRef, useEffect, useCallback, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import type { Diagram, Node } from '../core/diagram';
import { NODE_DIMENSIONS, BEAD_COLORS } from '../core/diagram';
import type { Bead } from '../core/simulation';
import { getPortPosition, bezierPoint, getEdgeControlPoints } from '../utils/geometry';
import { useGameStore } from '../hooks/useGameStore';

interface CanvasProps {
  viewMode: 'machine' | 'diagram';
  onNodeSelect: (nodeId: string, additive?: boolean) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onBackgroundClick: () => void;
}

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

      for (const node of diagram.nodes) {
        drawNode(ctx, node, selectedNodeIds.has(node.id), viewMode);
      }

      const beads = getBeads();
      for (const bead of beads) {
        drawBead(ctx, diagram, bead);
      }

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

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: Node,
  isSelected: boolean,
  viewMode: 'machine' | 'diagram'
) {
  const dims = NODE_DIMENSIONS[node.type];
  const { x, y } = node.position;

  if (viewMode === 'machine') {
    drawMachineNode(ctx, node, dims, x, y, isSelected);
  } else {
    drawDiagramNode(ctx, node, dims, x, y, isSelected);
  }

  drawPorts(ctx, node, dims);
}

function drawMachineNode(
  ctx: CanvasRenderingContext2D,
  node: Node,
  dims: { width: number; height: number },
  x: number,
  y: number,
  isSelected: boolean
) {
  ctx.fillStyle = isSelected ? '#4a4a6e' : '#2a2a4e';
  ctx.strokeStyle = isSelected ? '#6366f1' : '#3a3a5e';
  ctx.lineWidth = isSelected ? 3 : 2;

  ctx.beginPath();
  ctx.roundRect(x, y, dims.width, dims.height, 8);
  ctx.fill();
  ctx.stroke();

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
  ctx.fillStyle = 'transparent';
  ctx.strokeStyle = isSelected ? '#6366f1' : '#e2e8f0';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.rect(x, y, dims.width, dims.height);
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.type, x + dims.width / 2, y + dims.height / 2);
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
      ctx.beginPath();
      ctx.arc(x + dims.width / 2, y + dims.height / 2, 12, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}

function drawPorts(
  ctx: CanvasRenderingContext2D,
  node: Node,
  dims: { width: number; height: number }
) {
  const portRadius = 5;

  for (let i = 0; i < node.inputs.length; i++) {
    const port = node.inputs[i];
    const pos = getPortPosition(
      node.position.x,
      node.position.y,
      dims.width,
      dims.height,
      'input',
      i,
      node.inputs.length
    );
    ctx.fillStyle = BEAD_COLORS[port.kind];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, portRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < node.outputs.length; i++) {
    const port = node.outputs[i];
    const pos = getPortPosition(
      node.position.x,
      node.position.y,
      dims.width,
      dims.height,
      'output',
      i,
      node.outputs.length
    );
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

function drawBead(ctx: CanvasRenderingContext2D, diagram: Diagram, bead: Bead) {
  if (bead.position.type !== 'on-edge') return;

  const pos = bead.position;
  const edge = diagram.edges.find(e => e.id === pos.edgeId);
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

  const { p1, p2 } = getEdgeControlPoints(fromPos, toPos);
  const beadPos = bezierPoint(fromPos, p1, p2, toPos, pos.progress);

  ctx.fillStyle = BEAD_COLORS[bead.kind];
  ctx.shadowColor = BEAD_COLORS[bead.kind];
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.arc(beadPos.x, beadPos.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
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
  };
  return labels[type];
}
