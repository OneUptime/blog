# How to Build a Real-Time Collaboration Tool with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Real-Time, Collaboration, Pub/Sub, WebSocket, Node.js

Description: Learn how to build a real-time collaboration tool using Redis Pub/Sub and WebSockets, enabling multiple users to work together simultaneously.

---

## Overview

Real-time collaboration tools like Google Docs or Figma require instant synchronization between users. Redis Pub/Sub combined with WebSockets provides a scalable backbone for broadcasting changes to all connected clients in milliseconds.

## Architecture

```text
Client A --> WebSocket Server 1 --> Redis Pub/Sub --> WebSocket Server 2 --> Client B
                                               |
                                               --> WebSocket Server 3 --> Client C
```

Each WebSocket server subscribes to Redis channels. When a user makes a change, the server publishes to Redis, and all other servers broadcast it to their connected clients.

## Setting Up Dependencies

```bash
npm install ioredis ws express uuid
```

## Creating the Redis Pub/Sub Manager

```javascript
const Redis = require('ioredis');

class CollaborationManager {
  constructor() {
    this.publisher = new Redis({ host: 'localhost', port: 6379 });
    this.subscriber = new Redis({ host: 'localhost', port: 6379 });
    this.rooms = new Map(); // roomId -> Set of WebSocket clients
  }

  async joinRoom(roomId, ws) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      await this.subscriber.subscribe(`room:${roomId}`);
    }
    this.rooms.get(roomId).add(ws);
  }

  async leaveRoom(roomId, ws) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.rooms.delete(roomId);
        await this.subscriber.unsubscribe(`room:${roomId}`);
      }
    }
  }

  async publishChange(roomId, change, senderId) {
    const message = JSON.stringify({ ...change, senderId, timestamp: Date.now() });
    await this.publisher.publish(`room:${roomId}`, message);
  }

  setupMessageHandler() {
    this.subscriber.on('message', (channel, message) => {
      const roomId = channel.replace('room:', '');
      const room = this.rooms.get(roomId);
      if (!room) return;

      room.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(message);
        }
      });
    });
  }
}

module.exports = new CollaborationManager();
```

## Building the WebSocket Server

```javascript
const WebSocket = require('ws');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const collaboration = require('./collaborationManager');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

collaboration.setupMessageHandler();

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  ws.clientId = clientId;

  ws.on('message', async (data) => {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'join':
        ws.roomId = message.roomId;
        await collaboration.joinRoom(message.roomId, ws);
        ws.send(JSON.stringify({ type: 'joined', clientId }));
        break;

      case 'change':
        await collaboration.publishChange(ws.roomId, message, clientId);
        break;

      case 'cursor':
        await collaboration.publishChange(ws.roomId, {
          type: 'cursor',
          position: message.position
        }, clientId);
        break;
    }
  });

  ws.on('close', async () => {
    if (ws.roomId) {
      await collaboration.leaveRoom(ws.roomId, ws);
    }
  });
});

server.listen(3000, () => console.log('Collaboration server running on port 3000'));
```

## Storing Document State in Redis

Persist document snapshots so new users get the current state:

```javascript
async function saveDocumentState(roomId, content) {
  const redis = new Redis();
  await redis.set(`doc:${roomId}:content`, JSON.stringify(content));
  await redis.set(`doc:${roomId}:updated`, Date.now());
}

async function getDocumentState(roomId) {
  const redis = new Redis();
  const content = await redis.get(`doc:${roomId}:content`);
  return content ? JSON.parse(content) : { ops: [] };
}
```

## Tracking Active Users with Redis Hashes

```javascript
async function trackUser(roomId, userId, username) {
  const redis = new Redis();
  const key = `room:${roomId}:users`;
  await redis.hset(key, userId, JSON.stringify({ username, joinedAt: Date.now() }));
  await redis.expire(key, 3600); // Clean up after 1 hour
}

async function getActiveUsers(roomId) {
  const redis = new Redis();
  const users = await redis.hgetall(`room:${roomId}:users`);
  return Object.entries(users || {}).map(([id, data]) => ({
    id,
    ...JSON.parse(data)
  }));
}

async function removeUser(roomId, userId) {
  const redis = new Redis();
  await redis.hdel(`room:${roomId}:users`, userId);
}
```

## Implementing Operational Transforms Buffer

Store recent operations so clients can catch up after reconnecting:

```javascript
async function appendOperation(roomId, operation) {
  const redis = new Redis();
  const key = `room:${roomId}:ops`;
  await redis.rpush(key, JSON.stringify(operation));
  await redis.ltrim(key, -1000, -1); // Keep last 1000 ops
  await redis.expire(key, 3600);
}

async function getOperationsSince(roomId, fromIndex) {
  const redis = new Redis();
  const ops = await redis.lrange(`room:${roomId}:ops`, fromIndex, -1);
  return ops.map(op => JSON.parse(op));
}
```

## Client-Side JavaScript

```javascript
const ws = new WebSocket('ws://localhost:3000');
const roomId = 'doc-123';

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'join', roomId }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'change' && message.senderId !== myClientId) {
    applyChange(message.delta); // Apply change to local document
  }

  if (message.type === 'cursor') {
    updateCursorPosition(message.senderId, message.position);
  }
};

function sendChange(delta) {
  ws.send(JSON.stringify({ type: 'change', delta }));
}
```

## Summary

Redis Pub/Sub is the backbone of scalable real-time collaboration, enabling multiple WebSocket servers to stay synchronized. By combining channels for live updates, Hash sets for user tracking, and List structures for operation history, you can build a robust collaboration platform. This architecture scales horizontally by adding more WebSocket servers, all coordinated through Redis.
