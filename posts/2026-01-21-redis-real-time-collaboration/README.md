# How to Implement Real-Time Collaboration with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Real-Time, Collaboration, WebSockets, Presence, Shared Editing, Cursors

Description: A comprehensive guide to implementing real-time collaboration features with Redis, covering presence detection, cursor tracking, shared editing, and conflict resolution for building collaborative applications.

---

Real-time collaboration enables multiple users to work together simultaneously on shared content - from documents and spreadsheets to design tools and code editors. Redis provides the low-latency data structures needed to synchronize state across users in real-time. This guide covers how to implement presence detection, cursor tracking, and collaborative editing with Redis.

## Collaboration Architecture Overview

A real-time collaboration system typically includes:

1. **Presence Service**: Track who's online and what they're viewing
2. **Cursor/Selection Sync**: Share cursor positions and selections
3. **Operation Sync**: Synchronize edits across clients
4. **Conflict Resolution**: Handle concurrent edits
5. **State Recovery**: Restore state for new/reconnecting users

## Presence Detection

### Basic Presence System

```python
import redis
import json
import time
from typing import Dict, List, Optional

class PresenceService:
    """Track user presence in documents/rooms"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.presence_ttl = 30  # Seconds before considering user offline

    def join(self, room_id: str, user_id: str, user_info: dict):
        """User joins a room"""
        key = f"presence:{room_id}"
        member_key = f"presence:{room_id}:members"

        user_data = {
            'user_id': user_id,
            'name': user_info.get('name', ''),
            'avatar': user_info.get('avatar', ''),
            'color': user_info.get('color', self._generate_color(user_id)),
            'joined_at': time.time(),
            'last_seen': time.time()
        }

        # Add to presence hash
        self.redis.hset(key, user_id, json.dumps(user_data))
        self.redis.expire(key, self.presence_ttl * 2)

        # Add to sorted set for expiration tracking
        self.redis.zadd(member_key, {user_id: time.time()})

        # Publish join event
        self.redis.publish(f"room:{room_id}:presence", json.dumps({
            'type': 'join',
            'user': user_data
        }))

        return user_data

    def leave(self, room_id: str, user_id: str):
        """User leaves a room"""
        key = f"presence:{room_id}"
        member_key = f"presence:{room_id}:members"

        # Get user data before removing
        user_data = self.redis.hget(key, user_id)

        # Remove from presence
        self.redis.hdel(key, user_id)
        self.redis.zrem(member_key, user_id)

        # Publish leave event
        self.redis.publish(f"room:{room_id}:presence", json.dumps({
            'type': 'leave',
            'user_id': user_id
        }))

    def heartbeat(self, room_id: str, user_id: str):
        """Update user's last seen timestamp"""
        key = f"presence:{room_id}"
        member_key = f"presence:{room_id}:members"

        # Update last_seen in hash
        user_json = self.redis.hget(key, user_id)
        if user_json:
            user_data = json.loads(user_json)
            user_data['last_seen'] = time.time()
            self.redis.hset(key, user_id, json.dumps(user_data))
            self.redis.expire(key, self.presence_ttl * 2)

        # Update score in sorted set
        self.redis.zadd(member_key, {user_id: time.time()})

    def get_members(self, room_id: str) -> List[Dict]:
        """Get all active members in a room"""
        key = f"presence:{room_id}"
        member_key = f"presence:{room_id}:members"

        # Clean up expired members first
        cutoff = time.time() - self.presence_ttl
        expired = self.redis.zrangebyscore(member_key, '-inf', cutoff)

        for user_id in expired:
            self.leave(room_id, user_id)

        # Get active members
        members_json = self.redis.hgetall(key)
        members = []

        for user_id, data in members_json.items():
            member = json.loads(data)
            member['is_active'] = (time.time() - member['last_seen']) < self.presence_ttl
            members.append(member)

        return members

    def get_member_count(self, room_id: str) -> int:
        """Get count of active members"""
        member_key = f"presence:{room_id}:members"
        cutoff = time.time() - self.presence_ttl
        return self.redis.zcount(member_key, cutoff, '+inf')

    def _generate_color(self, user_id: str) -> str:
        """Generate consistent color for user"""
        colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ]
        return colors[hash(user_id) % len(colors)]


# Usage
r = redis.Redis(decode_responses=True)
presence = PresenceService(r)

# User joins
user_data = presence.join('doc_123', 'user_456', {
    'name': 'John Doe',
    'avatar': 'https://example.com/avatar.jpg'
})

# Get all members
members = presence.get_members('doc_123')
print(f"Members: {members}")

# Heartbeat (call periodically)
presence.heartbeat('doc_123', 'user_456')
```

