import { useEffect, useRef, useState } from "react";
import type {
  Point,
  LineElement,
  RectElement,
  WhiteboardElement,
  ClientToServerMessage,
  ServerToClientMessage,
} from "@whiteboard/shared";
import { setupCanvas, renderElements } from "../renderer";
import {
  createLineElement,
  createRectElement,
  createTextElement,
  getCanvasPoint,
  isValidLine,
  isValidRect,
} from "../engine/drawing";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

const ROOM_ID =
  new URLSearchParams(window.location.search).get("roomId") ?? "default-room";

export type Tool = "line" | "rect" | "text";
export type DraftElement = LineElement | RectElement | null;

export function useWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dragStartPointRef = useRef<Point | null>(null);
  const [clientId] = useState(() => crypto.randomUUID());
  const appliedOpIdsRef = useRef(new Set<string>());
  const lastAppliedVersionRef = useRef(0);

  const [snapshotReady, setSnapshotReady] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("line");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [draftElement, setDraftElement] = useState<DraftElement>(null);

  // Setup Canvas Context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = setupCanvas(canvas, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    ctxRef.current = ctx;
  }, []);

  // Trigger Rendering on State Changes
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

  // Setup WebSocket Connection
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      setSnapshotReady(false);
      sendMessage({
        type: "join_room",
        roomId: ROOM_ID,
        clientId,
      });
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerToClientMessage;

      if (message.type === "room_snapshot") {
        if (message.version < lastAppliedVersionRef.current) {
          return;
        }

        lastAppliedVersionRef.current = message.version;
        setElements(message.elements);
        setSnapshotReady(true);
        return;
      }

      if (message.type === "element_created") {
        lastAppliedVersionRef.current = Math.max(
          lastAppliedVersionRef.current,
          message.version
        );

        if (appliedOpIdsRef.current.has(message.opId)) {
          return;
        }

        appliedOpIdsRef.current.add(message.opId);

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
        lastAppliedVersionRef.current = Math.max(
          lastAppliedVersionRef.current,
          message.version
        );

        if (appliedOpIdsRef.current.has(message.opId)) {
          return;
        }

        appliedOpIdsRef.current.add(message.opId);

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
    if (!snapshotReady) {
      console.warn("Snapshot is not ready yet.");
      return;
    }

    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected.");
      return;
    }

    const opId = crypto.randomUUID();

    appliedOpIdsRef.current.add(opId);

    setElements((currentElements) => [...currentElements, element]);

    sendMessage({
      type: "create_element",
      roomId: ROOM_ID,
      clientId,
      opId,
      element,
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!snapshotReady) {
      console.warn("Cannot draw before snapshot is ready.");
      return;
    }
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
    if (!snapshotReady) {
      console.warn("Snapshot is not ready yet.");
      return;
    }

    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected.");
      return;
    }

    const opId = crypto.randomUUID();

    appliedOpIdsRef.current.add(opId);

    setElements([]);
    setDraftElement(null);
    dragStartPointRef.current = null;

    sendMessage({
      type: "clear_room",
      roomId: ROOM_ID,
      clientId,
      opId,
    });
  };

  return {
    canvasRef,
    connectionStatus,
    snapshotReady,
    elements,
    draftElement,
    activeTool,
    setActiveTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClear,
    roomId: ROOM_ID,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  };
}
