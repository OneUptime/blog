# How to Use WebSockets with Cloud Run for Real-Time Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, WebSockets, Real-Time, Server-Sent Events

Description: Learn how to implement WebSocket connections on Cloud Run for real-time features like live notifications, chat, and dashboards, including connection management and scaling considerations.

---

Cloud Run supports WebSocket connections, which opens the door to real-time features like live dashboards, chat applications, notifications, and collaborative editing. There was a time when serverless platforms could not handle long-lived connections, but that has changed. Cloud Run can keep WebSocket connections open for up to 60 minutes.

Let me show you how to build a real-time application on Cloud Run using WebSockets, along with the patterns that work well in a serverless environment.

## How WebSockets Work on Cloud Run

Cloud Run handles the WebSocket upgrade handshake transparently. Your container receives the initial HTTP request, upgrades it to a WebSocket connection, and then sends and receives messages over that connection. Cloud Run routes each connection to a specific container instance and keeps it there for the lifetime of the connection.

Key behaviors to understand:
- Each WebSocket connection is pinned to one container instance
- The connection timeout is configurable up to 60 minutes
- When the connection drops, the client needs to reconnect
- Cloud Run can scale to zero, but instances with active WebSocket connections stay alive

## Step 1: Build the WebSocket Server

Here is a Python implementation using the `websockets` library with a simple chat room:

```python
# server.py - WebSocket server for real-time communication
import os
import json
import asyncio
import websockets
from datetime import datetime

# Store connected clients per room
rooms = {}

async def handle_connection(websocket, path):
    """Handle a WebSocket connection from a client."""
    room_id = path.strip('/') or 'default'
    client_id = f"user-{id(websocket) % 10000}"

    # Add client to the room
    if room_id not in rooms:
        rooms[room_id] = set()
    rooms[room_id].add(websocket)

    print(f"Client {client_id} joined room {room_id}. "
          f"Room size: {len(rooms[room_id])}")

    # Notify the room about the new connection
    join_message = json.dumps({
        'type': 'system',
        'message': f'{client_id} joined the room',
        'timestamp': datetime.utcnow().isoformat(),
        'room': room_id
    })
    await broadcast(room_id, join_message, exclude=websocket)

    # Send a welcome message to the new client
    welcome = json.dumps({
        'type': 'system',
        'message': f'Welcome to room {room_id}. You are {client_id}.',
        'client_id': client_id,
        'timestamp': datetime.utcnow().isoformat()
    })
    await websocket.send(welcome)

    try:
        # Process incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)
                # Build the broadcast message
                broadcast_msg = json.dumps({
                    'type': 'message',
                    'client_id': client_id,
                    'content': data.get('content', ''),
                    'timestamp': datetime.utcnow().isoformat(),
                    'room': room_id
                })
                # Send to all clients in the room
                await broadcast(room_id, broadcast_msg)
            except json.JSONDecodeError:
                error_msg = json.dumps({
                    'type': 'error',
                    'message': 'Invalid JSON format'
                })
                await websocket.send(error_msg)

    except websockets.exceptions.ConnectionClosed:
        print(f"Client {client_id} disconnected from room {room_id}")
    finally:
        # Clean up when the client disconnects
        rooms[room_id].discard(websocket)
        if not rooms[room_id]:
            del rooms[room_id]
        else:
            leave_msg = json.dumps({
                'type': 'system',
                'message': f'{client_id} left the room',
                'timestamp': datetime.utcnow().isoformat()
            })
            await broadcast(room_id, leave_msg)

async def broadcast(room_id, message, exclude=None):
    """Send a message to all clients in a room."""
    if room_id not in rooms:
        return
    disconnected = set()
    for client in rooms[room_id]:
        if client == exclude:
            continue
        try:
            await client.send(message)
        except websockets.exceptions.ConnectionClosed:
            disconnected.add(client)
    # Remove disconnected clients
    rooms[room_id] -= disconnected

async def health_check(path, request_headers):
    """Handle health check requests on the HTTP path."""
    if path == '/health':
        return (200, [], b'OK')
    return None

async def main():
    """Start the WebSocket server."""
    port = int(os.environ.get('PORT', 8080))

    # Start WebSocket server with a health check handler
    server = await websockets.serve(
        handle_connection,
        '0.0.0.0',
        port,
        process_request=health_check,
        ping_interval=30,      # Send ping every 30 seconds to keep connection alive
        ping_timeout=10,       # Close connection if pong not received within 10 seconds
        close_timeout=10
    )

    print(f"WebSocket server running on port {port}")
    await server.wait_closed()

if __name__ == '__main__':
    asyncio.run(main())
```

