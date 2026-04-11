# How to Build a WebSocket Chat Server with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, WebSocket, Chat, Node.js, Real-Time, Pub/Sub

Description: Build a scalable WebSocket chat server using Redis Pub/Sub for message broadcasting and Redis Lists for chat history persistence across multiple server instances.

---

## Architecture Overview

The chat server uses:
- **WebSocket (ws)** for real-time client connections
- **Redis Pub/Sub** for cross-instance message broadcasting
- **Redis Lists** for persisting chat history
- **Redis Hashes** for user presence tracking

```text
Client -> WebSocket Server -> Redis Pub/Sub -> All WebSocket Servers -> All Clients
                          -> Redis List (history)
```

## Project Setup

```bash
mkdir chat-server && cd chat-server
npm init -y
npm install ws ioredis uuid
```

## Server Implementation

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const publisher = new Redis({ host: process.env.REDIS_HOST || 'localhost' });
const subscriber = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

// Local clients map: socketId -> { ws, userId, username, room }
const clients = new Map();

const HISTORY_KEY = (room) => `chat:history:${room}`;
const CHANNEL = (room) => `chat:room:${room}`;
const PRESENCE_KEY = (room) => `chat:presence:${room}`;
const MAX_HISTORY = 100;

async function main() {
  // Subscribe to all chat channels
  await subscriber.psubscribe('chat:room:*');

  subscriber.on('pmessage', (pattern, channel, rawMessage) => {
    const room = channel.replace('chat:room:', '');
    const message = JSON.parse(rawMessage);

    // Broadcast to locally connected clients in this room
    for (const [socketId, client] of clients) {
      if (client.room === room && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    }
  });

  const wss = new WebSocket.Server({ port: 8080 });

  wss.on('connection', (ws) => {
    const socketId = uuidv4();
    clients.set(socketId, { ws, userId: null, username: null, room: null });

    ws.on('message', async (data) => {
      let event;
      try {
        event = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      await handleEvent(socketId, ws, event);
    });

    ws.on('close', async () => {
      const client = clients.get(socketId);
      if (client?.room) {
        await handleLeave(socketId, client);
      }
      clients.delete(socketId);
    });
  });
}

main();
```

## Event Handlers

```javascript
async function handleEvent(socketId, ws, event) {
  const client = clients.get(socketId);

  switch (event.type) {
    case 'auth':
      await handleAuth(socketId, ws, event);
      break;
    case 'join':
      await handleJoin(socketId, ws, event);
      break;
    case 'message':
      await handleMessage(socketId, event);
      break;
    case 'leave':
      await handleLeave(socketId, client);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown event type' }));
  }
}

async function handleAuth(socketId, ws, event) {
  const { userId, username } = event;
  const client = clients.get(socketId);
  client.userId = userId;
  client.username = username;

  ws.send(JSON.stringify({ type: 'auth-success', userId, username }));
}

async function handleJoin(socketId, ws, event) {
  const { room } = event;
  const client = clients.get(socketId);
  client.room = room;

  // Add user to presence set
  await publisher.hset(PRESENCE_KEY(room), client.userId, client.username);

  // Get chat history (last N messages)
  const history = await publisher.lrange(HISTORY_KEY(room), 0, MAX_HISTORY - 1);
  ws.send(JSON.stringify({
    type: 'history',
    messages: history.map(m => JSON.parse(m)).reverse(),
  }));

  // Get current presence list
  const presence = await publisher.hgetall(PRESENCE_KEY(room));
  ws.send(JSON.stringify({ type: 'presence', users: presence }));

  // Notify room of new user
  const joinEvent = {
    type: 'user-joined',
    userId: client.userId,
    username: client.username,
    room,
    timestamp: Date.now(),
  };
  await publisher.publish(CHANNEL(room), JSON.stringify(joinEvent));
}

async function handleMessage(socketId, event) {
  const client = clients.get(socketId);
  if (!client?.room || !client?.userId) return;

  const message = {
    id: uuidv4(),
    type: 'message',
    userId: client.userId,
    username: client.username,
    text: event.text,
    room: client.room,
    timestamp: Date.now(),
  };

  // Persist to history
  await publisher.lpush(HISTORY_KEY(client.room), JSON.stringify(message));
  await publisher.ltrim(HISTORY_KEY(client.room), 0, MAX_HISTORY - 1);
  await publisher.expire(HISTORY_KEY(client.room), 86400 * 7); // 7 days

  // Broadcast to room
  await publisher.publish(CHANNEL(client.room), JSON.stringify(message));
}

async function handleLeave(socketId, client) {
  if (!client?.room) return;

  await publisher.hdel(PRESENCE_KEY(client.room), client.userId);

  const leaveEvent = {
    type: 'user-left',
    userId: client.userId,
    username: client.username,
    room: client.room,
    timestamp: Date.now(),
  };
  await publisher.publish(CHANNEL(client.room), JSON.stringify(leaveEvent));
  client.room = null;
}
```

## Client HTML Example

```html
<!DOCTYPE html>
<html>
<body>
<div id="messages"></div>
<input id="input" type="text" placeholder="Type a message...">
<button onclick="sendMessage()">Send</button>

<script>
  const ws = new WebSocket('ws://localhost:8080');

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'auth', userId: 'user-1', username: 'Alice' }));
    ws.send(JSON.stringify({ type: 'join', room: 'general' }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'message') {
      const div = document.createElement('div');
      div.textContent = `${data.username}: ${data.text}`;
      document.getElementById('messages').appendChild(div);
    }
  };

  function sendMessage() {
    const input = document.getElementById('input');
    ws.send(JSON.stringify({ type: 'message', text: input.value }));
    input.value = '';
  }
</script>
</body>
</html>
```

## Summary

A Redis-backed WebSocket chat server uses Pub/Sub for real-time message broadcasting across instances, Lists for persistent chat history with automatic trimming, and Hashes for presence tracking. This architecture scales horizontally by adding more WebSocket servers while maintaining consistent shared state through Redis as the central data layer.
