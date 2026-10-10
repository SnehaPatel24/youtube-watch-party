
const crypto = require("crypto");

const rooms = new Map();

function generateRoomId() {
  let roomId;

  do {
    roomId = crypto.randomBytes(3).toString("hex").toUpperCase();
  } while (rooms.has(roomId));

  return roomId;
}

function createRoom(socket, username) {
  const roomId = generateRoomId();

  const participant = {
    userId: socket.id,
    username,
    role: "Host"
  };

  const room = {
  roomId,
  hostId: socket.id,
  videoId: "",
  playState: "paused",
  currentTime: 0,
  participants: new Map([[socket.id, participant]]),
  pendingRequests: new Map()
};

  rooms.set(roomId, room);

  return room;
}

function getPublicRoom(room) {
  return {
    roomId: room.roomId,
    hostId: room.hostId,
    videoId: room.videoId,
    playState: room.playState,
    currentTime: room.currentTime,
    participants: Array.from(room.participants.values())
  };
}

module.exports = {
  rooms,
  createRoom,
  getPublicRoom
};