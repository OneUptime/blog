# How to Implement WebSocket Connections in a Node.js Application on Cloud Run with Session Affinity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, WebSocket, Node.js, Real-Time, Google Cloud

Description: Learn how to implement WebSocket connections in Node.js on Cloud Run using session affinity to maintain persistent connections across multiple instances.

---

WebSocket support on Cloud Run has been available since 2021, but making it work reliably with multiple instances requires understanding session affinity. When you have multiple Cloud Run instances running, a WebSocket connection needs to stay pinned to the same instance for its entire lifetime. Without session affinity, the load balancer might route subsequent requests to a different instance, breaking the connection.

In this guide, I will walk through building a WebSocket server with Node.js on Cloud Run, enabling session affinity, and handling the common pitfalls that come with WebSockets on serverless platforms.

## Understanding Session Affinity on Cloud Run

Cloud Run can route requests to any available instance. For regular HTTP request-response cycles, this is fine. But WebSocket connections are long-lived - once the initial HTTP upgrade handshake completes, the connection persists as a bidirectional channel. Session affinity tells Cloud Run's load balancer to route subsequent connections from the same client to the same instance.

Cloud Run uses a cookie-based affinity mechanism. When a client first connects, Cloud Run sets a cookie that identifies the instance. The client sends this cookie with subsequent requests, and the load balancer routes to the correct instance.

## Setting Up the Project

```bash
# Initialize project and install dependencies
mkdir websocket-cloud-run && cd websocket-cloud-run
npm init -y
npm install express ws
```

## Building the WebSocket Server

```javascript
// server.js - WebSocket server with Express on Cloud Run
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

// Create a WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({
  server,
  // Verify the upgrade request before accepting
  verifyClient: (info, callback) => {
    // Add authentication logic here if needed
    // info.req contains the HTTP upgrade request
    callback(true);
  },
});

// Track connected clients
const clients = new Map();

wss.on('connection', (ws, req) => {
  // Generate a unique ID for this connection
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`Client connected: ${clientId}`);
  clients.set(clientId, ws);

  // Send a welcome message with the client ID
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    instanceId: process.env.K_REVISION || 'local',
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Message from ${clientId}:`, message);

      // Echo back with a timestamp
      ws.send(JSON.stringify({
        type: 'echo',
        originalMessage: message,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Invalid message format:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  // Handle disconnection
  ws.on('close', (code, reason) => {
    console.log(`Client disconnected: ${clientId}, code: ${code}`);
    clients.delete(clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${clientId}:`, error);
    clients.delete(clientId);
  });

  // Set up a ping interval to keep the connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Ping every 30 seconds

  ws.on('close', () => clearInterval(pingInterval));
});

// Health check endpoint for Cloud Run
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    connectedClients: clients.size,
    instance: process.env.K_REVISION || 'local',
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## Implementing a Chat Room Example

Let's build something more practical - a chat room with multiple rooms.

```javascript
// rooms.js - Chat room management
const rooms = new Map();

function joinRoom(roomId, clientId, ws) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }

  const room = rooms.get(roomId);
  room.set(clientId, ws);

  // Notify everyone in the room
  broadcastToRoom(roomId, {
    type: 'user_joined',
    clientId,
    roomId,
    userCount: room.size,
  }, clientId);

  return room.size;
}

function leaveRoom(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.delete(clientId);

  if (room.size === 0) {
    rooms.delete(roomId);
  } else {
    broadcastToRoom(roomId, {
      type: 'user_left',
      clientId,
      roomId,
      userCount: room.size,
    });
  }
}

function broadcastToRoom(roomId, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = JSON.stringify(message);
  room.forEach((ws, clientId) => {
    if (clientId !== excludeClientId && ws.readyState === 1) {
      ws.send(payload);
    }
  });
}

module.exports = { joinRoom, leaveRoom, broadcastToRoom, rooms };
```

```javascript
// Enhanced message handler with room support
const { joinRoom, leaveRoom, broadcastToRoom } = require('./rooms');

wss.on('connection', (ws, req) => {
  const clientId = `client-${Date.now()}`;
  let currentRoom = null;

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'join':
        // Leave current room if in one
        if (currentRoom) leaveRoom(currentRoom, clientId);

        currentRoom = message.roomId;
        const userCount = joinRoom(currentRoom, clientId, ws);
        ws.send(JSON.stringify({
          type: 'joined',
          roomId: currentRoom,
          userCount,
        }));
        break;

      case 'message':
        if (!currentRoom) {
          ws.send(JSON.stringify({ type: 'error', message: 'Join a room first' }));
          return;
        }
        // Broadcast message to everyone in the room
        broadcastToRoom(currentRoom, {
          type: 'message',
          clientId,
          text: message.text,
          timestamp: new Date().toISOString(),
        });
        break;

      case 'leave':
        if (currentRoom) {
          leaveRoom(currentRoom, clientId);
          currentRoom = null;
        }
        break;
    }
  });

  ws.on('close', () => {
    if (currentRoom) leaveRoom(currentRoom, clientId);
  });
});
```

## Handling Cloud Run Timeouts

Cloud Run has a maximum request timeout (up to 60 minutes for HTTP streaming). WebSocket connections that exceed this timeout will be terminated. You need to handle reconnection on the client side.

```javascript
// client.js - Browser WebSocket client with reconnection logic
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.maxRetries = options.maxRetries || 10;
    this.retryDelay = options.retryDelay || 1000;
    this.retryCount = 0;
    this.handlers = {};

    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.retryCount = 0; // Reset on successful connection
      if (this.handlers.open) this.handlers.open();
    };

    this.ws.onmessage = (event) => {
      if (this.handlers.message) this.handlers.message(JSON.parse(event.data));
    };

    this.ws.onclose = (event) => {
      console.log(`Disconnected: code ${event.code}`);

      // Reconnect with exponential backoff
      if (this.retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, this.retryCount);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount + 1})`);
        this.retryCount++;
        setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }
}
```

## Enabling Session Affinity

Deploy to Cloud Run with session affinity enabled.

```bash
# Deploy with session affinity for WebSocket support
gcloud run deploy websocket-service \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 3600 \
  --session-affinity \
  --min-instances 1 \
  --max-instances 10 \
  --memory 256Mi
```

The critical flags are:

- `--session-affinity`: Routes subsequent requests from the same client to the same instance
- `--timeout 3600`: Allows connections to stay open for up to 1 hour
- `--min-instances 1`: Keeps at least one instance warm to avoid cold start delays

## Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Cloud Run uses PORT environment variable
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
```

## Important Limitations

There are a few things to know about WebSockets on Cloud Run:

- Maximum connection duration is limited by the request timeout (up to 60 minutes)
- When Cloud Run scales down, active connections will be terminated
- Session affinity is best-effort - during scaling events, affinity may break
- Each Cloud Run instance has a maximum number of concurrent connections (based on the concurrency setting)
- There is no cross-instance communication built in - if you need to broadcast across instances, use Pub/Sub or Redis

## Graceful Shutdown

Handle Cloud Run's SIGTERM signal to close WebSocket connections cleanly.

```javascript
// Gracefully close all connections on shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections');

  // Notify all clients that the server is shutting down
  clients.forEach((ws, clientId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'server_shutdown' }));
      ws.close(1001, 'Server shutting down');
    }
  });

  // Close the server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => process.exit(0), 10000);
});
```

WebSockets on Cloud Run work well for many real-time use cases as long as you plan for the session affinity behavior and handle reconnection on the client side. For applications that need guaranteed cross-instance messaging, consider pairing WebSockets with a Pub/Sub backend to fan out messages across all instances.
