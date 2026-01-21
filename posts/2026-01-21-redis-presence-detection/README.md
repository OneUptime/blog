# How to Implement Presence Detection with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Presence Detection, Online Status, Real-Time, WebSocket, Chat Applications

Description: A comprehensive guide to implementing real-time presence detection with Redis, covering online/offline status tracking, last seen timestamps, presence heartbeats, and scaling strategies.

---

Presence detection - showing whether users are online, offline, or away - is a fundamental feature for chat applications, collaboration tools, and social platforms. Redis excels at this use case due to its speed, expiration capabilities, and Pub/Sub support for real-time updates.

In this guide, we will build a complete presence detection system using Redis, covering status tracking, heartbeats, real-time notifications, and production considerations.

## Why Redis for Presence Detection?

Redis offers several advantages for presence detection:

- **TTL Support**: Automatic expiration for presence keys enables heartbeat-based detection
- **Sub-millisecond Latency**: Fast status checks for responsive UIs
- **Pub/Sub**: Real-time presence change notifications
- **Atomic Operations**: Consistent status updates without race conditions
- **Sorted Sets**: Efficient queries for "who's online" lists

## Basic Presence Tracking

### Simple Online/Offline Status

```python
import redis
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Set
from enum import Enum
import json
import threading

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class PresenceStatus(Enum):
    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"

class BasicPresence:
    # Presence timeout in seconds
    PRESENCE_TTL = 60  # User considered offline after 60 seconds of inactivity
    HEARTBEAT_INTERVAL = 30  # Heartbeat every 30 seconds

    def set_online(self, user_id: str, status: str = "online") -> None:
        """Mark a user as online with their current status."""
        now = datetime.now()

        presence_data = {
            "user_id": user_id,
            "status": status,
            "last_seen": now.isoformat(),
            "connected_at": now.isoformat()
        }

        pipe = r.pipeline()

        # Set presence data with TTL
        pipe.hset(f"presence:{user_id}", mapping=presence_data)
        pipe.expire(f"presence:{user_id}", self.PRESENCE_TTL)

        # Add to online users set
        pipe.sadd("users:online", user_id)

        # Add to sorted set with timestamp for "recently active" queries
        pipe.zadd("users:last_active", {user_id: now.timestamp()})

        pipe.execute()

        # Publish presence change
        self._publish_presence_change(user_id, status)

    def set_offline(self, user_id: str) -> None:
        """Mark a user as offline."""
        # Get last presence data for last_seen
        last_presence = r.hgetall(f"presence:{user_id}")

        pipe = r.pipeline()

        # Remove presence data
        pipe.delete(f"presence:{user_id}")

        # Remove from online users set
        pipe.srem("users:online", user_id)

        # Store last seen time (keep for 30 days)
        if last_presence:
            pipe.set(
                f"last_seen:{user_id}",
                last_presence.get("last_seen", datetime.now().isoformat()),
                ex=30 * 24 * 3600
            )

        pipe.execute()

        # Publish presence change
        self._publish_presence_change(user_id, "offline")

    def heartbeat(self, user_id: str, status: str = None) -> bool:
        """Send a heartbeat to maintain online presence."""
        exists = r.exists(f"presence:{user_id}")

        if not exists:
            # User was considered offline, set them online
            self.set_online(user_id, status or "online")
            return True

        now = datetime.now()

        pipe = r.pipeline()

        # Update last_seen and refresh TTL
        pipe.hset(f"presence:{user_id}", "last_seen", now.isoformat())
        pipe.expire(f"presence:{user_id}", self.PRESENCE_TTL)

        # Update status if provided
        if status:
            pipe.hset(f"presence:{user_id}", "status", status)

        # Update last active timestamp
        pipe.zadd("users:last_active", {user_id: now.timestamp()})

        pipe.execute()
        return True

    def get_status(self, user_id: str) -> Dict:
        """Get a user's current presence status."""
        presence = r.hgetall(f"presence:{user_id}")

        if presence:
            return {
                "user_id": user_id,
                "status": presence.get("status", "online"),
                "last_seen": presence.get("last_seen"),
                "is_online": True
            }

        # User is offline, get last seen
        last_seen = r.get(f"last_seen:{user_id}")

        return {
            "user_id": user_id,
            "status": "offline",
            "last_seen": last_seen,
            "is_online": False
        }

    def get_multiple_statuses(self, user_ids: List[str]) -> Dict[str, Dict]:
        """Get presence status for multiple users efficiently."""
        pipe = r.pipeline()

        for user_id in user_ids:
            pipe.hgetall(f"presence:{user_id}")
            pipe.get(f"last_seen:{user_id}")

        results = pipe.execute()

        statuses = {}
        for i, user_id in enumerate(user_ids):
            presence = results[i * 2]
            last_seen = results[i * 2 + 1]

            if presence:
                statuses[user_id] = {
                    "user_id": user_id,
                    "status": presence.get("status", "online"),
                    "last_seen": presence.get("last_seen"),
                    "is_online": True
                }
            else:
                statuses[user_id] = {
                    "user_id": user_id,
                    "status": "offline",
                    "last_seen": last_seen,
                    "is_online": False
                }

        return statuses

    def get_online_users(self) -> Set[str]:
        """Get all currently online users."""
        return r.smembers("users:online")

    def get_online_count(self) -> int:
        """Get count of online users."""
        return r.scard("users:online")

    def get_recently_active(self, minutes: int = 5, limit: int = 100) -> List[str]:
        """Get users who were active in the last N minutes."""
        cutoff = (datetime.now() - timedelta(minutes=minutes)).timestamp()

        return r.zrevrangebyscore(
            "users:last_active",
            "+inf",
            cutoff,
            start=0,
            num=limit
        )

    def _publish_presence_change(self, user_id: str, status: str) -> None:
        """Publish presence change to interested subscribers."""
        message = {
            "type": "presence_change",
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
        r.publish("presence:changes", json.dumps(message))


# Usage
presence = BasicPresence()

# User comes online
presence.set_online("user_123", "online")

# Get status
status = presence.get_status("user_123")
print(f"User status: {status}")

# Send heartbeat
presence.heartbeat("user_123")

# User sets status to away
presence.heartbeat("user_123", "away")

# Get online users
online = presence.get_online_users()
print(f"Online users: {online}")

# User disconnects
presence.set_offline("user_123")
```

