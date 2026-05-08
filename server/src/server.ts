import { WebSocketServer, WebSocket } from "ws";
import type { ClientToServerMessage, ServerToClientMessage } from "./types";
import {
  addClientToRoom,
  removeClientFromRoom,
  addElementToRoom,
  clearRoom,
  getRoomSnapshot,
  broadcastToRoomExceptSender,
} from "./roomStore";

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

function sendJson(ws: WebSocket, message: ServerToClientMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify(message));
}

function parseMessage(rawMessage: Buffer): ClientToServerMessage | null {
  try {
    return JSON.parse(rawMessage.toString()) as ClientToServerMessage;
  } catch {
    return null;
  }
}

wss.on("connection", (ws) => {
  console.log("client connected");

  ws.on("message", (rawMessage) => {
    const message = parseMessage(rawMessage as Buffer);

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

      addClientToRoom(roomId, ws);

      const elements = getRoomSnapshot(roomId);

      sendJson(ws, {
        type: "room_snapshot",
        roomId,
        elements,
      });

      console.log(`client ${clientId} joined room ${roomId}`);
      return;
    }

    if (message.type === "create_element") {
      const { roomId, clientId, element } = message;

      if (!roomId || !clientId || !element) {
        sendJson(ws, {
          type: "error",
          message: "create_element requires roomId, clientId and element",
        });
        return;
      }

      addElementToRoom(roomId, element);

      broadcastToRoomExceptSender(roomId, ws, {
        type: "element_created",
        roomId,
        clientId,
        element,
      });

      console.log(`element ${element.id} created in room ${roomId}`);
      return;
    }

    if (message.type === "clear_room") {
      const { roomId, clientId } = message;

      if (!roomId || !clientId) {
        sendJson(ws, {
          type: "error",
          message: "clear_room requires roomId and clientId",
        });
        return;
      }

      clearRoom(roomId);

      broadcastToRoomExceptSender(roomId, ws, {
        type: "room_cleared",
        roomId,
        clientId,
      });

      console.log(`room ${roomId} cleared by client ${clientId}`);
      return;
    }

    sendJson(ws, {
      type: "error",
      message: `Unknown message type: ${(message as ClientToServerMessage & { type: string }).type}`,
    });
  });

  ws.on("close", () => {
    removeClientFromRoom(ws);
    console.log("client disconnected");
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
