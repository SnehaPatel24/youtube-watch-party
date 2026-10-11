# YouTube Watch Party

A real-time YouTube Watch Party application that allows users to watch videos together in shared rooms with synchronized playback and role-based permissions.

## Features

- Create rooms with unique room codes.
- Join rooms using a room code and request Host approval.
- Synchronize YouTube video playback across participants.
- Play, pause, and seek videos with shared playback state.
- Support Host, Moderator, and Participant roles.
- Allow the Host to assign roles and remove participants.
- Manage join requests with approval and rejection.
- Share room invitation links.
- Real-time communication using Socket.IO.

## Tech Stack

**Frontend:** React, Vite, JavaScript, CSS, YouTube IFrame Player API

**Backend:** Node.js, Express.js, Socket.IO

**Version Control:** Git and GitHub

## Project Structure

```text
youtube-watch-party/
├── client/
│   ├── src/
│   ├── package.json
│   └── ...
├── server/
│   ├── src/
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md
```

## Run Locally

### Prerequisites

- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd youtube-watch-party
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Start the backend

```bash
cd server
npm install
npm run dev
```

### 3. Start the frontend

Open another terminal from the project root:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

## How It Works

1. A user creates a room and becomes the Host.
2. Other users submit requests to join the room.
3. The Host approves or rejects incoming requests.
4. The Host selects a YouTube video.
5. Socket.IO broadcasts playback and room-state updates to connected participants.
6. The backend validates permissions for playback and room-management actions.

## Limitations

- Room information is stored in server memory and may be lost when the server restarts.
- Persistent storage and user authentication are not currently implemented.
- Playback synchronization depends on network conditions and YouTube's embedded player behavior.

## Links

- GitHub Repository: https://github.com/SnehaPatel24/youtube-watch-party
- Frontend: https://youtube-watch-party-client.vercel.app
- Backend: https://youtube-watch-party-server-5cpt.onrender.com

## Future Improvements

- Persistent rooms and user accounts.
- Improved playback synchronization.
- Chat and reactions.
- More advanced moderation controls.
