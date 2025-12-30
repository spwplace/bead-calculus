import type { Diagram, Node, Edge, TracePair } from './diagram';
import {
  findNode,
  areNodesInIndependentFactors,
  cloneDiagram,
  createEdge,
  computeTensorFactors,
} from './diagram';

export type RewriteRuleName = 'slide' | 'straighten' | 'thread' | 'superpose';

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

      if (areNodesInIndependentFactors(diagram, nodeA.id, nodeB.id)) {
        matches.push({
          rule: 'slide',
          nodeIds: [nodeA.id, nodeB.id],
          description: `Slide ${nodeA.type} ↔ ${nodeB.type} (independent factors)`,
        });
      }
    }
  }

  return matches;
}

export function applySlide(diagram: Diagram, match: RewriteMatch): RewriteResult {
  if (match.nodeIds.length !== 2) {
    return { success: false, diagram, message: 'Slide requires exactly 2 nodes' };
  }

  const [nodeAId, nodeBId] = match.nodeIds;
  
  if (!areNodesInIndependentFactors(diagram, nodeAId, nodeBId)) {
    return { 
      success: false, 
      diagram, 
      message: 'Nodes are not in independent tensor factors - slide not valid' 
    };
  }

  const nodeA = findNode(diagram, nodeAId);
  const nodeB = findNode(diagram, nodeBId);

  if (!nodeA || !nodeB) {
    return { success: false, diagram, message: 'Nodes not found' };
  }

  const newDiagram = cloneDiagram(diagram);
  const newNodeA = findNode(newDiagram, nodeAId)!;
  const newNodeB = findNode(newDiagram, nodeBId)!;
  
  const tempPos = { ...newNodeA.position };
  newNodeA.position = { ...newNodeB.position };
  newNodeB.position = tempPos;

  return {
    success: true,
    diagram: newDiagram,
    message: 'Slid independent nodes (interchange law)',
  };
}

export function findStraightenMatches(diagram: Diagram): RewriteMatch[] {
  const matches: RewriteMatch[] = [];

  for (const tracePair of diagram.tracePairs) {
    if (isEmptyTrace(diagram, tracePair)) {
      matches.push({
        rule: 'straighten',
        nodeIds: [tracePair.traceInNodeId, tracePair.traceOutNodeId],
        description: 'Remove empty trace loop (yanking)',
      });
    }
  }

  return matches;
}

function isEmptyTrace(diagram: Diagram, tracePair: TracePair): boolean {
  const traceIn = findNode(diagram, tracePair.traceInNodeId);
  const traceOut = findNode(diagram, tracePair.traceOutNodeId);
  
  if (!traceIn || !traceOut) return false;
  
  const directEdge = diagram.edges.find(
    e => e.from.nodeId === traceIn.id && e.to.nodeId === traceOut.id
  );
  
  return directEdge !== null;
}

function findEdgeToNode(diagram: Diagram, nodeId: string, portId: string): Edge | undefined {
  return diagram.edges.find(e => e.to.nodeId === nodeId && e.to.portId === portId);
}

function findEdgeFromNode(diagram: Diagram, nodeId: string, portId: string): Edge | undefined {
  return diagram.edges.find(e => e.from.nodeId === nodeId && e.from.portId === portId);
}

