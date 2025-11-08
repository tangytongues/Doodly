// client/canvas.js
(function () {
  const canvas = document.getElementById("drawCanvas");
  const ctx = canvas.getContext("2d");

  // Drawing state
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentStroke = [];
  let strokes = [];
  let undone = [];
  const ratio = window.devicePixelRatio || 1;

  // Tool settings
  let currentTool = "brush";
  let currentColor = "#1abc9c";
  let currentWidth = 4;

  // -------------------------------
  // Resize handling
  // -------------------------------
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    redrawAll();
  }
  window.addEventListener("resize", () => {
    resizeCanvas();
    window.requestAnimationFrame(redrawAll);
  });
  resizeCanvas();

  // -------------------------------
  // Position helpers
  // -------------------------------
  function getNormalizedPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x, y };
  }

  // -------------------------------
  // Drawing logic
  // -------------------------------
  function startDraw(e) {
    drawing = true;
    undone = [];
    const { x, y } = getNormalizedPos(e);
    lastX = x;
    lastY = y;
    currentStroke = [{ x, y }];
    ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : currentColor;
    ctx.lineWidth = currentWidth;
  }

  function draw(e) {
    if (!drawing) return;
    const { x, y } = getNormalizedPos(e);
    const rect = canvas.getBoundingClientRect();

    ctx.beginPath();
    ctx.moveTo(lastX * rect.width, lastY * rect.height);
    ctx.lineTo(x * rect.width, y * rect.height);
    ctx.stroke();

    lastX = x;
    lastY = y;
    currentStroke.push({ x, y });
  }

  function stopDraw() {
    if (!drawing) return;
    drawing = false;

    if (currentStroke.length) {
      const strokeObj = {
        color: currentTool === "eraser" ? "#ffffff" : currentColor,
        width: currentWidth,
        points: currentStroke.slice(),
      };
      strokes.push(strokeObj);
      currentStroke = [];
      broadcastStroke(strokeObj);
    }
  }

  canvas.addEventListener("pointerdown", startDraw);
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", stopDraw);
  canvas.addEventListener("pointerleave", stopDraw);

  // -------------------------------
  // Rendering helpers
  // -------------------------------
  function drawStroke(s) {
    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();

    const pts = s.points;
    for (let i = 0; i < pts.length; i++) {
      const px = pts[i].x * rect.width;
      const py = pts[i].y * rect.height;
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

  // -------------------------------
  // Undo / Redo
  // -------------------------------
  function undo() {
    if (!strokes.length) return;
    const last = strokes.pop();
    undone.push(last);
    redrawAll();
    if (window.SocketClient) SocketClient.sendUndo({ roomId: getRoom() });
  }

  function redo() {
    if (!undone.length) return;
    const stroke = undone.pop();
    strokes.push(stroke);
    redrawAll();
    if (window.SocketClient) SocketClient.sendRedo({ roomId: getRoom() });
  }

  // -------------------------------
  // WebSocket sync
  // -------------------------------
  function getRoom() {
    return document.getElementById("roomInput").value || "default";
  }

  function broadcastStroke(strokeObj) {
    if (!window.SocketClient) return;
    SocketClient.sendStrokeFull({
      roomId: getRoom(),
      strokeId: "s-" + Math.random().toString(36).slice(2, 9),
      color: strokeObj.color,
      width: strokeObj.width,
      points: strokeObj.points,
    });
  }

  // Receive strokes from other users
  if (!window.APP) window.APP = {};
  window.APP.onServerOp = function (seq, op) {
    if (op.type === "stroke_full" || op.type === "stroke" || op.type === "stroke_chunk") {
      drawStroke(op);
      strokes.push({ color: op.color, width: op.width, points: op.points });
    } else if (op.type === "undo") {
      strokes.pop();
      redrawAll();
    }
  };

  // -------------------------------
  // Toolbar integration
  // -------------------------------
  window.CanvasApp = {
    setTool(tool) {
      currentTool = tool;
    },
    setColor(c) {
      currentColor = c;
    },
    setWidth(w) {
      currentWidth = w;
    },
    undo,
    redo,
  };

  console.log("✅ DOODLY canvas synced, smooth, and ready");
})();
