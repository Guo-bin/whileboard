import { useWhiteboard, type Tool } from "./hooks/useWhiteboard";

export default function App() {
  const {
    canvasRef,
    connectionStatus,
    snapshotReady,
    elements,
    activeTool,
    setActiveTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClear,
    roomId,
    canvasWidth,
    canvasHeight,
  } = useWhiteboard();

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
          Whiteboard Stage 0 - Day 5 (Refactored)
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
            Snapshot: {snapshotReady ? "ready" : "loading"}
          </span>
          <span style={{ color: "#4b5563", fontSize: "14px" }}>
            Room: {roomId}
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
            width={canvasWidth}
            height={canvasHeight}
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
          Day 5 Refactored：前端狀態、WebSocket 同步與 Canvas 幾何運算均已解耦分層。
        </p>
      </div>
    </div>
  );
}
