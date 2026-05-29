import type {
  Point,
  LineElement,
  RectElement,
  TextElement,
} from "@whiteboard/shared";

export interface SimplePointerEvent {
  clientX: number;
  clientY: number;
}

export function createLineElement(points: Point[], clientId: string): LineElement {
  return {
    id: crypto.randomUUID(),
    type: "line",
    points,
    stroke: "#2563eb",
    strokeWidth: 4,
    createdBy: clientId,
    createdAt: Date.now(),
  };
}

export function createRectElement(
  start: Point,
  current: Point,
  clientId: string
): RectElement {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  return {
    id: crypto.randomUUID(),
    type: "rect",
    x,
    y,
    width,
    height,
    stroke: "#111827",
    strokeWidth: 3,
    fill: "#fef3c7",
    createdBy: clientId,
    createdAt: Date.now(),
  };
}

export function createTextElement(
  point: Point,
  text: string,
  clientId: string
): TextElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    x: point.x,
    y: point.y,
    text,
    color: "#111827",
    fontSize: 24,
    createdBy: clientId,
    createdAt: Date.now(),
  };
}

export function getCanvasPoint(
  event: SimplePointerEvent,
  canvas: HTMLCanvasElement
): Point {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function isValidRect(rect: RectElement): boolean {
  return rect.width >= 3 && rect.height >= 3;
}

export function isValidLine(line: LineElement): boolean {
  if (line.points.length < 2) return false;

  const firstPoint = line.points[0];
  const lastPoint = line.points[line.points.length - 1];

  const dx = lastPoint.x - firstPoint.x;
  const dy = lastPoint.y - firstPoint.y;

  return Math.sqrt(dx * dx + dy * dy) >= 3;
}
