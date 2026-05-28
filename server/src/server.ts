import { WebSocket, WebSocketServer, type RawData } from "ws";

import {
  addClientToRoom,
  removeClientFromRoom,
  getRoomSnapshot,
  applyCreateElement,
  applyClearRoom,
  broadcastToRoom,
  type RoomWebSocket,
} from "./roomStore";

import type {
  ServerToClientMessage,
  WhiteboardElement,
} from "./types";

type IncomingClientMessage = {
  type?: string;
  roomId?: string;
  clientId?: string;
  opId?: string;
  element?: WhiteboardElement;
};

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

function sendJson(ws: RoomWebSocket, message: ServerToClientMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify(message));
}

function parseMessage(rawMessage: RawData): IncomingClientMessage | null {
  try {
    return JSON.parse(rawMessage.toString()) as IncomingClientMessage;
  } catch {
    return null;
  }
}

wss.on("connection", (socket) => {
  const ws = socket as RoomWebSocket;

  console.log("client connected");

  ws.on("message", (rawMessage: RawData) => {
    const message = parseMessage(rawMessage);

    if (!message) {
      sendJson(ws, {
        type: "error",
        message: "Invalid JSON message",
      });
      return;
    }

    if (message.type === "join_room") {
      const { roomId, clientId } = message;

      if (!roomId || !clientId) {
        sendJson(ws, {
          type: "error",
          message: "join_room requires roomId and clientId",
        });
        return;
      }

      ws.clientId = clientId;

      addClientToRoom(roomId, ws);

      const snapshot = getRoomSnapshot(roomId);

      sendJson(ws, {
        type: "room_snapshot",
        roomId,
        version: snapshot.version,
        elements: snapshot.elements,
      });

      console.log(`client ${clientId} joined room ${roomId}`);
      return;
    }

    if (message.type === "create_element") {
      const { roomId, clientId, opId, element } = message;

      if (!roomId || !clientId || !opId || !element) {
        sendJson(ws, {
          type: "error",
          message: "create_element requires roomId, clientId, opId and element",
        });
        return;
      }

      const result = applyCreateElement(roomId, opId, element);

      if (!result.applied) {
        return;
      }

      broadcastToRoom(roomId, {
        type: "element_created",
        roomId,
        clientId,
        opId,
        version: result.version,
        element,
      });

      console.log(
        `element ${element.id} created in room ${roomId}, version ${result.version}`
      );
      return;
    }

    if (message.type === "clear_room") {
      const { roomId, clientId, opId } = message;

      if (!roomId || !clientId || !opId) {
        sendJson(ws, {
          type: "error",
          message: "clear_room requires roomId, clientId and opId",
        });
        return;
      }

      const result = applyClearRoom(roomId, opId);

      if (!result.applied) {
        return;
      }

      broadcastToRoom(roomId, {
        type: "room_cleared",
        roomId,
        clientId,
        opId,
        version: result.version,
      });

      console.log(
        `room ${roomId} cleared by client ${clientId}, version ${result.version}`
      );
      return;
    }

    sendJson(ws, {
      type: "error",
      message: `Unknown message type: ${message.type}`,
    });
  });

  ws.on("close", () => {
    removeClientFromRoom(ws);
    console.log("client disconnected");
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);