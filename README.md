# YouTube Watch Party

A real-time YouTube Watch Party application that allows multiple users to watch YouTube videos together in shared rooms with synchronized playback and role-based access control.

## Live Demo

- **Frontend:** https://youtube-watch-party-client.vercel.app/
- **Backend:** https://youtube-watch-party-server-5cpt.onrender.com
- **GitHub Repository:** https://github.com/SnehaPatel24/youtube-watch-party

## Features

- Create watch rooms with unique room codes.
- Join rooms using a room code or invitation link.
- Request Host approval to join a room.
- Synchronize YouTube video playback across participants.
- Synchronize play, pause, seek, and video changes.
- Support Host, Moderator, and Participant roles.
- Allow the Host to assign roles and remove participants.
- Approve or reject incoming join requests.
- Restrict playback controls according to user permissions.
- Display room and participant updates in real time.
- Use Socket.IO for real-time bidirectional communication.

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS
- YouTube IFrame Player API

**Backend**
- Node.js
- Express.js
- Socket.IO

**Deployment and Version Control**
- Vercel — frontend hosting
- Render — backend hosting
- Git and GitHub

## Project Structure

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

## Getting Started

### Prerequisites

- Node.js and npm
- Git

### 1. Clone the repository

git clone https://github.com/SnehaPatel24/youtube-watch-party.git
cd youtube-watch-party


### 2. Configure environment variables

Configure the following environment variables in the appropriate frontend and backend environments.

**Frontend — `client/.env`**

VITE_SERVER_URL=http://localhost:5000

**Backend — `server/.env`**

CLIENT_URL=http://localhost:5173

These values assume that the backend runs on port `5000` and Vite runs on port `5173`. If your server uses a different port, update the values accordingly.

Do not commit secret credentials or private environment files to GitHub.

### 3. Start the backend

Open a terminal:

cd server
npm install
npm run dev

Make sure the backend's development script is configured in `server/package.json`. If your project uses a different script, run the appropriate command.

### 4. Start the frontend

Open another terminal from the project root:

cd client
npm install
npm run dev


Open the local URL displayed by Vite in your browser.

## How It Works

1. A user creates a room and becomes its Host.
2. Other users join through a room code or invitation link.
3. If approval is required, the Host approves or rejects join requests.
4. The Host selects a YouTube video using the embedded YouTube player.
5. The frontend sends playback and room actions to the backend through Socket.IO.
6. The backend checks the user's permissions before processing restricted actions.
7. Validated state changes are broadcast to the room so connected participants can synchronize their players and update their interfaces.
8. Role and participant updates are broadcast to keep the room's participant list current.

## Architecture Overview

The application uses a React frontend, a Node.js and Express backend, and Socket.IO for real-time communication.

- **Frontend:** Provides the room interface, participant list, role controls, and embedded YouTube player.
- **Backend:** Manages room state, participants, join requests, and role-based permissions.
- **Socket.IO:** Supports bidirectional communication between clients and the backend and broadcasts validated room updates.
- **YouTube IFrame Player API:** Embeds and controls YouTube videos in the browser.
- **Deployment:** The frontend is hosted on Vercel, while the WebSocket-enabled backend is hosted on Render.

The backend is responsible for enforcing permissions; hiding or disabling controls in the frontend alone is not sufficient to secure restricted actions.

## Role-Based Access Control

| Role          | Permissions |

| Host          | Full room control, playback management, role assignment, and participant removal |
| Moderator     | Playback controls and video changes, subject to backend permission checks |
| Participant   | Watch synchronized videos without controlling playback |

The Host is assigned automatically when a room is created. New participants receive the default role configured by the application. The backend validates restricted actions before applying them.

## Limitations

- Room information is stored in server memory and may be lost when the backend restarts.
- Persistent database storage and user authentication are not currently implemented.
- Playback synchronization may be affected by network latency and YouTube's embedded player behavior.
- The application does not currently provide a persistent room history.

## Future Improvements

- Persistent room storage using a database.
- User authentication and account management.
- Text chat and emoji reactions.
- Improved synchronization and recovery after reconnection.
- Host transfer and advanced moderation controls.
- Horizontal scaling with a shared Socket.IO adapter such as Redis.

## Author

**Sneha Patel**

GitHub: https://github.com/SnehaPatel24