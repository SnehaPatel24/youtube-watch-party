import YouTubePlayer from "./YouTubePlayer";
import { useEffect, useState } from "react";
import { socket } from "./socket";
import "./App.css";

function App() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [myUserId, setMyUserId] = useState("");
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
      setMessage("Disconnected from server. Please reconnect.");
      setRoom(null);
      setMyUserId("");
    }

    function onRoomCreated(data) {
      setRoom(data.room);
      setMyUserId(data.userId);
      setMessage("Room created successfully!");
    }

    function onRoomJoined(data) {
      setRoom(data.room);
      setMyUserId(data.userId);
      setMessage("Joined room successfully!");
    }

    function onSyncState(data) {
      setRoom((currentRoom) => {
        if (!currentRoom || currentRoom.roomId !== data.roomId) {
          return currentRoom;
        }

        return data;
      });
    }

    function onUserJoined(data) {
      setRoom((currentRoom) => {
        if (!currentRoom) return currentRoom;

        return {
          ...currentRoom,
          participants: data.participants
        };
      });
    }

    function onUserLeft(data) {
      setRoom((currentRoom) => {
        if (!currentRoom) return currentRoom;

        return {
          ...currentRoom,
          participants: data.participants,
          hostId: data.participants.find(
            (p) => p.role === "Host"
          )?.userId || currentRoom.hostId
        };
      });
    }

    function onRejected(data) {
      setMessage(data.message);
    }

    function onPlaybackTick(data) {
  setRoom((currentRoom) => {
    if (!currentRoom || currentRoom.roomId !== data.roomId) {
      return currentRoom;
    }

    return {
      ...currentRoom,
      currentTime: data.currentTime
    };
  });
}

    function onJoinRequestReceived(data) {
  setPendingRequests((current) => {
    const exists = current.some(
      (request) => request.userId === data.request.userId
    );



    return exists ? current : [...current, data.request];
  });
}

function onJoinRequestPending(data) {
  setMessage(data.message);
}

function onJoinRequestRejected(data) {
  setMessage(data.message);
}

function onJoinRequestRemoved(data) {
  setPendingRequests((current) =>
    current.filter((request) => request.userId !== data.targetUserId)
  );
}

    function onRoomRemoved(data) {
  setRoom(null);
  setMyUserId("");
  setRoomCode("");
  setMessage(data.message);
}




    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_created", onRoomCreated);
    socket.on("room_joined", onRoomJoined);
    socket.on("sync_state", onSyncState);
    socket.on("user_joined", onUserJoined);
    socket.on("user_left", onUserLeft);
    socket.on("action_rejected", onRejected);
    socket.on("room_removed", onRoomRemoved);
    socket.on("join_request_received", onJoinRequestReceived);
    socket.on("join_request_pending", onJoinRequestPending);
    socket.on("join_request_rejected", onJoinRequestRejected);
    socket.on("join_request_removed", onJoinRequestRemoved);
    socket.on("playback_tick", onPlaybackTick);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_created", onRoomCreated);
      socket.off("room_joined", onRoomJoined);
      socket.off("sync_state", onSyncState);
      socket.off("user_joined", onUserJoined);
      socket.off("user_left", onUserLeft);
      socket.off("action_rejected", onRejected);
      socket.off("room_removed", onRoomRemoved);
      socket.off("join_request_received", onJoinRequestReceived);
      socket.off("join_request_pending", onJoinRequestPending);
      socket.off("join_request_rejected", onJoinRequestRejected);
      socket.off("join_request_removed", onJoinRequestRemoved);
      socket.off("playback_tick", onPlaybackTick);
      socket.disconnect();
    };
  }, []);

  function createRoom() {
    setMessage("");

    if (!username.trim()) {
      setMessage("Please enter your username.");
      return;
    }

    if (!connected) {
      setMessage("Please wait for the server connection.");
      return;
    }

    socket.emit("create_room", { username });
  }

  function joinRoom() {
    setMessage("");

    if (!username.trim() || !roomCode.trim()) {
      setMessage("Enter your username and room code.");
      return;
    }

    if (!connected) {
      setMessage("Please wait for the server connection.");
      return;
    }

    socket.emit("request_to_join", {
  username,
  roomId: roomCode
});
  }

  function leaveRoom() {
    socket.emit("leave_room");
    setRoom(null);
    setMyUserId("");
    setMessage("You left the room.");
  }

  async function copyRoomLink() {
    const link =
      `${window.location.origin}/room/${room.roomId}`;

    try {
      await navigator.clipboard.writeText(link);
      setMessage("Room link copied!");
    } catch {
      setMessage(`Share this link: ${link}`);
    }
  }

  if (!room) {
    return (
      <main className="container">
        <h1>YouTube Watch Party</h1>
        <p>Watch your favorite videos together.</p>

        <p>
          Server status:{" "}
          <strong>{connected ? "Connected" : "Connecting..."}</strong>
        </p>

        <section className="panel">
          <label htmlFor="username">Your username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            maxLength={25}
          />

          <button onClick={createRoom}>
            Create Room
          </button>

          <hr />

          <label htmlFor="roomCode">Room code</label>
          <input
            id="roomCode"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code"
            maxLength={6}
          />

          <button onClick={joinRoom}>
            Join Room
          </button>
        </section>

        {message && <p role="status">{message}</p>}
      </main>
    );
  }

  const isHost = room.hostId === myUserId;

  return (
    <main className="container">
      <h1>YouTube Watch Party</h1>

      <section className="panel">
        <h2>Room: {room.roomId}</h2>
        <p>
          Your role:{" "}
          <strong>
            {room.participants.find(
              (p) => p.userId === myUserId
            )?.role || "Participant"}
          </strong>
        </p>

        <button onClick={copyRoomLink}>
          Copy Invite Link
        </button>

        <h3>Participants ({room.participants.length})</h3>

        <ul>
          {room.participants.map((participant) => (
  <li key={participant.userId}>
    {participant.username} — {participant.role}
    {participant.userId === myUserId ? " (You)" : ""}

    {isHost && participant.userId !== myUserId && (
      <>
        <button
          onClick={() =>
            socket.emit("assign_role", {
              targetUserId: participant.userId,
              role:
                participant.role === "Moderator"
                  ? "Participant"
                  : "Moderator"
            })
          }
        >
          {participant.role === "Moderator"
            ? "Remove Moderator"
            : "Make Moderator"}
        </button>

        <button
          onClick={() =>
            socket.emit("remove_participant", {
              targetUserId: participant.userId
            })
          }
        >
          Remove
        </button>
      </>
    )}
  </li>
))}
        </ul>

        {isHost && (
  <section className="panel">
    <h3>Join Requests ({pendingRequests.length})</h3>

    {pendingRequests.length === 0 ? (
      <p>No pending join requests.</p>
    ) : (
      <ul>
        {pendingRequests.map((request) => (
          <li key={request.userId}>
            {request.username}

            <button
              onClick={() => {
                socket.emit("approve_join_request", {
                  targetUserId: request.userId
                });
              }}
            >
              Approve
            </button>

            <button
              onClick={() => {
                socket.emit("reject_join_request", {
                  targetUserId: request.userId
                });
              }}
            >
              Reject
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
)}

        {isHost && <p>You are the room Host.</p>}

        <button onClick={leaveRoom}>
          Leave Room
        </button>
      </section>
      <YouTubePlayer room={room} isHost={isHost} />

      {message && <p role="status">{message}</p>}
    </main>
  );
}

export default App;