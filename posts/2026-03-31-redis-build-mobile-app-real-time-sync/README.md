# How to Build a Mobile App Real-Time Sync with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Mobile, Real-Time, Pub/Sub, Sync

Description: Learn how to use Redis Pub/Sub and keyspace notifications to synchronize data in real time across mobile app clients.

---

Real-time sync keeps mobile app users on the same page. When one user updates a shared document or cart, others should see the change immediately. Redis Pub/Sub makes this straightforward without polling.

## Architecture Overview

The pattern uses a thin backend server that subscribes to Redis channels and pushes updates to connected mobile clients via WebSockets or Server-Sent Events.

```text
Mobile Client A --> REST/WebSocket --> App Server --> Redis (PUBLISH)
Mobile Client B <-- WebSocket <-- App Server <-- Redis (SUBSCRIBE)
```

## Setting Up Redis Pub/Sub

On the server side, create a dedicated subscriber connection. In Node.js:

```javascript
const Redis = require("ioredis");
const pub = new Redis();
const sub = new Redis();

// Subscribe to a room/document channel
sub.subscribe("room:123", (err, count) => {
  if (err) console.error("Subscribe error:", err);
  console.log(`Subscribed to ${count} channel(s)`);
});

sub.on("message", (channel, message) => {
  const payload = JSON.parse(message);
  broadcastToClients(channel, payload);
});

// Publish an update from a client
async function publishUpdate(roomId, data) {
  await pub.publish(`room:${roomId}`, JSON.stringify(data));
}
```

## Handling Mobile Client Connections

Use WebSockets to maintain persistent connections. When a client connects, register it against the appropriate channel:

```javascript
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });
const roomClients = new Map();

wss.on("connection", (ws, req) => {
  const roomId = req.url.replace("/", "");
  if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
  roomClients.get(roomId).add(ws);

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg);
    await publishUpdate(roomId, data);
  });

  ws.on("close", () => {
    roomClients.get(roomId)?.delete(ws);
  });
});

function broadcastToClients(channel, payload) {
  const roomId = channel.split(":")[1];
  const clients = roomClients.get(roomId) || new Set();
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }
}
```

## Persisting Last Known State

Combine Pub/Sub with a Redis hash so new clients can fetch current state on connect:

```javascript
async function updateRoomState(roomId, key, value) {
  await pub.hset(`state:${roomId}`, key, value);
  await pub.publish(`room:${roomId}`, JSON.stringify({ key, value }));
}

async function getRoomState(roomId) {
  return pub.hgetall(`state:${roomId}`);
}
```

When a mobile client connects, call `getRoomState` to hydrate the UI before subscribing for live updates.

## Handling Reconnects

Mobile networks are unreliable. Track the last message ID so clients can request missed updates on reconnect:

```javascript
async function getUpdatesSince(roomId, lastTimestamp) {
  const key = `history:${roomId}`;
  return pub.zrangebyscore(key, lastTimestamp, "+inf");
}

async function recordUpdate(roomId, data) {
  const key = `history:${roomId}`;
  const score = Date.now();
  await pub.zadd(key, score, JSON.stringify(data));
  await pub.expire(key, 3600); // keep 1 hour of history
}
```

## Summary

Redis Pub/Sub provides a simple, low-latency backbone for mobile real-time sync. Pairing channels with hash-based state storage and a sorted-set history log gives clients everything they need: live updates, initial hydration, and catch-up on reconnect. This approach scales horizontally by adding more app server instances that all share the same Redis subscription.
