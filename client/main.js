// client/main.js
document.addEventListener("DOMContentLoaded", () => {
  // Grab sections
  const welcomePage = document.getElementById("welcome-page");
  const roomPage = document.getElementById("room-page");
  const canvasPage = document.getElementById("canvas-page");

  // Buttons
  const joinBtn = document.getElementById("joinBtn");
  const toRoomsLink = document.getElementById("toRooms");
  const joinRoomBtn = document.getElementById("joinRoomBtn");
  const createRoomBtn = document.getElementById("createRoomBtn");
  const leaveRoomBtn = document.getElementById("leaveRoomBtn");

  // Inputs
  const nameInput = document.getElementById("nameInput");
  const roomInput = document.getElementById("roomInput");

  // Helper to show sections
  function showSection(section) {
    [welcomePage, roomPage, canvasPage].forEach((s) =>
      s.classList.remove("active")
    );
    section.classList.add("active");
  }

  // Go to room list
  toRoomsLink.addEventListener("click", () => {
    showSection(roomPage);
  });

  // Join from welcome page
  joinBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const room = roomInput.value.trim();
    if (!name || !room) {
      alert("Please enter both name and room name!");
      return;
    }
    joinRoom(name, room);
  });

  // Join from room list
  joinRoomBtn.addEventListener("click", () => {
    const selected = document.querySelector("#roomList .selected");
    if (!selected) {
      alert("Please select a room first!");
      return;
    }
    const name = nameInput.value.trim() || "Guest";
    joinRoom(name, selected.innerText.trim());
  });

  // Create new room
  createRoomBtn.addEventListener("click", () => {
    const newRoom = prompt("Enter a new room name:");
    if (!newRoom) return;
    const name = nameInput.value.trim() || "Guest";
    joinRoom(name, newRoom);
  });

  // Leave room
  leaveRoomBtn.addEventListener("click", () => {
    if (window.SocketClient && SocketClient.leave) SocketClient.leave();
    showSection(welcomePage);
  });

  // Clicking on a room highlights it
  document.querySelectorAll("#roomList li").forEach((li) => {
    li.addEventListener("click", () => {
      document.querySelectorAll("#roomList li").forEach((l) =>
        l.classList.remove("selected")
      );
      li.classList.add("selected");
    });
  });

  // Join + show canvas
  function joinRoom(name, room) {
    console.log(`Joining room: ${room} as ${name}`);
    showSection(canvasPage);
    if (window.SocketClient) {
      SocketClient.connect();
      SocketClient.join(room, name);
    }
  }

  console.log("✅ Doodly UI navigation ready");
});
