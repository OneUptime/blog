# How to Use SSE vs WebSockets for Real-Time Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSE, WebSockets, Real-time, Event Stream, HTTP

Description: Learn when to use Server-Sent Events vs WebSockets for real-time applications, including implementation examples and performance considerations.

---

> Choose SSE when data flows one way (server to client). Choose WebSockets when both sides need to talk. The simplest solution that works is usually the right one.

Real-time communication is essential for modern web applications - from live dashboards and notifications to collaborative editing and chat. Two dominant technologies enable this: Server-Sent Events (SSE) and WebSockets. This guide breaks down when to use each, how they work, and provides practical implementation examples.

---

## Table of Contents

1. What is SSE (Server-Sent Events)
2. What are WebSockets
3. Key Differences
4. When to Use SSE
5. When to Use WebSockets
6. Browser Support and Fallbacks
7. Connection Handling and Reconnection
8. Scalability Considerations
9. SSE Implementation Example
10. WebSocket Implementation Example
11. Decision Framework
12. Best Practices Summary

---

## 1. What is SSE (Server-Sent Events)

Server-Sent Events is a standard that enables servers to push data to web clients over HTTP. It uses a simple, unidirectional protocol where the server sends events to the client through a persistent HTTP connection.

Key characteristics:
- **Unidirectional**: Data flows only from server to client
- **Built on HTTP**: Uses standard HTTP/1.1 or HTTP/2
- **Text-based**: Sends UTF-8 encoded text (typically JSON)
- **Auto-reconnection**: Built-in reconnection with last event ID tracking
- **Simple API**: Native `EventSource` browser API

The protocol is straightforward - the server responds with `Content-Type: text/event-stream` and sends events in a specific format:

```
event: message
data: {"user": "alice", "action": "joined"}

event: update
data: {"count": 42}

```

Each event is separated by two newlines. The `event` field is optional (defaults to "message"), and `data` can span multiple lines.

---

## 2. What are WebSockets

WebSockets provide full-duplex, bidirectional communication channels over a single TCP connection. After an initial HTTP handshake, the connection upgrades to the WebSocket protocol.

Key characteristics:
- **Bidirectional**: Both client and server can send data anytime
- **Binary and text**: Supports both binary frames and UTF-8 text
- **Low overhead**: Minimal framing after handshake (2-14 bytes per frame)
- **Persistent**: Long-lived connection until explicitly closed
- **Different protocol**: Uses `ws://` or `wss://` (not HTTP after handshake)

The handshake starts as HTTP:

```
GET /chat HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

After successful upgrade, raw WebSocket frames flow over the connection.

---

## 3. Key Differences

| Aspect | SSE | WebSocket |
|--------|-----|-----------|
| Direction | Server to client only | Bidirectional |
| Protocol | HTTP | WebSocket (after HTTP upgrade) |
| Data format | Text only (UTF-8) | Text and binary |
| Reconnection | Automatic with `Last-Event-ID` | Manual implementation required |
| Browser API | `EventSource` | `WebSocket` |
| Proxy/firewall support | Excellent (standard HTTP) | Sometimes blocked |
| HTTP/2 multiplexing | Yes | No (separate TCP connection) |
| Max connections per domain | Shared with HTTP (6 in HTTP/1.1) | Separate limit |
| Overhead per message | Higher (HTTP headers on reconnect) | Lower (2-14 byte frames) |

---

## 4. When to Use SSE

SSE is the right choice when:

**Live feeds and dashboards**
- Stock tickers, sports scores, news feeds
- Server metrics and monitoring dashboards
- Social media timelines

**Notifications**
- Push notifications to web clients
- Alert systems and status updates
- Progress updates for long-running operations

**Event streaming**
- Log streaming
- Activity feeds
- Real-time analytics displays

**Advantages in these scenarios:**
- Simpler server implementation (just HTTP responses)
- Works through most proxies and firewalls without configuration
- Built-in reconnection saves development time
- Leverages HTTP/2 multiplexing for multiple streams

**Example use case**: A CI/CD dashboard showing build progress. The server pushes status updates, and the client only needs to display them - no need for the client to send data back.

---

## 5. When to Use WebSockets

WebSockets are the right choice when:

**Chat and messaging**
- Real-time chat applications
- Collaborative editing (Google Docs-style)
- Multiplayer games

**Interactive applications**
- Live auctions with bidding
- Collaborative whiteboards
- Real-time trading platforms

**IoT and device communication**
- Bidirectional device control
- Sensor data with acknowledgments
- Remote command execution

**Advantages in these scenarios:**
- True bidirectional communication
- Lower latency for high-frequency messages
- Binary data support for efficient transfers
- Single connection for both directions

**Example use case**: A collaborative text editor where multiple users type simultaneously. Each keystroke needs to be sent to the server and broadcast to other clients in real-time.

---

## 6. Browser Support and Fallbacks

### SSE Browser Support

SSE is supported in all modern browsers. Internet Explorer never supported it, but Edge does.

```javascript
// Check SSE support
if (typeof EventSource !== 'undefined') {
  // SSE is supported
  const eventSource = new EventSource('/events');
} else {
  // Fallback to polling
  setInterval(fetchUpdates, 5000);
}
```

### WebSocket Browser Support

WebSockets have universal support in modern browsers, including IE10+.

```javascript
// Check WebSocket support
if ('WebSocket' in window) {
  // WebSocket is supported
  const ws = new WebSocket('wss://example.com/socket');
} else {
  // Fallback (rare in modern browsers)
  useLongPolling();
}
```

### Fallback Strategies

For SSE, long-polling is the standard fallback:

```javascript
// Simple long-polling fallback
async function longPoll() {
  try {
    const response = await fetch('/poll');
    const data = await response.json();
    handleData(data);
  } catch (error) {
    console.error('Poll failed:', error);
  }
  // Continue polling
  setTimeout(longPoll, 100);
}
```

Libraries like Socket.IO automatically handle WebSocket fallbacks using long-polling when WebSockets are unavailable.

---

## 7. Connection Handling and Reconnection

### SSE Automatic Reconnection

SSE has built-in reconnection. The browser automatically reconnects if the connection drops:

```javascript
const eventSource = new EventSource('/events');

