# How to Implement WebSocket Connections in Python with FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, WebSocket, FastAPI, Real-time, Async, Starlette

Description: Learn how to implement WebSocket connections in Python using FastAPI and Starlette. This guide covers connection management, broadcasting, authentication, and production best practices for real-time applications.

---

> WebSockets enable real-time, bidirectional communication between clients and servers. Unlike HTTP, WebSocket connections stay open, allowing instant data push without polling. This guide shows you how to implement robust WebSocket handling in FastAPI.

Real-time features like chat, notifications, live updates, and collaborative editing all benefit from WebSockets.

---

## Basic WebSocket Endpoint

```python
# websocket_basic.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("Client disconnected")
```

---

## Connection Manager

For managing multiple connections:

```python
# connection_manager.py
from fastapi import WebSocket
from typing import Dict, List, Set
import asyncio

class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.rooms: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        # Remove from all rooms
        for room in self.rooms.values():
            room.discard(client_id)

    async def send_personal(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast(self, message: str, exclude: str = None):
        for client_id, connection in self.active_connections.items():
            if client_id != exclude:
                await connection.send_text(message)

    def join_room(self, client_id: str, room: str):
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(client_id)

    def leave_room(self, client_id: str, room: str):
        if room in self.rooms:
            self.rooms[room].discard(client_id)

    async def broadcast_to_room(self, message: str, room: str, exclude: str = None):
        if room not in self.rooms:
            return
        for client_id in self.rooms[room]:
            if client_id != exclude and client_id in self.active_connections:
                await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()
```

### Using the Connection Manager

```python
# websocket_app.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from connection_manager import manager
import json

app = FastAPI()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    await manager.broadcast(f"{client_id} joined", exclude=client_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "chat":
                await manager.broadcast(
                    json.dumps({
                        "type": "chat",
                        "from": client_id,
                        "content": message["content"]
                    })
                )
            elif message["type"] == "join_room":
                manager.join_room(client_id, message["room"])
                await manager.broadcast_to_room(
                    json.dumps({"type": "user_joined", "user": client_id}),
                    message["room"]
                )
            elif message["type"] == "room_message":
                await manager.broadcast_to_room(
                    json.dumps({
                        "type": "room_message",
                        "from": client_id,
                        "content": message["content"]
                    }),
                    message["room"]
                )

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast(f"{client_id} left")
```

---

## Authentication

```python
# websocket_auth.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from jose import jwt, JWTError

app = FastAPI()

async def get_user_from_token(token: str) -> dict:
    """Validate token and return user"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return {"id": user_id, "name": payload.get("name")}
    except JWTError:
        return None

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    # Authenticate before accepting
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    await manager.connect(websocket, user["id"])

    try:
        while True:
            data = await websocket.receive_text()
            # Handle messages with user context
            await handle_message(user, data)
    except WebSocketDisconnect:
        manager.disconnect(user["id"])
```

### Cookie-Based Auth

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Get cookie before accepting
    cookies = websocket.cookies
    session_token = cookies.get("session")

    if not session_token:
        await websocket.close(code=4001)
        return

    user = await validate_session(session_token)
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    # Continue with authenticated user
```

---

## Heartbeat/Ping-Pong

```python
# websocket_heartbeat.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio

app = FastAPI()

HEARTBEAT_INTERVAL = 30  # seconds

async def heartbeat(websocket: WebSocket):
    """Send periodic heartbeat to keep connection alive"""
    while True:
        try:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            await websocket.send_json({"type": "ping"})
        except Exception:
            break

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()

    # Start heartbeat task
    heartbeat_task = asyncio.create_task(heartbeat(websocket))

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "pong":
                continue  # Heartbeat response

            # Handle other messages
            await handle_message(client_id, data)

    except WebSocketDisconnect:
        heartbeat_task.cancel()
        manager.disconnect(client_id)
