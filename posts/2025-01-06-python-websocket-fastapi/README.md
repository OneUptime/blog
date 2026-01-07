# How to Implement WebSocket Connections in Python with FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, WebSocket, FastAPI, Real-time, Async, Starlette

Description: Learn how to implement WebSocket connections in Python using FastAPI and Starlette. This guide covers connection management, broadcasting, authentication, and production best practices for real-time applications.

---

> WebSockets enable real-time, bidirectional communication between clients and servers. Unlike HTTP, WebSocket connections stay open, allowing instant data push without polling. This guide shows you how to implement robust WebSocket handling in FastAPI.

Real-time features like chat, notifications, live updates, and collaborative editing all benefit from WebSockets.

---

## Basic WebSocket Endpoint

This simple example shows a WebSocket echo server that receives messages and sends them back. The connection stays open until the client disconnects, demonstrating the persistent nature of WebSocket connections.

```python
# websocket_basic.py
# Simple WebSocket echo server
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

@app.websocket("/ws")  # WebSocket endpoint (not HTTP)
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()  # Accept the WebSocket connection handshake
    try:
        while True:  # Keep connection open indefinitely
            data = await websocket.receive_text()  # Wait for message from client
            await websocket.send_text(f"Echo: {data}")  # Send response back
    except WebSocketDisconnect:
        # Client closed connection - handle gracefully
        print("Client disconnected")
```

---

## Connection Manager

For applications with multiple connected clients, a connection manager tracks all active connections and provides methods for targeted messaging and broadcasting. This pattern is essential for chat applications, notifications, and collaborative tools.

```python
# connection_manager.py
# WebSocket connection manager for multi-client scenarios
from fastapi import WebSocket
from typing import Dict, List, Set
import asyncio

class ConnectionManager:
    """Manages WebSocket connections with room support"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # client_id -> websocket
        self.rooms: Dict[str, Set[str]] = {}  # room_name -> set of client_ids

    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept connection and register client"""
        await websocket.accept()  # Complete WebSocket handshake
        self.active_connections[client_id] = websocket  # Store connection

    def disconnect(self, client_id: str):
        """Remove client and clean up room memberships"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        # Remove client from all rooms they were in
        for room in self.rooms.values():
            room.discard(client_id)  # Safe removal (no error if not present)

    async def send_personal(self, message: str, client_id: str):
        """Send message to specific client"""
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast(self, message: str, exclude: str = None):
        """Send message to all connected clients"""
        for client_id, connection in self.active_connections.items():
            if client_id != exclude:  # Optionally skip sender
                await connection.send_text(message)

    def join_room(self, client_id: str, room: str):
        """Add client to a room"""
        if room not in self.rooms:
            self.rooms[room] = set()  # Create room if it doesn't exist
        self.rooms[room].add(client_id)

    def leave_room(self, client_id: str, room: str):
        """Remove client from a room"""
        if room in self.rooms:
            self.rooms[room].discard(client_id)

    async def broadcast_to_room(self, message: str, room: str, exclude: str = None):
        """Send message to all clients in a specific room"""
        if room not in self.rooms:
            return
        for client_id in self.rooms[room]:
            if client_id != exclude and client_id in self.active_connections:
                await self.active_connections[client_id].send_text(message)

# Singleton instance for use across the application
manager = ConnectionManager()
```

### Using the Connection Manager

This example shows how to use the connection manager in a FastAPI endpoint. It handles different message types including chat messages, room joins, and room-specific messages.

```python
# websocket_app.py
# WebSocket endpoint using the connection manager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from connection_manager import manager
import json

app = FastAPI()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    # Register the new connection
    await manager.connect(websocket, client_id)
    # Notify all other users that someone joined
    await manager.broadcast(f"{client_id} joined", exclude=client_id)

    try:
        while True:
            data = await websocket.receive_text()  # Wait for client message
            message = json.loads(data)  # Parse JSON message

            # Handle different message types
            if message["type"] == "chat":
                # Broadcast chat message to everyone
                await manager.broadcast(
                    json.dumps({
                        "type": "chat",
                        "from": client_id,
                        "content": message["content"]
                    })
                )
            elif message["type"] == "join_room":
                # Add client to a specific room
                manager.join_room(client_id, message["room"])
                # Notify room members
                await manager.broadcast_to_room(
                    json.dumps({"type": "user_joined", "user": client_id}),
                    message["room"]
                )
            elif message["type"] == "room_message":
                # Send message only to room members
                await manager.broadcast_to_room(
                    json.dumps({
                        "type": "room_message",
                        "from": client_id,
                        "content": message["content"]
                    }),
                    message["room"]
                )

    except WebSocketDisconnect:
        # Clean up when client disconnects
        manager.disconnect(client_id)
        await manager.broadcast(f"{client_id} left")
```

