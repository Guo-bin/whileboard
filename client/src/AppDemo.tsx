import React, { useEffect, useRef ,useState,useMemo} from 'react'
import { WhiteboardElement } from './types'
import { setupCanvas,renderElements } from './renderer';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

const createDemoElement = ():WhiteboardElement[]=>{
  const now = Date.now();

  return [
    {
      id:'line-1',
      type: 'line',
      points: [
        {x: 80, y:80},
        {x: 140,y:110},
        {x: 200,y: 90},
        {x: 260,y: 150},
      ],
      stroke:"#2563eb",
      strokeWidth: 4 ,
      createdBy:"local-user",
      createdAt: now,
    },
    {
      id: "rect-1",
      type:"rect",
      x: 320,
      y: 120,
      width:180,
      height:100,
      stroke: "#111827",
      strokeWidth: 3,
      fill: "#fef3c7",
      createdBy:"local-user",
      createdAt:now + 1
    },
    {
      id: "text-1",
      type:"text",
      x:80,
      y:220,
      text: "Day1: elements[]-> render()",
      color:"#111827",
      fontSize: 28,
      createdBy:"local-user",
      createdAt: now + 2
    }
  ]
}

const AppDemo = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const [elements, setElements] = useState<WhiteboardElement[]>([]);

  const demoElements = useMemo(()=> createDemoElement(),[])


  useEffect(()=>{
    const canvas = canvasRef.current
    if(!canvas) return ;

    const ctx = setupCanvas(canvas,{
      width:CANVAS_WIDTH,
      height:CANVAS_HEIGHT,
    })
    ctxRef.current = ctx;
  },[])


  useEffect(()=>{
    const ctx = ctxRef.current;
    if(!ctx)return ;

    renderElements(ctx,elements,CANVAS_WIDTH,CANVAS_HEIGHT);

  },[elements])


  const handleLoadDemo = ()=>{
    setElements(demoElements);
  }

  const handleClear = ()=>{
    setElements([]);
  }

  /**
   * 創造canvas參考V
   * 創造ctxRef參考V
   * 創造渲染elements陣列V
   * 用useEffect初始化ctx v
   * 創造一個clearData的函數
   * 創造一個loadData的函數
   * 創造一個useEffect專門偵測資料變動來渲染資料v
   */




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
          Whiteboard Stage 0 - Day 1
        </h1>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={handleLoadDemo}
            style={{
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#000000",
              cursor: "pointer",
            }}
          >
            載入假資料
          </button>

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
          <canvas ref={canvasRef} />
        </div>

        <p
          style={{
            marginTop: "12px",
            color: "#4b5563",
            fontSize: "14px",
          }}
        >
          今天先確認：資料存在 elements[]，canvas 只是 render 結果。
        </p>
      </div>
    </div>
  )
}

export default AppDemo