// Track connection state
eventSource.onopen = () => {
  console.log('Connected');
};

eventSource.onerror = (error) => {
  // Browser will automatically attempt to reconnect
  console.log('Connection lost, reconnecting...');
};

// Server can control retry interval (in milliseconds)
// Server sends: retry: 5000
```

The server can send a `Last-Event-ID` header, and on reconnection, the browser includes this ID so the server can resume from where it left off:

```javascript
// Server-side: send event IDs
// id: 12345
// data: {"message": "hello"}

// On reconnect, browser sends:
// Last-Event-ID: 12345
```

### WebSocket Manual Reconnection

WebSockets require manual reconnection logic:

```javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000;
    this.maxDelay = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      // Reset delay on successful connection
      this.reconnectDelay = 1000;
    };

    this.ws.onclose = (event) => {
      console.log('Disconnected, reconnecting...');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  scheduleReconnect() {
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff with cap
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxDelay
    );
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
```

---

## 8. Scalability Considerations

### SSE Scalability

**Pros:**
- Works with standard HTTP load balancers
- Leverages HTTP/2 multiplexing (multiple streams over one connection)
- Stateless servers can handle reconnections easily with event IDs
- CDNs can potentially cache and fan out events

**Challenges:**
- Each client holds an open connection
- HTTP/1.1 limits connections per domain (typically 6)
- Long-lived connections may timeout at proxies

**Scaling pattern:**

```javascript
// Use Redis pub/sub for multi-server setup
const Redis = require('ioredis');
const subscriber = new Redis();
const publisher = new Redis();

// Subscribe to channel
subscriber.subscribe('events');

// Each server instance handles its connected clients
const clients = new Set();

subscriber.on('message', (channel, message) => {
  // Broadcast to all connected SSE clients on this server
  clients.forEach(client => {
    client.write(`data: ${message}\n\n`);
  });
});

// When an event occurs
publisher.publish('events', JSON.stringify({ type: 'update', data: {} }));
```

### WebSocket Scalability

**Pros:**
- Lower per-message overhead
- Single connection handles both directions
- Better for high-frequency, small messages

**Challenges:**
- Requires sticky sessions or shared state
- WebSocket-aware load balancers needed
- More complex server-side state management

**Scaling pattern:**

```javascript
// Use Redis adapter with Socket.IO for multi-server
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

const io = new Server(server);
io.adapter(createAdapter(pubClient, subClient));

// Now events are broadcast across all server instances
io.emit('notification', { message: 'Hello everyone' });
```

### Connection Limits

Both technologies hold persistent connections. Plan for:
- Memory per connection (typically 10-50KB)
- File descriptor limits (ulimit)
- Load balancer connection limits
- Heartbeat/keepalive to detect dead connections

---

## 9. SSE Implementation Example

### Server (Node.js/Express)

```javascript
const express = require('express');
const app = express();

// Store connected clients
const clients = new Map();
let clientId = 0;

// SSE endpoint
app.get('/events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Disable response buffering
  res.flushHeaders();

  // Assign client ID
  const id = ++clientId;
  clients.set(id, res);

  console.log(`Client ${id} connected. Total: ${clients.size}`);

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(id);
    console.log(`Client ${id} disconnected. Total: ${clients.size}`);
  });

  // Send initial connection event
  res.write(`event: connected\n`);
  res.write(`data: {"clientId": ${id}}\n\n`);

  // Optional: send retry interval (milliseconds)
  res.write(`retry: 5000\n\n`);
});