---

## Authentication

WebSocket connections should be authenticated before accepting. This example shows JWT token validation via query parameter. Always validate before calling `websocket.accept()` to reject unauthorized connections early.

```python
# websocket_auth.py
# WebSocket authentication using JWT tokens
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from jose import jwt, JWTError

app = FastAPI()

async def get_user_from_token(token: str) -> dict:
    """Validate JWT token and extract user information"""
    try:
        # Decode and verify the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")  # Standard JWT subject claim
        if not user_id:
            return None
        return {"id": user_id, "name": payload.get("name")}
    except JWTError:
        return None  # Invalid or expired token

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)  # Token passed as query parameter: ws://host/ws?token=xxx
):
    # Validate token BEFORE accepting the connection
    user = await get_user_from_token(token)
    if not user:
        # Close with custom code for authentication failure
        await websocket.close(code=4001)  # 4001 = custom "Unauthorized" code
        return

    # Authentication successful - accept and register connection
    await websocket.accept()
    await manager.connect(websocket, user["id"])

    try:
        while True:
            data = await websocket.receive_text()
            # Handle messages with authenticated user context
            await handle_message(user, data)
    except WebSocketDisconnect:
        manager.disconnect(user["id"])
```

### Cookie-Based Auth

For browser-based applications, you can use session cookies for authentication. Cookies are automatically sent with WebSocket connections from the same origin.

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Access cookies before accepting the connection
    cookies = websocket.cookies  # Dict of cookie name -> value
    session_token = cookies.get("session")  # Get session cookie

    if not session_token:
        await websocket.close(code=4001)  # No session cookie
        return

    # Validate the session (check database, Redis, etc.)
    user = await validate_session(session_token)
    if not user:
        await websocket.close(code=4001)  # Invalid session
        return

    await websocket.accept()  # Authentication passed
    # Continue with authenticated user...
```

---

## Heartbeat/Ping-Pong

Heartbeats detect stale connections and keep the WebSocket alive through proxies and load balancers. The server sends periodic pings, and clients respond with pongs to confirm they're still connected.

```python
# websocket_heartbeat.py
# WebSocket heartbeat for connection health monitoring
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio

app = FastAPI()

HEARTBEAT_INTERVAL = 30  # Send ping every 30 seconds

async def heartbeat(websocket: WebSocket):
    """Background task that sends periodic ping messages"""
    while True:
        try:
            await asyncio.sleep(HEARTBEAT_INTERVAL)  # Wait between pings
            await websocket.send_json({"type": "ping"})  # Send ping to client
        except Exception:
            break  # Connection closed, stop heartbeat

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()

    # Start heartbeat as a background task
    heartbeat_task = asyncio.create_task(heartbeat(websocket))

    try:
        while True:
            data = await websocket.receive_json()  # Wait for message

            if data.get("type") == "pong":
                continue  # Ignore heartbeat response, loop continues

            # Handle other message types
            await handle_message(client_id, data)

    except WebSocketDisconnect:
        heartbeat_task.cancel()  # Stop the heartbeat task
        manager.disconnect(client_id)  # Clean up connection