### WebSocket Integration for Presence

```python
import asyncio
import aioredis
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set

app = FastAPI()

class CollaborationManager:
    """Manage collaborative sessions with WebSocket"""

    def __init__(self):
        self.connections: Dict[str, Dict[str, WebSocket]] = {}  # room -> user -> ws
        self.redis = None
        self.pubsub_tasks: Dict[str, asyncio.Task] = {}

    async def get_redis(self):
        if not self.redis:
            self.redis = await aioredis.from_url('redis://localhost', decode_responses=True)
        return self.redis

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, user_info: dict):
        """Connect user to room"""
        await websocket.accept()

        # Initialize room if needed
        if room_id not in self.connections:
            self.connections[room_id] = {}
            # Start listening to room events
            self.pubsub_tasks[room_id] = asyncio.create_task(
                self._subscribe_to_room(room_id)
            )

        self.connections[room_id][user_id] = websocket

        # Register presence in Redis
        redis = await self.get_redis()
        user_data = {
            'user_id': user_id,
            **user_info,
            'joined_at': asyncio.get_event_loop().time()
        }
        await redis.hset(f"presence:{room_id}", user_id, json.dumps(user_data))

        # Notify others
        await self._broadcast_to_room(room_id, {
            'type': 'user_joined',
            'user': user_data
        }, exclude_user=user_id)

        # Send current state to new user
        await self._send_initial_state(websocket, room_id)

    async def disconnect(self, room_id: str, user_id: str):
        """Disconnect user from room"""
        if room_id in self.connections and user_id in self.connections[room_id]:
            del self.connections[room_id][user_id]

            # Clean up empty room
            if not self.connections[room_id]:
                del self.connections[room_id]
                if room_id in self.pubsub_tasks:
                    self.pubsub_tasks[room_id].cancel()
                    del self.pubsub_tasks[room_id]

        # Remove from Redis
        redis = await self.get_redis()
        await redis.hdel(f"presence:{room_id}", user_id)

        # Notify others
        await self._broadcast_to_room(room_id, {
            'type': 'user_left',
            'user_id': user_id
        })

    async def _subscribe_to_room(self, room_id: str):
        """Subscribe to Redis pubsub for room"""
        redis = await self.get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"room:{room_id}")

        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    data = json.loads(message['data'])
                    await self._broadcast_to_room(
                        room_id,
                        data,
                        exclude_user=data.get('from_user')
                    )
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(f"room:{room_id}")

    async def _broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        """Broadcast message to all users in room"""
        if room_id not in self.connections:
            return

        message_str = json.dumps(message)
        dead_connections = []

        for user_id, ws in self.connections[room_id].items():
            if user_id == exclude_user:
                continue
            try:
                await ws.send_text(message_str)
            except Exception:
                dead_connections.append(user_id)

        # Clean up dead connections
        for user_id in dead_connections:
            await self.disconnect(room_id, user_id)

    async def _send_initial_state(self, websocket: WebSocket, room_id: str):
        """Send current room state to new user"""
        redis = await self.get_redis()

        # Get current members
        members_raw = await redis.hgetall(f"presence:{room_id}")
        members = [json.loads(m) for m in members_raw.values()]

        # Get cursors
        cursors_raw = await redis.hgetall(f"cursors:{room_id}")
        cursors = {k: json.loads(v) for k, v in cursors_raw.items()}

        await websocket.send_text(json.dumps({
            'type': 'initial_state',
            'members': members,
            'cursors': cursors
        }))


manager = CollaborationManager()

@app.websocket("/ws/collab/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    user_info = {'name': f'User {user_id}'}  # Get from auth

    await manager.connect(websocket, room_id, user_id, user_info)

    try:
        while True:
            data = await websocket.receive_text()
            await handle_message(room_id, user_id, json.loads(data))
    except WebSocketDisconnect:
        await manager.disconnect(room_id, user_id)


async def handle_message(room_id: str, user_id: str, message: dict):
    """Handle incoming WebSocket message"""
    redis = await manager.get_redis()

    if message['type'] == 'cursor_move':
        await redis.hset(f"cursors:{room_id}", user_id, json.dumps(message['position']))
        await redis.publish(f"room:{room_id}", json.dumps({
            'type': 'cursor_update',
            'user_id': user_id,
            'position': message['position'],
            'from_user': user_id
        }))

    elif message['type'] == 'operation':
        # Handle document operation
        await redis.publish(f"room:{room_id}", json.dumps({
            'type': 'operation',
            'user_id': user_id,
            'operation': message['operation'],
            'from_user': user_id
        }))
```

