# How to Build FastAPI WebSocket Chat with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FastAPI, WebSocket, Pub/Sub, Python

Description: Build a real-time multi-room WebSocket chat application in FastAPI using Redis Pub/Sub to broadcast messages across multiple server instances.

---

## Introduction

A naive WebSocket chat implementation stores connections in memory, which breaks when you scale to multiple server processes. Redis Pub/Sub solves this: each server subscribes to Redis channels, and any message published to a channel is broadcast to all subscribers regardless of which server the recipient is connected to. This guide builds a scalable chat application using FastAPI and Redis.

## Installation

```bash
pip install fastapi uvicorn redis websockets
```

## Connection Manager

```python
# connection_manager.py
from typing import Dict, Set
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # room -> set of websockets
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.rooms:
            self.rooms[room].discard(websocket)

    async def broadcast_to_room(self, message: str, room: str):
        if room in self.rooms:
            dead = set()
            for ws in self.rooms[room]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.add(ws)
            self.rooms[room] -= dead
```

## Redis Pub/Sub Manager

```python
# redis_pubsub.py
import asyncio
import json
import redis.asyncio as aioredis

class RedisPubSub:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis: aioredis.Redis = None
        self._channels: dict = {}

    async def connect(self):
        self.redis = aioredis.from_url(self.redis_url, decode_responses=True)

    async def publish(self, room: str, message: dict):
        await self.redis.publish(f"chat:{room}", json.dumps(message))

    async def subscribe(self, room: str, callback):
        channel = f"chat:{room}"
        if channel in self._channels:
            return  # Already subscribed to this room
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(channel)

        async def _listener():
            try:
                async for msg in pubsub.listen():
                    if msg["type"] == "message":
                        await callback(msg["data"])
            except asyncio.CancelledError:
                await pubsub.unsubscribe(channel)
                await pubsub.close()

        self._channels[channel] = asyncio.create_task(_listener())

    async def unsubscribe(self, room: str):
        channel = f"chat:{room}"
        task = self._channels.pop(channel, None)
        if task:
            task.cancel()
```

## FastAPI Application

```python
# main.py
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from connection_manager import ConnectionManager
from redis_pubsub import RedisPubSub

app = FastAPI()
manager = ConnectionManager()
pubsub = RedisPubSub("redis://localhost:6379")

@app.on_event("startup")
async def startup():
    await pubsub.connect()

@app.websocket("/ws/{room}/{username}")
async def websocket_endpoint(websocket: WebSocket, room: str, username: str):
    await manager.connect(websocket, room)

    # Subscribe to Redis channel (one subscription per room, shared across connections)
    async def on_redis_message(data: str):
        await manager.broadcast_to_room(data, room)

    await pubsub.subscribe(room, on_redis_message)

    try:
        while True:
            data = await websocket.receive_text()
            message = {
                "username": username,
                "room": room,
                "message": data,
            }
            # Publish to Redis - all server instances will receive this
            await pubsub.publish(room, message)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
        # Publish leave message through Redis so all servers see it
        await pubsub.publish(room, {"system": f"{username} left the room"})
        # Unsubscribe from Redis if no more local connections in this room
        if not manager.rooms.get(room):
            await pubsub.unsubscribe(room)
```

## HTML Client for Testing

```python
from fastapi.responses import HTMLResponse

# Simple test client - serve as static HTML
CHAT_HTML = """
<!DOCTYPE html>
<html>
<body>
<input id="room" placeholder="Room name" value="general">
<input id="username" placeholder="Username" value="user1">
<button onclick="connect()">Connect</button>
<div id="messages"></div>
<input id="msg" placeholder="Message">
<button onclick="sendMsg()">Send</button>
<script>
let ws;
function connect() {
  const room = document.getElementById("room").value;
  const user = document.getElementById("username").value;
  ws = new WebSocket(`ws://localhost:8000/ws/${room}/${user}`);
  ws.onmessage = (e) => {
    const d = document.getElementById("messages");
    d.innerHTML += "<p>" + e.data + "</p>";
  };
}
function sendMsg() {
  ws.send(document.getElementById("msg").value);
}
</script>
</body>
</html>
"""

@app.get("/")
async def index():
    return HTMLResponse(CHAT_HTML)
```

## Running the Server

```bash
# Development (single process with auto-reload)
uvicorn main:app --reload

# Production (multiple workers, no reload)
uvicorn main:app --workers 4
```

## Summary

Building a scalable FastAPI WebSocket chat with Redis Pub/Sub involves a local `ConnectionManager` for in-process WebSocket management and a `RedisPubSub` class to relay messages across server instances. Each server subscribes to a Redis channel per room, so messages published by any server instance reach all connected clients. This pattern scales horizontally - add more server instances behind a load balancer and Redis ensures message delivery across all of them.
