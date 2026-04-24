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
  // stroke是邊框
  stroke: string;
  strokeWidth: number;
  // 是否需要填滿
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