## Cursor and Selection Tracking

```python
class CursorService:
    """Track and sync cursor positions"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.cursor_ttl = 30

    def update_cursor(self, room_id: str, user_id: str, position: dict):
        """Update user's cursor position"""
        key = f"cursors:{room_id}"

        cursor_data = {
            'user_id': user_id,
            'position': position,  # {line, column} or {x, y}
            'timestamp': time.time()
        }

        self.redis.hset(key, user_id, json.dumps(cursor_data))
        self.redis.expire(key, self.cursor_ttl)

        # Publish cursor update
        self.redis.publish(f"room:{room_id}:cursors", json.dumps(cursor_data))

    def update_selection(self, room_id: str, user_id: str, selection: dict):
        """Update user's selection"""
        key = f"selections:{room_id}"

        selection_data = {
            'user_id': user_id,
            'selection': selection,  # {start, end} positions
            'timestamp': time.time()
        }

        self.redis.hset(key, user_id, json.dumps(selection_data))
        self.redis.expire(key, self.cursor_ttl)

        # Publish selection update
        self.redis.publish(f"room:{room_id}:selections", json.dumps(selection_data))

    def get_all_cursors(self, room_id: str) -> Dict:
        """Get all cursor positions in room"""
        key = f"cursors:{room_id}"
        cursors_raw = self.redis.hgetall(key)

        cursors = {}
        cutoff = time.time() - self.cursor_ttl

        for user_id, data in cursors_raw.items():
            cursor = json.loads(data)
            if cursor['timestamp'] >= cutoff:
                cursors[user_id] = cursor

        return cursors

    def remove_cursor(self, room_id: str, user_id: str):
        """Remove user's cursor"""
        self.redis.hdel(f"cursors:{room_id}", user_id)
        self.redis.hdel(f"selections:{room_id}", user_id)

        self.redis.publish(f"room:{room_id}:cursors", json.dumps({
            'type': 'remove',
            'user_id': user_id
        }))


# JavaScript client for cursor rendering
```

```javascript
class CursorRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cursors = new Map();
    }

    updateCursor(userId, position, userName, color) {
        let cursorEl = this.cursors.get(userId);

        if (!cursorEl) {
            cursorEl = this.createCursorElement(userId, userName, color);
            this.cursors.set(userId, cursorEl);
        }

        // Position the cursor
        cursorEl.style.left = `${position.x}px`;
        cursorEl.style.top = `${position.y}px`;

        // Show cursor is active
        cursorEl.classList.add('active');
        clearTimeout(cursorEl.hideTimeout);
        cursorEl.hideTimeout = setTimeout(() => {
            cursorEl.classList.remove('active');
        }, 3000);
    }

    createCursorElement(userId, userName, color) {
        const cursor = document.createElement('div');
        cursor.className = 'remote-cursor';
        cursor.innerHTML = `
            <div class="cursor-caret" style="background-color: ${color}"></div>
            <div class="cursor-label" style="background-color: ${color}">${userName}</div>
        `;
        this.container.appendChild(cursor);
        return cursor;
    }

    removeCursor(userId) {
        const cursorEl = this.cursors.get(userId);
        if (cursorEl) {
            cursorEl.remove();
            this.cursors.delete(userId);
        }
    }

    updateSelection(userId, selection, color) {
        // Render selection highlight
        const existingHighlight = document.querySelector(`.selection-${userId}`);
        if (existingHighlight) {
            existingHighlight.remove();
        }

        if (selection) {
            const highlight = document.createElement('div');
            highlight.className = `selection-highlight selection-${userId}`;
            highlight.style.backgroundColor = `${color}33`; // With transparency
            // Position based on selection coordinates
            this.container.appendChild(highlight);
        }
    }
}

// CSS
const styles = `
.remote-cursor {
    position: absolute;
    pointer-events: none;
    z-index: 1000;
    transition: left 0.1s, top 0.1s;
}

.cursor-caret {
    width: 2px;
    height: 20px;
}

.cursor-label {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 3px;
    color: white;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s;
}

.remote-cursor.active .cursor-label {
    opacity: 1;
}

