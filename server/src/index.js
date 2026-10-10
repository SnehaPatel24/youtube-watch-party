
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const {
  rooms,
  createRoom,
  getPublicRoom
} = require("./roomManager");

const app = express();
const server = http.createServer(app);

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

app.get("/", (req, res) => {
  res.send("YouTube Watch Party backend is running!");
});

function cleanUsername(value) {
  if (typeof value !== "string") return null;

  const username = value.trim();

  if (!username || username.length > 25) return null;

  return username;
}

function leaveCurrentRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  socket.leave(roomId);
  socket.data.roomId = null;

  if (!room) return;

  const participant = room.participants.get(socket.id);
  if (!participant) return;

  room.participants.delete(socket.id);

  if (room.participants.size === 0) {
    rooms.delete(roomId);
    return;
  }

  // Transfer Host if the current Host leaves.
  if (room.hostId === socket.id) {
    const nextHost = room.participants.values().next().value;

    nextHost.role = "Host";
    room.hostId = nextHost.userId;
  }

  io.to(roomId).emit("user_left", {
    username: participant.username,
    userId: participant.userId,
    participants: getPublicRoom(room).participants
  });

  io.to(roomId).emit("sync_state", getPublicRoom(room));
}


function canControlRoom(socket, room) {
  const participant = room.participants.get(socket.id);

  return (
    participant &&
    (participant.role === "Host" ||
      participant.role === "Moderator")
  );
}

function extractVideoId(value) {
  if (typeof value !== "string") return null;

  const input = value.trim();

  // Accept a plain 11-character YouTube video ID.
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    let id = "";

    if (
      url.hostname === "youtu.be" ||
      url.hostname === "www.youtu.be"
    ) {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com",
       "music.youtube.com"].includes(url.hostname)
    ) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v") || "";
      } else {
        const parts = url.pathname.split("/").filter(Boolean);

        if (["embed", "shorts", "live"].includes(parts[0])) {
          id = parts[1] || "";
        }
      }
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("create_room", ({ username } = {}) => {
    if (socket.data.roomId) {
      leaveCurrentRoom(socket);
    }

    const validUsername = cleanUsername(username);

    if (!validUsername) {
      socket.emit("action_rejected", {
        message: "Enter a username of 1–25 characters."
      });
      return;
    }

    const room = createRoom(socket, validUsername);

    socket.data.roomId = room.roomId;
    socket.join(room.roomId);

    socket.emit("room_created", {
      room: getPublicRoom(room),
      userId: socket.id
    });
  });

  socket.on("join_room", ({ roomId, username } = {}) => {
    if (socket.data.roomId) {
      leaveCurrentRoom(socket);
    }

    const validUsername = cleanUsername(username);
    const normalizedRoomId =
      typeof roomId === "string" ? roomId.trim().toUpperCase() : "";

    if (!validUsername || !normalizedRoomId) {
      socket.emit("action_rejected", {
        message: "Enter a valid username and room code."
      });
      return;
    }

    const room = rooms.get(normalizedRoomId);

    if (!room) {
      socket.emit("action_rejected", {
        message: "Room not found. Check the code or create a new room."
      });
      return;
    }

    const participant = {
      userId: socket.id,
      username: validUsername,
      role: "Participant"
    };

    room.participants.set(socket.id, participant);

    socket.data.roomId = room.roomId;
    socket.join(room.roomId);

    socket.emit("room_joined", {
      room: getPublicRoom(room),
      userId: socket.id
    });

    io.to(room.roomId).emit("user_joined", {
      username: participant.username,
      userId: participant.userId,
      role: participant.role,
      participants: getPublicRoom(room).participants
    });

    // Send the current room state to everyone, including the new joiner.
    io.to(room.roomId).emit("sync_state", getPublicRoom(room));
  });

  socket.on("leave_room", () => {
    leaveCurrentRoom(socket);
  });

  socket.on("set_video", ({ videoUrl } = {}) => {
  const roomId = socket.data.roomId;
  const room = rooms.get(roomId);

  if (!room || !canControlRoom(socket, room)) {
    socket.emit("action_rejected", {
      message: "Only the Host or a Moderator can change the video."
    });
    return;
  }

  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    socket.emit("action_rejected", {
      message: "Enter a valid YouTube video URL or video ID."
    });
    return;
  }

  room.videoId = videoId;
  room.currentTime = 0;
  room.playState = "paused";

  io.to(roomId).emit("sync_state", getPublicRoom(room));
});