```

---

## Production Connection Manager

```python
# production_manager.py
from fastapi import WebSocket
from typing import Dict, Set, Optional
import asyncio
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ProductionConnectionManager:
    """Production-ready WebSocket connection manager"""

    def __init__(self, heartbeat_interval: int = 30):
        self.connections: Dict[str, WebSocket] = {}
        self.rooms: Dict[str, Set[str]] = {}
        self.user_data: Dict[str, dict] = {}
        self.heartbeat_interval = heartbeat_interval
        self._heartbeat_tasks: Dict[str, asyncio.Task] = {}

    async def connect(
        self,
        websocket: WebSocket,
        client_id: str,
        user_data: dict = None
    ):
        """Accept connection and start monitoring"""
        await websocket.accept()
        self.connections[client_id] = websocket
        self.user_data[client_id] = user_data or {}

        # Start heartbeat
        self._heartbeat_tasks[client_id] = asyncio.create_task(
            self._heartbeat_loop(client_id)
        )

        logger.info(f"Client connected: {client_id}")

    async def disconnect(self, client_id: str):
        """Clean up connection"""
        # Cancel heartbeat
        if client_id in self._heartbeat_tasks:
            self._heartbeat_tasks[client_id].cancel()
            del self._heartbeat_tasks[client_id]

        # Remove from rooms
        for room in list(self.rooms.keys()):
            self.rooms[room].discard(client_id)
            if not self.rooms[room]:
                del self.rooms[room]

        # Remove connection
        self.connections.pop(client_id, None)
        self.user_data.pop(client_id, None)

        logger.info(f"Client disconnected: {client_id}")

    async def _heartbeat_loop(self, client_id: str):
        """Send periodic heartbeats"""
        while client_id in self.connections:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                await self.send_json(client_id, {"type": "ping", "ts": datetime.utcnow().isoformat()})
            except Exception as e:
                logger.warning(f"Heartbeat failed for {client_id}: {e}")
                break

    async def send_json(self, client_id: str, data: dict) -> bool:
        """Send JSON to specific client"""
        if client_id not in self.connections:
            return False

        try:
            await self.connections[client_id].send_json(data)
            return True
        except Exception as e:
            logger.error(f"Failed to send to {client_id}: {e}")
            await self.disconnect(client_id)
            return False

    async def broadcast(self, data: dict, exclude: Set[str] = None):
        """Broadcast to all connections"""
        exclude = exclude or set()
        tasks = [
            self.send_json(cid, data)
            for cid in self.connections
            if cid not in exclude
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast_to_room(
        self,
        room: str,
        data: dict,
        exclude: Set[str] = None
    ):
        """Broadcast to room members"""
        if room not in self.rooms:
            return

        exclude = exclude or set()
        members = self.rooms[room] - exclude
        tasks = [self.send_json(cid, data) for cid in members]
        await asyncio.gather(*tasks, return_exceptions=True)

    def join_room(self, client_id: str, room: str):
        """Add client to room"""
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(client_id)
        logger.info(f"Client {client_id} joined room {room}")

    def leave_room(self, client_id: str, room: str):
        """Remove client from room"""
        if room in self.rooms:
            self.rooms[room].discard(client_id)
            if not self.rooms[room]:
                del self.rooms[room]
        logger.info(f"Client {client_id} left room {room}")

    def get_room_members(self, room: str) -> Set[str]:
        """Get members of a room"""
        return self.rooms.get(room, set()).copy()

    def get_connection_count(self) -> int:
        """Get total connection count"""
        return len(self.connections)

    def get_room_count(self) -> int:
        """Get total room count"""
        return len(self.rooms)
```

---

## Complete Chat Application

```python
# chat_app.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from production_manager import ProductionConnectionManager
from pydantic import BaseModel
from typing import Optional
import json
import uuid

app = FastAPI()
manager = ProductionConnectionManager()

class Message(BaseModel):
    type: str
    room: Optional[str] = None
    content: Optional[str] = None
    to: Optional[str] = None

@app.websocket("/chat/{username}")
async def chat_endpoint(websocket: WebSocket, username: str):
    client_id = f"{username}_{uuid.uuid4().hex[:8]}"

    await manager.connect(
        websocket,
        client_id,
        user_data={"username": username}
    )

    # Notify others
    await manager.broadcast(
        {"type": "user_connected", "username": username},
        exclude={client_id}
    )

    try:
        while True:
            data = await websocket.receive_json()
            message = Message(**data)

            if message.type == "pong":
                continue

            elif message.type == "join_room":
                manager.join_room(client_id, message.room)
                await manager.broadcast_to_room(
                    message.room,
                    {
                        "type": "user_joined_room",
                        "username": username,
                        "room": message.room
                    },
                    exclude={client_id}
                )

            elif message.type == "leave_room":
                manager.leave_room(client_id, message.room)
                await manager.broadcast_to_room(
                    message.room,
                    {
                        "type": "user_left_room",
                        "username": username,
                        "room": message.room
                    }
                )

            elif message.type == "room_message":
                await manager.broadcast_to_room(
                    message.room,
                    {
                        "type": "room_message",
                        "room": message.room,
                        "from": username,
                        "content": message.content
                    }
                )

            elif message.type == "direct_message":
                await manager.send_json(
                    message.to,
                    {
                        "type": "direct_message",
                        "from": username,
                        "content": message.content
                    }
                )

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
        await manager.broadcast(
            {"type": "user_disconnected", "username": username}
        )

@app.get("/stats")
async def get_stats():
    return {
        "connections": manager.get_connection_count(),
        "rooms": manager.get_room_count()
    }
```

---

## Scaling WebSockets

For multiple server instances, use Redis pub/sub:

```python
# redis_pubsub.py
import aioredis
import asyncio
import json

class RedisWebSocketManager:
    """WebSocket manager with Redis pub/sub for scaling"""

    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.local_connections: Dict[str, WebSocket] = {}
        self.pubsub = None
        self.redis = None

    async def connect(self):
        """Initialize Redis connection"""
        self.redis = await aioredis.from_url(self.redis_url)
        self.pubsub = self.redis.pubsub()
        asyncio.create_task(self._listen_to_redis())

    async def _listen_to_redis(self):
        """Listen for messages from other servers"""
        await self.pubsub.subscribe("websocket_broadcast")
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await self._handle_redis_message(data)

    async def _handle_redis_message(self, data: dict):
        """Handle message from Redis"""
        target = data.get("target")
        message = data.get("message")

        if target == "broadcast":
            for ws in self.local_connections.values():
                await ws.send_json(message)
        elif target in self.local_connections:
            await self.local_connections[target].send_json(message)

    async def broadcast(self, message: dict):
        """Broadcast to all servers via Redis"""
        await self.redis.publish(
            "websocket_broadcast",
            json.dumps({"target": "broadcast", "message": message})
        )
```

---

## Best Practices

1. **Always handle disconnects** gracefully
2. **Use heartbeats** to detect stale connections
3. **Authenticate before accepting** connections
4. **Limit message size** to prevent abuse
5. **Use JSON** for structured messages
6. **Scale with Redis** pub/sub for multiple servers

---

## Conclusion

WebSockets in FastAPI enable powerful real-time features. Key takeaways:

- **Connection managers** organize multi-client scenarios
- **Rooms** enable targeted broadcasting
- **Heartbeats** maintain connection health
- **Redis pub/sub** enables horizontal scaling

---

*Need to monitor your WebSocket connections? [OneUptime](https://oneuptime.com) provides real-time monitoring for WebSocket applications.*
