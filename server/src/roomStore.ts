import { WebSocket } from "ws";

import type { ServerToClientMessage, WhiteboardElement } from "@whiteboard/shared";

export type RoomWebSocket = WebSocket & {
  clientId?: string;
  roomId?: string;
};

type Room = {
  elements: WhiteboardElement[];
  clients: Set<RoomWebSocket>;
  version: number;
  processedOps: Set<string>;
};

type RoomMutationResult = {
  applied: boolean;
  version: number;
};

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string): Room {
  const existingRoom = rooms.get(roomId);

  if (existingRoom) {
    return existingRoom;
  }

  const room: Room = {
    elements: [],
    clients: new Set(),
    version: 0,
    processedOps: new Set(),
  };

  rooms.set(roomId, room);

  return room;
}

export function addClientToRoom(roomId: string, ws: RoomWebSocket): void {
  const room = getOrCreateRoom(roomId);
  room.clients.add(ws);
  ws.roomId = roomId;
}

export function removeClientFromRoom(ws: RoomWebSocket): void {
  const roomId = ws.roomId;

  if (!roomId) return;

  const room = rooms.get(roomId);

  if (!room) return;

  room.clients.delete(ws);
}

export function getRoomSnapshot(roomId: string): Pick<Room, "version" | "elements"> {
  const room = getOrCreateRoom(roomId);

  return {
    version: room.version,
    elements: room.elements,
  };
}

export function applyCreateElement(
  roomId: string,
  opId: string,
  element: WhiteboardElement
): RoomMutationResult {
  const room = getOrCreateRoom(roomId);

  if (room.processedOps.has(opId)) {
    return {
      applied: false,
      version: room.version,
    };
  }

  room.processedOps.add(opId);
  room.elements.push(element);
  room.version += 1;

  return {
    applied: true,
    version: room.version,
  };
}

export function applyClearRoom(roomId: string, opId: string): RoomMutationResult {
  const room = getOrCreateRoom(roomId);

  if (room.processedOps.has(opId)) {
    return {
      applied: false,
      version: room.version,
    };
  }

  room.processedOps.add(opId);
  room.elements = [];
  room.version += 1;

  return {
    applied: true,
    version: room.version,
  };
}

export function broadcastToRoom(
  roomId: string,
  message: ServerToClientMessage
): void {
  const room = rooms.get(roomId);

  if (!room) return;

  const payload = JSON.stringify(message);

  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}