socket.on("request_to_join", ({ roomId, username } = {}) => {
  const normalizedRoomId =
    typeof roomId === "string" ? roomId.trim().toUpperCase() : "";

  const normalizedUsername =
    typeof username === "string" ? username.trim() : "";

  const room = rooms.get(normalizedRoomId);

  if (!room) {
    socket.emit("action_rejected", {
      message: "Room not found."
    });
    return;
  }

  if (!normalizedUsername || normalizedUsername.length > 25) {
    socket.emit("action_rejected", {
      message: "Enter a valid username (1–25 characters)."
    });
    return;
  }

  if (room.participants.has(socket.id)) {
    socket.emit("action_rejected", {
      message: "You are already in this room."
    });
    return;
  }

  if (Array.from(room.pendingRequests.values()).some(
    (request) => request.userId === socket.id
  )) {
    socket.emit("action_rejected", {
      message: "Your request is already pending."
    });
    return;
  }

  room.pendingRequests.set(socket.id, {
    userId: socket.id,
    username: normalizedUsername
  });

  socket.data.pendingRoomId = normalizedRoomId;

  io.to(room.hostId).emit("join_request_received", {
    roomId: normalizedRoomId,
    request: {
      userId: socket.id,
      username: normalizedUsername
    }
  });

  socket.emit("join_request_pending", {
    message: "Join request sent. Please wait for Host approval."
  });
});

socket.on("approve_join_request", ({ targetUserId } = {}) => {
  const roomId = socket.data.roomId;
  const room = rooms.get(roomId);

  if (!room || room.hostId !== socket.id) {
    socket.emit("action_rejected", {
      message: "Only the Host can approve requests."
    });
    return;
  }

  const request = room.pendingRequests.get(targetUserId);

  if (!request) {
    socket.emit("action_rejected", {
      message: "Join request not found."
    });
    return;
  }

  const targetSocket = io.sockets.sockets.get(targetUserId);

  if (!targetSocket || targetSocket.data.pendingRoomId !== roomId) {
    room.pendingRequests.delete(targetUserId);
    socket.emit("action_rejected", {
      message: "The requester is no longer connected."
    });
    return;
  }

  room.pendingRequests.delete(targetUserId);

  socket.emit("join_request_removed", { targetUserId });

  const participant = {
    userId: targetUserId,
    username: request.username,
    role: "Participant"
  };

  room.participants.set(targetUserId, participant);

  targetSocket.join(roomId);
  targetSocket.data.roomId = roomId;
  delete targetSocket.data.pendingRoomId;

  targetSocket.emit("room_joined", {
    room: getPublicRoom(room),
    userId: targetUserId
  });

  targetSocket.emit("join_request_approved", {
    message: "Your request was approved!"
  });

  io.to(roomId).emit("sync_state", getPublicRoom(room));

  socket.to(roomId).emit("user_joined", {
    participants: Array.from(room.participants.values())
  });
});

socket.on("reject_join_request", ({ targetUserId } = {}) => {
  const roomId = socket.data.roomId;
  const room = rooms.get(roomId);

  if (!room || room.hostId !== socket.id) {
    socket.emit("action_rejected", {
      message: "Only the Host can reject requests."
    });
    return;
  }

  const request = room.pendingRequests.get(targetUserId);

  if (!request) {
    socket.emit("action_rejected", {
      message: "Join request not found."
    });
    return;
  }

  room.pendingRequests.delete(targetUserId);

  const targetSocket = io.sockets.sockets.get(targetUserId);

  if (targetSocket) {
    delete targetSocket.data.pendingRoomId;

    targetSocket.emit("join_request_rejected", {
      message: "Your request was declined by the Host."
    });
  }

  socket.emit("join_request_removed", { targetUserId });
});

