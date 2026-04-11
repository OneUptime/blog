# How to Build a Real-Time Notification System in Node.js with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Pub/Sub, Real-Time, Notification, WebSocket

Description: Learn how to build a scalable real-time notification system in Node.js using Redis Pub/Sub and WebSockets to push events to connected clients instantly.

---

## Architecture Overview

A real-time notification system needs two components:
1. **A way to receive events** - from your application services (new orders, messages, alerts)
2. **A way to push to clients** - WebSockets or Server-Sent Events to connected browsers

Redis Pub/Sub acts as the message bus between your services and your notification server. Any service can publish a notification to Redis, and all connected clients subscribed to that channel receive it instantly.

```text
[Service A] --> PUBLISH --> [Redis] --> SUBSCRIBE --> [Notification Server] --> [WebSocket] --> [Browser]
[Service B] --> PUBLISH --> [Redis]
```

## Installing Dependencies

```bash
npm install express socket.io ioredis
```

## Setting Up the Notification Server

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Separate Redis clients for pub and sub
const publisher = new Redis({ host: 'localhost', port: 6379 });
const subscriber = new Redis({ host: 'localhost', port: 6379 });

// Map userId -> Set of socket IDs
const userSockets = new Map();

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Client authenticates and registers for notifications
  socket.on('register', (userId) => {
    socket.userId = userId;

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);
    console.log(`User ${userId} registered (socket: ${socket.id})`);
  });

  socket.on('disconnect', () => {
    if (socket.userId && userSockets.has(socket.userId)) {
      userSockets.get(socket.userId).delete(socket.id);
      if (userSockets.get(socket.userId).size === 0) {
        userSockets.delete(socket.userId);
      }
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Subscribe to Redis notification channels
subscriber.subscribe('notifications:global', 'notifications:user', (err, count) => {
  if (err) {
    console.error('Subscribe error:', err);
    return;
  }
  console.log(`Subscribed to ${count} channels`);
});

// Route Redis messages to WebSocket clients
subscriber.on('message', (channel, message) => {
  const notification = JSON.parse(message);

  if (channel === 'notifications:global') {
    // Broadcast to all connected clients
    io.emit('notification', notification);

  } else if (channel === 'notifications:user') {
    // Send to specific user
    const { userId, ...data } = notification;
    io.to(`user:${userId}`).emit('notification', data);
  }
});

server.listen(3000, () => {
  console.log('Notification server running on port 3000');
});
```

## Publishing Notifications from Other Services

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

// Send a global notification (e.g., system maintenance warning)
async function broadcastNotification(message, type = 'info') {
  const notification = {
    id: Date.now().toString(),
    type,
    message,
    timestamp: new Date().toISOString()
  };
  await redis.publish('notifications:global', JSON.stringify(notification));
  console.log('Broadcast notification sent:', notification.id);
}

// Send a notification to a specific user
async function notifyUser(userId, notification) {
  const payload = {
    userId,
    id: Date.now().toString(),
    ...notification,
    timestamp: new Date().toISOString()
  };
  await redis.publish('notifications:user', JSON.stringify(payload));
  console.log(`Notification sent to user ${userId}`);
}

// Usage examples
broadcastNotification('System maintenance in 30 minutes', 'warning');

notifyUser(1001, {
  type: 'order_shipped',
  title: 'Your order has shipped',
  message: 'Order #4892 is on the way',
  data: { orderId: '4892', trackingNumber: 'UPS123456' }
});
```

## Client-Side JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Notifications Demo</title>
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
  <div id="notifications"></div>
  <script>
    const socket = io('http://localhost:3000');
    const userId = 1001; // Get from your auth system

    // Register for user-specific notifications
    socket.on('connect', () => {
      socket.emit('register', userId);
      console.log('Connected and registered for notifications');
    });

    // Handle incoming notifications
    socket.on('notification', (notification) => {
      const div = document.getElementById('notifications');
      const item = document.createElement('div');
      item.className = `notification notification-${notification.type}`;
      item.textContent = `[${notification.type}] ${notification.message || notification.title}`;
      div.prepend(item);

      // Auto-remove after 5 seconds
      setTimeout(() => item.remove(), 5000);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from notification server');
    });
  </script>
</body>
</html>
```

## Persisting Undelivered Notifications

For users who are offline, persist notifications in Redis lists:
```javascript
async function notifyUser(userId, notification) {
  const payload = JSON.stringify({
    id: Date.now().toString(),
    ...notification,
    timestamp: new Date().toISOString()
  });

  // Always store notification (for offline users)
  const storageKey = `user:${userId}:notifications`;
  await publisher.lpush(storageKey, payload);
  await publisher.ltrim(storageKey, 0, 99); // Keep last 100
  await publisher.expire(storageKey, 30 * 24 * 3600); // Expire after 30 days

  // Also publish for real-time delivery
  await publisher.publish('notifications:user', JSON.stringify({ userId, ...JSON.parse(payload) }));
}

// Fetch unread notifications when user comes online
app.get('/api/notifications/:userId', async (req, res) => {
  const key = `user:${req.params.userId}:notifications`;
  const items = await publisher.lrange(key, 0, 49); // Last 50
  const notifications = items.map(item => JSON.parse(item));
  res.json({ notifications });
});
```

## Scaling Across Multiple Servers

When running multiple notification servers, use Socket.IO Redis adapter so that messages published to Redis reach clients connected to any server:

```bash
npm install @socket.io/redis-adapter
```

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

const pubClient = new Redis({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

Now `io.to('user:1001').emit(...)` delivers to the right socket even if that user is connected to a different server instance.

## Summary

A Redis Pub/Sub backed notification system delivers real-time events from any service to connected clients through a WebSocket layer. Use separate pub and sub Redis clients, route messages to specific users via Socket.IO rooms, and persist notifications for offline users in Redis lists. Scale horizontally by adding the Socket.IO Redis adapter, which routes messages to the correct server instance automatically.
