import type { Diagram, Node } from './diagram';
import { findNode } from './diagram';

export type RewriteRuleName = 'slide' | 'straighten' | 'thread';

export interface RewriteMatch {
  rule: RewriteRuleName;
  nodeIds: string[];
  description: string;
}

export interface RewriteResult {
  success: boolean;
  diagram: Diagram;
  message: string;
}

export function findSlideMatches(diagram: Diagram): RewriteMatch[] {
  const matches: RewriteMatch[] = [];

  for (let i = 0; i < diagram.nodes.length; i++) {
    for (let j = i + 1; j < diagram.nodes.length; j++) {
      const nodeA = diagram.nodes[i];
      const nodeB = diagram.nodes[j];

      if (areNodesIndependent(diagram, nodeA, nodeB) && areNodesAdjacent(nodeA, nodeB)) {
        matches.push({
          rule: 'slide',
          nodeIds: [nodeA.id, nodeB.id],
          description: `Slide ${nodeA.type} past ${nodeB.type}`,
        });
      }
    }
  }

  return matches;
}

function areNodesIndependent(diagram: Diagram, nodeA: Node, nodeB: Node): boolean {
  const aOutputIds = new Set(nodeA.outputs.map(p => p.id));
  const bInputIds = new Set(nodeB.inputs.map(p => p.id));
  const bOutputIds = new Set(nodeB.outputs.map(p => p.id));
  const aInputIds = new Set(nodeA.inputs.map(p => p.id));

  for (const edge of diagram.edges) {
    if (edge.from.nodeId === nodeA.id && aOutputIds.has(edge.from.portId) &&
        edge.to.nodeId === nodeB.id && bInputIds.has(edge.to.portId)) {
      return false;
    }
    if (edge.from.nodeId === nodeB.id && bOutputIds.has(edge.from.portId) &&
        edge.to.nodeId === nodeA.id && aInputIds.has(edge.to.portId)) {
      return false;
    }
  }

  return true;
}

function areNodesAdjacent(nodeA: Node, nodeB: Node): boolean {
  const dx = Math.abs(nodeA.position.x - nodeB.position.x);
  const dy = Math.abs(nodeA.position.y - nodeB.position.y);
  return dx < 150 && dy < 150;
}

export function applySlide(diagram: Diagram, match: RewriteMatch): RewriteResult {
  if (match.nodeIds.length !== 2) {
    return { success: false, diagram, message: 'Slide requires exactly 2 nodes' };
  }

  const [nodeAId, nodeBId] = match.nodeIds;
  const nodeA = findNode(diagram, nodeAId);
  const nodeB = findNode(diagram, nodeBId);

  if (!nodeA || !nodeB) {
    return { success: false, diagram, message: 'Nodes not found' };
  }

  const newNodes = diagram.nodes.map(n => {
    if (n.id === nodeAId) {
      return { ...n, position: { ...nodeB.position } };
    }
    if (n.id === nodeBId) {
      return { ...n, position: { ...nodeA.position } };
    }
    return n;
  });

  return {
    success: true,
    diagram: { ...diagram, nodes: newNodes },
    message: 'Slid nodes past each other',
  };
}

export function findStraightenMatches(diagram: Diagram): RewriteMatch[] {
  const matches: RewriteMatch[] = [];

  for (const node of diagram.nodes) {
    if (node.type === 'trace-in') {
      const pairedTraceOut = findPairedTraceOut(diagram, node);
      if (pairedTraceOut && isEmptyLoop(diagram, node, pairedTraceOut)) {
        matches.push({
          rule: 'straighten',
          nodeIds: [node.id, pairedTraceOut.id],
          description: 'Remove empty loop',
        });
      }
    }
  }

  return matches;
}

function findPairedTraceOut(diagram: Diagram, traceIn: Node): Node | null {
  for (const edge of diagram.edges) {
    if (edge.from.nodeId === traceIn.id) {
      const targetNode = findNode(diagram, edge.to.nodeId);
      if (targetNode?.type === 'trace-out') {
        return targetNode;
      }
    }
  }
  return null;
}

function isEmptyLoop(diagram: Diagram, traceIn: Node, traceOut: Node): boolean {
  const directEdge = diagram.edges.find(
    e => e.from.nodeId === traceIn.id && e.to.nodeId === traceOut.id
  );
  return directEdge !== null;
}

