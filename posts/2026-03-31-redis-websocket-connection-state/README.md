# How to Track WebSocket Connection State with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, WebSocket, State Management

Description: Learn how to track WebSocket connection state in Redis to enable cross-server presence detection, connection counts, and user online status in distributed deployments.

---

When WebSocket servers scale horizontally, each server only knows about its own connections. If a user connects to server A and a message arrives at server B, server B has no way to know if the user is online. Storing connection state in Redis solves this by giving all servers a shared view of active connections.

## Connection State Data Model

Store connection metadata in Redis hashes keyed by connection ID:

```bash
HSET conn:abc123 userId user_42 serverId server-1 connectedAt 1706054400 lastPing 1706054500
EXPIRE conn:abc123 120
```

Also maintain a set of connection IDs per user:

```bash
SADD user:user_42:connections abc123 def456
EXPIRE user:user_42:connections 120
```

## Registering Connections on Connect

```javascript
const WebSocket = require('ws');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const wss = new WebSocket.Server({ port: 8080 });
const serverId = process.env.SERVER_ID || 'server-1';

wss.on('connection', async (ws, req) => {
  const connId = uuidv4();
  const userId = req.headers['x-user-id'];

  // Store connection state
  await redis.hSet(`conn:${connId}`, {
    userId,
    serverId,
    connectedAt: Date.now(),
    lastPing: Date.now()
  });
  await redis.expire(`conn:${connId}`, 120);

  // Add to user's connection set
  await redis.sAdd(`user:${userId}:connections`, connId);
  await redis.expire(`user:${userId}:connections`, 120);

  // Heartbeat refresh
  const heartbeat = setInterval(async () => {
    await redis.hSet(`conn:${connId}`, 'lastPing', Date.now());
    await redis.expire(`conn:${connId}`, 120);
    await redis.expire(`user:${userId}:connections`, 120);
  }, 30000);

  ws.on('close', async () => {
    clearInterval(heartbeat);
    await redis.del(`conn:${connId}`);
    await redis.sRem(`user:${userId}:connections`, connId);
  });
});
```

## Checking User Online Status

```javascript
async function isUserOnline(userId) {
  const connections = await redis.sMembers(`user:${userId}:connections`);

  // Filter out stale connections
  const live = [];
  for (const connId of connections) {
    const exists = await redis.exists(`conn:${connId}`);
    if (exists) {
      live.push(connId);
    } else {
      await redis.sRem(`user:${userId}:connections`, connId);
    }
  }

  return live.length > 0;
}

async function getUserConnectionCount(userId) {
  return redis.sCard(`user:${userId}:connections`);
}
```

## Getting All Online Users

```javascript
async function getOnlineUsers() {
  const keys = await redis.keys('user:*:connections');
  const onlineUsers = [];

  for (const key of keys) {
    const userId = key.split(':')[1];
    const count = await redis.sCard(key);
    if (count > 0) onlineUsers.push(userId);
  }

  return onlineUsers;
}
```

## Broadcasting Presence Updates

When a user connects or disconnects, publish a presence event:

```javascript
wss.on('connection', async (ws, req) => {
  // ... register connection ...

  await redis.publish('presence', JSON.stringify({
    event: 'connected',
    userId,
    connId
  }));

  ws.on('close', async () => {
    // ... cleanup ...
    await redis.publish('presence', JSON.stringify({
      event: 'disconnected',
      userId,
      connId
    }));
  });
});
```

## Summary

Tracking WebSocket connection state in Redis enables multi-server presence detection by maintaining per-connection hash entries and per-user connection sets. TTL-based expiry handles crashed connections automatically, and heartbeat refreshes keep active connections alive. Publishing presence events to Redis Pub/Sub lets other services react to connect and disconnect events in real time.