The Dockerfile:

```dockerfile
# Dockerfile for the WebSocket server
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
ENV PORT=8080
EXPOSE 8080
CMD ["python", "server.py"]
```

Requirements:

```
websockets==12.*
```

## Step 2: Build and Deploy

```bash
# Build and push the WebSocket server image
gcloud builds submit . \
  --tag=us-central1-docker.pkg.dev/my-project/my-repo/ws-server:v1
```

Deploy with a longer request timeout for WebSocket connections:

```bash
# Deploy with extended timeout for long-lived WebSocket connections
gcloud run deploy ws-server \
  --image=us-central1-docker.pkg.dev/my-project/my-repo/ws-server:v1 \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --timeout=3600 \
  --min-instances=1 \
  --concurrency=1000 \
  --cpu=1 \
  --memory=512Mi \
  --session-affinity
```

Important flags:
- `--timeout=3600` sets the request timeout to 60 minutes (the maximum), which is how long a WebSocket connection can stay open
- `--min-instances=1` prevents scale-to-zero, which would disconnect all clients
- `--concurrency=1000` allows many WebSocket connections per instance
- `--session-affinity` tries to route reconnecting clients to the same instance

## Step 3: Build the Client

### Browser JavaScript Client

```html
<!-- index.html - WebSocket client for the chat room -->
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Chat</title>
</head>
<body>
    <div id="messages"></div>
    <input type="text" id="messageInput" placeholder="Type a message...">
    <button onclick="sendMessage()">Send</button>

    <script>
        // WebSocket client with automatic reconnection
        const SERVICE_URL = 'wss://ws-server-abc123-uc.a.run.app';
        const ROOM = 'general';
        let ws;
        let reconnectAttempts = 0;
        const MAX_RECONNECT_DELAY = 30000;

        function connect() {
            // Connect to the WebSocket server with the room path
            ws = new WebSocket(`${SERVICE_URL}/${ROOM}`);

            ws.onopen = function() {
                console.log('Connected to WebSocket server');
                reconnectAttempts = 0;
                addMessage('Connected to chat room', 'system');
            };

            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                if (data.type === 'message') {
                    addMessage(`${data.client_id}: ${data.content}`, 'message');
                } else if (data.type === 'system') {
                    addMessage(data.message, 'system');
                }
            };

            ws.onclose = function(event) {
                console.log('WebSocket closed. Reconnecting...');
                addMessage('Disconnected. Reconnecting...', 'system');
                scheduleReconnect();
            };

            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
        }

        function scheduleReconnect() {
            // Exponential backoff for reconnection attempts
            const delay = Math.min(
                1000 * Math.pow(2, reconnectAttempts),
                MAX_RECONNECT_DELAY
            );
            reconnectAttempts++;
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
            setTimeout(connect, delay);
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const content = input.value.trim();
            if (content && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ content: content }));
                input.value = '';
            }
        }

        function addMessage(text, type) {
            const div = document.getElementById('messages');
            const p = document.createElement('p');
            p.textContent = text;
            p.className = type;
            div.appendChild(p);
            div.scrollTop = div.scrollHeight;
        }

        // Handle Enter key
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
        });

        // Start the connection
        connect();
    </script>
</body>
</html>
```

### Node.js Client