## Room-Based Presence

Track presence within specific rooms or channels:

```python
class RoomPresence:
    PRESENCE_TTL = 60

    def join_room(self, user_id: str, room_id: str) -> Dict:
        """User joins a room."""
        now = datetime.now()

        pipe = r.pipeline()

        # Add user to room members
        pipe.sadd(f"room:{room_id}:members", user_id)

        # Track user's presence in the room
        pipe.hset(f"room:{room_id}:presence:{user_id}", mapping={
            "user_id": user_id,
            "joined_at": now.isoformat(),
            "last_seen": now.isoformat(),
            "status": "active"
        })
        pipe.expire(f"room:{room_id}:presence:{user_id}", self.PRESENCE_TTL)

        # Track which rooms the user is in
        pipe.sadd(f"user:{user_id}:rooms", room_id)

        # Get current member count
        pipe.scard(f"room:{room_id}:members")

        results = pipe.execute()
        member_count = results[4]

        # Publish join event
        self._publish_room_event(room_id, "user_joined", {
            "user_id": user_id,
            "member_count": member_count
        })

        return {
            "room_id": room_id,
            "user_id": user_id,
            "member_count": member_count
        }

    def leave_room(self, user_id: str, room_id: str) -> Dict:
        """User leaves a room."""
        pipe = r.pipeline()

        # Remove user from room
        pipe.srem(f"room:{room_id}:members", user_id)
        pipe.delete(f"room:{room_id}:presence:{user_id}")
        pipe.srem(f"user:{user_id}:rooms", room_id)
        pipe.scard(f"room:{room_id}:members")

        results = pipe.execute()
        member_count = results[3]

        # Publish leave event
        self._publish_room_event(room_id, "user_left", {
            "user_id": user_id,
            "member_count": member_count
        })

        return {
            "room_id": room_id,
            "member_count": member_count
        }

    def room_heartbeat(self, user_id: str, room_id: str,
                       status: str = "active") -> bool:
        """Send heartbeat for room presence."""
        key = f"room:{room_id}:presence:{user_id}"

        if not r.exists(key):
            # User not in room, rejoin
            self.join_room(user_id, room_id)
            return True

        now = datetime.now()

        pipe = r.pipeline()
        pipe.hset(key, "last_seen", now.isoformat())
        pipe.hset(key, "status", status)
        pipe.expire(key, self.PRESENCE_TTL)
        pipe.execute()

        return True

    def get_room_members(self, room_id: str) -> List[Dict]:
        """Get all members in a room with their presence status."""
        members = r.smembers(f"room:{room_id}:members")

        if not members:
            return []

        pipe = r.pipeline()
        for member_id in members:
            pipe.hgetall(f"room:{room_id}:presence:{member_id}")

        presences = pipe.execute()

        result = []
        for member_id, presence in zip(members, presences):
            if presence:
                result.append({
                    "user_id": member_id,
                    "status": presence.get("status", "active"),
                    "joined_at": presence.get("joined_at"),
                    "last_seen": presence.get("last_seen"),
                    "is_active": True
                })
            else:
                # User presence expired but still in members set
                result.append({
                    "user_id": member_id,
                    "status": "inactive",
                    "is_active": False
                })

        return result

    def get_room_member_count(self, room_id: str) -> int:
        """Get count of members in a room."""
        return r.scard(f"room:{room_id}:members")

    def get_active_room_members(self, room_id: str) -> List[str]:
        """Get only active members (with valid presence)."""
        members = r.smembers(f"room:{room_id}:members")

        if not members:
            return []

        pipe = r.pipeline()
        for member_id in members:
            pipe.exists(f"room:{room_id}:presence:{member_id}")

        exists_results = pipe.execute()

        return [
            member_id
            for member_id, exists in zip(members, exists_results)
            if exists
        ]

    def get_user_rooms(self, user_id: str) -> Set[str]:
        """Get all rooms a user is in."""
        return r.smembers(f"user:{user_id}:rooms")

    def _publish_room_event(self, room_id: str, event_type: str,
                           data: Dict) -> None:
        """Publish room presence event."""
        message = {
            "type": event_type,
            "room_id": room_id,
            "timestamp": datetime.now().isoformat(),
            **data
        }
        r.publish(f"room:{room_id}:events", json.dumps(message))


# Usage
room_presence = RoomPresence()

# Users join a room
room_presence.join_room("user_alice", "room_general")
room_presence.join_room("user_bob", "room_general")

# Get room members
members = room_presence.get_room_members("room_general")
print(f"Room members: {members}")

# User sends heartbeat
room_presence.room_heartbeat("user_alice", "room_general")

# User leaves
room_presence.leave_room("user_bob", "room_general")
```

