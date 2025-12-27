// pages/index.js
import Canvas from "../components/canvas"; // no .js needed


export default function Home() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
      <Canvas />
    </div>
  );
}