export function applyStraighten(diagram: Diagram, match: RewriteMatch): RewriteResult {
  if (match.nodeIds.length !== 2) {
    return { success: false, diagram, message: 'Straighten requires trace-in and trace-out pair' };
  }

  const [traceInId, traceOutId] = match.nodeIds;
  
  const tracePair = diagram.tracePairs.find(
    tp => tp.traceInNodeId === traceInId && tp.traceOutNodeId === traceOutId
  );
  
  if (!tracePair) {
    return { success: false, diagram, message: 'No valid trace pair found' };
  }
  
  if (!isEmptyTrace(diagram, tracePair)) {
    return { success: false, diagram, message: 'Trace is not empty - cannot straighten' };
  }

  const traceIn = findNode(diagram, traceInId)!;
  const traceOut = findNode(diagram, traceOutId)!;
  
  const incomingToTraceIn = findEdgeToNode(diagram, traceInId, traceIn.inputs[0]?.id);
  const outgoingFromTraceOut = findEdgeFromNode(diagram, traceOutId, traceOut.outputs[0]?.id);

  let newEdges = diagram.edges.filter(
    e =>
      e.from.nodeId !== traceInId &&
      e.from.nodeId !== traceOutId &&
      e.to.nodeId !== traceInId &&
      e.to.nodeId !== traceOutId
  );

  if (incomingToTraceIn && outgoingFromTraceOut) {
    const bypassEdge = createEdge(
      incomingToTraceIn.from.nodeId,
      incomingToTraceIn.from.portId,
      outgoingFromTraceOut.to.nodeId,
      outgoingFromTraceOut.to.portId
    );
    newEdges = [...newEdges, bypassEdge];
  }

  const newNodes = diagram.nodes.filter(
    n => n.id !== traceInId && n.id !== traceOutId
  );
  
  const newTracePairs = diagram.tracePairs.filter(tp => tp.id !== tracePair.id);

  return {
    success: true,
    diagram: {
      ...diagram,
      nodes: newNodes,
      edges: newEdges,
      tracePairs: newTracePairs,
    },
    message: 'Straightened empty trace (yanking law: Tr(id) = id)',
  };
}

export function findThreadMatches(diagram: Diagram): RewriteMatch[] {
  const matches: RewriteMatch[] = [];

  for (const tracePair of diagram.tracePairs) {
    const nodesInLoop = findNodesInTraceLoop(diagram, tracePair);
    
    for (const nodeId of nodesInLoop) {
      const node = findNode(diagram, nodeId);
      if (!node) continue;
      if (node.type === 'trace-in' || node.type === 'trace-out') continue;
      
      if (canThreadNode(diagram, tracePair, node)) {
        matches.push({
          rule: 'thread',
          nodeIds: [nodeId, tracePair.traceInNodeId, tracePair.traceOutNodeId],
          description: `Thread ${node.type} out of loop (dinaturality)`,
        });
      }
    }
  }

  return matches;
}

function findNodesInTraceLoop(diagram: Diagram, tracePair: TracePair): string[] {
  const nodesInLoop: string[] = [];
  const visited = new Set<string>();
  
  const traceIn = findNode(diagram, tracePair.traceInNodeId);
  if (!traceIn) return [];
  
  const queue: string[] = [];
  
  for (const edge of diagram.edges) {
    if (edge.from.nodeId === traceIn.id) {
      queue.push(edge.to.nodeId);
    }
  }
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    if (currentId === tracePair.traceOutNodeId) continue;
    
    nodesInLoop.push(currentId);
    
    for (const edge of diagram.edges) {
      if (edge.from.nodeId === currentId && !visited.has(edge.to.nodeId)) {
        queue.push(edge.to.nodeId);
      }
    }
  }
  
  return nodesInLoop;
}

function canThreadNode(diagram: Diagram, tracePair: TracePair, node: Node): boolean {
  if (node.inputs.length !== 1 || node.outputs.length !== 1) {
    return false;
  }
  
  const inputEdge = diagram.edges.find(e => e.to.nodeId === node.id);
  const outputEdge = diagram.edges.find(e => e.from.nodeId === node.id);
  
  if (!inputEdge || !outputEdge) return false;
  
  const comesFromTraceIn = inputEdge.from.nodeId === tracePair.traceInNodeId;
  const goesToTraceOut = outputEdge.to.nodeId === tracePair.traceOutNodeId;
  
  return comesFromTraceIn && goesToTraceOut;
}

