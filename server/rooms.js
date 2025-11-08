// server/rooms.js
const globalRooms = {};

function ensureRoom(roomId = 'default') {
  if (!globalRooms[roomId]) {
    globalRooms[roomId] = {
      seq: 0,
      opLog: [],            // [{ seq, op }]
      activeSet: new Set(), // seqs currently active (not undone)
      undoStack: [],        // for redo
      clients: new Map(),   // socketId -> {id,name,color}
      colors: ['#1abc9c','#3498db','#9b59b6','#f1c40f','#e74c3c','#2ecc71'],
      colorIndex: 0,
      assignColor() {
        const c = this.colors[this.colorIndex % this.colors.length];
        this.colorIndex += 1;
        return c;
      }
    };
  }
  return globalRooms[roomId];
}

module.exports = { ensureRoom, globalRooms };
