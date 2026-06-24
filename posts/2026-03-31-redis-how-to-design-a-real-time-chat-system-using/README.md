# How to Design a Real-Time Chat System Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Chat, Real-Time, Pub/Sub, Interview, WebSocket

Description: A complete system design walkthrough for building a real-time chat system using Redis Pub/Sub, Streams, and sorted sets for message history.

---

## Problem Statement

Design a chat system that:
- Supports 1-on-1 and group messaging
- Delivers messages in real time to online users
- Stores message history (last 30 days)
- Shows online/offline presence
- Scales to 100M users, 1M concurrent connections

## Architecture Overview

```text
Client (WebSocket)
    |
    v
WebSocket Servers (stateless, horizontally scaled)
    |
    +----> Redis Pub/Sub (real-time message fanout)
    |
    +----> Redis (presence, unread counts, recent messages)
    |
    +----> Message Database (MongoDB/Cassandra - long-term history)
```

## Data Model in Redis

```text
Key                             Type        TTL         Purpose
---                             ----        ---         -------
user:{id}:status                String      30s         Online/offline
chat:{chatId}:messages          Stream      30 days     Recent messages
chat:{chatId}:members           Set         None        Chat participants
user:{id}:unread                Hash        None        Unread count per chat
pubsub channel: chat:{chatId}   Pub/Sub     -           Real-time delivery
```

## User Presence Tracking

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

async function setUserOnline(userId) {
  await redis.setex(`user:${userId}:status`, 30, 'online');
}

async function heartbeat(userId) {
  // Refresh TTL every 15 seconds
  await redis.expire(`user:${userId}:status`, 30);
}

async function getUserStatus(userId) {
  const status = await redis.get(`user:${userId}:status`);
  return status || 'offline';
}

async function getBulkPresence(userIds) {
  const keys = userIds.map(id => `user:${id}:status`);
  const statuses = await redis.mget(...keys);
  return userIds.map((id, i) => ({ userId: id, status: statuses[i] || 'offline' }));
}
```

## Sending a Message

```javascript
async function sendMessage(chatId, senderId, content) {
  const sentAt = String(Date.now());

  // 1. Store in Redis Stream (recent history, capped at ~1000 messages per chat)
  const messageId = await redis.xadd(
    `chat:${chatId}:messages`,
    'MAXLEN', '~', 1000,
    '*',
    'senderId', String(senderId),
    'content', content,
    'sentAt', sentAt
  );

  // 2. Publish to Pub/Sub channel for real-time delivery
  const message = { senderId, content, sentAt, messageId };
  await redis.publish(`chat:${chatId}`, JSON.stringify(message));

  // 3. Update unread counts for all members except sender
  const members = await redis.smembers(`chat:${chatId}:members`);
  const pipeline = redis.pipeline();
  members.forEach(memberId => {
    if (memberId !== String(senderId)) {
      pipeline.hincrby(`user:${memberId}:unread`, chatId, 1);
    }
  });
  await pipeline.exec();

  // 4. Store full message in database for long-term history (async)
  storeMessageInDatabase(chatId, senderId, content, messageId).catch(console.error);

  return messageId;
}
```

## WebSocket Server with Pub/Sub

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

// Separate Redis client for subscribing
const subscriber = new Redis({ host: 'localhost', port: 6379 });
const clients = new Map(); // userId -> ws

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    const msg = JSON.parse(data);

    switch (msg.type) {
      case 'auth':
        ws.userId = msg.userId;
        clients.set(msg.userId, ws);
        await setUserOnline(msg.userId);

        // Subscribe to all user's chat channels
        const chats = await getUserChats(msg.userId);
        for (const chatId of chats) {
          await subscriber.subscribe(`chat:${chatId}`);
        }
        break;

      case 'send':
        await sendMessage(msg.chatId, ws.userId, msg.content);
        break;

      case 'read':
        // Mark chat as read
        await redis.hdel(`user:${ws.userId}:unread`, msg.chatId);
        break;
    }
  });

  ws.on('close', async () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      await redis.del(`user:${ws.userId}:status`);
    }
  });
});

// Handle incoming Pub/Sub messages
subscriber.on('message', (channel, message) => {
  const chatId = channel.replace('chat:', '');
  const msgData = JSON.parse(message);

  // Find all connected clients who are members of this chat
  // and forward the message via WebSocket
  deliverToConnectedMembers(chatId, msgData);
});

async function deliverToConnectedMembers(chatId, message) {
  const members = await redis.smembers(`chat:${chatId}:members`);
  for (const memberId of members) {
    const clientWs = clients.get(memberId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'message', chatId, ...message }));
    }
  }
}
```

## Message History

```javascript
async function getChatHistory(chatId, count = 50) {
  const entries = await redis.xrevrange(
    `chat:${chatId}:messages`, '+', '-', 'COUNT', count
  );

  return entries
    .map(([id, fields]) => {
      const obj = { messageId: id };
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      return obj;
    })
    .reverse(); // Return in chronological order
}
```

## Group Chat Management

```javascript
async function createGroupChat(chatId, memberIds) {
  const pipeline = redis.pipeline();
  pipeline.sadd(`chat:${chatId}:members`, ...memberIds);
  pipeline.set(`chat:${chatId}:type`, 'group');
  await pipeline.exec();
}

async function addMemberToChat(chatId, userId) {
  await redis.sadd(`chat:${chatId}:members`, userId);
}

async function removeMemberFromChat(chatId, userId) {
  await redis.srem(`chat:${chatId}:members`, userId);
  await redis.hdel(`user:${userId}:unread`, chatId);
}
```

## Scaling Considerations

```text
1M concurrent users:
- WebSocket servers: 100 servers * 10K connections each
- Redis Pub/Sub: all WebSocket servers subscribe to all active chat channels
- Problem: 1M channels all subscribed on every server = too many subscriptions

Solution: Route users to specific WebSocket server groups based on chat ID
  - Chat channels are sharded across WebSocket server clusters
  - Redis Cluster distributes Pub/Sub channels across nodes
```

## Capacity Estimation

```text
Messages per day: 100M users * 10 messages = 1 billion messages
Peak: 50K messages/sec

Redis memory for recent history:
- 100K active chats * 1000 messages * 200 bytes = 20GB
- Use maxmemory + MAXLEN trimming

Pub/Sub fanout:
- Average group size: 10 members
- 50K msg/sec * 10 members = 500K WebSocket writes/sec
- Distribute across 50 WebSocket servers = 10K writes/sec per server
```

## Summary

A real-time chat system uses Redis Pub/Sub for instant message delivery across WebSocket servers, Redis Streams for recent message history with automatic trimming, Hashes for unread counts, and Sets for chat membership. Presence tracking uses short-TTL keys refreshed by client heartbeats. The key scaling challenge is managing Pub/Sub subscriptions at millions of concurrent users, solved by routing users to chat-specific server clusters.