```javascript
// client.js - Node.js WebSocket client with reconnection
const WebSocket = require('ws');

const SERVICE_URL = 'wss://ws-server-abc123-uc.a.run.app/general';
let reconnectAttempts = 0;

function connect() {
    const ws = new WebSocket(SERVICE_URL);

    ws.on('open', () => {
        console.log('Connected to WebSocket server');
        reconnectAttempts = 0;

        // Send a message every 5 seconds
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    content: `Ping from Node.js client at ${new Date().toISOString()}`
                }));
            } else {
                clearInterval(interval);
            }
        }, 5000);
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`[${message.type}] ${message.client_id || 'system'}: ${message.content || message.message}`);
    });

    ws.on('close', () => {
        console.log('Disconnected. Reconnecting...');
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        setTimeout(connect, delay);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
    });
}

connect();
```

## Scaling Considerations

WebSockets on Cloud Run have some important implications for scaling:

### Connection Distribution

Cloud Run distributes new connections across instances, but existing connections stay pinned to their original instance. This means if you have 3 instances and 300 connections, the distribution might not be even - it depends on when connections were established relative to when instances were created.

### State Management for Multi-Instance

When running multiple instances, each instance has its own set of connected clients. Messages sent on one instance are not automatically visible to clients on other instances. For a real chat application, you need a shared message bus:

```python
# Using Redis Pub/Sub for cross-instance message distribution
import aioredis

async def setup_redis_pubsub(room_id):
    """Subscribe to a Redis channel for cross-instance messaging."""
    redis = await aioredis.from_url(os.environ.get('REDIS_URL'))
    pubsub = redis.pubsub()
    await pubsub.subscribe(f'room:{room_id}')

    # Listen for messages from other instances
    async for message in pubsub.listen():
        if message['type'] == 'message':
            # Broadcast to local WebSocket clients
            await broadcast(room_id, message['data'].decode())

async def publish_message(room_id, message):
    """Publish a message to Redis for all instances to receive."""
    redis = await aioredis.from_url(os.environ.get('REDIS_URL'))
    await redis.publish(f'room:{room_id}', message)
```

### Connection Limits

Each Cloud Run instance can handle many WebSocket connections, but consider:
- Each connection uses memory (typically a few KB per connection)
- An instance with 512 MB memory can reasonably handle 5,000-10,000 connections
- Set concurrency accordingly to prevent overloading instances

## Alternative: Server-Sent Events

If you only need server-to-client communication (no client-to-server messages over the connection), Server-Sent Events (SSE) are simpler:

```python
# SSE endpoint for one-way real-time updates
from flask import Flask, Response
import time
import json

app = Flask(__name__)

@app.route('/events')
def events():
    """Stream events to the client using Server-Sent Events."""
    def generate():
        while True:
            # Get updates from your data source
            data = json.dumps({
                'type': 'update',
                'timestamp': time.time(),
                'message': 'New data available'
            })
            yield f"data: {data}\n\n"
            time.sleep(1)

    return Response(
        generate(),
        content_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )
```

SSE is simpler, uses regular HTTP, and works with standard HTTP load balancers. It is a better fit when you just need to push updates from server to client.

## Monitoring WebSocket Connections

Track active connections using Cloud Monitoring:

```bash
# Check active instance count (indicates WebSocket load)
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/instance_count" AND resource.labels.service_name="ws-server"' \
  --interval-start-time=$(date -u -d '-1 hour' +%Y-%m-%dT%H:%M:%SZ)
```

Also add connection tracking in your application:

```python
# Expose connection count as a metric
@app.route('/metrics')
def metrics():
    """Return current connection counts for monitoring."""
    total_connections = sum(len(clients) for clients in rooms.values())
    return json.dumps({
        'total_connections': total_connections,
        'rooms': {room: len(clients) for room, clients in rooms.items()}
    })
```

WebSockets on Cloud Run work well for moderate real-time workloads. For applications with tens of thousands of concurrent connections, dedicated WebSocket infrastructure (like a Pub/Sub-backed system) might be a better fit. But for most real-time features - live notifications, dashboards, collaborative editing - Cloud Run with WebSockets gets the job done with minimal operational overhead.
