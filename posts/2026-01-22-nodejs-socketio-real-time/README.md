# How to Create Real-Time Applications with Socket.io in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Socket.io, WebSocket, Real-Time, Express

Description: Learn how to build real-time applications using Socket.io in Node.js including chat apps, notifications, live dashboards, and multiplayer features.

---

Socket.io enables real-time, bidirectional communication between web clients and servers. It uses WebSocket when available and falls back to HTTP long-polling when needed, making it reliable across different network conditions.

## Installation

```bash
npm install socket.io express
```

For the client:

```bash
npm install socket.io-client
```

## Basic Setup

### Server Setup

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Handle connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle events from client
  socket.on('message', (data) => {
    console.log('Received:', data);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### Client Setup

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Send message
socket.emit('message', { text: 'Hello!' });

// Listen for messages
socket.on('message', (data) => {
  console.log('Received:', data);
});
```

## Chat Application

### Server

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Store active users
const users = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  
  // User joins with username
  socket.on('join', (username) => {
    users.set(socket.id, username);
    
    // Notify all users
    io.emit('user-joined', {
      username,
      users: Array.from(users.values()),
    });
  });
  
  // Handle chat messages
  socket.on('chat-message', (message) => {
    const username = users.get(socket.id);
    
    // Broadcast to all users
    io.emit('chat-message', {
      username,
      message,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Handle typing indicator
  socket.on('typing', () => {
    const username = users.get(socket.id);
    socket.broadcast.emit('user-typing', username);
  });
  
  socket.on('stop-typing', () => {
    socket.broadcast.emit('user-stop-typing');
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    
    io.emit('user-left', {
      username,
      users: Array.from(users.values()),
    });
  });
});

httpServer.listen(3001);
```

### Client (React)

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

function Chat() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [joined, setJoined] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    
    newSocket.on('chat-message', (data) => {
      setMessages(prev => [...prev, data]);
    });
    
    newSocket.on('user-joined', (data) => {
      setUsers(data.users);
      setMessages(prev => [...prev, {
        system: true,
        message: `${data.username} joined the chat`,
      }]);
    });
    
    newSocket.on('user-left', (data) => {
      setUsers(data.users);
      setMessages(prev => [...prev, {
        system: true,
        message: `${data.username} left the chat`,
      }]);
    });
    
    newSocket.on('user-typing', (username) => {
      setTypingUser(username);
    });
    
    newSocket.on('user-stop-typing', () => {
      setTypingUser(null);
    });
    
    return () => newSocket.close();
  }, []);
  
  const handleJoin = (e) => {
    e.preventDefault();
    socket.emit('join', username);
    setJoined(true);
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('chat-message', message);
      setMessage('');
      socket.emit('stop-typing');
    }
  };
  
  const handleTyping = () => {
    socket.emit('typing');
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing');
    }, 1000);
  };
  
  if (!joined) {
    return (
      <form onSubmit={handleJoin}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
        />
        <button type="submit">Join Chat</button>
      </form>
    );
  }
  
  return (
    <div className="chat">
      <div className="users">
        <h3>Online ({users.length})</h3>
        {users.map(user => (
          <div key={user}>{user}</div>
        ))}
      </div>
      
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.system ? 'system' : 'message'}>
            {msg.system ? (
              msg.message
            ) : (
              <>
                <strong>{msg.username}:</strong> {msg.message}
              </>
            )}
          </div>
        ))}
        {typingUser && (
          <div className="typing">{typingUser} is typing...</div>
        )}
      </div>
      
      <form onSubmit={handleSendMessage}>
        <input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## Rooms

Socket.io rooms allow you to create separate channels for communication.

```javascript
io.on('connection', (socket) => {
  // Join a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', socket.id);
  });
  
  // Leave a room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', socket.id);
  });
  
  // Send message to room
  socket.on('room-message', ({ roomId, message }) => {
    io.to(roomId).emit('room-message', {
      sender: socket.id,
      message,
    });
  });
  
  // Get users in a room
  socket.on('get-room-users', async (roomId) => {
    const sockets = await io.in(roomId).fetchSockets();
    socket.emit('room-users', sockets.map(s => s.id));
  });
});
```

## Private Messages

```javascript
const users = new Map();  // socket.id -> username
const userSockets = new Map();  // username -> socket.id

io.on('connection', (socket) => {
  socket.on('register', (username) => {
    users.set(socket.id, username);
    userSockets.set(username, socket.id);
  });
  
  // Private message
  socket.on('private-message', ({ to, message }) => {
    const targetSocketId = userSockets.get(to);
    const fromUsername = users.get(socket.id);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('private-message', {
        from: fromUsername,
        message,
      });
    } else {
      socket.emit('error', { message: 'User not found' });
    }
  });
  
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    userSockets.delete(username);
  });
});
```

