# How to Use App Engine Flexible Environment with WebSockets for Real-Time Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, WebSockets, Real-Time, Flexible Environment

Description: Build real-time applications on App Engine Flexible Environment using WebSockets with practical examples for chat, live updates, and notification systems.

---

App Engine Standard does not support WebSockets because its request model is designed for short-lived HTTP request-response cycles. If you need persistent, bidirectional connections for real-time features like live chat, collaborative editing, or streaming dashboards, App Engine Flexible Environment is the way to go. Flex runs your application in Docker containers on Compute Engine VMs, which means long-lived connections work just fine.

In this guide, I will walk through building a real-time application on App Engine Flex with WebSockets, covering the server setup, scaling considerations, and session management.

## Why App Engine Flex for WebSockets

App Engine Flex handles WebSocket connections because it does not have the same request timeout constraints as Standard. Each Flex instance can maintain persistent connections for as long as the client stays connected. The load balancer in front of Flex supports WebSocket protocol upgrades, and connections can stay open for up to 24 hours.

## Setting Up the Server - Node.js with ws

Here is a Node.js WebSocket server using the `ws` library:

```javascript
// server.js - WebSocket server for App Engine Flex
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

// Create WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ server });

// Track connected clients
const clients = new Map();

wss.on("connection", (ws, req) => {
  // Generate a unique client ID
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  clients.set(clientId, ws);

  console.log(`Client connected: ${clientId}. Total clients: ${clients.size}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: "connected",
    clientId: clientId,
    message: "Welcome to the real-time server"
  }));

  // Handle incoming messages
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientId, message);
    } catch (err) {
      console.error("Invalid message format:", err.message);
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}. Total clients: ${clients.size}`);
  });

  // Handle errors
  ws.on("error", (err) => {
    console.error(`WebSocket error for ${clientId}:`, err.message);
    clients.delete(clientId);
  });

  // Keep the connection alive with periodic pings
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Ping every 30 seconds
});

function handleMessage(clientId, message) {
  switch (message.type) {
    case "broadcast":
      // Send message to all connected clients
      broadcastMessage(clientId, message.data);
      break;
    case "direct":
      // Send message to a specific client
      sendToClient(message.targetId, message.data);
      break;
    default:
      console.log(`Unknown message type: ${message.type}`);
  }
}

function broadcastMessage(senderId, data) {
  const payload = JSON.stringify({
    type: "broadcast",
    senderId: senderId,
    data: data,
    timestamp: Date.now()
  });

  // Send to all connected clients except the sender
  clients.forEach((ws, id) => {
    if (id !== senderId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function sendToClient(targetId, data) {
  const targetWs = clients.get(targetId);
  if (targetWs && targetWs.readyState === WebSocket.OPEN) {
    targetWs.send(JSON.stringify({ type: "direct", data: data }));
  }
}

// Regular HTTP endpoints still work alongside WebSockets
app.get("/", (req, res) => {
  res.json({
    status: "running",
    connectedClients: clients.size
  });
});

app.get("/_ah/health", (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## Setting Up the Server - Python with websockets

For Python applications, use the `websockets` library with `asyncio`:

```python
# server.py - Python WebSocket server for App Engine Flex
import asyncio
import websockets
import json
import os
from aiohttp import web

# Track connected clients
connected_clients = {}

async def websocket_handler(websocket, path):
    """Handle WebSocket connections."""
    client_id = f"client-{id(websocket)}"
    connected_clients[client_id] = websocket

    try:
        # Send welcome message
        await websocket.send(json.dumps({
            "type": "connected",
            "clientId": client_id
        }))

        # Listen for messages
        async for message in websocket:
            data = json.loads(message)
            await handle_message(client_id, data)

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        # Clean up on disconnect
        del connected_clients[client_id]

async def handle_message(sender_id, message):
    """Process incoming WebSocket messages."""
    if message.get("type") == "broadcast":
        payload = json.dumps({
            "type": "broadcast",
            "senderId": sender_id,
            "data": message["data"]
        })
        # Send to all other connected clients
        tasks = []
        for cid, ws in connected_clients.items():
            if cid != sender_id:
                tasks.append(ws.send(payload))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

# Run the WebSocket server
port = int(os.environ.get("PORT", 8080))
start_server = websockets.serve(websocket_handler, "0.0.0.0", port)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
```

## App Engine Flex Configuration

Configure your `app.yaml` for WebSocket support:

```yaml
# app.yaml - App Engine Flex with WebSocket support
runtime: custom
env: flex

# Use session affinity so WebSocket connections stick to the same instance
network:
  session_affinity: true

resources:
  cpu: 1
  memory_gb: 1
  disk_size_gb: 10

automatic_scaling:
  min_num_instances: 2    # At least 2 for high availability
  max_num_instances: 10
  cool_down_period_sec: 120
  cpu_utilization:
    target_utilization: 0.6