.selection-highlight {
    position: absolute;
    pointer-events: none;
}
`;
```

## Collaborative Document Editing

### Operational Transformation (OT) with Redis

```python
import redis
import json
import time
import uuid
from typing import List, Dict, Optional

class Operation:
    """Represents an edit operation"""

    def __init__(self, type_: str, position: int, text: str = '', length: int = 0):
        self.type = type_  # 'insert' or 'delete'
        self.position = position
        self.text = text  # For insert
        self.length = length  # For delete
        self.id = str(uuid.uuid4())
        self.timestamp = time.time()

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'position': self.position,
            'text': self.text,
            'length': self.length,
            'timestamp': self.timestamp
        }

    @classmethod
    def from_dict(cls, data):
        op = cls(data['type'], data['position'], data.get('text', ''), data.get('length', 0))
        op.id = data['id']
        op.timestamp = data['timestamp']
        return op


class CollaborativeDocument:
    """Collaborative document with OT"""

    def __init__(self, redis_client, doc_id: str):
        self.redis = redis_client
        self.doc_id = doc_id
        self.content_key = f"doc:{doc_id}:content"
        self.ops_key = f"doc:{doc_id}:operations"
        self.version_key = f"doc:{doc_id}:version"

    def get_content(self) -> str:
        """Get current document content"""
        return self.redis.get(self.content_key) or ''

    def get_version(self) -> int:
        """Get current document version"""
        return int(self.redis.get(self.version_key) or 0)

    def apply_operation(self, operation: Operation, user_id: str, base_version: int) -> dict:
        """Apply operation with conflict resolution"""
        # Use Lua script for atomicity
        APPLY_OP_SCRIPT = """
        local content_key = KEYS[1]
        local ops_key = KEYS[2]
        local version_key = KEYS[3]

        local op_json = ARGV[1]
        local user_id = ARGV[2]
        local base_version = tonumber(ARGV[3])

        local current_version = tonumber(redis.call('GET', version_key) or 0)
        local content = redis.call('GET', content_key) or ''
        local op = cjson.decode(op_json)

        -- Check if we need to transform the operation
        if base_version < current_version then
            -- Get operations since base_version
            local ops_since = redis.call('ZRANGEBYSCORE', ops_key, base_version + 1, current_version)

            -- Transform operation against each
            for _, past_op_json in ipairs(ops_since) do
                local past_op = cjson.decode(past_op_json)
                op = transform_operation(op, past_op)
            end
        end

        -- Apply operation to content
        if op.type == 'insert' then
            local pos = math.min(op.position, #content)
            content = string.sub(content, 1, pos) .. op.text .. string.sub(content, pos + 1)
        elseif op.type == 'delete' then
            local pos = math.min(op.position, #content)
            local del_end = math.min(pos + op.length, #content)
            content = string.sub(content, 1, pos) .. string.sub(content, del_end + 1)
        end

        -- Update state
        local new_version = current_version + 1
        redis.call('SET', content_key, content)
        redis.call('SET', version_key, new_version)

        -- Store operation with version as score
        op.version = new_version
        op.user_id = user_id
        redis.call('ZADD', ops_key, new_version, cjson.encode(op))

        -- Trim old operations (keep last 1000)
        redis.call('ZREMRANGEBYRANK', ops_key, 0, -1001)

        return cjson.encode({
            success = true,
            version = new_version,
            operation = op,
            content = content
        })
        """

        # Simplified Python version (for demonstration)
        content = self.get_content()
        current_version = self.get_version()

        # Transform if needed
        if base_version < current_version:
            ops_since = self.redis.zrangebyscore(
                self.ops_key,
                base_version + 1,
                current_version
            )
            for op_json in ops_since:
                past_op = Operation.from_dict(json.loads(op_json))
                operation = self._transform(operation, past_op)

        # Apply operation
        if operation.type == 'insert':
            pos = min(operation.position, len(content))
            content = content[:pos] + operation.text + content[pos:]
        elif operation.type == 'delete':
            pos = min(operation.position, len(content))
            end = min(pos + operation.length, len(content))
            content = content[:pos] + content[end:]

        # Update state atomically
        pipe = self.redis.pipeline()
        new_version = current_version + 1
        pipe.set(self.content_key, content)
        pipe.set(self.version_key, new_version)

        op_data = operation.to_dict()
        op_data['version'] = new_version
        op_data['user_id'] = user_id
        pipe.zadd(self.ops_key, {json.dumps(op_data): new_version})
        pipe.execute()

        # Publish operation
        self.redis.publish(f"doc:{self.doc_id}:ops", json.dumps(op_data))

        return {
            'success': True,
            'version': new_version,
            'operation': op_data
        }

    def _transform(self, op1: Operation, op2: Operation) -> Operation:
        """Transform op1 against op2 (basic OT)"""
        if op1.type == 'insert' and op2.type == 'insert':
            if op1.position > op2.position:
                op1.position += len(op2.text)
            elif op1.position == op2.position:
                # Tie-break by operation ID
                if op1.id > op2.id:
                    op1.position += len(op2.text)

        elif op1.type == 'insert' and op2.type == 'delete':
            if op1.position > op2.position:
                op1.position = max(op2.position, op1.position - op2.length)

        elif op1.type == 'delete' and op2.type == 'insert':
            if op2.position <= op1.position:
                op1.position += len(op2.text)

        elif op1.type == 'delete' and op2.type == 'delete':
            if op2.position < op1.position:
                op1.position = max(op2.position, op1.position - op2.length)
            elif op2.position < op1.position + op1.length:
                overlap = min(op1.position + op1.length, op2.position + op2.length) - op2.position
                op1.length = max(0, op1.length - overlap)

        return op1

    def get_operations_since(self, version: int) -> List[Dict]:
        """Get operations since a version"""
        ops_json = self.redis.zrangebyscore(self.ops_key, version + 1, '+inf')
        return [json.loads(op) for op in ops_json]


# Usage
r = redis.Redis(decode_responses=True)
doc = CollaborativeDocument(r, 'doc_123')

# Apply an insert operation
op = Operation('insert', 5, 'Hello ')
result = doc.apply_operation(op, 'user_456', doc.get_version())
print(f"Result: {result}")
```

