# How to Build a Flask WebSocket Server with Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Flask, WebSocket, PubSub, Real-Time

Description: Learn how to build a real-time Flask WebSocket server using Flask-SocketIO and Redis Pub/Sub to broadcast messages across multiple server instances.

---

Flask-SocketIO with Redis as its message queue enables WebSocket communication that scales across multiple worker processes. Redis Pub/Sub acts as the inter-process message bus.

## Installation

```bash
pip install flask-socketio redis eventlet
```

## Application Setup

```python
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.secret_key = "your-secret-key"

# Use Redis as the message queue for multi-worker scaling
socketio = SocketIO(
    app,
    message_queue="redis://localhost:6379/0",
    cors_allowed_origins="*",
    async_mode="eventlet",
)
```

## WebSocket Event Handlers

```python
@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit("server_message", {"text": "Welcome!"})

@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on("join_room")
def handle_join_room(data):
    room = data.get("room")
    join_room(room)
    emit("room_joined", {"room": room}, room=room)

@socketio.on("leave_room")
def handle_leave_room(data):
    room = data.get("room")
    leave_room(room)

@socketio.on("chat_message")
def handle_chat_message(data):
    room = data.get("room", "global")
    message = data.get("message", "")
    # Broadcast to all clients in the room via Redis Pub/Sub
    emit("chat_message", {"message": message, "sender": request.sid}, room=room)
```

## HTTP Endpoint to Trigger WebSocket Push

Push messages to connected clients from a regular HTTP request:

```python
from flask import request as http_request, jsonify

@app.route("/broadcast", methods=["POST"])
def broadcast_notification():
    data = http_request.get_json()
    room = data.get("room", "global")
    message = data.get("message")

    # This goes through Redis Pub/Sub to reach all SocketIO workers
    socketio.emit("notification", {"text": message}, room=room)
    return jsonify({"status": "sent"})
```

## Client-Side JavaScript

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
  const socket = io();

  socket.on("connect", () => {
    console.log("Connected:", socket.id);
    socket.emit("join_room", { room: "general" });
  });

  socket.on("chat_message", (data) => {
    console.log("Message:", data.message);
  });

  socket.on("notification", (data) => {
    alert(data.text);
  });

  // Send a message
  document.getElementById("send-btn").onclick = () => {
    socket.emit("chat_message", {
      room: "general",
      message: document.getElementById("msg").value,
    });
  };
</script>
```

## Running with Multiple Workers

```bash
# Instance 1
gunicorn --worker-class eventlet -w 1 -b 0.0.0.0:5000 myapp:app

# Instance 2 (receives Redis messages via Pub/Sub)
gunicorn --worker-class eventlet -w 1 -b 0.0.0.0:5001 myapp:app
```

Place a load balancer (e.g., nginx with `ip_hash`) in front of both instances with sticky sessions enabled.

Redis ensures that a message emitted by Worker 1 reaches clients connected to Worker 2.

## Summary

Flask-SocketIO with `message_queue="redis://..."` uses Redis Pub/Sub to distribute WebSocket events across all worker processes. Define event handlers with `@socketio.on()`, use `join_room`/`emit(..., room=...)` for targeted delivery, and call `socketio.emit()` from regular HTTP routes to push server-initiated events. This architecture scales horizontally with sticky sessions and a load balancer in front of your instances.