export function applyThread(diagram: Diagram, match: RewriteMatch): RewriteResult {
  if (match.nodeIds.length !== 3) {
    return { success: false, diagram, message: 'Thread requires node and trace pair' };
  }

  const [nodeId, traceInId, traceOutId] = match.nodeIds;
  
  const tracePair = diagram.tracePairs.find(
    tp => tp.traceInNodeId === traceInId && tp.traceOutNodeId === traceOutId
  );
  
  if (!tracePair) {
    return { success: false, diagram, message: 'Invalid trace pair' };
  }
  
  const node = findNode(diagram, nodeId);
  const traceIn = findNode(diagram, traceInId);
  const traceOut = findNode(diagram, traceOutId);
  
  if (!node || !traceIn || !traceOut) {
    return { success: false, diagram, message: 'Nodes not found' };
  }
  
  if (!canThreadNode(diagram, tracePair, node)) {
    return { success: false, diagram, message: 'Node cannot be threaded out of this loop' };
  }

  const newDiagram = cloneDiagram(diagram);
  
  const traceInToNode = newDiagram.edges.find(
    e => e.from.nodeId === traceInId && e.to.nodeId === nodeId
  );
  const nodeToTraceOut = newDiagram.edges.find(
    e => e.from.nodeId === nodeId && e.to.nodeId === traceOutId
  );
  
  if (!traceInToNode || !nodeToTraceOut) {
    return { success: false, diagram, message: 'Required edges not found' };
  }

  newDiagram.edges = newDiagram.edges.filter(
    e => e.id !== traceInToNode.id && e.id !== nodeToTraceOut.id
  );

  const newTraceInNode = findNode(newDiagram, traceInId)!;
  const newTraceOutNode = findNode(newDiagram, traceOutId)!;
  const newNode = findNode(newDiagram, nodeId)!;
  
  const directLoopEdge = createEdge(
    traceInId,
    newTraceInNode.outputs[0].id,
    traceOutId,
    newTraceOutNode.inputs[0].id
  );
  newDiagram.edges.push(directLoopEdge);

  const incomingToTraceIn = newDiagram.edges.find(
    e => e.to.nodeId === traceInId
  );
  
  if (incomingToTraceIn) {
    newDiagram.edges = newDiagram.edges.filter(e => e.id !== incomingToTraceIn.id);
    
    const sourceToNode = createEdge(
      incomingToTraceIn.from.nodeId,
      incomingToTraceIn.from.portId,
      nodeId,
      newNode.inputs[0].id
    );
    newDiagram.edges.push(sourceToNode);
    
    const nodeToTraceIn = createEdge(
      nodeId,
      newNode.outputs[0].id,
      traceInId,
      newTraceInNode.inputs[0].id
    );
    newDiagram.edges.push(nodeToTraceIn);
  }

  newNode.position = {
    x: newTraceInNode.position.x - 100,
    y: newTraceInNode.position.y,
  };

  return {
    success: true,
    diagram: newDiagram,
    message: 'Threaded node out of trace loop (dinaturality)',
  };
}

export function findSuperposeMatches(diagram: Diagram): RewriteMatch[] {
  const matches: RewriteMatch[] = [];
  const factors = computeTensorFactors(diagram);

  for (const tracePair of diagram.tracePairs) {
    const traceFactor = factors.find(
      f => f.includes(tracePair.traceInNodeId) || f.includes(tracePair.traceOutNodeId)
    );
    if (!traceFactor) continue;

    for (const factor of factors) {
      if (factor === traceFactor) continue;
      
      for (const nodeId of factor) {
        const node = findNode(diagram, nodeId);
        if (!node) continue;
        if (node.type === 'trace-in' || node.type === 'trace-out') continue;

        matches.push({
          rule: 'superpose',
          nodeIds: [nodeId, tracePair.traceInNodeId, tracePair.traceOutNodeId],
          description: `Absorb ${node.type} into trace (superposing)`,
        });
      }
    }

    const nodesInTraceFactor = traceFactor.filter(
      id => id !== tracePair.traceInNodeId && id !== tracePair.traceOutNodeId
    );

    for (const nodeId of nodesInTraceFactor) {
      const node = findNode(diagram, nodeId);
      if (!node) continue;
      if (node.type === 'trace-in' || node.type === 'trace-out') continue;

      if (isNodeParallelToFeedback(diagram, tracePair, node)) {
        matches.push({
          rule: 'superpose',
          nodeIds: [nodeId, tracePair.traceInNodeId, tracePair.traceOutNodeId],
          description: `Expel ${node.type} from trace (superposing)`,
        });
      }
    }
  }

  return matches;
}

