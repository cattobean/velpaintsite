import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

let socket;

export default function Canvas() {
  const canvasRef = useRef(null);
  const terminalRef = useRef(null);

  // Drawing & canvas states
  const [drawing, setDrawing] = useState(false);
  const [brush, setBrush] = useState("round");
  const [size, setSize] = useState(5);
  const [color, setColor] = useState("#000000"); // default black
  const [opacity, setOpacity] = useState(1);
  const [rainbowUnlocked, setRainbowUnlocked] = useState(false);
  const [secret1Unlocked, setSecret1Unlocked] = useState(false);
  const [secret2Unlocked, setSecret2Unlocked] = useState(false);
  const [hue, setHue] = useState(0);
  const [serverAlive, setServerAlive] = useState(false);

  const [canvasSize, setCanvasSize] = useState({ width: 2000, height: 2000 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panRef = useRef(false);

  useEffect(() => {
    socket = io("https://YOUR_REPL_URL.repl.co");

    socket.on("connect", () => setServerAlive(true));
    socket.on("disconnect", () => setServerAlive(false));

    socket.on("draw", drawStroke);
    socket.on("loadDrawings", (allDrawings) => allDrawings.forEach(drawStroke));

    const interval = setInterval(() => {
      if (rainbowUnlocked) setHue((h) => (h + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [offset, rainbowUnlocked]);

  function drawStroke({ x0, y0, x1, y1, color, size, opacity, brush }) {
    const ctx = canvasRef.current.getContext("2d");
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = brush === "round" ? "round" : brush === "square" ? "butt" : "square";

    ctx.beginPath();
    ctx.moveTo(x0 + offset.x, y0 + offset.y);
    ctx.lineTo(x1 + offset.x, y1 + offset.y);
    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }

  const startDrawing = (e) => {
    if (e.shiftKey) {
      panRef.current = { startX: e.clientX, startY: e.clientY };
      return;
    }
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    canvasRef.current.lastX = e.clientX - rect.left - offset.x;
    canvasRef.current.lastY = e.clientY - rect.top - offset.y;
  };

  const draw = (e) => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setOffset((o) => {
        const newOffset = { x: o.x + dx, y: o.y + dy };
        checkExpandCanvas(newOffset);
        return newOffset;
      });
      panRef.current.startX = e.clientX;
      panRef.current.startY = e.clientY;
      return;
    }

    if (!drawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;

    let currentColor = color;
    if (color === "rainbow") currentColor = `hsl(${hue},100%,50%)`;
    else if (color === "secret1") currentColor = "#ff00ff";
    else if (color === "secret2") currentColor = "#ff4500";

    const ctx = canvasRef.current.getContext("2d");
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = size;
    ctx.lineCap = brush === "round" ? "round" : brush === "square" ? "butt" : "square";

    ctx.beginPath();
    ctx.moveTo(canvasRef.current.lastX + offset.x, canvasRef.current.lastY + offset.y);
    ctx.lineTo(x + offset.x, y + offset.y);
    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1;

    socket.emit("draw", {
      x0: canvasRef.current.lastX,
      y0: canvasRef.current.lastY,
      x1: x,
      y1: y,
      color: currentColor,
      size,
      opacity,
      brush,
    });

    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  const stopDrawing = () => {
    setDrawing(false);
    panRef.current = false;
  };

  const checkExpandCanvas = (newOffset) => {
    const ctx = canvasRef.current.getContext("2d");
    let expanded = false;
    let width = canvasSize.width;
    let height = canvasSize.height;

    const margin = 200;
    if (Math.abs(newOffset.x) + window.innerWidth > width - margin) {
      width += 1000;
      expanded = true;
    }
    if (Math.abs(newOffset.y) + window.innerHeight > height - margin) {
      height += 1000;
      expanded = true;
    }

    if (expanded) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.fillStyle = "#ffffff"; // fill white
      tempCtx.fillRect(0, 0, width, height);
      tempCtx.drawImage(canvasRef.current, 0, 0);
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      ctx.drawImage(tempCanvas, 0, 0);
      setCanvasSize({ width, height });
    }
  };

  const handleCommand = (e) => {
    if (e.key !== "Enter") return;
    const input = e.target.value.trim().split(" ");
    const cmd = input[0].toLowerCase();
    const arg = input.slice(1).join(" ").toLowerCase();

    if (cmd === "brush") setBrush(arg || "round");
    if (cmd === "color") {
      if (arg === "rainbow" && !rainbowUnlocked) appendTerminal("Rainbow locked!");
      else if (arg === "secret1" && !secret1Unlocked) appendTerminal("Secret1 locked!");
      else if (arg === "secret2" && !secret2Unlocked) appendTerminal("Secret2 locked!");
      else setColor(arg || "#000000"); // default black
    }
    if (cmd === "opacity") setOpacity(Math.min(Math.max(parseFloat(arg), 0), 1) || 1);
    if (cmd === "unlock") {
      if (arg === "unicornmode") { setRainbowUnlocked(true); appendTerminal("Rainbow unlocked!"); }
      if (arg === "starlight") { setSecret1Unlocked(true); appendTerminal("Secret1 unlocked!"); }
      if (arg === "magma") { setSecret2Unlocked(true); appendTerminal("Secret2 unlocked!"); }
    }
    e.target.value = "";
  };

  const appendTerminal = (text) => {
    terminalRef.current.innerText += `\n${text}`;
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const status = socket.connected ? "Server responding ✅" : "Server not responding ❌";
      if (terminalRef.current) {
        const lines = terminalRef.current.innerText.split("\n");
        if (lines[0].startsWith("Server")) lines.shift();
        terminalRef.current.innerText = `${status}\n` + lines.join("\n");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#ffffff", height: "100vh" }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ backgroundColor: "#ffffff", flex: 1 }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div style={{ backgroundColor: "#222", color: "#00f", fontFamily: "monospace", padding: "10px", height: "150px", overflowY: "auto" }}>
        <div ref={terminalRef}>Server responding ❌  Commands: brush, color, opacity, unlock</div>
        <input
          type="text"
          onKeyDown={handleCommand}
          style={{ width: "100%", background: "#222", color: "#00f", border: "none", outline: "none", fontFamily: "monospace" }}
          placeholder="Enter command..."
        />
      </div>
    </div>
  );
}