## Typing Indicators

Show when users are typing:

```python
class TypingIndicator:
    TYPING_TTL = 5  # Typing indicator expires after 5 seconds

    def set_typing(self, user_id: str, channel_id: str) -> None:
        """Mark user as typing in a channel."""
        now = datetime.now().timestamp()

        pipe = r.pipeline()

        # Add to typing set with timestamp
        pipe.zadd(f"typing:{channel_id}", {user_id: now})

        # Clean up expired typing indicators
        cutoff = now - self.TYPING_TTL
        pipe.zremrangebyscore(f"typing:{channel_id}", "-inf", cutoff)

        # Set key expiration
        pipe.expire(f"typing:{channel_id}", self.TYPING_TTL * 2)

        pipe.execute()

        # Publish typing event
        self._publish_typing(channel_id, user_id, True)

    def clear_typing(self, user_id: str, channel_id: str) -> None:
        """Clear typing indicator for a user."""
        r.zrem(f"typing:{channel_id}", user_id)

        # Publish clear event
        self._publish_typing(channel_id, user_id, False)

    def get_typing_users(self, channel_id: str) -> List[str]:
        """Get users currently typing in a channel."""
        now = datetime.now().timestamp()
        cutoff = now - self.TYPING_TTL

        # Get users who typed within TTL
        return r.zrangebyscore(
            f"typing:{channel_id}",
            cutoff,
            "+inf"
        )

    def _publish_typing(self, channel_id: str, user_id: str,
                       is_typing: bool) -> None:
        """Publish typing indicator change."""
        message = {
            "type": "typing",
            "channel_id": channel_id,
            "user_id": user_id,
            "is_typing": is_typing,
            "timestamp": datetime.now().isoformat()
        }
        r.publish(f"channel:{channel_id}:typing", json.dumps(message))


# Usage
typing = TypingIndicator()

# User starts typing
typing.set_typing("user_alice", "channel_general")

# Get who's typing
typing_users = typing.get_typing_users("channel_general")
print(f"Typing: {typing_users}")

# User stops typing (sent message or cleared)
typing.clear_typing("user_alice", "channel_general")
```

