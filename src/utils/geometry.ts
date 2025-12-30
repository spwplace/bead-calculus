export interface Point {
  x: number;
  y: number;
}

export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

export function bezierPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

export function getEdgeControlPoints(
  from: Point,
  to: Point
): { p1: Point; p2: Point } {
  const dx = to.x - from.x;
  const controlOffset = Math.max(Math.abs(dx) * 0.4, 30);

  return {
    p1: { x: from.x + controlOffset, y: from.y },
    p2: { x: to.x - controlOffset, y: to.y },
  };
}

export function getPortPosition(
  nodeX: number,
  nodeY: number,
  nodeWidth: number,
  nodeHeight: number,
  direction: 'input' | 'output',
  portIndex: number,
  totalPorts: number
): Point {
  const x = direction === 'input' ? nodeX : nodeX + nodeWidth;
  const portSpacing = nodeHeight / (totalPorts + 1);
  const y = nodeY + portSpacing * (portIndex + 1);

  return { x, y };
}

export function pointInRect(
  point: Point,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean {
  return (
    point.x >= rectX &&
    point.x <= rectX + rectWidth &&
    point.y >= rectY &&
    point.y <= rectY + rectHeight
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}
