// client/websocket.js
const SocketClient = (function () {
  let socket = null;
  let clientId = null;
  let roomId = null;

  function connect() {
    socket = io();
    socket.on('connect', () => {
      clientId = socket.id;
      log('connected ' + clientId);
    });
    socket.on('joined', (data) => {
      log('joined room ' + data.roomId + ' (server version ' + data.stateVersion + ')');
      window.APP?.onJoined && window.APP.onJoined(data);
    });
    socket.on('clients', (clients) => {
      window.APP?.updateClients && window.APP.updateClients(clients);
    });
    socket.on('op', ({ seq, op }) => {
      window.APP?.onServerOp && window.APP.onServerOp(seq, op);
    });
    socket.on('cursor', (c) => {
      window.APP?.onCursor && window.APP.onCursor(c);
    });
    socket.on('state', (s) => {
      window.APP?.onState && window.APP.onState(s);
    });
  }

  function join(rId, name) {
    roomId = rId || 'default';
    if (!socket) connect();
    socket.emit('join', { roomId, name });
  }

  function sendStrokeChunk(payload) {
    if (!socket) return;
    socket.emit('stroke_chunk', payload);
  }

  function sendStrokeFull(payload) {
    if (!socket) return;
    socket.emit('stroke_full', payload);
  }

  function sendUndo(payload) {
    if (!socket) return;
    socket.emit('undo', payload || {});
  }

  function sendRedo(payload) {
    if (!socket) return;
    socket.emit('redo', payload || {});
  }

  function sendCursor(x, y, room) {
    if (!socket) return;
    socket.emit('cursor', { roomId: room || roomId || 'default', x, y });
  }

  return { connect, join, sendStrokeChunk, sendStrokeFull, sendUndo, sendRedo, sendCursor };
})();
