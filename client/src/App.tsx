import { useEffect, useRef, useState } from "react";
import { renderElements, setupCanvas } from "./renderer";
import type { LineElement, Point, WhiteboardElement } from "./types";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

const LOCAL_USER_ID = "local-user";

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

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [draftElement, setDraftElement] = useState<LineElement | null>(null);

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

    const line = createLineElement([point, point]);

    setDraftElement(line);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDraftElement((currentDraft) => {
      if (!currentDraft) return null;

      const point = getCanvasPoint(event, canvas);

      return {
        ...currentDraft,
        points: [...currentDraft.points, point],
      };
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.releasePointerCapture(event.pointerId);

    setDraftElement((currentDraft) => {
      if (!currentDraft) return null;

      setElements((currentElements) => [...currentElements, currentDraft]);

      return null;
    });
  };

  const handleClear = () => {
    setElements([]);
    setDraftElement(null);
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
          Whiteboard Stage 0 - Day 2
        </h1>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={handleClear}
            style={{
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#000000",
              cursor: "pointer",
            }}
          >
            清空
          </button>
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
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              display: "block",
              touchAction: "none",
              cursor: "crosshair",
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
          Day 2：滑鼠拖曳時產生 draft line，放開後提交到 elements[]。
        </p>
      </div>
    </div>
  );
}