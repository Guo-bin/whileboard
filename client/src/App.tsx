import { useEffect, useRef, useState } from "react";
import { renderElements, setupCanvas } from "./renderer";
import type {
  ClientToServerMessage,
  LineElement,
  Point,
  RectElement,
  ServerToClientMessage,
  TextElement,
  WhiteboardElement,
} from "./types";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

const ROOM_ID =
  new URLSearchParams(window.location.search).get("roomId") ?? "default-room";

type Tool = "line" | "rect" | "text";

type DraftElement = LineElement | RectElement | null;

function createLineElement(points: Point[], clientId: string): LineElement {
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

function createRectElement(
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

function createTextElement(
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
  if (line.points.length < 2) return false;

  const firstPoint = line.points[0];
  const lastPoint = line.points[line.points.length - 1];

  const dx = lastPoint.x - firstPoint.x;
  const dy = lastPoint.y - firstPoint.y;

  return Math.sqrt(dx * dx + dy * dy) >= 3;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dragStartPointRef = useRef<Point | null>(null);
  const [clientId] = useState(() => crypto.randomUUID());

  const [activeTool, setActiveTool] = useState<Tool>("line");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
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
  const sendMessage = (message: ClientToServerMessage) => {
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected.");
      return;
    }

    ws.send(JSON.stringify(message));
  };
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");

      sendMessage({
        type: "join_room",
        roomId: ROOM_ID,
        clientId,
      });
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerToClientMessage;

      if (message.type === "room_snapshot") {
        setElements(message.elements);
        return;
      }

      if (message.type === "element_created") {
        if (message.clientId === clientId) return;

        setElements((currentElements) => {
          const alreadyExists = currentElements.some(
            (element) => element.id === message.element.id
          );

          if (alreadyExists) return currentElements;

          return [...currentElements, message.element];
        });

        return;
      }
      if (message.type === "room_cleared") {
        if (message.clientId === clientId) return;

        setElements([]);
        setDraftElement(null);
        dragStartPointRef.current = null;
        return;
      }
      if (message.type === "error") {
        console.error(message.message);
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
    };

    ws.onerror = () => {
      setConnectionStatus("error");
    };

    return () => {
      ws.close();
    };
  }, [clientId]);



  const commitElement = (element: WhiteboardElement) => {
    setElements((currentElements) => [...currentElements, element]);

    sendMessage({
      type: "create_element",
      roomId: ROOM_ID,
      clientId,
      element,
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(event, canvas);

    if (activeTool === "text") {
      const text = window.prompt("請輸入文字");

      if (!text || text.trim().length === 0) {
        return;
      }

      const textElement = createTextElement(point, text.trim(), clientId);
      commitElement(textElement);
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    dragStartPointRef.current = point;

    if (activeTool === "line") {
      const line = createLineElement([point, point], clientId);
      setDraftElement(line);
      return;
    }

    if (activeTool === "rect") {
      const rect = createRectElement(point, point, clientId);
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
          ...createRectElement(startPoint, currentPoint, clientId),
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
        commitElement(currentDraft);
      }

      if (currentDraft.type === "rect" && isValidRect(currentDraft)) {
        commitElement(currentDraft);
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

    sendMessage({
      type: "clear_room",
      roomId: ROOM_ID,
      clientId,
    });
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
          Whiteboard Stage 0 - Day 4
        </h1>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            alignItems: "center",
            flexWrap: "wrap",
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
            清空白板
          </button>

          <span style={{ color: "#4b5563", fontSize: "14px" }}>
            Room: {ROOM_ID}
          </span>

          <span style={{ color: "#4b5563", fontSize: "14px" }}>
            Status: {connectionStatus}
          </span>

          <span style={{ color: "#4b5563", fontSize: "14px" }}>
            Elements: {elements.length}
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
          Day 4：前端送 create_element，server 存進 room memory，
          其他分頁透過 element_created 同步。
        </p>
      </div>
    </div>
  );
}