## Multi-Device Presence

Handle users connected from multiple devices:

```python
class MultiDevicePresence:
    PRESENCE_TTL = 60

    def device_connect(self, user_id: str, device_id: str,
                       device_info: Dict = None) -> Dict:
        """Register a device connection."""
        now = datetime.now()

        device_data = {
            "device_id": device_id,
            "user_id": user_id,
            "connected_at": now.isoformat(),
            "last_seen": now.isoformat(),
            "device_type": device_info.get("type", "unknown") if device_info else "unknown",
            "platform": device_info.get("platform", "unknown") if device_info else "unknown"
        }

        pipe = r.pipeline()

        # Store device presence
        pipe.hset(f"device:{user_id}:{device_id}", mapping=device_data)
        pipe.expire(f"device:{user_id}:{device_id}", self.PRESENCE_TTL)

        # Add to user's devices set
        pipe.sadd(f"user:{user_id}:devices", device_id)

        # Mark user as online (if first device)
        pipe.sadd("users:online", user_id)

        pipe.execute()

        # Publish connection event
        self._publish_device_event(user_id, device_id, "connected")

        return {
            "user_id": user_id,
            "device_id": device_id,
            "connected_at": now.isoformat()
        }

    def device_disconnect(self, user_id: str, device_id: str) -> Dict:
        """Unregister a device connection."""
        pipe = r.pipeline()

        # Remove device presence
        pipe.delete(f"device:{user_id}:{device_id}")
        pipe.srem(f"user:{user_id}:devices", device_id)

        # Get remaining devices
        pipe.scard(f"user:{user_id}:devices")

        results = pipe.execute()
        remaining_devices = results[2]

        # If no devices left, mark user offline
        if remaining_devices == 0:
            r.srem("users:online", user_id)
            r.set(
                f"last_seen:{user_id}",
                datetime.now().isoformat(),
                ex=30 * 24 * 3600
            )

        # Publish disconnection event
        self._publish_device_event(user_id, device_id, "disconnected")

        return {
            "user_id": user_id,
            "device_id": device_id,
            "remaining_devices": remaining_devices
        }

    def device_heartbeat(self, user_id: str, device_id: str) -> bool:
        """Send heartbeat for a specific device."""
        key = f"device:{user_id}:{device_id}"

        if not r.exists(key):
            return False

        now = datetime.now()

        pipe = r.pipeline()
        pipe.hset(key, "last_seen", now.isoformat())
        pipe.expire(key, self.PRESENCE_TTL)
        pipe.execute()

        return True

    def get_user_devices(self, user_id: str) -> List[Dict]:
        """Get all connected devices for a user."""
        device_ids = r.smembers(f"user:{user_id}:devices")

        if not device_ids:
            return []

        pipe = r.pipeline()
        for device_id in device_ids:
            pipe.hgetall(f"device:{user_id}:{device_id}")

        devices_data = pipe.execute()

        devices = []
        for device_id, data in zip(device_ids, devices_data):
            if data:  # Device is still active
                devices.append(data)

        return devices

    def get_user_status(self, user_id: str) -> Dict:
        """Get user's aggregated presence status."""
        devices = self.get_user_devices(user_id)

        if not devices:
            last_seen = r.get(f"last_seen:{user_id}")
            return {
                "user_id": user_id,
                "is_online": False,
                "status": "offline",
                "last_seen": last_seen,
                "devices": []
            }

        # Determine aggregate status from devices
        # Priority: active > away > idle
        status = "online"

        return {
            "user_id": user_id,
            "is_online": True,
            "status": status,
            "device_count": len(devices),
            "devices": devices
        }

    def _publish_device_event(self, user_id: str, device_id: str,
                             event: str) -> None:
        """Publish device connection event."""
        message = {
            "type": f"device_{event}",
            "user_id": user_id,
            "device_id": device_id,
            "timestamp": datetime.now().isoformat()
        }
        r.publish(f"user:{user_id}:devices", json.dumps(message))


# Usage
multi_presence = MultiDevicePresence()

# User connects from phone
multi_presence.device_connect("user_alice", "device_phone_123", {
    "type": "mobile",
    "platform": "iOS"
})

# User also connects from laptop
multi_presence.device_connect("user_alice", "device_laptop_456", {
    "type": "desktop",
    "platform": "macOS"
})

# Get user's devices
devices = multi_presence.get_user_devices("user_alice")
print(f"Connected devices: {devices}")

# Phone disconnects
multi_presence.device_disconnect("user_alice", "device_phone_123")

# Check status (still online via laptop)
status = multi_presence.get_user_status("user_alice")
print(f"User status: {status}")
```