export function applyStraighten(diagram: Diagram, match: RewriteMatch): RewriteResult {
  if (match.nodeIds.length !== 2) {
    return { success: false, diagram, message: 'Straighten requires trace-in and trace-out pair' };
  }

  const [traceInId, traceOutId] = match.nodeIds;

  const newNodes = diagram.nodes.filter(
    n => n.id !== traceInId && n.id !== traceOutId
  );
  const newEdges = diagram.edges.filter(
    e =>
      e.from.nodeId !== traceInId &&
      e.from.nodeId !== traceOutId &&
      e.to.nodeId !== traceInId &&
      e.to.nodeId !== traceOutId
  );

  return {
    success: true,
    diagram: { ...diagram, nodes: newNodes, edges: newEdges },
    message: 'Straightened loop',
  };
}

export function findThreadMatches(diagram: Diagram): RewriteMatch[] {
  const matches: RewriteMatch[] = [];

  for (const node of diagram.nodes) {
    if (node.type !== 'trace-in' && node.type !== 'trace-out') {
      const traceContext = findTraceContext(diagram, node);
      if (traceContext) {
        matches.push({
          rule: 'thread',
          nodeIds: [node.id, traceContext.traceIn.id, traceContext.traceOut.id],
          description: `Thread ${node.type} across loop`,
        });
      }
    }
  }

  return matches;
}

interface TraceContext {
  traceIn: Node;
  traceOut: Node;
}

function findTraceContext(diagram: Diagram, node: Node): TraceContext | null {
  let connectedTraceIn: Node | null = null;
  let connectedTraceOut: Node | null = null;

  for (const edge of diagram.edges) {
    if (edge.to.nodeId === node.id) {
      const sourceNode = findNode(diagram, edge.from.nodeId);
      if (sourceNode?.type === 'trace-in') {
        connectedTraceIn = sourceNode;
      }
    }
    if (edge.from.nodeId === node.id) {
      const targetNode = findNode(diagram, edge.to.nodeId);
      if (targetNode?.type === 'trace-out') {
        connectedTraceOut = targetNode;
      }
    }
  }

  if (connectedTraceIn && connectedTraceOut) {
    return { traceIn: connectedTraceIn, traceOut: connectedTraceOut };
  }

  return null;
}

export function applyThread(diagram: Diagram, match: RewriteMatch): RewriteResult {
  if (match.nodeIds.length !== 3) {
    return { success: false, diagram, message: 'Thread requires node and trace pair' };
  }

  const [nodeId, traceInId, traceOutId] = match.nodeIds;
  const node = findNode(diagram, nodeId);
  const traceIn = findNode(diagram, traceInId);
  const traceOut = findNode(diagram, traceOutId);

  if (!node || !traceIn || !traceOut) {
    return { success: false, diagram, message: 'Nodes not found' };
  }

  const avgX = (traceIn.position.x + traceOut.position.x) / 2;
  const newX = node.position.x < avgX
    ? traceOut.position.x + 100
    : traceIn.position.x - 100;

  const newNodes = diagram.nodes.map(n => {
    if (n.id === nodeId) {
      return { ...n, position: { ...n.position, x: newX } };
    }
    return n;
  });

  return {
    success: true,
    diagram: { ...diagram, nodes: newNodes },
    message: 'Threaded node across loop',
  };
}

export function findAllRewriteMatches(diagram: Diagram): RewriteMatch[] {
  return [
    ...findSlideMatches(diagram),
    ...findStraightenMatches(diagram),
    ...findThreadMatches(diagram),
  ];
}

export function applyRewrite(diagram: Diagram, match: RewriteMatch): RewriteResult {
  switch (match.rule) {
    case 'slide':
      return applySlide(diagram, match);
    case 'straighten':
      return applyStraighten(diagram, match);
    case 'thread':
      return applyThread(diagram, match);
    default:
      return { success: false, diagram, message: 'Unknown rewrite rule' };
  }
}

export function checkDiagramEquivalence(a: Diagram, b: Diagram): boolean {
  if (a.nodes.length !== b.nodes.length) return false;
  if (a.edges.length !== b.edges.length) return false;

  const aNodeTypes = a.nodes.map(n => n.type).sort();
  const bNodeTypes = b.nodes.map(n => n.type).sort();
  
  for (let i = 0; i < aNodeTypes.length; i++) {
    if (aNodeTypes[i] !== bNodeTypes[i]) return false;
  }

  return true;
}
