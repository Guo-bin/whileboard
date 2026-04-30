import { useEffect, useRef, useState } from "react";
import { renderElements, setupCanvas } from "./renderer";
import type {
  LineElement,
  Point,
  RectElement,
  TextElement,
  WhiteboardElement,
} from "./types";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

const LOCAL_USER_ID = "local-user";

type Tool = "line" | "rect" | "text";

type DraftElement = LineElement | RectElement | null;

function createLineElement(points: Point[]): LineElement {
  return {
    id: crypto.randomUUID(),
    type: "line",
    points,
    stroke: "#2563eb",
    strokeWidth: 4,
    createdBy: LOCAL_USER_ID,
    createdAt: Date.now(),
  };
}

function createRectElement(start: Point, current: Point): RectElement {
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
    createdBy: LOCAL_USER_ID,
    createdAt: Date.now(),
  };
}

function createTextElement(point: Point, text: string): TextElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    x: point.x,
    y: point.y,
    text,
    color: "#111827",
    fontSize: 24,
    createdBy: LOCAL_USER_ID,
    createdAt: Date.now(),
  };
}

function getCanvasPoint(
  event: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement
): Point {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function isValidRect(rect: RectElement): boolean {
  return rect.width >= 3 && rect.height >= 3;
}

function isValidLine(line: LineElement): boolean {
  return line.points.length >= 2;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const dragStartPointRef = useRef<Point | null>(null);

  const [activeTool, setActiveTool] = useState<Tool>("line");
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [draftElement, setDraftElement] = useState<DraftElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = setupCanvas(canvas, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    ctxRef.current = ctx;

    renderElements(
      ctx,
      elements,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      draftElement
    );
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    renderElements(
      ctx,
      elements,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      draftElement
    );
  }, [elements, draftElement]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(event, canvas);

    if (activeTool === "text") {
      const text = window.prompt("請輸入文字");

      if (!text || text.trim().length === 0) {
        return;
      }

      const textElement = createTextElement(point, text.trim());

      setElements((currentElements) => [...currentElements, textElement]);
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    dragStartPointRef.current = point;

    if (activeTool === "line") {
      const line = createLineElement([point, point]);
      setDraftElement(line);
      return;
    }

    if (activeTool === "rect") {
      const rect = createRectElement(point, point);
      setDraftElement(rect);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentPoint = getCanvasPoint(event, canvas);

    setDraftElement((currentDraft) => {
      if (!currentDraft) return null;

      if (currentDraft.type === "line") {
        return {
          ...currentDraft,
          points: [...currentDraft.points, currentPoint],
        };
      }

      if (currentDraft.type === "rect") {
        const startPoint = dragStartPointRef.current;

        if (!startPoint) return currentDraft;

        return {
          ...createRectElement(startPoint, currentPoint),
          id: currentDraft.id,
          createdAt: currentDraft.createdAt,
        };
      }

      return currentDraft;
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    setDraftElement((currentDraft) => {
      if (!currentDraft) return null;

      if (currentDraft.type === "line" && isValidLine(currentDraft)) {
        setElements((currentElements) => [...currentElements, currentDraft]);
      }

      if (currentDraft.type === "rect" && isValidRect(currentDraft)) {
        setElements((currentElements) => [...currentElements, currentDraft]);
      }

      return null;
    });

    dragStartPointRef.current = null;
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    setDraftElement(null);
    dragStartPointRef.current = null;
  };

  const handleClear = () => {
    setElements([]);
    setDraftElement(null);
    dragStartPointRef.current = null;
  };

  const getToolButtonStyle = (tool: Tool): React.CSSProperties => {
    const isActive = activeTool === tool;

    return {
      padding: "10px 14px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      background: isActive ? "#111827" : "#ffffff",
      color: isActive ? "#ffffff" : "#111827",
      cursor: "pointer",
    };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: "28px",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          Whiteboard Stage 0 - Day 3
        </h1>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setActiveTool("line")}
            style={getToolButtonStyle("line")}
          >
            Line
          </button>

          <button
            onClick={() => setActiveTool("rect")}
            style={getToolButtonStyle("rect")}
          >
            Rect
          </button>

          <button
            onClick={() => setActiveTool("text")}
            style={getToolButtonStyle("text")}
          >
            Text
          </button>

          <button
            onClick={handleClear}
            style={{
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#ffffff",
              cursor: "pointer",
              marginLeft: "12px",
            }}
          >
            清空
          </button>

          <span
            style={{
              color: "#4b5563",
              fontSize: "14px",
            }}
          >
            Current tool: {activeTool}
          </span>
        </div>

        <div
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "12px",
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.06)",
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              display: "block",
              touchAction: "none",
              cursor: activeTool === "text" ? "text" : "crosshair",
            }}
          />
        </div>

        <p
          style={{
            marginTop: "12px",
            color: "#4b5563",
            fontSize: "14px",
          }}
        >
          Day 3：Line / Rect 使用 draftElement，Text 點擊後直接 committed 到
          elements[]。
        </p>
      </div>
    </div>
  );
}