## Presence for Friends/Contacts

Efficiently track presence for a user's contacts:

```python
class FriendPresence:
    def add_friend(self, user_id: str, friend_id: str) -> None:
        """Add a bidirectional friend relationship."""
        pipe = r.pipeline()
        pipe.sadd(f"friends:{user_id}", friend_id)
        pipe.sadd(f"friends:{friend_id}", user_id)
        pipe.execute()

    def remove_friend(self, user_id: str, friend_id: str) -> None:
        """Remove a friend relationship."""
        pipe = r.pipeline()
        pipe.srem(f"friends:{user_id}", friend_id)
        pipe.srem(f"friends:{friend_id}", user_id)
        pipe.execute()

    def get_friends(self, user_id: str) -> Set[str]:
        """Get a user's friends."""
        return r.smembers(f"friends:{user_id}")

    def get_online_friends(self, user_id: str) -> List[str]:
        """Get friends who are currently online."""
        # Intersect friends with online users
        online_friends = r.sinter(
            f"friends:{user_id}",
            "users:online"
        )
        return list(online_friends)

    def get_friends_presence(self, user_id: str) -> Dict[str, Dict]:
        """Get presence status for all friends."""
        friends = self.get_friends(user_id)

        if not friends:
            return {}

        presence = BasicPresence()
        return presence.get_multiple_statuses(list(friends))

    def subscribe_to_friends_presence(self, user_id: str, callback) -> None:
        """Subscribe to presence changes for friends."""
        friends = self.get_friends(user_id)

        def filtered_callback(message):
            # Only forward messages about friends
            if message.get("user_id") in friends:
                callback(message)

        # Subscribe to global presence changes
        def listener():
            pubsub = r.pubsub()
            pubsub.subscribe("presence:changes")

            for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    filtered_callback(data)

        thread = threading.Thread(target=listener, daemon=True)
        thread.start()


# Usage
friend_presence = FriendPresence()

# Add friends
friend_presence.add_friend("user_alice", "user_bob")
friend_presence.add_friend("user_alice", "user_charlie")

# Get friends' presence
friends_status = friend_presence.get_friends_presence("user_alice")
print(f"Friends presence: {friends_status}")

# Get only online friends
online = friend_presence.get_online_friends("user_alice")
print(f"Online friends: {online}")
```

