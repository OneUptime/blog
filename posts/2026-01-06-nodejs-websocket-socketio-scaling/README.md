# How to Implement WebSocket Connections in Node.js with Socket.io and Scaling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Scaling, Performance, Redis, DevOps

Description: Learn to implement WebSocket connections in Node.js using Socket.io with Redis adapter for horizontal scaling, rooms, authentication, and production best practices.

---

Real-time features like chat, notifications, live updates, and collaborative editing require persistent connections. Socket.io provides a robust abstraction over WebSockets with automatic fallbacks, reconnection, and room-based broadcasting. This guide covers implementing Socket.io at scale with horizontal scaling using Redis.

## Basic Socket.io Setup

```bash
npm install socket.io socket.io-client
```

### Server

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('message', (data) => {
    console.log('Message received:', data);
    // Broadcast to all other clients
    socket.broadcast.emit('message', data);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

httpServer.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

### Client

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('message', (data) => {
  console.log('Message:', data);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Send message
socket.emit('message', { text: 'Hello!' });
```

## Authentication

### JWT Authentication

```javascript
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.id} connected`);

  // Join user-specific room for targeted messages
  socket.join(`user:${socket.user.id}`);

  // Join organization room if applicable
  if (socket.user.orgId) {
    socket.join(`org:${socket.user.orgId}`);
  }
});

// Send to specific user
function sendToUser(userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

// Send to organization
function sendToOrg(orgId, event, data) {
  io.to(`org:${orgId}`).emit(event, data);
}
```

### Client with Authentication

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('accessToken'),
  },
});

// Handle token refresh
socket.on('connect_error', async (error) => {
  if (error.message === 'Invalid token') {
    // Refresh token
    const newToken = await refreshAccessToken();
    socket.auth.token = newToken;
    socket.connect();
  }
});
```

## Rooms for Channels

```javascript
io.on('connection', (socket) => {
  // Join a chat room
  socket.on('join-room', (roomId) => {
    // Validate user can join this room
    if (!canUserJoinRoom(socket.user, roomId)) {
      return socket.emit('error', { message: 'Access denied' });
    }

    socket.join(roomId);
    socket.to(roomId).emit('user-joined', {
      userId: socket.user.id,
      username: socket.user.name,
    });

    console.log(`User ${socket.user.id} joined room ${roomId}`);
  });

  // Leave a room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', {
      userId: socket.user.id,
    });
  });

  // Message to room
  socket.on('room-message', ({ roomId, message }) => {
    // Verify user is in room
    if (!socket.rooms.has(roomId)) {
      return socket.emit('error', { message: 'Not in room' });
    }

    const payload = {
      userId: socket.user.id,
      username: socket.user.name,
      message,
      timestamp: new Date().toISOString(),
    };

    io.to(roomId).emit('room-message', payload);
  });

  // Handle disconnect - leave all rooms
  socket.on('disconnect', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('user-left', {
          userId: socket.user.id,
        });
      }
    }
  });
});
```

## Horizontal Scaling with Redis Adapter

Single Socket.io server can't scale horizontally because clients connected to different servers can't communicate. The Redis adapter solves this:

```bash
npm install @socket.io/redis-adapter redis
```

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

async function setupSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Create Redis clients for pub/sub
  const pubClient = createClient({
    url: process.env.REDIS_URL,
  });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Use Redis adapter
  io.adapter(createAdapter(pubClient, subClient));

  return io;
}

// Now you can run multiple Socket.io servers
// All messages are broadcast via Redis pub/sub
```

### Sticky Sessions for Load Balancer

With multiple servers, clients must consistently connect to the same server (for HTTP polling fallback):

**NGINX Configuration:**

```nginx
upstream socketio {
    ip_hash;  # Sticky sessions based on client IP
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;

    location /socket.io/ {
        proxy_pass http://socketio;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeout
        proxy_read_timeout 86400;
    }
}
```

## Connection State Recovery

Handle reconnections gracefully:

```javascript
// Server
const io = new Server(httpServer, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true, // Skip auth on recovery
  },
});

io.on('connection', (socket) => {
  if (socket.recovered) {
    // Connection was recovered
    console.log(`User ${socket.user?.id} reconnected`);
    // Rooms are automatically restored
  } else {
    // New connection
    console.log('New connection');
  }
});
```

## Presence System

Track online users:

```javascript
// presence.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

class PresenceManager {
  constructor(io) {
    this.io = io;
    this.ONLINE_TTL = 60; // Seconds before considered offline
  }

  async setOnline(userId, socketId) {
    const key = `presence:${userId}`;
    await redis.hset(key, socketId, Date.now());
    await redis.expire(key, this.ONLINE_TTL);

    // Broadcast presence update
    this.io.emit('presence', { userId, status: 'online' });
  }

  async setOffline(userId, socketId) {
    const key = `presence:${userId}`;
    await redis.hdel(key, socketId);

    // Check if user has other connections
    const remaining = await redis.hlen(key);
    if (remaining === 0) {
      await redis.del(key);
      this.io.emit('presence', { userId, status: 'offline' });
    }
  }

  async isOnline(userId) {
    const key = `presence:${userId}`;
    const connections = await redis.hlen(key);
    return connections > 0;
  }

  async getOnlineUsers(userIds) {
    const pipeline = redis.pipeline();
    for (const userId of userIds) {
      pipeline.hlen(`presence:${userId}`);
    }

    const results = await pipeline.exec();
    return userIds.filter((_, i) => results[i][1] > 0);
  }

  // Heartbeat to refresh TTL
  async heartbeat(userId, socketId) {
    const key = `presence:${userId}`;
    await redis.hset(key, socketId, Date.now());
    await redis.expire(key, this.ONLINE_TTL);
  }
}

// Usage
const presence = new PresenceManager(io);

io.on('connection', async (socket) => {
  if (socket.user) {
    await presence.setOnline(socket.user.id, socket.id);

    // Heartbeat interval
    const heartbeatInterval = setInterval(() => {
      presence.heartbeat(socket.user.id, socket.id);
    }, 30000);

    socket.on('disconnect', async () => {
      clearInterval(heartbeatInterval);
      await presence.setOffline(socket.user.id, socket.id);
    });
  }
});
```

## Rate Limiting

Prevent message flooding:

```javascript
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.max = options.max || 100;
    this.clients = new Map();
  }

  isAllowed(clientId) {
    const now = Date.now();
    const client = this.clients.get(clientId) || { count: 0, resetAt: now + this.windowMs };

    if (now > client.resetAt) {
      client.count = 0;
      client.resetAt = now + this.windowMs;
    }

    if (client.count >= this.max) {
      return false;
    }

    client.count++;
    this.clients.set(clientId, client);
    return true;
  }
}

const rateLimiter = new RateLimiter({ windowMs: 60000, max: 60 });

io.on('connection', (socket) => {
  socket.use((packet, next) => {
    if (!rateLimiter.isAllowed(socket.id)) {
      return next(new Error('Rate limit exceeded'));
    }
    next();
  });

  socket.on('error', (err) => {
    if (err.message === 'Rate limit exceeded') {
      socket.emit('rate-limit', { retryAfter: 60 });
    }
  });
});
```

## Graceful Shutdown

```javascript
async function gracefulShutdown() {
  console.log('Shutting down Socket.io server...');

  // Notify clients
  io.emit('server-shutdown', { message: 'Server is restarting' });

  // Close all connections
  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    socket.disconnect(true);
  }

  // Close Redis connections
  await pubClient.quit();
  await subClient.quit();

  // Close HTTP server
  httpServer.close();

  console.log('Socket.io server shut down');
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## Monitoring and Metrics

```javascript
const prometheus = require('prom-client');

const connectedClients = new prometheus.Gauge({
  name: 'socketio_connected_clients',
  help: 'Number of connected Socket.io clients',
});

const messagesSent = new prometheus.Counter({
  name: 'socketio_messages_total',
  help: 'Total messages sent',
  labelNames: ['event'],
});

// Track connections
io.on('connection', (socket) => {
  connectedClients.inc();

  socket.onAny((event) => {
    messagesSent.inc({ event });
  });

  socket.on('disconnect', () => {
    connectedClients.dec();
  });
});

// Admin namespace for monitoring
const adminNamespace = io.of('/admin');

adminNamespace.use((socket, next) => {
  // Require admin auth
  if (socket.handshake.auth.adminKey !== process.env.ADMIN_KEY) {
    return next(new Error('Unauthorized'));
  }
  next();
});

adminNamespace.on('connection', (socket) => {
  socket.on('get-stats', async (callback) => {
    const sockets = await io.fetchSockets();
    const rooms = io.sockets.adapter.rooms;

    callback({
      connections: sockets.length,
      rooms: rooms.size,
    });
  });
});
```

## Summary

| Feature | Implementation |
|---------|----------------|
| **Basic setup** | socket.io with express |
| **Authentication** | JWT in handshake |
| **Rooms** | Channel-based messaging |
| **Scaling** | Redis adapter + sticky sessions |
| **Presence** | Redis-backed online tracking |
| **Rate limiting** | Per-socket message limits |
| **Shutdown** | Graceful disconnect notification |

Socket.io provides a robust foundation for real-time features in Node.js. With Redis adapter for scaling, proper authentication, and monitoring, you can build production-ready real-time applications that handle thousands of concurrent connections.