## Real-Time Notifications

### Server

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Map of userId -> socket.id
const userSockets = new Map();

io.on('connection', (socket) => {
  // User authenticates
  socket.on('authenticate', (userId) => {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    
    // Join personal room
    socket.join(`user:${userId}`);
  });
  
  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
    }
  });
});

// Function to send notification to specific user
function sendNotification(userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification);
}

// API endpoint that triggers notification
app.post('/api/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  // Update order in database...
  const order = await updateOrder(orderId, status);
  
  // Send real-time notification
  sendNotification(order.userId, {
    type: 'order-status',
    orderId,
    status,
    message: `Your order #${orderId} is now ${status}`,
  });
  
  res.json({ success: true });
});

httpServer.listen(3001);
```

### Client

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    const socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      socket.emit('authenticate', userId);
    });
    
    socket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      toast.info(notification.message);
    });
    
    return () => socket.close();
  }, [userId]);
  
  return notifications;
}
```

## Live Dashboard

```javascript
// Server
const io = require('socket.io')(httpServer);

// Broadcast metrics every second
setInterval(async () => {
  const metrics = await collectMetrics();
  io.emit('metrics-update', metrics);
}, 1000);

async function collectMetrics() {
  return {
    cpu: process.cpuUsage(),
    memory: process.memoryUsage(),
    activeConnections: io.engine.clientsCount,
    requestsPerSecond: await getRequestRate(),
    timestamp: Date.now(),
  };
}

// Client
const socket = io('http://localhost:3001');

socket.on('metrics-update', (metrics) => {
  updateCPUChart(metrics.cpu);
  updateMemoryChart(metrics.memory);
  updateConnectionsCount(metrics.activeConnections);
});
```

## Authentication

### JWT Authentication

```javascript
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const io = new Server(httpServer);

// Middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Authenticated user:', socket.user.email);
  
  // Join user's personal room
  socket.join(`user:${socket.userId}`);
});
```

### Client with Auth

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('token'),
  },
});

socket.on('connect_error', (error) => {
  if (error.message === 'Authentication required') {
    // Redirect to login
    window.location.href = '/login';
  }
});
```

## Scaling with Redis

For running Socket.io across multiple servers:

```bash
npm install @socket.io/redis-adapter redis
```

```javascript
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const io = new Server(httpServer);

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Socket.io Redis adapter connected');
});

// Now events are shared across all server instances
io.on('connection', (socket) => {
  socket.on('broadcast', (message) => {
    // This reaches clients connected to any server
    io.emit('broadcast', message);
  });
});
```

## Error Handling

### Server

```javascript
io.on('connection', (socket) => {
  // Wrap handlers with error handling
  socket.on('action', async (data, callback) => {
    try {
      const result = await performAction(data);
      callback({ success: true, result });
    } catch (error) {
      console.error('Action error:', error);
      callback({ success: false, error: error.message });
    }
  });
  
  // Global error handler
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Connection error handling
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', err.code, err.message);
});
```

### Client

```javascript
const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection failed:', error.message);
});

socket.on('reconnect_failed', () => {
  console.error('All reconnection attempts failed');
});
```

## Namespaces

Namespaces allow you to create separate communication channels.

```javascript
// Main namespace
io.on('connection', (socket) => {
  console.log('Connected to main');
});

// Admin namespace
const adminNamespace = io.of('/admin');

adminNamespace.use((socket, next) => {
  if (socket.handshake.auth.role === 'admin') {
    next();
  } else {
    next(new Error('Admin access required'));
  }
});

adminNamespace.on('connection', (socket) => {
  console.log('Admin connected');
  
  socket.on('system-action', (action) => {
    // Admin-only actions
  });
});

// Chat namespace
const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
  console.log('User connected to chat');
});
```

Client:

```javascript
const mainSocket = io('http://localhost:3001');
const adminSocket = io('http://localhost:3001/admin', {
  auth: { role: 'admin' },
});
const chatSocket = io('http://localhost:3001/chat');
```

## Summary

| Event | Description |
|-------|-------------|
| `connection` | New client connected |
| `disconnect` | Client disconnected |
| `connect_error` | Connection failed |
| `reconnect` | Client reconnected |

| Method | Description |
|--------|-------------|
| `emit()` | Send to sender |
| `broadcast.emit()` | Send to all except sender |
| `io.emit()` | Send to all clients |
| `to(room).emit()` | Send to specific room |
| `join(room)` | Join a room |
| `leave(room)` | Leave a room |

| Feature | Use Case |
|---------|----------|
| Rooms | Group messaging, channels |
| Namespaces | Separate concerns, admin areas |
| Redis Adapter | Multi-server scaling |
| Acknowledgments | Request-response pattern |
