# How to Build a Server-Sent Events Endpoint with Express.js on Cloud Run for Real-Time Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, SSE, Express, Node.js, Real-Time, Google Cloud

Description: Build a Server-Sent Events endpoint with Express.js on Cloud Run to push real-time updates to browser clients without WebSocket complexity.

---

Server-Sent Events (SSE) is one of those browser APIs that does not get enough attention. While WebSockets get all the hype, SSE is simpler, uses standard HTTP, works through most proxies and load balancers without special configuration, and is perfectly suited for one-way real-time updates from server to client.

On Cloud Run, SSE works out of the box without session affinity or special protocols. Cloud Run supports HTTP streaming, which is exactly what SSE needs. In this post, I will show you how to build an SSE endpoint with Express.js, handle reconnections, manage multiple clients, and deploy it to Cloud Run.

## How SSE Works

SSE is built on top of regular HTTP. The server responds with `Content-Type: text/event-stream` and keeps the connection open, writing events in a specific text format. The browser's `EventSource` API handles reconnection automatically. Each event looks like this:

```
event: message
data: {"text": "Hello, world!"}
id: 1

```

The blank line at the end signals the end of an event. The `id` field lets the client track where it left off for reconnection.

## Basic SSE Endpoint

```javascript
// app.js - Express server with SSE endpoint
const express = require('express');
const app = express();
app.use(express.json());

// Store connected clients
const clients = new Set();

// SSE endpoint - clients connect here to receive events
app.get('/events', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    // Allow cross-origin if needed
    'Access-Control-Allow-Origin': '*',
  });

  // Send an initial comment to establish the connection
  // Comments start with a colon and are ignored by EventSource
  res.write(':connected\n\n');

  // Add this client to the set
  clients.add(res);
  console.log(`Client connected. Total clients: ${clients.size}`);

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(res);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
  });
});

// Helper function to send an event to a specific client
function sendEvent(res, event, data, id = null) {
  let message = '';
  if (id) message += `id: ${id}\n`;
  if (event) message += `event: ${event}\n`;
  message += `data: ${JSON.stringify(data)}\n\n`;

  res.write(message);
}

// Broadcast an event to all connected clients
function broadcast(event, data) {
  const id = Date.now().toString();
  clients.forEach((client) => {
    sendEvent(client, event, data, id);
  });
}
```

## Adding an API to Trigger Events

Create endpoints that trigger events to all connected clients.

```javascript
// API endpoint that triggers a broadcast
app.post('/api/notifications', (req, res) => {
  const { title, message, severity } = req.body;

  broadcast('notification', {
    title,
    message,
    severity: severity || 'info',
    timestamp: new Date().toISOString(),
  });

  res.json({
    status: 'sent',
    clientCount: clients.size,
  });
});

// Simulate order status updates
app.post('/api/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status, note } = req.body;

  broadcast('order-update', {
    orderId,
    status,
    note,
    timestamp: new Date().toISOString(),
  });

  res.json({ orderId, status });
});
```

## Channel-Based Subscriptions

Instead of broadcasting to everyone, let clients subscribe to specific channels.

```javascript
// Channel-based SSE with selective broadcasting
const channels = new Map();

app.get('/events/:channel', (req, res) => {
  const { channel } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(':connected\n\n');

  // Add to channel-specific set
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel).add(res);

  console.log(`Client joined channel ${channel}. Subscribers: ${channels.get(channel).size}`);

  req.on('close', () => {
    const channelClients = channels.get(channel);
    if (channelClients) {
      channelClients.delete(res);
      if (channelClients.size === 0) {
        channels.delete(channel);
      }
    }
    console.log(`Client left channel ${channel}`);
  });
});

// Broadcast to a specific channel
function broadcastToChannel(channel, event, data) {
  const channelClients = channels.get(channel);
  if (!channelClients) return 0;

  const id = Date.now().toString();
  channelClients.forEach((client) => {
    sendEvent(client, event, data, id);
  });

  return channelClients.size;
}

// Send an update to a specific order's channel
app.post('/api/orders/:orderId/update', (req, res) => {
  const { orderId } = req.params;
  const { status, details } = req.body;

  const sent = broadcastToChannel(`order-${orderId}`, 'status', {
    orderId,
    status,
    details,
    timestamp: new Date().toISOString(),
  });

  res.json({ sent, orderId, status });
});
```

