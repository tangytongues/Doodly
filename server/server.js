// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ✅ Serve static frontend files (fixes websocket.js 404 issue)
app.use(express.static(path.join(__dirname, "../client")));

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ---- Data structures ----
const rooms = {}; // { roomId: { users: Set, history: [] } }

// ---- Socket.io connections ----
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  // Join a room
  socket.on("join", ({ roomId, name }) => {
    if (!roomId) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name || `User-${socket.id.slice(0, 4)}`;

    if (!rooms[roomId]) {
      rooms[roomId] = { users: new Set(), history: [] };
    }

    rooms[roomId].users.add(socket.id);

    console.log(`👤 ${socket.data.name} joined room ${roomId}`);

    // Notify the joining user
    socket.emit("joined", { roomId, name: socket.data.name });

    // Send room user list
    updateRoomClients(roomId);

    // Send recent drawings if available
    const history = rooms[roomId].history || [];
    if (history.length > 0) {
      history.forEach((stroke) => socket.emit("op", { seq: 0, op: stroke }));
    }
  });

  // ---- Drawing stroke events ----
  socket.on("stroke_full", (strokeData) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    // Save to room history
    rooms[roomId].history.push({
      type: "stroke_full",
      color: strokeData.color,
      width: strokeData.width,
      points: strokeData.points,
    });

    // Broadcast to others in the room
    socket.to(roomId).emit("op", {
      seq: Date.now(),
      op: strokeData,
    });
  });

  // ---- Undo / Redo ----
  socket.on("undo", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    if (rooms[roomId].history.length > 0) {
      rooms[roomId].history.pop();
      io.to(roomId).emit("op", { seq: Date.now(), op: { type: "undo" } });
    }
  });

  socket.on("redo", () => {
    // (optional - not storing redo stack globally yet)
    console.log("Redo requested (not yet implemented globally)");
  });

  // ---- Chat feature ----
  socket.on("chat", (data) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    io.to(roomId).emit("chat", {
      name: data.name || "Anonymous",
      message: data.message,
      time: new Date().toLocaleTimeString(),
    });
  });

  // ---- Handle disconnection ----
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId].users.delete(socket.id);
    console.log(`🔴 ${socket.data.name} left room ${roomId}`);

    // Remove room if empty
    if (rooms[roomId].users.size === 0) {
      delete rooms[roomId];
      console.log(`🗑️ Room ${roomId} deleted (empty)`);
    } else {
      updateRoomClients(roomId);
    }
  });
});

// ---- Helper: update room users ----
function updateRoomClients(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const clients = Array.from(room.users).map((id) => {
    const s = io.sockets.sockets.get(id);
    return s?.data?.name || "Guest";
  });
  io.to(roomId).emit("clients", clients);
  io.emit("roomList", Object.keys(rooms)); // broadcast list to all
}

// ---- Start server ----
server.listen(PORT, () => {
  console.log(`🚀 DOODLY server running at http://localhost:${PORT}`);
});