function isNodeParallelToFeedback(diagram: Diagram, tracePair: TracePair, node: Node): boolean {
  const traceIn = findNode(diagram, tracePair.traceInNodeId);
  const traceOut = findNode(diagram, tracePair.traceOutNodeId);
  if (!traceIn || !traceOut) return false;

  const nodeInputs = diagram.edges.filter(e => e.to.nodeId === node.id);
  const nodeOutputs = diagram.edges.filter(e => e.from.nodeId === node.id);

  const feedsIntoTrace = nodeOutputs.some(
    e => e.to.nodeId === tracePair.traceInNodeId || e.to.nodeId === tracePair.traceOutNodeId
  );
  const fedByTrace = nodeInputs.some(
    e => e.from.nodeId === tracePair.traceInNodeId || e.from.nodeId === tracePair.traceOutNodeId
  );

  if (feedsIntoTrace || fedByTrace) {
    return false;
  }

  const nodesInLoop = findNodesInTraceLoop(diagram, tracePair);
  const isInLoop = nodesInLoop.includes(node.id);

  return !isInLoop;
}

export function applySuperpose(diagram: Diagram, match: RewriteMatch): RewriteResult {
  if (match.nodeIds.length !== 3) {
    return { success: false, diagram, message: 'Superpose requires node and trace pair' };
  }

  const [nodeId, traceInId, traceOutId] = match.nodeIds;

  const tracePair = diagram.tracePairs.find(
    tp => tp.traceInNodeId === traceInId && tp.traceOutNodeId === traceOutId
  );

  if (!tracePair) {
    return { success: false, diagram, message: 'Invalid trace pair' };
  }

  const node = findNode(diagram, nodeId);
  const traceIn = findNode(diagram, traceInId);

  if (!node || !traceIn) {
    return { success: false, diagram, message: 'Nodes not found' };
  }

  const factors = computeTensorFactors(diagram);
  const traceFactor = factors.find(f => f.includes(traceInId));
  const nodeFactor = factors.find(f => f.includes(nodeId));

  if (!traceFactor || !nodeFactor) {
    return { success: false, diagram, message: 'Could not determine tensor factors' };
  }

  const newDiagram = cloneDiagram(diagram);
  const newNode = findNode(newDiagram, nodeId)!;
  const newTraceIn = findNode(newDiagram, traceInId)!;

  if (traceFactor !== nodeFactor) {
    newNode.position = {
      x: newTraceIn.position.x,
      y: newTraceIn.position.y + 80,
    };

    return {
      success: true,
      diagram: newDiagram,
      message: 'Absorbed node into trace factor (superposing: Tr(f) ⊗ g → Tr(f ⊗ g))',
    };
  } else {
    newNode.position = {
      x: newTraceIn.position.x + 200,
      y: newTraceIn.position.y + 100,
    };

    return {
      success: true,
      diagram: newDiagram,
      message: 'Expelled node from trace factor (superposing: Tr(f ⊗ g) → Tr(f) ⊗ g)',
    };
  }
}

export function findAllRewriteMatches(diagram: Diagram): RewriteMatch[] {
  return [
    ...findSlideMatches(diagram),
    ...findStraightenMatches(diagram),
    ...findThreadMatches(diagram),
    ...findSuperposeMatches(diagram),
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
    case 'superpose':
      return applySuperpose(diagram, match);
    default:
      return { success: false, diagram, message: 'Unknown rewrite rule' };
  }
}

export function checkDiagramEquivalence(a: Diagram, b: Diagram): boolean {
  if (a.nodes.length !== b.nodes.length) return false;
  if (a.edges.length !== b.edges.length) return false;
  if (a.tracePairs.length !== b.tracePairs.length) return false;

  const aNodeTypes = a.nodes.map(n => n.type).sort();
  const bNodeTypes = b.nodes.map(n => n.type).sort();
  
  for (let i = 0; i < aNodeTypes.length; i++) {
    if (aNodeTypes[i] !== bNodeTypes[i]) return false;
  }

  return true;
}

export function computeCanonicalSignature(diagram: Diagram): string {
  const nodeTypeCounts = new Map<string, number>();
  for (const node of diagram.nodes) {
    nodeTypeCounts.set(node.type, (nodeTypeCounts.get(node.type) ?? 0) + 1);
  }
  
  const sortedTypes = [...nodeTypeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const nodeSignature = sortedTypes.map(([t, c]) => `${t}:${c}`).join(',');
  
  return `nodes(${nodeSignature})|edges(${diagram.edges.length})|traces(${diagram.tracePairs.length})`;
}
