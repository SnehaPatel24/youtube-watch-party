import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { socket } from "./socket";

function YouTubePlayer({ room, isHost }) {
  const playerRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [seekSeconds, setSeekSeconds] = useState("0");
  const [duration, setDuration] = useState(0);

  const videoId = room.videoId;

  useEffect(() => {
  playerRef.current = null;
  setDuration(0);
}, [videoId]);

  const playerOptions = {
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      rel: 0
    }
  };

  
function onReady(event) {
  playerRef.current = event.target;
  setDuration(event.target.getDuration() || 0);

  if (room.currentTime > 0) {
    event.target.seekTo(room.currentTime, true);
  }

  if (room.playState === "playing") {
    event.target.playVideo();
  } else {
    event.target.pauseVideo();
  }
}


 

  useEffect(() => {
  if (!isHost || !videoId || room.playState !== "playing") {
    return;
  }

  const intervalId = setInterval(() => {
    const player = playerRef.current;

    if (!player) return;

    try {
      if (player.getPlayerState() === 1) {
        socket.emit("playback_sync", {
          currentTime: player.getCurrentTime()
        });
      }
    } catch (error) {
      console.error("Playback sync failed:", error);
    }
  }, 2000);

  return () => clearInterval(intervalId);
}, [isHost, videoId, room.playState]);

  
useEffect(() => {
  const player = playerRef.current;

  if (!player || !videoId) return;

  try {
    const iframe = player.getIframe();

    if (!iframe || !iframe.isConnected) return;

    if (room.playState === "playing") {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  } catch (error) {
    console.warn("Player is not ready yet:", error);
  }
}, [room.playState, videoId]);


  
useEffect(() => {
  const player = playerRef.current;

  if (!player || !videoId) return;

  try {
    const iframe = player.getIframe();

    if (!iframe || !iframe.isConnected) return;

    const actualTime = player.getCurrentTime();

    if (Math.abs(actualTime - room.currentTime) > 2) {
      player.seekTo(room.currentTime, true);
    }
  } catch (error) {
    console.warn("Seeking skipped; player is not ready:", error);
  }
}, [room.currentTime, videoId]);


  function changeVideo() {
    if (!isHost) return;

    socket.emit("set_video", { videoUrl });
  }

  function togglePlayback() {
    if (!isHost || !playerRef.current || !videoId) return;

    const player = playerRef.current;
    const state = player.getPlayerState();
    const action = state === 1 ? "pause" : "play";

    socket.emit("playback_action", {
      action,
      currentTime: player.getCurrentTime()
    });
  }

  function seekVideo() {
    if (!isHost || !playerRef.current || !videoId) return;

    const seconds = Number(seekSeconds);

    if (!Number.isFinite(seconds) || seconds < 0) {
      return;
    }

    const target = duration > 0
      ? Math.min(seconds, duration)
      : seconds;

    socket.emit("seek_to", { seconds: target });
  }

  return (
    <section className="panel">
      <h2>Shared YouTube Video</h2>

      {isHost && (
        <div>
          <label htmlFor="videoUrl">YouTube video URL</label>
          <input
            id="videoUrl"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="Paste a YouTube video URL"
          />

          <button onClick={changeVideo}>
            Load Video for Everyone
          </button>
        </div>
      )}

      {videoId ? (
        <>
          <div className="video-container">
            
<YouTube
  key={videoId}
  videoId={videoId}
  opts={playerOptions}
  onReady={onReady}
  onError={(event) => {
    console.error("YouTube player error:", event.data);
  }}
/>

          </div>

          {isHost ? (
            <div>
              <button onClick={togglePlayback}>
                Play / Pause
              </button>

              <label htmlFor="seekSeconds">
                Seek to position (seconds)
              </label>
              <input
                id="seekSeconds"
                type="number"
                min="0"
                max={duration || undefined}
                value={seekSeconds}
                onChange={(event) =>
                  setSeekSeconds(event.target.value)
                }
              />

              <button onClick={seekVideo}>
                Seek
              </button>
            </div>
          ) : (
            <p>The Host controls playback for everyone.</p>
          )}
        </>
      ) : (
        <p>Waiting for the Host to select a video.</p>
      )}
    </section>
  );
}

export default YouTubePlayer;