# How to Build a Game Chat System with Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Game Chat, Real-Time, WebSocket

Description: Build a real-time game chat system using Redis Pub/Sub to broadcast messages between channels including global, team, and match-specific chat rooms.

---

## Overview

Game chat requires low-latency message delivery across multiple chat channels: global chat, team chat, match-specific chat, and private messages. Redis Pub/Sub provides the message routing layer, while WebSockets handle the client connection. Redis delivers messages in under 1 millisecond to all subscribers.

## Channel Architecture

```text
chat:global              -> Global game chat
chat:match:{match_id}    -> Match-specific chat
chat:team:{team_id}      -> Team channel
chat:player:{player_id}  -> Private messages
```

## Publishing Messages

```python
import json
import time
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

def publish_message(
    channel: str,
    sender_id: str,
    sender_name: str,
    content: str,
    message_type: str = "chat"
) -> dict:
    """Publish a message to a chat channel."""
    if len(content) > 500:
        content = content[:500]

    message = {
        "id": f"{int(time.time() * 1000)}-{sender_id[:6]}",
        "sender_id": sender_id,
        "sender_name": sender_name,
        "content": content,
        "type": message_type,  # chat, system, emote, whisper
        "channel": channel,
        "timestamp": int(time.time() * 1000)
    }

    message_json = json.dumps(message)

    # Publish to live subscribers
    subscriber_count = r.publish(channel, message_json)

    # Persist recent messages for history
    history_key = f"chat:history:{channel}"
    r.lpush(history_key, message_json)
    r.ltrim(history_key, 0, 199)   # Keep last 200 messages
    r.expire(history_key, 86400)   # Expire after 24 hours

    return {**message, "delivered_to": subscriber_count}

def send_match_chat(
    match_id: str,
    sender_id: str,
    sender_name: str,
    content: str
) -> dict:
    return publish_message(
        f"chat:match:{match_id}",
        sender_id,
        sender_name,
        content
    )

def send_team_chat(
    team_id: str,
    sender_id: str,
    sender_name: str,
    content: str
) -> dict:
    return publish_message(
        f"chat:team:{team_id}",
        sender_id,
        sender_name,
        content
    )

def send_private_message(
    from_player_id: str,
    from_name: str,
    to_player_id: str,
    content: str
) -> dict:
    return publish_message(
        f"chat:player:{to_player_id}",
        from_player_id,
        from_name,
        content,
        message_type="whisper"
    )

def send_system_message(channel: str, content: str):
    """Send a system notification to a channel."""
    return publish_message(channel, "system", "System", content, "system")
```

## Chat History

```python
def get_chat_history(channel: str, limit: int = 50) -> list[dict]:
    """Get recent message history for a channel."""
    history_key = f"chat:history:{channel}"
    raw = r.lrange(history_key, 0, limit - 1)
    messages = [json.loads(m) for m in raw]
    return list(reversed(messages))  # Return oldest first

def get_match_history(match_id: str, limit: int = 50) -> list[dict]:
    return get_chat_history(f"chat:match:{match_id}", limit)
```

## WebSocket Handler (FastAPI)

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
import redis.asyncio as aioredis

app = FastAPI()

ar = aioredis.Redis(host='localhost', port=6379, decode_responses=True)

class ChatConnection:
    def __init__(self, websocket: WebSocket, player_id: str, player_name: str):
        self.websocket = websocket
        self.player_id = player_id
        self.player_name = player_name
        self.subscribed_channels: set[str] = set()

class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, ChatConnection] = {}

    async def connect(self, websocket: WebSocket, player_id: str, player_name: str):
        await websocket.accept()
        conn = ChatConnection(websocket, player_id, player_name)
        self.connections[player_id] = conn
        return conn

    async def disconnect(self, player_id: str):
        self.connections.pop(player_id, None)

manager = ConnectionManager()

@app.websocket("/ws/chat/{player_id}")
async def chat_websocket(websocket: WebSocket, player_id: str, player_name: str = "Player"):
    conn = await manager.connect(websocket, player_id, player_name)

    # Subscribe to player's private channel
    private_channel = f"chat:player:{player_id}"
    asyncio.create_task(subscribe_to_channel(conn, private_channel))

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "join_match":
                match_id = data["match_id"]
                channel = f"chat:match:{match_id}"
                conn.subscribed_channels.add(channel)
                asyncio.create_task(subscribe_to_channel(conn, channel))
                # Send history
                history = get_match_history(match_id)
                await websocket.send_json({"type": "history", "messages": history})

            elif action == "send_message":
                channel = data.get("channel", f"chat:match:{data.get('match_id')}")
                publish_message(channel, player_id, player_name, data["content"])

    except WebSocketDisconnect:
        await manager.disconnect(player_id)

async def subscribe_to_channel(conn: ChatConnection, channel: str):
    """Subscribe to a Redis channel and forward messages to WebSocket."""
    sub = ar.pubsub()
    await sub.subscribe(channel)
    async for message in sub.listen():
        if message["type"] == "message":
            try:
                await conn.websocket.send_text(message["data"])
            except Exception:
                break
    await sub.unsubscribe(channel)
```

## Chat Moderation

```python
def mute_player(
    player_id: str,
    duration_seconds: int = 300,
    reason: str = "Inappropriate language"
):
    """Mute a player from chat."""
    mute_key = f"chat:muted:{player_id}"
    r.set(mute_key, reason, ex=duration_seconds)
    send_system_message(
        f"chat:player:{player_id}",
        f"You have been muted for {duration_seconds // 60} minutes: {reason}"
    )

def is_muted(player_id: str) -> bool:
    """Check if a player is currently muted."""
    return bool(r.exists(f"chat:muted:{player_id}"))

def report_message(
    reporter_id: str,
    message_id: str,
    reason: str
):
    """Log a message report for moderation review."""
    report = {
        "reporter_id": reporter_id,
        "message_id": message_id,
        "reason": reason,
        "reported_at": int(time.time())
    }
    r.lpush("chat:reports", json.dumps(report))
    r.ltrim("chat:reports", 0, 999)
```

## Summary

Redis Pub/Sub routes game chat messages to all subscribers of a channel with sub-millisecond latency, making it ideal for match, team, and global chat in games. Persisting recent messages to a List key provides join-late history for players who connect mid-match. Pairing Redis Pub/Sub with WebSocket connections enables real-time bidirectional chat that scales horizontally by adding more server instances, all sharing the same Redis channel subscriptions.