## Client-Side Implementation

Here is how to consume the SSE endpoint from the browser.

```javascript
// Browser client for SSE
class EventClient {
  constructor(url) {
    this.url = url;
    this.handlers = {};
    this.connect();
  }

  connect() {
    // EventSource handles reconnection automatically
    this.source = new EventSource(this.url);

    // Default message handler
    this.source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (this.handlers['message']) {
        this.handlers['message'](data);
      }
    };

    // Connection opened
    this.source.onopen = () => {
      console.log('SSE connected');
    };

    // Connection error or closed
    this.source.onerror = (error) => {
      console.log('SSE error, will auto-reconnect');
    };
  }

  // Listen for specific event types
  on(eventType, handler) {
    this.handlers[eventType] = handler;
    this.source.addEventListener(eventType, (event) => {
      handler(JSON.parse(event.data));
    });
  }

  close() {
    this.source.close();
  }
}

// Usage
const events = new EventClient('/events/order-ORD-123');
events.on('status', (data) => {
  console.log('Order update:', data);
  updateOrderUI(data);
});
events.on('notification', (data) => {
  showNotification(data.title, data.message);
});
```

## Heartbeat to Keep Connections Alive

Cloud Run has a request timeout (configurable up to 60 minutes). Send periodic heartbeats to keep connections alive and detect dead clients.

```javascript
// Send heartbeats to keep connections alive
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(':connected\n\n');
  clients.add(res);

  // Send periodic heartbeat comments
  // Comments (lines starting with :) are ignored by EventSource
  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n');
    } catch (error) {
      // Client disconnected
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, HEARTBEAT_INTERVAL);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});
```

## Reconnection with Last-Event-ID

When a client reconnects (which `EventSource` does automatically), it sends the `Last-Event-ID` header. You can use this to replay missed events.

```javascript
// Event history for replay on reconnection
const eventHistory = [];
const MAX_HISTORY = 1000;

function recordAndBroadcast(event, data) {
  const id = Date.now().toString();

  // Store in history
  eventHistory.push({ id, event, data, timestamp: Date.now() });
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift();
  }

  // Broadcast to current clients
  clients.forEach((client) => {
    sendEvent(client, event, data, id);
  });
}

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Check if client is reconnecting with a Last-Event-ID
  const lastEventId = req.headers['last-event-id'];
  if (lastEventId) {
    // Replay missed events
    const missedEvents = eventHistory.filter(
      (e) => parseInt(e.id) > parseInt(lastEventId)
    );

    console.log(`Replaying ${missedEvents.length} missed events`);
    missedEvents.forEach((e) => {
      sendEvent(res, e.event, e.data, e.id);
    });
  }

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});
```

## Deploying to Cloud Run

```bash
# Deploy with streaming support
gcloud run deploy sse-service \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 3600 \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 1000 \
  --memory 256Mi
```

Important settings:

- `--timeout 3600`: Allows connections up to 1 hour
- `--concurrency 1000`: SSE connections are lightweight, so a single instance can handle many
- `--min-instances 1`: Avoid cold starts for real-time features

## Starting the Server

```javascript
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`SSE server running on port ${PORT}`);
});
```

SSE on Cloud Run is a practical choice for real-time updates that flow in one direction - from server to client. It is simpler to implement than WebSockets, works through standard HTTP infrastructure, and the browser's `EventSource` API handles reconnection automatically. For dashboards, notification feeds, live status pages, and similar features, SSE is often all you need.
