// client/canvas.js
(function () {
  const canvas = document.getElementById("drawCanvas");
  const ctx = canvas.getContext("2d");

  // ---- Canvas State ----
  let drawing = false;
  let currentTool = "brush";
  let currentColor = "#e74c3c";
  let currentWidth = 4;
  let strokes = [];
  let undone = [];
  let currentStroke = [];

  const ratio = window.devicePixelRatio || 1;

  // ---- Resize Canvas ----
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    redrawAll();
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // ---- Drawing Helpers ----
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function startDraw(e) {
    drawing = true;
    currentStroke = [];
    const { x, y } = getPos(e);
    currentStroke.push({ x, y });
  }

  function draw(e) {
    if (!drawing) return;
    const { x, y } = getPos(e);
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : currentColor;
    ctx.lineWidth = currentWidth;

    const last = currentStroke[currentStroke.length - 1];
    ctx.beginPath();
    ctx.moveTo(last.x * rect.width, last.y * rect.height);
    ctx.lineTo(x * rect.width, y * rect.height);
    ctx.stroke();

    currentStroke.push({ x, y });
  }

  function stopDraw() {
    if (!drawing) return;
    drawing = false;
    if (currentStroke.length > 0) {
      const stroke = {
        type: "stroke_full",
        color: currentTool === "eraser" ? "#ffffff" : currentColor,
        width: currentWidth,
        points: currentStroke.slice(),
      };
      strokes.push(stroke);
      broadcastStroke(stroke);
    }
    currentStroke = [];
  }

  canvas.addEventListener("pointerdown", startDraw);
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", stopDraw);
  canvas.addEventListener("pointerleave", stopDraw);

  // ---- Redraw everything ----
  function drawStroke(s) {
    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    for (let i = 0; i < s.points.length; i++) {
      const px = s.points[i].x * rect.width;
      const py = s.points[i].y * rect.height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) drawStroke(s);
  }

  // ---- Undo / Redo ----
  function undo() {
    if (strokes.length === 0) return;
    undone.push(strokes.pop());
    redrawAll();
    SocketClient?.sendUndo?.();
  }

  function redo() {
    if (undone.length === 0) return;
    const stroke = undone.pop();
    strokes.push(stroke);
    redrawAll();
    SocketClient?.sendRedo?.();
  }

  // ---- Socket Sync ----
  function broadcastStroke(stroke) {
    if (!window.SocketClient) return;
    SocketClient.sendStrokeFull(stroke);
  }

  if (!window.APP) window.APP = {};
  window.APP.onServerOp = function (seq, op) {
    if (op.type === "stroke_full") {
      drawStroke(op);
      strokes.push(op);
    } else if (op.type === "undo") {
      strokes.pop();
      redrawAll();
    }
  };

  // ---- Toolbar bindings ----
  const colorPicker = document.getElementById("colorPicker");
  const brushSize = document.getElementById("brushSize");
  const eraserBtn = document.getElementById("eraserBtn");
  const pencilBtn = document.getElementById("pencilBtn");
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  const colorBoxes = document.querySelectorAll(".color");

  // Quick palette
  colorBoxes.forEach((box) => {
    box.addEventListener("click", () => {
      currentColor = box.style.backgroundColor;
      colorBoxes.forEach((b) => b.classList.remove("selected"));
      box.classList.add("selected");
      pencilBtn.classList.add("active");
      eraserBtn.classList.remove("active");
      currentTool = "brush";
    });
  });

  // Color picker
  colorPicker.addEventListener("input", (e) => {
    currentColor = e.target.value;
    currentTool = "brush";
    pencilBtn.classList.add("active");
    eraserBtn.classList.remove("active");
  });

  // Brush size
  brushSize.addEventListener("input", (e) => {
    currentWidth = parseInt(e.target.value);
  });

  // Tool selection
  pencilBtn.addEventListener("click", () => {
    currentTool = "brush";
    pencilBtn.classList.add("active");
    eraserBtn.classList.remove("active");
  });

  eraserBtn.addEventListener("click", () => {
    currentTool = "eraser";
    eraserBtn.classList.add("active");
    pencilBtn.classList.remove("active");
  });

  // Undo / Redo
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  console.log("✅ Doodly canvas ready with brush, eraser, color, undo/redo!");
})();
