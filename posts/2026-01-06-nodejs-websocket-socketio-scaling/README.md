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

This sets up a Socket.io server attached to an Express HTTP server. The configuration includes CORS for cross-origin connections and ping settings for connection health monitoring.

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
// Socket.io needs an HTTP server to attach to
const httpServer = createServer(app);

// Initialize Socket.io with configuration
const io = new Server(httpServer, {
  cors: {
    // Allow connections from these origins (frontend domains)
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,  // Allow cookies/auth headers
  },
  pingTimeout: 60000,   // How long to wait for ping response before disconnecting
  pingInterval: 25000,  // How often to send ping packets
});

// Handle new connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Listen for 'message' events from this client
  socket.on('message', (data) => {
    console.log('Message received:', data);
    // Broadcast to all OTHER connected clients (not the sender)
    socket.broadcast.emit('message', data);
  });

  // Handle disconnection - clean up resources
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

httpServer.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

### Client

The client automatically handles reconnection with exponential backoff. Configure transports to prefer WebSocket but fall back to HTTP polling if WebSocket is blocked.

```javascript
import { io } from 'socket.io-client';

// Connect to Socket.io server
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],  // Try WebSocket first, fall back to polling
  reconnection: true,                     // Auto-reconnect on disconnect
  reconnectionAttempts: 5,                // Max reconnection attempts
  reconnectionDelay: 1000,                // Start with 1s delay
  reconnectionDelayMax: 5000,             // Max 5s between attempts
});

// Connection established
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Receive messages from server or other clients
socket.on('message', (data) => {
  console.log('Message:', data);
});

// Connection lost
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // reason: 'io server disconnect', 'transport close', etc.
});

// Failed to connect
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Send message to server
socket.emit('message', { text: 'Hello!' });
```

## Authentication

### JWT Authentication

Use Socket.io middleware to authenticate connections before they're established. The middleware has access to the handshake data including auth tokens. Invalid tokens reject the connection.

```javascript
const jwt = require('jsonwebtoken');

// Authentication middleware - runs before connection is established
io.use((socket, next) => {
  // Get token from auth object or Authorization header
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication required'));  // Rejects connection
  }

  try {
    // Verify token and attach user data to socket
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;  // Available in all event handlers
    next();  // Allow connection
  } catch (error) {
    next(new Error('Invalid token'));  // Rejects connection
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.id} connected`);

  // Auto-join user to their personal room for direct messages
  socket.join(`user:${socket.user.id}`);

  // Join organization room for team-wide broadcasts
  if (socket.user.orgId) {
    socket.join(`org:${socket.user.orgId}`);
  }
});

// Helper: Send event to a specific user (wherever they're connected)
function sendToUser(userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

// Helper: Send event to all users in an organization
function sendToOrg(orgId, event, data) {
  io.to(`org:${orgId}`).emit(event, data);
}
```

### Client with Authentication

Pass the JWT token in the auth object when connecting. Handle token expiration by refreshing and reconnecting.

```javascript
// Connect with authentication token
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('accessToken'),  // Sent with handshake
  },
});

// Handle authentication errors (token expired or invalid)
socket.on('connect_error', async (error) => {
  if (error.message === 'Invalid token') {
    // Token expired - refresh it
    const newToken = await refreshAccessToken();
    socket.auth.token = newToken;  // Update token for next connection
    socket.connect();               // Retry connection
  }
});
```

## Rooms for Channels

Rooms allow grouping sockets for targeted broadcasting. Use them for chat channels, document collaboration, or any feature where messages go to a subset of connected users.

```javascript
io.on('connection', (socket) => {
  // Join a chat room (e.g., chat channel, document, game)
  socket.on('join-room', (roomId) => {
    // Always validate permissions before allowing room join
    if (!canUserJoinRoom(socket.user, roomId)) {
      return socket.emit('error', { message: 'Access denied' });
    }

    // Join the room
    socket.join(roomId);

    // Notify other room members (not the joining user)
    socket.to(roomId).emit('user-joined', {
      userId: socket.user.id,
      username: socket.user.name,
    });

    console.log(`User ${socket.user.id} joined room ${roomId}`);
  });

  // Leave a room explicitly
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    // Notify remaining room members
    socket.to(roomId).emit('user-left', {
      userId: socket.user.id,
    });
  });

  // Send message to a room
  socket.on('room-message', ({ roomId, message }) => {
    // Security: verify sender is actually in the room
    if (!socket.rooms.has(roomId)) {
      return socket.emit('error', { message: 'Not in room' });
    }

    const payload = {
      userId: socket.user.id,
      username: socket.user.name,
      message,
      timestamp: new Date().toISOString(),
    };

    // Send to all room members INCLUDING the sender
    io.to(roomId).emit('room-message', payload);
  });

  // Clean up on disconnect - notify all rooms
  socket.on('disconnect', () => {
    for (const room of socket.rooms) {
      // Skip the default room (socket's own ID)
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

A single Socket.io server cannot scale horizontally because clients connected to different servers cannot communicate with each other. The Redis adapter uses pub/sub to relay messages between servers, enabling true horizontal scaling.

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

  // Create two Redis clients: one for publishing, one for subscribing
  // This is required because a Redis client in subscribe mode cannot publish
  const pubClient = createClient({
    url: process.env.REDIS_URL,
  });
  const subClient = pubClient.duplicate();  // Clone with same config

  // Connect both clients
  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Attach Redis adapter - all io.emit() calls now go through Redis
  io.adapter(createAdapter(pubClient, subClient));

  return io;
}

// With Redis adapter, you can run multiple Socket.io servers
// A message emitted on Server A reaches clients connected to Server B
// This works because all servers subscribe to the same Redis channels
```

### Sticky Sessions for Load Balancer

Socket.io starts with HTTP polling then upgrades to WebSocket. Both requests must reach the same server or the upgrade fails. Use sticky sessions (session affinity) to route all requests from a client to the same backend.

**NGINX Configuration:**

```nginx
# Define upstream servers with sticky sessions
upstream socketio {
    ip_hash;  # Route based on client IP - same IP always goes to same server
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;

    # Handle Socket.io traffic
    location /socket.io/ {
        proxy_pass http://socketio;

        # Required for WebSocket upgrade
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forward client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Keep WebSocket connections alive for 24 hours
        proxy_read_timeout 86400;
    }
}
```

## Connection State Recovery

Socket.io 4.6+ supports automatic state recovery after brief disconnections. The server remembers room memberships and pending messages, restoring state when the client reconnects.

```javascript
// Server - enable connection state recovery
const io = new Server(httpServer, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // Recover connections up to 2 minutes old
    skipMiddlewares: true, // Skip auth middleware on recovery (already validated)
  },
});

io.on('connection', (socket) => {
  if (socket.recovered) {
    // Client reconnected within the recovery window
    // Room memberships are automatically restored
    console.log(`User ${socket.user?.id} reconnected`);
    // Any messages emitted during disconnection are delivered now
  } else {
    // Brand new connection - run normal setup
    console.log('New connection');
  }
});
```

## Presence System

Track which users are online across multiple servers. Store presence in Redis so any server can check user status. Handle users with multiple connections (multiple tabs/devices).

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