socket.on("playback_action", ({ action, currentTime } = {}) => {
  const roomId = socket.data.roomId;
  const room = rooms.get(roomId);

  if (!room || !canControlRoom(socket, room)) {
    socket.emit("action_rejected", {
      message: "You do not have permission to control playback."
    });
    return;
  }

  if (!room.videoId || !["play", "pause"].includes(action)) {
    return;
  }

  room.playState = action === "play" ? "playing" : "paused";

  if (
    typeof currentTime === "number" &&
    Number.isFinite(currentTime) &&
    currentTime >= 0
  ) {
    room.currentTime = currentTime;
  }

  io.to(roomId).emit("sync_state", getPublicRoom(room));
});

socket.on("seek_to", ({ seconds } = {}) => {
  const roomId = socket.data.roomId;
  const room = rooms.get(roomId);

  if (!room || !canControlRoom(socket, room)) {
    socket.emit("action_rejected", {
      message: "You do not have permission to seek."
    });
    return;
  }

  if (
    !room.videoId ||
    typeof seconds !== "number" ||
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    socket.emit("action_rejected", {
      message: "Enter a valid playback position."
    });
    return;
  }

  socket.on("playback_sync", ({ currentTime } = {}) => {
  const roomId = socket.data.roomId;
  const room = rooms.get(roomId);

  if (!room || !canControlRoom(socket, room)) {
    return;
  }

  if (
    typeof currentTime !== "number" ||
    !Number.isFinite(currentTime) ||
    currentTime < 0
  ) {
    return;
  }

  room.currentTime = currentTime;

  io.to(roomId).emit("playback_tick", {
    roomId,
    currentTime
  });
});

  room.currentTime = seconds;

  io.to(roomId).emit("sync_state", getPublicRoom(room));
});
    socket.on("assign_role", ({ targetUserId, role } = {}) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);

      if (!room || room.hostId !== socket.id) {
        socket.emit("action_rejected", {
          message: "Only the Host can assign roles."
        });
        return;
      }

      if (!["Moderator", "Participant"].includes(role)) {
        socket.emit("action_rejected", {
          message: "Invalid role."
        });
        return;
      }

      const target = room.participants.get(targetUserId);

      if (!target) {
        socket.emit("action_rejected", {
          message: "Participant not found."
        });
        return;
      }

      if (targetUserId === room.hostId) {
        socket.emit("action_rejected", {
          message: "The Host role cannot be changed here."
        });
        return;
      }

      target.role = role;

      io.to(roomId).emit("sync_state", getPublicRoom(room));
    });

    socket.on("remove_participant", ({ targetUserId } = {}) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);

      if (!room || room.hostId !== socket.id) {
        socket.emit("action_rejected", {
          message: "Only the Host can remove participants."
        });
        return;
      }

      if (
        !targetUserId ||
        targetUserId === socket.id ||
        !room.participants.has(targetUserId)
      ) {
        socket.emit("action_rejected", {
          message: "Invalid participant."
        });
        return;
      }

      const targetSocket = io.sockets.sockets.get(targetUserId);

      room.participants.delete(targetUserId);

      if (targetSocket) {
        targetSocket.leave(roomId);
        delete targetSocket.data.roomId;

        targetSocket.emit("room_removed", {
          message: "The Host removed you from the room."
        });
      }

      io.to(roomId).emit("sync_state", getPublicRoom(room));
    });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    leaveCurrentRoom(socket);

    for (const room of rooms.values()) {
  room.pendingRequests?.delete(socket.id);
}
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});