import type WebSocket from "ws";
import type { WhiteboardElement, ServerToClientMessage } from "./types.js";

type AppWebSocket = WebSocket & {
  roomId?: string;
};

type Room = {
  elements: WhiteboardElement[];
  clients: Set<AppWebSocket>;
};

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      elements: [],
      clients: new Set(),
    });
  }

  return rooms.get(roomId)!;
}

export function addClientToRoom(roomId: string, ws: AppWebSocket): void {
  const room = getOrCreateRoom(roomId);
  room.clients.add(ws);
  ws.roomId = roomId;
}

export function removeClientFromRoom(ws: AppWebSocket): void {
  const roomId = ws.roomId;

  if (!roomId) return;

  const room = rooms.get(roomId);

  if (!room) return;

  room.clients.delete(ws);
}

export function addElementToRoom(
  roomId: string,
  element: WhiteboardElement
): void {
  const room = getOrCreateRoom(roomId);
  room.elements.push(element);
}

export function clearRoom(roomId: string): void {
  const room = getOrCreateRoom(roomId);
  room.elements = [];
}

export function getRoomSnapshot(roomId: string): WhiteboardElement[] {
  const room = getOrCreateRoom(roomId);
  return room.elements;
}

export function broadcastToRoomExceptSender(
  roomId: string,
  senderWs: AppWebSocket,
  message: ServerToClientMessage
): void {
  const room = rooms.get(roomId);

  if (!room) return;

  const payload = JSON.stringify(message);

  for (const client of room.clients) {
    if (client === senderWs) continue;

    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}