## Conflict-Free Replicated Data Types (CRDTs)

For certain use cases, CRDTs provide automatic conflict resolution.

```python
class LWWRegister:
    """Last-Write-Wins Register CRDT"""

    def __init__(self, redis_client, key: str):
        self.redis = redis_client
        self.key = key

    def set(self, value: str, timestamp: float = None):
        """Set value with timestamp"""
        timestamp = timestamp or time.time()
        current = self.redis.hgetall(self.key)

        current_ts = float(current.get('timestamp', 0))
        if timestamp > current_ts:
            self.redis.hset(self.key, mapping={
                'value': value,
                'timestamp': timestamp
            })
            return True
        return False

    def get(self) -> Optional[str]:
        """Get current value"""
        return self.redis.hget(self.key, 'value')

    def merge(self, other_value: str, other_timestamp: float):
        """Merge with remote state"""
        return self.set(other_value, other_timestamp)


class GCounter:
    """Grow-only Counter CRDT"""

    def __init__(self, redis_client, key: str, node_id: str):
        self.redis = redis_client
        self.key = key
        self.node_id = node_id

    def increment(self, amount: int = 1):
        """Increment this node's counter"""
        self.redis.hincrby(self.key, self.node_id, amount)

    def value(self) -> int:
        """Get total count across all nodes"""
        counts = self.redis.hgetall(self.key)
        return sum(int(c) for c in counts.values())

    def merge(self, other_counts: Dict[str, int]):
        """Merge with remote state"""
        pipe = self.redis.pipeline()
        for node_id, count in other_counts.items():
            # Keep the maximum for each node
            current = int(self.redis.hget(self.key, node_id) or 0)
            if count > current:
                pipe.hset(self.key, node_id, count)
        pipe.execute()


class ORSet:
    """Observed-Remove Set CRDT"""

    def __init__(self, redis_client, key: str):
        self.redis = redis_client
        self.key = key

    def add(self, element: str):
        """Add element with unique tag"""
        tag = str(uuid.uuid4())
        self.redis.hset(f"{self.key}:elements", f"{element}:{tag}", element)

    def remove(self, element: str):
        """Remove all instances of element"""
        elements = self.redis.hgetall(f"{self.key}:elements")
        to_remove = [k for k, v in elements.items() if v == element]
        if to_remove:
            self.redis.hdel(f"{self.key}:elements", *to_remove)

    def contains(self, element: str) -> bool:
        """Check if element is in set"""
        elements = self.redis.hgetall(f"{self.key}:elements")
        return element in elements.values()

    def members(self) -> set:
        """Get all elements"""
        elements = self.redis.hgetall(f"{self.key}:elements")
        return set(elements.values())


# Usage
r = redis.Redis(decode_responses=True)

# LWW Register for shared state
title = LWWRegister(r, 'doc:123:title')
title.set('My Document')

# G-Counter for view count
views = GCounter(r, 'doc:123:views', 'server_1')
views.increment()
print(f"Total views: {views.value()}")

# OR-Set for collaborators
collaborators = ORSet(r, 'doc:123:collaborators')
collaborators.add('user_1')
collaborators.add('user_2')
print(f"Collaborators: {collaborators.members()}")
```

