# How to Build Express.js WebSocket Server with Redis Adapter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Express, WebSocket, Socket.IO, Node.js

Description: Scale Socket.io across multiple Express.js instances using the Redis adapter so messages broadcast to all connected clients regardless of which server they are on.

---

When you run multiple instances of a Socket.io server, a message emitted on one instance reaches only clients connected to that instance. The Redis adapter routes messages through Redis Pub/Sub so every instance forwards them to its own connected clients.

## Install Dependencies

```bash
npm install express socket.io @socket.io/redis-adapter redis
```

## Configure the Redis Adapter

```javascript
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Create pub/sub clients - each needs a dedicated connection
const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});
```

## Handle Socket Events

```javascript
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a room
  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`${socket.id} joined ${room}`);
  });

  // Broadcast to a room - reaches ALL instances
  socket.on("send-message", ({ room, message }) => {
    io.to(room).emit("new-message", {
      from: socket.id,
      message,
      timestamp: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
```

## REST Endpoint to Emit Events

```javascript
app.post("/broadcast", express.json(), (req, res) => {
  const { room, event, data } = req.body;
  io.to(room).emit(event, data);
  res.json({ sent: true });
});
```

With the Redis adapter, this emit reaches clients on all server instances.

## Client-Side JavaScript

```javascript
const socket = io("http://localhost:3000");

socket.emit("join-room", "general");

socket.on("new-message", (data) => {
  console.log(`${data.from}: ${data.message}`);
});

socket.emit("send-message", { room: "general", message: "Hello everyone!" });
```

## Verify Adapter Channels

```bash
redis-cli pubsub channels "socket.io*"
redis-cli pubsub numsub "socket.io#/#"
```

## Scale with Multiple Instances

```bash
PORT=3001 node server.js &
PORT=3002 node server.js &
PORT=3003 node server.js &
```

A client connected to port 3001 and another on port 3002 will both receive broadcasts because the Redis adapter relays messages between instances.

## Summary

The Socket.io Redis adapter enables horizontal scaling of WebSocket servers by routing all Pub/Sub events through Redis. Each server instance maintains its own Socket.io connections but delegates cross-instance communication to Redis channels. This requires two dedicated Redis connections per instance (publish and subscribe) and no changes to application-level socket event handlers.
