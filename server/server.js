// server/server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { ensureRoom, globalRooms } = require('./rooms');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Serve client static files (client folder)
app.use('/', express.static(path.join(__dirname, '..', 'client')));

// Basic health endpoint
app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  // store current room for socket (simple)
  socket._currentRoom = null;

  socket.on('join', ({ roomId, name }) => {
    const rid = roomId || 'default';
    socket.join(rid);
    socket._currentRoom = rid;

    const room = ensureRoom(rid);
    const client = { id: socket.id, name: name || 'Anon', color: room.assignColor() };
    room.clients.set(socket.id, client);

    // send joined event with current opLog (small scale)
    socket.emit('joined', {
      clientId: socket.id,
      roomId: rid,
      clients: Array.from(room.clients.values()),
      stateVersion: room.seq,
      opLog: room.opLog
    });

    // broadcast current clients to everyone in room
    io.to(rid).emit('clients', Array.from(room.clients.values()));
    console.log(`[${rid}] ${client.name} joined (${socket.id})`);
  });

  socket.on('stroke_chunk', (msg) => {
    // msg: { roomId, strokeId, color, width, points, isFinal }
    const rid = msg.roomId || socket._currentRoom || 'default';
    const room = ensureRoom(rid);
    room.seq += 1;
    const op = {
      type: 'stroke_chunk',
      strokeId: msg.strokeId,
      userId: socket.id,
      userName: room.clients.get(socket.id)?.name || 'Anon',
      color: msg.color,
      width: msg.width,
      points: msg.points || [],
      isFinal: !!msg.isFinal,
      timestamp: Date.now()
    };
    room.opLog.push({ seq: room.seq, op });
    room.activeSet.add(room.seq);
    io.to(rid).emit('op', { seq: room.seq, op });
  });

  socket.on('stroke_full', (msg) => {
    const rid = msg.roomId || socket._currentRoom || 'default';
    const room = ensureRoom(rid);
    room.seq += 1;
    const op = {
      type: 'stroke',
      strokeId: msg.strokeId,
      userId: socket.id,
      userName: room.clients.get(socket.id)?.name || 'Anon',
      color: msg.color,
      width: msg.width,
      points: msg.points || [],
      timestamp: Date.now()
    };
    room.opLog.push({ seq: room.seq, op });
    room.activeSet.add(room.seq);
    io.to(rid).emit('op', { seq: room.seq, op });
  });

  socket.on('undo', ({ roomId }) => {
    const rid = roomId || socket._currentRoom || 'default';
    const room = ensureRoom(rid);
    // find last active op that is a stroke or chunk
    let lastSeq = null;
    for (let i = room.opLog.length - 1; i >= 0; --i) {
      const e = room.opLog[i];
      if (!room.activeSet.has(e.seq)) continue;
      if (e.op.type === 'stroke' || e.op.type === 'stroke_chunk') {
        lastSeq = e.seq;
        break;
      }
    }
    if (lastSeq != null) {
      room.seq += 1;
      const op = {
        type: 'undo',
        targetSeq: lastSeq,
        userId: socket.id,
        userName: room.clients.get(socket.id)?.name || 'Anon',
        timestamp: Date.now()
      };
      room.opLog.push({ seq: room.seq, op });
      room.activeSet.delete(lastSeq);
      room.undoStack.push(lastSeq);
      io.to(rid).emit('op', { seq: room.seq, op });
    }
  });

  socket.on('redo', ({ roomId }) => {
    const rid = roomId || socket._currentRoom || 'default';
    const room = ensureRoom(rid);
    const targetSeq = room.undoStack.pop();
    if (targetSeq != null) {
      room.seq += 1;
      const op = {
        type: 'redo',
        targetSeq,
        userId: socket.id,
        userName: room.clients.get(socket.id)?.name || 'Anon',
        timestamp: Date.now()
      };
      room.opLog.push({ seq: room.seq, op });
      room.activeSet.add(targetSeq);
      io.to(rid).emit('op', { seq: room.seq, op });
    }
  });

  socket.on('cursor', ({ roomId, x, y }) => {
    const rid = roomId || socket._currentRoom || 'default';
    socket.to(rid).emit('cursor', {
      userId: socket.id,
      x, y,
      name: (ensureRoom(rid).clients.get(socket.id)?.name || 'Anon')
    });
  });

  socket.on('request_state', ({ roomId }) => {
    const rid = roomId || socket._currentRoom || 'default';
    const room = ensureRoom(rid);
    socket.emit('state', { seq: room.seq, opLog: room.opLog, clients: Array.from(room.clients.values()) });
  });

  socket.on('disconnect', () => {
    const rid = socket._currentRoom;
    if (rid) {
      const room = ensureRoom(rid);
      if (room.clients.has(socket.id)) {
        const name = room.clients.get(socket.id).name;
        room.clients.delete(socket.id);
        io.to(rid).emit('clients', Array.from(room.clients.values()));
        console.log(`[${rid}] ${name} disconnected (${socket.id})`);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`DOODLY server listening on http://localhost:${PORT}`);
});
