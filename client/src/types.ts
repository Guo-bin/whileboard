export type Point = {
  x: number;
  y: number;
};

export type LineElement = {
  id: string;
  type: "line";
  points: Point[];
  stroke: string;
  strokeWidth: number;
  createdBy: string;
  createdAt: number;
};

export type RectElement = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  createdBy: string;
  createdAt: number;
};

export type TextElement = {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  createdBy: string;
  createdAt: number;
};

export type WhiteboardElement = LineElement | RectElement | TextElement;
export type ClientToServerMessage =
  | {
      type: "join_room";
      roomId: string;
      clientId: string;
    }
  | {
      type: "create_element";
      roomId: string;
      clientId: string;
      element: WhiteboardElement;
    }
  | {
      type: "clear_room";
      roomId: string;
      clientId: string;
    };

export type ServerToClientMessage =
  | {
      type: "room_snapshot";
      roomId: string;
      elements: WhiteboardElement[];
    }
  | {
      type: "element_created";
      roomId: string;
      clientId: string;
      element: WhiteboardElement;
    }
  | {
      type: "room_cleared";
      roomId: string;
      clientId: string;
    }
  | {
      type: "error";
      message: string;
    };