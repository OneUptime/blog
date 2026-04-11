# How to Design a Real-Time Chat System Using Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Real-Time, Chat, Pub/Sub, Scalability

Description: Learn how to design a scalable real-time chat system using Redis Pub/Sub, sorted sets, and streams in a system design interview.

---

## Why Redis for a Chat System

Redis is a natural fit for chat systems because it provides sub-millisecond latency, built-in Pub/Sub messaging, and data structures that map directly to chat concepts like message history, presence tracking, and user lists. In a system design interview, choosing Redis demonstrates awareness of the tradeoffs between consistency and speed for user-facing real-time features.

## High-Level Architecture

A real-time chat system has several key components:

- **Message broker** - routes messages between users or groups
- **Message history store** - persists recent messages for retrieval
- **Presence service** - tracks online/offline status
- **Session store** - maps users to their WebSocket connections

Redis handles all four roles with different data structures.

```text
Client -> WebSocket Server -> Redis Pub/Sub -> Other WebSocket Servers -> Clients
                          -> Redis Streams   (message persistence)
                          -> Redis Sorted Set (message ordering)
                          -> Redis Hash       (user presence)
```

## Pub/Sub for Real-Time Message Delivery

Redis Pub/Sub enables a message published in one process to be received by all subscribers across multiple server instances.

```bash
# Publisher (WebSocket server receiving a message)
PUBLISH chat:room:42 '{"from":"alice","text":"Hello!","ts":1711900000}'

# Subscriber (WebSocket server delivering to clients)
SUBSCRIBE chat:room:42
```

In Node.js:

```javascript
const redis = require('redis');
const pub = redis.createClient();
const sub = redis.createClient();

await pub.connect();
await sub.connect();

// When Alice sends a message
async function sendMessage(roomId, userId, text) {
  const message = JSON.stringify({ from: userId, text, ts: Date.now() });
  await pub.publish(`chat:room:${roomId}`, message);
}

// WebSocket server subscribes to room channels
await sub.subscribe('chat:room:42', (message) => {
  const parsed = JSON.parse(message);
  // Broadcast to all connected WebSocket clients in room 42
  broadcastToRoom(42, parsed);
});
```

## Message History with Redis Streams

Redis Streams provide an append-only log with consumer group support, making them ideal for message persistence and replay.

```bash
# Append a message to the stream
XADD chat:room:42:messages * from alice text "Hello!"

# Read last 50 messages
XREVRANGE chat:room:42:messages + - COUNT 50

# Read messages after a specific ID (pagination)
XRANGE chat:room:42:messages 1711900000000-0 + COUNT 20
```

Stream entries have auto-generated IDs based on timestamp, so ordering is guaranteed. Trim old messages to prevent unbounded growth:

```bash
# Keep only last 1000 messages
XADD chat:room:42:messages MAXLEN ~ 1000 * from alice text "Hello!"
```

## Presence Tracking with Hashes and Expiry

Track which users are online using a hash combined with key expiration:

```bash
# Mark user as online using a hash (note: EXPIRE applies to the whole key)
HSET presence:room:42 user:alice "online"
EXPIRE presence:room:42 60

# Using a separate key per user for fine-grained TTL (preferred)
SET presence:user:alice:room:42 1 EX 60

# Get all online users in a room
HGETALL presence:room:42
```

In application code:

```javascript
// Heartbeat from client
async function updatePresence(userId, roomId) {
  await redis.set(`presence:${userId}:${roomId}`, 1, { EX: 60 });
}

// Get online users
async function getOnlineUsers(roomId) {
  const keys = await redis.keys(`presence:*:${roomId}`);
  return keys.map(k => k.split(':')[1]);
}
```

## Unread Message Counters with Sorted Sets

Track unread counts per user using sorted sets where the score is the count:

```bash
# Increment unread count for a user
ZINCRBY unread:user:bob 1 room:42

# Get all rooms with unread messages for bob
ZRANGEBYSCORE unread:user:bob 1 +inf WITHSCORES

# Reset unread count when user opens room
ZREM unread:user:bob room:42
```

## Direct Messages vs. Group Channels

For direct messages, use a deterministic channel key:

```javascript
function getDMChannel(userId1, userId2) {
  const sorted = [userId1, userId2].sort();
  return `chat:dm:${sorted[0]}:${sorted[1]}`;
}
```

For group channels, use the room ID directly: `chat:room:{roomId}`.

## Handling Reconnections and Message Replay

When a user reconnects after a disconnect, they may have missed messages. Use the stream ID to resume:

```javascript
async function reconnect(userId, roomId, lastSeenId) {
  // Fetch messages missed since last seen
  const missed = await redis.xRange(
    `chat:room:${roomId}:messages`,
    lastSeenId,
    '+',
    { COUNT: 100 }
  );
  return missed;
}
```

Store the last-seen stream ID per user:

```bash
SET user:alice:room:42:lastSeen 1711900000000-0
```

## Scaling Considerations

| Component | Redis Strategy | Notes |
|---|---|---|
| Message delivery | Pub/Sub | Stateless, horizontally scalable |
| Message history | Streams | Persistent, replayable |
| Presence | Keys with TTL | Simple, low memory |
| Unread counts | Sorted Sets | O(log N) operations |
| Rate limiting | INCR + EXPIRE | Prevent spam |

For very high scale, use Redis Cluster to shard by room ID. Route all operations for a given room to the same shard using hash tags: `{room:42}:messages`.

## Summary

Designing a real-time chat system with Redis involves combining Pub/Sub for live message delivery, Streams for persistent history, hashes and expiring keys for presence, and sorted sets for unread counts. This architecture scales horizontally by running multiple WebSocket servers all connected to the same Redis instance or cluster. In a system design interview, be ready to discuss tradeoffs around message durability, fan-out to millions of users, and how to handle Pub/Sub's fire-and-forget nature for offline users.
