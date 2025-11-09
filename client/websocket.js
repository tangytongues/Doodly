// client/websocket.js
const SocketClient = (function () {
  let socket = null;
  let currentRoom = "default";
  let currentName = "Guest";

  function connect() {
    socket = io();

    socket.on("connect", () => {
      console.log("✅ Connected to Socket.io server:", socket.id);
    });

    socket.on("joined", (data) => {
      console.log("🎉 Joined room:", data.roomId);
      if (window.APP && window.APP.onJoined) window.APP.onJoined(data);
    });

    socket.on("op", ({ seq, op }) => {
      if (window.APP && window.APP.onServerOp) window.APP.onServerOp(seq, op);
    });

    socket.on("chat", (data) => {
      if (window.SocketClient.onChat) window.SocketClient.onChat(data);
    });

    socket.on("roomList", (rooms) => {
      if (window.SocketClient.onRoomList) window.SocketClient.onRoomList(rooms);
    });
  }

  function join(roomId, name) {
    if (!socket) connect();
    currentRoom = roomId;
    currentName = name;
    socket.emit("join", { roomId, name });
  }

  function sendStrokeFull(payload) {
    if (!socket) return;
    socket.emit("stroke_full", { ...payload, roomId: currentRoom });
  }

  function sendUndo() {
    if (!socket) return;
    socket.emit("undo", { roomId: currentRoom });
  }

  function sendRedo() {
    if (!socket) return;
    socket.emit("redo", { roomId: currentRoom });
  }

  function sendChat(message) {
    if (!socket) return;
    socket.emit("chat", { roomId: currentRoom, name: currentName, message });
  }

  return { connect, join, sendStrokeFull, sendUndo, sendRedo, sendChat };
})();