liveness_check:
  path: "/_ah/health"
  check_interval_sec: 30
  timeout_sec: 4
  failure_threshold: 4
  success_threshold: 2

readiness_check:
  path: "/_ah/health"
  check_interval_sec: 5
  timeout_sec: 4
  failure_threshold: 2
  success_threshold: 2
  app_start_timeout_sec: 300

env_variables:
  NODE_ENV: "production"
```

The `session_affinity: true` setting is important. It ensures that once a client establishes a WebSocket connection to an instance, subsequent HTTP requests from the same client go to the same instance. Without this, reconnection attempts might hit a different instance.

## Dockerfile for the Custom Runtime

```dockerfile
# Dockerfile - Node.js WebSocket server
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY server.js ./

ENV PORT=8080
EXPOSE 8080

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "server.js"]
```

## Handling Multiple Instances with Pub/Sub

When you have multiple Flex instances, each instance only knows about its own connected clients. If client A is on instance 1 and client B is on instance 2, a broadcast from client A will not reach client B because they are on different instances.

Solve this with Pub/Sub as a message bus between instances:

```javascript
// pubsub-bridge.js - Bridge WebSocket messages across instances
const { PubSub } = require("@google-cloud/pubsub");

const pubsub = new PubSub();
const TOPIC_NAME = "websocket-messages";
const SUBSCRIPTION_NAME = `ws-instance-${process.env.GAE_INSTANCE || "local"}`;

let subscription;

async function initPubSub() {
  // Get or create the topic
  const [topic] = await pubsub.topic(TOPIC_NAME).get({ autoCreate: true });

  // Create a unique subscription for this instance
  try {
    [subscription] = await topic.createSubscription(SUBSCRIPTION_NAME);
  } catch (err) {
    // Subscription might already exist
    [subscription] = await topic.subscription(SUBSCRIPTION_NAME).get();
  }

  // Listen for messages from other instances
  subscription.on("message", (msg) => {
    const data = JSON.parse(msg.data.toString());

    // Skip messages we published ourselves
    if (data.sourceInstance === process.env.GAE_INSTANCE) {
      msg.ack();
      return;
    }

    // Deliver to local clients
    deliverToLocalClients(data);
    msg.ack();
  });
}

async function publishMessage(messageData) {
  // Add source instance identifier
  const data = {
    ...messageData,
    sourceInstance: process.env.GAE_INSTANCE || "local"
  };

  const topic = pubsub.topic(TOPIC_NAME);
  await topic.publish(Buffer.from(JSON.stringify(data)));
}

function deliverToLocalClients(data) {
  // Send to all local clients that should receive this message
  const payload = JSON.stringify({
    type: data.type,
    senderId: data.senderId,
    data: data.data
  });

  clients.forEach((ws, id) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

module.exports = { initPubSub, publishMessage };
```

Update the broadcast function to publish through Pub/Sub:

```javascript
// Updated broadcast that works across multiple instances
async function broadcastMessage(senderId, data) {
  // Deliver to local clients immediately
  const payload = JSON.stringify({
    type: "broadcast",
    senderId: senderId,
    data: data,
    timestamp: Date.now()
  });

  clients.forEach((ws, id) => {
    if (id !== senderId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });

  // Publish to Pub/Sub for other instances
  await publishMessage({
    type: "broadcast",
    senderId: senderId,
    data: data
  });
}
```

## Client-Side WebSocket Code

Here is a browser client with automatic reconnection:

```javascript
// client.js - WebSocket client with reconnection logic
class RealtimeClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.listeners = new Map();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("Connected to server");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Notify registered listeners
      const handlers = this.listeners.get(message.type) || [];
      handlers.forEach(handler => handler(message));
    };

    this.ws.onclose = () => {
      console.log("Disconnected from server");
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      // Exponential backoff: 1s, 2s, 4s, 8s, ...
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      this.reconnectAttempts++;
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    }
  }

  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  on(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(handler);
  }
}

// Usage
const client = new RealtimeClient("wss://your-project.appspot.com");
client.on("broadcast", (msg) => console.log("Broadcast:", msg.data));
client.connect();
```

## Connection Limits and Monitoring

Each Flex instance can handle thousands of concurrent WebSocket connections, limited mainly by memory. Monitor connection counts and set alerts:

```javascript
// Expose metrics endpoint for monitoring
app.get("/metrics", (req, res) => {
  res.json({
    connectedClients: clients.size,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    instanceId: process.env.GAE_INSTANCE || "unknown"
  });
});
```

## Summary

App Engine Flexible Environment supports WebSockets natively through its custom runtime capability. Set `session_affinity: true` in your `app.yaml` to keep clients connected to the same instance. For multi-instance deployments, use Pub/Sub or Redis as a message bus to broadcast messages across instances. Implement heartbeat pings to detect stale connections, and build reconnection logic into your clients. The combination of Flex's long-lived connections and automatic scaling gives you a solid foundation for real-time applications.