## Real-Time Presence Updates with WebSocket

Integrate presence with WebSocket connections:

```python
# Flask-SocketIO example
"""
from flask import Flask
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

presence = BasicPresence()
room_presence = RoomPresence()
friend_presence = FriendPresence()

@socketio.on('connect')
def handle_connect():
    user_id = get_user_from_session()  # Your auth logic
    device_id = request.sid  # Socket ID as device ID

    # Mark user as online
    multi_presence = MultiDevicePresence()
    multi_presence.device_connect(user_id, device_id, {
        "type": "web",
        "platform": request.user_agent.platform
    })

    # Join personal room for direct messages
    join_room(f"user:{user_id}")

    # Subscribe to friends' presence
    friends = friend_presence.get_friends(user_id)
    for friend_id in friends:
        join_room(f"presence:{friend_id}")

    # Notify friends
    for friend_id in friends:
        socketio.emit('friend_online', {
            'user_id': user_id
        }, room=f"user:{friend_id}")

@socketio.on('disconnect')
def handle_disconnect():
    user_id = get_user_from_session()
    device_id = request.sid

    multi_presence = MultiDevicePresence()
    result = multi_presence.device_disconnect(user_id, device_id)

    # If user is now fully offline, notify friends
    if result['remaining_devices'] == 0:
        friends = friend_presence.get_friends(user_id)
        for friend_id in friends:
            socketio.emit('friend_offline', {
                'user_id': user_id
            }, room=f"user:{friend_id}")

@socketio.on('heartbeat')
def handle_heartbeat():
    user_id = get_user_from_session()
    device_id = request.sid

    multi_presence = MultiDevicePresence()
    multi_presence.device_heartbeat(user_id, device_id)

@socketio.on('join_room')
def handle_join_room(data):
    user_id = get_user_from_session()
    room_id = data['room_id']

    room_presence.join_room(user_id, room_id)
    join_room(f"room:{room_id}")

    # Notify room members
    emit('user_joined', {
        'user_id': user_id
    }, room=f"room:{room_id}")

@socketio.on('leave_room')
def handle_leave_room(data):
    user_id = get_user_from_session()
    room_id = data['room_id']

    room_presence.leave_room(user_id, room_id)
    leave_room(f"room:{room_id}")

    emit('user_left', {
        'user_id': user_id
    }, room=f"room:{room_id}")

@socketio.on('typing')
def handle_typing(data):
    user_id = get_user_from_session()
    channel_id = data['channel_id']

    typing = TypingIndicator()
    typing.set_typing(user_id, channel_id)

    emit('user_typing', {
        'user_id': user_id
    }, room=f"room:{channel_id}")

@socketio.on('stop_typing')
def handle_stop_typing(data):
    user_id = get_user_from_session()
    channel_id = data['channel_id']

    typing = TypingIndicator()
    typing.clear_typing(user_id, channel_id)

    emit('user_stopped_typing', {
        'user_id': user_id
    }, room=f"room:{channel_id}")

# Background task to clean up stale presence
def cleanup_stale_presence():
    while True:
        # This runs periodically to clean up any orphaned presence data
        time.sleep(60)
        # Implementation would scan and clean stale entries

# Run cleanup in background
import threading
cleanup_thread = threading.Thread(target=cleanup_stale_presence, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    socketio.run(app, debug=True)
"""
```

## Conclusion

Redis provides an excellent foundation for implementing presence detection systems. Key takeaways:

- Use **TTL-based keys** with heartbeats for automatic offline detection
- Use **sorted sets** for querying recently active users
- Use **sets** for efficient "who's online" queries
- Use **Pub/Sub** for real-time presence notifications
- Implement **multi-device support** for modern applications
- Use **room-based presence** for channels and group chats
- Add **typing indicators** for responsive chat experiences

With these patterns, you can build presence detection systems that handle millions of concurrent users while maintaining real-time accuracy.

## Related Resources

- [Redis Key Expiration](https://redis.io/commands/expire/)
- [Redis Pub/Sub](https://redis.io/docs/interact/pubsub/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