## Best Practices

### 1. Throttle Updates

```javascript
class ThrottledSync {
    constructor(syncFn, intervalMs = 50) {
        this.syncFn = syncFn;
        this.intervalMs = intervalMs;
        this.pending = null;
        this.lastSync = 0;
    }

    schedule(data) {
        this.pending = data;

        const now = Date.now();
        const elapsed = now - this.lastSync;

        if (elapsed >= this.intervalMs) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => {
                this.flush();
                this.timer = null;
            }, this.intervalMs - elapsed);
        }
    }

    flush() {
        if (this.pending) {
            this.syncFn(this.pending);
            this.pending = null;
            this.lastSync = Date.now();
        }
    }
}

// Usage for cursor updates
const cursorSync = new ThrottledSync((position) => {
    ws.send(JSON.stringify({ type: 'cursor_move', position }));
}, 50);

document.addEventListener('mousemove', (e) => {
    cursorSync.schedule({ x: e.clientX, y: e.clientY });
});
```

### 2. Handle Reconnection

```python
class ReconnectingCollaborator:
    """Handle reconnection with state recovery"""

    def __init__(self, redis_client, doc_id: str):
        self.redis = redis_client
        self.doc_id = doc_id
        self.last_version = 0

    async def reconnect(self):
        """Recover state after reconnection"""
        # Get operations we missed
        missed_ops = await self.redis.zrangebyscore(
            f"doc:{self.doc_id}:operations",
            self.last_version + 1,
            '+inf'
        )

        # Apply missed operations
        for op_json in missed_ops:
            op = json.loads(op_json)
            self.apply_remote_operation(op)
            self.last_version = op['version']

        return len(missed_ops)
```

### 3. Implement Undo/Redo

```python
class UndoManager:
    """Manage undo/redo for collaborative editing"""

    def __init__(self, redis_client, doc_id: str, user_id: str):
        self.redis = redis_client
        self.doc_id = doc_id
        self.user_id = user_id
        self.undo_key = f"doc:{doc_id}:undo:{user_id}"
        self.redo_key = f"doc:{doc_id}:redo:{user_id}"

    def record_operation(self, operation: dict):
        """Record operation for undo"""
        inverse = self._create_inverse(operation)
        self.redis.lpush(self.undo_key, json.dumps(inverse))
        self.redis.ltrim(self.undo_key, 0, 99)  # Keep last 100
        self.redis.delete(self.redo_key)  # Clear redo stack

    def undo(self) -> Optional[dict]:
        """Pop and return undo operation"""
        op_json = self.redis.lpop(self.undo_key)
        if op_json:
            op = json.loads(op_json)
            self.redis.lpush(self.redo_key, json.dumps(self._create_inverse(op)))
            return op
        return None

    def redo(self) -> Optional[dict]:
        """Pop and return redo operation"""
        op_json = self.redis.lpop(self.redo_key)
        if op_json:
            op = json.loads(op_json)
            self.redis.lpush(self.undo_key, json.dumps(self._create_inverse(op)))
            return op
        return None

    def _create_inverse(self, operation: dict) -> dict:
        """Create inverse operation"""
        if operation['type'] == 'insert':
            return {
                'type': 'delete',
                'position': operation['position'],
                'length': len(operation['text'])
            }
        elif operation['type'] == 'delete':
            return {
                'type': 'insert',
                'position': operation['position'],
                'text': operation.get('deleted_text', '')
            }
        return operation
```

## Conclusion

Building real-time collaboration with Redis requires careful consideration of presence, cursor sync, and conflict resolution. Key takeaways:

- Use presence detection to show who's online and active
- Implement cursor and selection tracking for visual feedback
- Choose between OT and CRDTs based on your use case
- Throttle high-frequency updates like cursor movements
- Handle reconnection gracefully with state recovery
- Implement undo/redo for better user experience

Redis provides the low-latency primitives needed for responsive collaboration, while proper architecture ensures consistency across all participants.
