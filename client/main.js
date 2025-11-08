// client/main.js
document.addEventListener("DOMContentLoaded", () => {
  // initialize socket connection
  if (window.SocketClient) SocketClient.connect();

  const joinBtn = document.getElementById("joinBtn");
  const nameInput = document.getElementById("nameInput");
  const roomInput = document.getElementById("roomInput");
  const toolSelect = document.getElementById("toolSelect");
  const sizeInput = document.getElementById("sizeInput");
  const colorInput = document.getElementById("colorInput");
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");

  // join button
  joinBtn.addEventListener("click", () => {
    const name = nameInput.value || "Anon";
    const room = roomInput.value || "default";
    SocketClient.join(room, name);
    console.log("Joined room:", room, "as", name);
  });

  // tool select
  toolSelect.addEventListener("change", (e) => {
    if (window.CanvasApp) window.CanvasApp.setTool(e.target.value);
  });

  // brush size
  sizeInput.addEventListener("input", (e) => {
    if (window.CanvasApp) window.CanvasApp.setWidth(parseInt(e.target.value));
  });

  // color
  colorInput.addEventListener("input", (e) => {
    if (window.CanvasApp) window.CanvasApp.setColor(e.target.value);
  });

  // undo
  undoBtn.addEventListener("click", () => {
    if (window.CanvasApp) window.CanvasApp.undo();
  });

  // redo
  redoBtn.addEventListener("click", () => {
    if (window.CanvasApp) window.CanvasApp.redo();
  });

  // keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      if (window.CanvasApp) window.CanvasApp.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
      e.preventDefault();
      if (window.CanvasApp) window.CanvasApp.redo();
    }
  });
});
