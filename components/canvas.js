import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

let socket;

export default function Canvas() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    socket = io(`drawingbackend--dannywoolaway.replit.app`);

    socket.on("draw", drawStroke);
    socket.on("loadDrawings", (allDrawings) => {
      allDrawings.forEach(drawStroke);
    });

    function drawStroke({ x0, y0, x1, y1, color, size }) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.closePath();
    }
  }, []);

  const startDrawing = (e) => {
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    canvasRef.current.lastX = e.clientX - rect.left;
    canvasRef.current.lastY = e.clientY - rect.top;
  };

  const draw = (e) => {
    if (!drawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvasRef.current.lastX, canvasRef.current.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();

    socket.emit("draw", {
      x0: canvasRef.current.lastX,
      y0: canvasRef.current.lastY,
      x1: x,
      y1: y,
      color: "black",
      size: 2,
    });

    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  const stopDrawing = () => setDrawing(false);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ border: "1px solid black" }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    />
  );
}