```

---

## Production Connection Manager

This production-ready connection manager includes logging, automatic heartbeat management, graceful error handling, and proper cleanup. It handles edge cases like failed sends and provides methods for monitoring connection statistics.

```python
# production_manager.py
# Production-ready WebSocket connection manager with full features
from fastapi import WebSocket
from typing import Dict, Set, Optional
import asyncio
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ProductionConnectionManager:
    """Production-ready WebSocket connection manager with monitoring"""

    def __init__(self, heartbeat_interval: int = 30):
        self.connections: Dict[str, WebSocket] = {}  # Active WebSocket connections
        self.rooms: Dict[str, Set[str]] = {}  # Room membership tracking
        self.user_data: Dict[str, dict] = {}  # Per-client metadata storage
        self.heartbeat_interval = heartbeat_interval  # Seconds between pings
        self._heartbeat_tasks: Dict[str, asyncio.Task] = {}  # Background heartbeat tasks

    async def connect(
        self,
        websocket: WebSocket,
        client_id: str,
        user_data: dict = None
    ):
        """Accept connection, store metadata, and start heartbeat"""
        await websocket.accept()  # Complete WebSocket handshake
        self.connections[client_id] = websocket  # Store connection
        self.user_data[client_id] = user_data or {}  # Store associated user data

        # Start automatic heartbeat for this connection
        self._heartbeat_tasks[client_id] = asyncio.create_task(
            self._heartbeat_loop(client_id)
        )

        logger.info(f"Client connected: {client_id}")

    async def disconnect(self, client_id: str):
        """Clean up all resources associated with a connection"""
        # Stop the heartbeat background task
        if client_id in self._heartbeat_tasks:
            self._heartbeat_tasks[client_id].cancel()
            del self._heartbeat_tasks[client_id]

        # Remove from all rooms and clean up empty rooms
        for room in list(self.rooms.keys()):
            self.rooms[room].discard(client_id)
            if not self.rooms[room]:  # Room is empty
                del self.rooms[room]

        # Remove connection and user data
        self.connections.pop(client_id, None)
        self.user_data.pop(client_id, None)

        logger.info(f"Client disconnected: {client_id}")

    async def _heartbeat_loop(self, client_id: str):
        """Background task: send periodic heartbeats to detect stale connections"""
        while client_id in self.connections:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                # Send ping with timestamp for latency measurement
                await self.send_json(client_id, {"type": "ping", "ts": datetime.utcnow().isoformat()})
            except Exception as e:
                logger.warning(f"Heartbeat failed for {client_id}: {e}")
                break  # Connection is dead, exit loop

    async def send_json(self, client_id: str, data: dict) -> bool:
        """Send JSON to specific client with error handling"""
        if client_id not in self.connections:
            return False  # Client not connected

        try:
            await self.connections[client_id].send_json(data)
            return True  # Success
        except Exception as e:
            # Send failed - connection is broken
            logger.error(f"Failed to send to {client_id}: {e}")
            await self.disconnect(client_id)  # Clean up dead connection
            return False

    async def broadcast(self, data: dict, exclude: Set[str] = None):
        """Broadcast to all connections concurrently"""
        exclude = exclude or set()
        # Create tasks for parallel sending
        tasks = [
            self.send_json(cid, data)
            for cid in self.connections
            if cid not in exclude
        ]
        # Wait for all sends to complete, ignore individual failures
        await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast_to_room(
        self,
        room: str,
        data: dict,
        exclude: Set[str] = None
    ):
        """Broadcast to all members of a specific room"""
        if room not in self.rooms:
            return  # Room doesn't exist

        exclude = exclude or set()
        members = self.rooms[room] - exclude  # Room members minus excluded
        tasks = [self.send_json(cid, data) for cid in members]
        await asyncio.gather(*tasks, return_exceptions=True)

    def join_room(self, client_id: str, room: str):
        """Add client to a room, creating room if needed"""
        if room not in self.rooms:
            self.rooms[room] = set()  # Create new room
        self.rooms[room].add(client_id)
        logger.info(f"Client {client_id} joined room {room}")

    def leave_room(self, client_id: str, room: str):
        """Remove client from room, deleting empty rooms"""
        if room in self.rooms:
            self.rooms[room].discard(client_id)
            if not self.rooms[room]:  # Clean up empty room
                del self.rooms[room]
        logger.info(f"Client {client_id} left room {room}")

    def get_room_members(self, room: str) -> Set[str]:
        """Get members of a room (returns copy to prevent modification)"""
        return self.rooms.get(room, set()).copy()

    def get_connection_count(self) -> int:
        """Get total number of active connections (for monitoring)"""
        return len(self.connections)

    def get_room_count(self) -> int:
        """Get total number of active rooms (for monitoring)"""
        return len(self.rooms)
```

---

## Complete Chat Application

This complete example brings together all the concepts into a working chat application. It supports global broadcast, room-based messaging, and direct messages between users, with a stats endpoint for monitoring.

```python
# chat_app.py
# Complete chat application with rooms and direct messages
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from production_manager import ProductionConnectionManager
from pydantic import BaseModel
from typing import Optional
import json
import uuid

