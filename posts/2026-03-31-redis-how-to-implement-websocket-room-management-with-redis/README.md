# How to Implement WebSocket Room Management with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, WebSocket, Room Management, Real-Time, Node.js

Description: Manage WebSocket rooms across multiple server instances using Redis Sets and Hashes to track room membership, presence, and metadata persistently.

---

## Why Redis for Room Management

WebSocket rooms are typically stored in memory per server instance. This creates problems when:

- Clients in the same room are on different server instances
- Server restarts lose all room state
- You need to query room membership from other services

Redis stores room data centrally so any server instance can access consistent room state.

## Data Model

Use Redis Sets to store room members and Hashes for room metadata:

```text
room:{roomId}:members -> Set of userIds
room:{roomId}:meta -> Hash { name, createdAt, maxSize, ownerId }
user:{userId}:rooms -> Set of roomIds the user is in
```

## Room Manager Class

```javascript
const Redis = require('ioredis');

class RoomManager {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async createRoom(roomId, { name, ownerId, maxSize = 100 }) {
    const pipeline = this.redis.pipeline();
    pipeline.hset(`room:${roomId}:meta`, {
      name,
      ownerId,
      maxSize,
      createdAt: Date.now().toString(),
    });
    pipeline.sadd('rooms:all', roomId);
    await pipeline.exec();
    return roomId;
  }

  async joinRoom(roomId, userId) {
    const meta = await this.redis.hgetall(`room:${roomId}:meta`);
    if (!meta || !meta.name) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    const memberCount = await this.redis.scard(`room:${roomId}:members`);
    if (memberCount >= parseInt(meta.maxSize)) {
      throw new Error('Room is full');
    }

    const pipeline = this.redis.pipeline();
    pipeline.sadd(`room:${roomId}:members`, userId);
    pipeline.sadd(`user:${userId}:rooms`, roomId);
    pipeline.hset(`room:${roomId}:meta`, 'lastActivity', Date.now().toString());
    await pipeline.exec();

    return { success: true, memberCount: memberCount + 1 };
  }

  async leaveRoom(roomId, userId) {
    const pipeline = this.redis.pipeline();
    pipeline.srem(`room:${roomId}:members`, userId);
    pipeline.srem(`user:${userId}:rooms`, roomId);
    await pipeline.exec();

    // Auto-delete empty rooms
    const remaining = await this.redis.scard(`room:${roomId}:members`);
    if (remaining === 0) {
      await this.deleteRoom(roomId);
    }

    return { remaining };
  }

  async getRoomMembers(roomId) {
    return this.redis.smembers(`room:${roomId}:members`);
  }

  async getUserRooms(userId) {
    return this.redis.smembers(`user:${userId}:rooms`);
  }

  async getRoomMeta(roomId) {
    return this.redis.hgetall(`room:${roomId}:meta`);
  }

  async isUserInRoom(userId, roomId) {
    return this.redis.sismember(`room:${roomId}:members`, userId);
  }

  async deleteRoom(roomId) {
    const members = await this.redis.smembers(`room:${roomId}:members`);
    const pipeline = this.redis.pipeline();

    for (const userId of members) {
      pipeline.srem(`user:${userId}:rooms`, roomId);
    }

    pipeline.del(`room:${roomId}:members`);
    pipeline.del(`room:${roomId}:meta`);
    pipeline.srem('rooms:all', roomId);
    await pipeline.exec();
  }
}
```

## Integrating Room Manager with WebSocket Server

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');

const redis = new Redis({ host: process.env.REDIS_HOST });
const pubsub = redis.duplicate();
const subscriber = redis.duplicate();
const roomManager = new RoomManager(redis);

const wss = new WebSocket.Server({ port: 8080 });

// Subscribe to room events for cross-server broadcasting
await subscriber.psubscribe('room:*:events');

subscriber.on('pmessage', (pattern, channel, message) => {
  const roomId = channel.split(':')[1];
  const event = JSON.parse(message);

  // Forward to locally connected clients in this room
  broadcastToLocalRoom(roomId, event);
});

wss.on('connection', async (ws, req) => {
  const userId = extractUserId(req);
  ws.userId = userId;
  ws.rooms = new Set();

  ws.on('message', async (data) => {
    const { action, roomId, payload } = JSON.parse(data.toString());

    switch (action) {
      case 'join': {
        await roomManager.joinRoom(roomId, userId);
        ws.rooms.add(roomId);

        // Notify room members via Redis
        await pubsub.publish(`room:${roomId}:events`, JSON.stringify({
          type: 'user-joined',
          userId,
          timestamp: Date.now(),
        }));
        break;
      }

      case 'leave': {
        await roomManager.leaveRoom(roomId, userId);
        ws.rooms.delete(roomId);
        await pubsub.publish(`room:${roomId}:events`, JSON.stringify({
          type: 'user-left',
          userId,
          timestamp: Date.now(),
        }));
        break;
      }

      case 'message': {
        const inRoom = await roomManager.isUserInRoom(userId, roomId);
        if (!inRoom) {
          ws.send(JSON.stringify({ error: 'Not in room' }));
          return;
        }

        await pubsub.publish(`room:${roomId}:events`, JSON.stringify({
          type: 'message',
          userId,
          payload,
          timestamp: Date.now(),
        }));
        break;
      }
    }
  });

  ws.on('close', async () => {
    for (const roomId of ws.rooms) {
      await roomManager.leaveRoom(roomId, ws.userId);
    }
  });
});
```

## Room Listing and Discovery

```javascript
async function listRooms(cursor = '0', count = 20) {
  const rooms = [];
  let nextCursor = cursor;

  const [newCursor, roomIds] = await redis.sscan('rooms:all', cursor, 'COUNT', count);
  nextCursor = newCursor;

  for (const roomId of roomIds) {
    const [meta, memberCount] = await Promise.all([
      redis.hgetall(`room:${roomId}:meta`),
      redis.scard(`room:${roomId}:members`),
    ]);
    rooms.push({ roomId, ...meta, memberCount });
  }

  return { rooms, nextCursor };
}
```

## Summary

Redis provides persistent, cross-instance room management for WebSocket servers by storing membership in Sets and metadata in Hashes. Combine the `RoomManager` class with Redis Pub/Sub to broadcast room events to all server instances simultaneously, enabling reliable multi-server WebSocket room management without sticky sessions.