// Function to broadcast events to all clients
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    client.write(message);
  });
}

// Example: broadcast updates periodically
setInterval(() => {
  broadcast('heartbeat', {
    timestamp: Date.now(),
    clients: clients.size
  });
}, 30000);

// API endpoint to trigger events
app.post('/notify', express.json(), (req, res) => {
  broadcast('notification', req.body);
  res.json({ sent: true, clients: clients.size });
});

app.listen(3000, () => {
  console.log('SSE server running on port 3000');
});
```

### Client (Browser)

```javascript
// Create EventSource connection
const eventSource = new EventSource('/events');

// Handle connection open
eventSource.onopen = () => {
  console.log('SSE connection established');
  updateStatus('connected');
};

// Handle connection errors
eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  updateStatus('reconnecting');
  // Browser will automatically reconnect
};

// Listen for specific event types
eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  console.log('Connected with client ID:', data.clientId);
});

eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  displayNotification(data);
});

eventSource.addEventListener('heartbeat', (event) => {
  const data = JSON.parse(event.data);
  console.log('Heartbeat:', data.timestamp);
});

// Generic message handler (for events without specific type)
eventSource.onmessage = (event) => {
  console.log('Message:', event.data);
};

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  eventSource.close();
});

function updateStatus(status) {
  document.getElementById('status').textContent = status;
}

function displayNotification(data) {
  const container = document.getElementById('notifications');
  const notification = document.createElement('div');
  notification.textContent = JSON.stringify(data);
  container.prepend(notification);
}
```

---

## 10. WebSocket Implementation Example

### Server (Node.js with ws library)

```javascript
const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients with metadata
const clients = new Map();
let clientId = 0;

wss.on('connection', (ws, req) => {
  // Assign client ID
  const id = ++clientId;
  clients.set(id, { ws, subscriptions: new Set() });

  console.log(`Client ${id} connected. Total: ${clients.size}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId: id
  }));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(id, data);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON'
      }));
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    clients.delete(id);
    console.log(`Client ${id} disconnected. Total: ${clients.size}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`Client ${id} error:`, error);
    clients.delete(id);
  });

  // Setup ping/pong for connection health
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Handle different message types
function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case 'subscribe':
      // Client subscribes to a channel
      client.subscriptions.add(data.channel);
      client.ws.send(JSON.stringify({
        type: 'subscribed',
        channel: data.channel
      }));
      break;

    case 'unsubscribe':
      client.subscriptions.delete(data.channel);
      break;

    case 'broadcast':
      // Broadcast to all clients in a channel
      broadcastToChannel(data.channel, {
        type: 'message',
        from: clientId,
        channel: data.channel,
        content: data.content
      });
      break;

    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong' }));
      break;

    default:
      console.log(`Unknown message type: ${data.type}`);
  }
}

// Broadcast to clients subscribed to a channel
function broadcastToChannel(channel, message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.subscriptions.has(channel) &&
        client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// Broadcast to all connected clients
function broadcastAll(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// Heartbeat to detect dead connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

server.listen(3000, () => {
  console.log('WebSocket server running on port 3000');
});
```

### Client (Browser)

```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.handlers = new Map();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectDelay = 1000;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.emit('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  scheduleReconnect() {
    console.log(`Reconnecting in ${this.reconnectDelay}ms...`);
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay
    );
  }

  handleMessage(data) {
    // Emit event based on message type
    if (data.type && this.handlers.has(data.type)) {
      this.handlers.get(data.type).forEach(handler => handler(data));
    }
  }

  // Register event handler
  on(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type).delete(handler);
  }

  emit(type, data = {}) {
    if (this.handlers.has(type)) {
      this.handlers.get(type).forEach(handler => handler(data));
    }
  }

  // Send message to server
  send(type, data = {}) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    } else {
      console.warn('WebSocket not open, message not sent');
    }
  }

  // Subscribe to a channel
  subscribe(channel) {
    this.send('subscribe', { channel });
  }

  // Unsubscribe from a channel
  unsubscribe(channel) {
    this.send('unsubscribe', { channel });
  }

  // Broadcast message to channel
  broadcast(channel, content) {
    this.send('broadcast', { channel, content });
  }

  // Close connection
  close() {
    this.ws.close();
  }
}

