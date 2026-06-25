# ✈️ Plane — Full-Stack Messenger

A Telegram-like messaging app built with React, Node.js, PostgreSQL, and Socket.IO.

## Stack
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Real-time:** Socket.IO
- **Auth:** JWT
- **File storage:** Local (or Cloudinary)

## Features
- 🔐 Registration & login with JWT auth
- 💬 Direct messages between users
- 👥 Group chats with custom names
- ⚡ Real-time messaging via Socket.IO
- ✏️ Edit & delete messages
- 😊 Emoji reactions
- 💬 Reply to messages
- 📎 File & image uploads
- ⌨️ Typing indicators
- 🟢 Online/offline status
- 🔢 Unread message counters
- 📜 Message history pagination

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 2. Database Setup

```bash
# Create the database
createdb plane_db

# Apply schema
psql plane_db < backend/schema.sql
```

### 3. Backend Setup

```bash
cd backend
npm install

# Copy and edit environment variables
cp .env.example .env
# Edit .env with your database URL and JWT secret

npm run dev
# Runs on http://localhost:3001
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

### Backend `.env`

```env
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/plane_db
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Optional: Cloudinary for file storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Project Structure

```
plane/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Business logic
│   │   │   ├── authController.js
│   │   │   ├── chatController.js
│   │   │   ├── messageController.js
│   │   │   ├── userController.js
│   │   │   └── uploadController.js
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT middleware
│   │   ├── routes/
│   │   │   └── index.js      # All API routes
│   │   ├── socket/
│   │   │   └── index.js      # Socket.IO handlers
│   │   ├── db.js             # PostgreSQL connection
│   │   └── index.js          # Entry point
│   ├── schema.sql            # Database schema
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── chat/
    │   │   │   ├── ChatWindow.tsx    # Main chat area
    │   │   │   ├── MessageBubble.tsx # Single message
    │   │   │   └── MessageInput.tsx  # Send box
    │   │   ├── layout/
    │   │   │   └── Sidebar.tsx       # Chat list + search
    │   │   └── ui/
    │   │       └── Avatar.tsx        # Avatar component
    │   ├── hooks/
    │   │   └── useSocket.ts          # Socket.IO hook
    │   ├── pages/
    │   │   ├── ChatPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── store/
    │   │   ├── authStore.ts          # Zustand auth store
    │   │   └── chatStore.ts          # Zustand chat store
    │   ├── types/
    │   │   └── index.ts              # TypeScript types
    │   └── utils/
    │       └── api.ts                # Axios instance
    └── package.json
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/search?q=...` | Search users |
| GET | `/api/users/:id` | Get user by ID |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | Get my chats |
| POST | `/api/chats/direct` | Create direct chat |
| POST | `/api/chats/group` | Create group |
| GET | `/api/chats/:id/messages` | Get messages |
| POST | `/api/chats/:id/read` | Mark as read |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chats/:id/messages` | Send message |
| PATCH | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Delete message |
| POST | `/api/messages/:id/reactions` | Toggle reaction |

### Socket Events (Client → Server)
| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ chatId, content, type, replyTo? }` | Send message |
| `message:edit` | `{ messageId, content }` | Edit message |
| `message:delete` | `{ messageId }` | Delete message |
| `message:react` | `{ messageId, emoji }` | Toggle reaction |
| `typing:start` | `{ chatId }` | Start typing |
| `typing:stop` | `{ chatId }` | Stop typing |
| `message:read` | `{ chatId }` | Mark as read |

### Socket Events (Server → Client)
| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `Message` | New message |
| `message:edited` | `Message` | Message edited |
| `message:deleted` | `{ messageId, chatId }` | Message deleted |
| `message:reaction` | `{ messageId, userId, emoji, action }` | Reaction updated |
| `typing:start` | `{ chatId, userId, user }` | User typing |
| `typing:stop` | `{ chatId, userId }` | User stopped |
| `user:status` | `{ userId, status }` | Status change |

---

## Production Deployment

```bash
# Frontend build
cd frontend && npm run build

# Serve static files with Express or nginx
# Point nginx to frontend/dist for static files
# Point /api and /socket.io to backend:3001
```

## Adding Cloudinary
1. Sign up at cloudinary.com
2. Add credentials to backend `.env`
3. Files will automatically be stored on Cloudinary

---

Built with ❤️ as Plane messenger