app = FastAPI()
manager = ProductionConnectionManager()  # Singleton connection manager

class Message(BaseModel):
    """Pydantic model for incoming WebSocket messages"""
    type: str  # Message type: pong, join_room, leave_room, room_message, direct_message
    room: Optional[str] = None  # Target room for room-based operations
    content: Optional[str] = None  # Message content
    to: Optional[str] = None  # Target user for direct messages

@app.websocket("/chat/{username}")
async def chat_endpoint(websocket: WebSocket, username: str):
    # Create unique client ID (username + random suffix for multiple tabs)
    client_id = f"{username}_{uuid.uuid4().hex[:8]}"

    # Connect and store user metadata
    await manager.connect(
        websocket,
        client_id,
        user_data={"username": username}  # Store username for later use
    )

    # Notify all other users about the new connection
    await manager.broadcast(
        {"type": "user_connected", "username": username},
        exclude={client_id}  # Don't notify the user who just connected
    )

    try:
        while True:
            data = await websocket.receive_json()  # Wait for message
            message = Message(**data)  # Validate with Pydantic

            # Handle heartbeat response
            if message.type == "pong":
                continue  # Acknowledge and continue loop

            # Handle room join request
            elif message.type == "join_room":
                manager.join_room(client_id, message.room)
                # Notify room members that user joined
                await manager.broadcast_to_room(
                    message.room,
                    {
                        "type": "user_joined_room",
                        "username": username,
                        "room": message.room
                    },
                    exclude={client_id}
                )

            # Handle room leave request
            elif message.type == "leave_room":
                manager.leave_room(client_id, message.room)
                # Notify room members that user left
                await manager.broadcast_to_room(
                    message.room,
                    {
                        "type": "user_left_room",
                        "username": username,
                        "room": message.room
                    }
                )

            # Handle message to a room
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

            # Handle direct message to specific user
            elif message.type == "direct_message":
                await manager.send_json(
                    message.to,  # Target client ID
                    {
                        "type": "direct_message",
                        "from": username,
                        "content": message.content
                    }
                )

    except WebSocketDisconnect:
        # Clean up when client disconnects
        await manager.disconnect(client_id)
        # Notify everyone that user left
        await manager.broadcast(
            {"type": "user_disconnected", "username": username}
        )

@app.get("/stats")
async def get_stats():
    """HTTP endpoint for monitoring connection statistics"""
    return {
        "connections": manager.get_connection_count(),  # Active connections
        "rooms": manager.get_room_count()  # Active rooms
    }
```

---

## Scaling WebSockets

When running multiple server instances (horizontal scaling), each server only knows about its own connections. Use Redis pub/sub to broadcast messages across all instances, ensuring all connected clients receive messages regardless of which server they're connected to.

```python
# redis_pubsub.py
# WebSocket scaling with Redis pub/sub for multi-instance deployments
import aioredis
import asyncio
import json

class RedisWebSocketManager:
    """WebSocket manager with Redis pub/sub for horizontal scaling"""

    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.local_connections: Dict[str, WebSocket] = {}  # Only this server's connections
        self.pubsub = None  # Redis pub/sub subscriber
        self.redis = None  # Redis client for publishing

    async def connect(self):
        """Initialize Redis connection and start listener"""
        self.redis = await aioredis.from_url(self.redis_url)
        self.pubsub = self.redis.pubsub()  # Create pub/sub object
        # Start background task to listen for messages from other servers
        asyncio.create_task(self._listen_to_redis())

    async def _listen_to_redis(self):
        """Background task: listen for messages from other server instances"""
        await self.pubsub.subscribe("websocket_broadcast")  # Subscribe to channel
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])  # Parse incoming message
                await self._handle_redis_message(data)

    async def _handle_redis_message(self, data: dict):
        """Handle message received from Redis (from any server instance)"""
        target = data.get("target")  # "broadcast" or specific client_id
        message = data.get("message")  # The actual message to send

        if target == "broadcast":
            # Send to all local connections on this server
            for ws in self.local_connections.values():
                await ws.send_json(message)
        elif target in self.local_connections:
            # Send to specific client (if they're on this server)
            await self.local_connections[target].send_json(message)

    async def broadcast(self, message: dict):
        """Broadcast to all servers via Redis pub/sub"""
        # Publish to Redis - all subscribed servers will receive this
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