// Usage example
const client = new WebSocketClient('wss://example.com/socket');

client.on('connected', () => {
  console.log('Connected to server');
  client.subscribe('notifications');
  client.subscribe('chat-room-1');
});

client.on('subscribed', (data) => {
  console.log('Subscribed to:', data.channel);
});

client.on('message', (data) => {
  console.log(`Message in ${data.channel}:`, data.content);
  displayMessage(data);
});

client.on('disconnected', () => {
  updateStatus('Reconnecting...');
});

// Send a chat message
function sendMessage(text) {
  client.broadcast('chat-room-1', { text, timestamp: Date.now() });
}
```

---

## 11. Decision Framework

Use this flowchart to choose between SSE and WebSockets:

```
START
  |
  v
Does the client need to send frequent data to the server?
  |
  +-- YES --> Use WebSockets
  |
  +-- NO
       |
       v
     Is it primarily server-to-client updates?
       |
       +-- YES --> Use SSE
       |
       +-- NO
            |
            v
          Do you need binary data support?
            |
            +-- YES --> Use WebSockets
            |
            +-- NO
                 |
                 v
               Are you working with restrictive proxies/firewalls?
                 |
                 +-- YES --> Use SSE (better HTTP compatibility)
                 |
                 +-- NO
                      |
                      v
                    Is simplicity a priority?
                      |
                      +-- YES --> Use SSE
                      |
                      +-- NO --> Use WebSockets
```

### Quick Reference Table

| Scenario | Recommendation |
|----------|----------------|
| Live dashboard with metrics | SSE |
| Chat application | WebSocket |
| Notification system | SSE |
| Multiplayer game | WebSocket |
| Log streaming | SSE |
| Collaborative editor | WebSocket |
| Stock ticker | SSE |
| IoT device control | WebSocket |
| Progress updates | SSE |
| Video/audio streaming signaling | WebSocket |

---

## 12. Best Practices Summary

### General

- **Start simple**: If SSE meets your needs, use it. Upgrade to WebSockets only when necessary.
- **Plan for scale**: Use Redis or similar for multi-server deployments from the start.
- **Handle disconnections**: Implement proper reconnection logic with exponential backoff.
- **Monitor connections**: Track active connections, message rates, and error rates.

### SSE Best Practices

- Send event IDs for resumable streams
- Use the `retry` field to control reconnection timing
- Keep events small (avoid large JSON payloads)
- Consider HTTP/2 for multiplexing multiple event streams

### WebSocket Best Practices

- Implement heartbeat/ping-pong for connection health
- Use message framing (type field) for routing
- Handle backpressure when clients cannot keep up
- Authenticate on connection, not per message

### Security

- Always use TLS (HTTPS for SSE, WSS for WebSockets)
- Validate and sanitize all incoming data
- Implement rate limiting to prevent abuse
- Use authentication tokens, not cookies for WebSockets

### Performance

- Batch small updates when possible
- Compress large payloads (gzip for SSE, per-message deflate for WebSockets)
- Use connection pooling on the server side
- Set appropriate timeouts to clean up dead connections

---

## Conclusion

SSE and WebSockets both solve real-time communication problems, but they excel in different scenarios. SSE is simpler, works well with existing HTTP infrastructure, and handles server-to-client streaming elegantly. WebSockets provide the flexibility of bidirectional communication at the cost of additional complexity.

Choose based on your actual requirements, not perceived needs. Many applications that seem to need WebSockets can be built effectively with SSE and occasional HTTP POST requests for client-to-server communication.

---

*Need to monitor your real-time applications? [OneUptime](https://oneuptime.com) provides comprehensive observability for SSE and WebSocket-based services, with alerting, metrics, and distributed tracing to keep your real-time features running smoothly.*
