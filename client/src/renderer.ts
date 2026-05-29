import type {
  WhiteboardElement,
  LineElement,
  RectElement,
  TextElement,
} from "@whiteboard/shared";

type SetupCanvasOptions = {
  width: number;
  height: number;
};

export function setupCanvas(
  canvas: HTMLCanvasElement,
  options: SetupCanvasOptions
): CanvasRenderingContext2D {
  const { width, height } = options;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2D context from canvas.");
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return ctx;
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
}

export function renderElements(
  ctx: CanvasRenderingContext2D,
  elements: WhiteboardElement[],
  width: number,
  height: number,
  draftElement?: WhiteboardElement | null
) {
  clearCanvas(ctx, width, height);

  for (const element of elements) {
    drawElement(ctx, element);
  }

  if (draftElement) {
    drawElement(ctx, draftElement);
  }
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement
) {
  switch (element.type) {
    case "line":
      drawLine(ctx, element);
      break;
    case "rect":
      drawRect(ctx, element);
      break;
    case "text":
      drawText(ctx, element);
      break;
    default: {
      const exhaustiveCheck: never = element;
      throw new Error(`Unknown element type: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

function drawLine(ctx: CanvasRenderingContext2D, element: LineElement) {
  if (element.points.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = element.stroke;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.moveTo(element.points[0].x, element.points[0].y);

  for (let i = 1; i < element.points.length; i += 1) {
    const point = element.points[i];
    ctx.lineTo(point.x, point.y);
  }

  ctx.stroke();
}

function drawRect(ctx: CanvasRenderingContext2D, element: RectElement) {
  if (element.fill) {
    ctx.fillStyle = element.fill;
    ctx.fillRect(element.x, element.y, element.width, element.height);
  }

  ctx.strokeStyle = element.stroke;
  ctx.lineWidth = element.strokeWidth;
  ctx.strokeRect(element.x, element.y, element.width, element.height);
}

function drawText(ctx: CanvasRenderingContext2D, element: TextElement) {
  ctx.fillStyle = element.color;
  ctx.font = `${element.fontSize}px sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(element.text, element.x, element.y);
}