# How to Scale WebSocket Servers with Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, WebSocket, Pub/Sub, Scaling, Socket.IO, Node.js

Description: Scale WebSocket servers horizontally across multiple instances using Redis Pub/Sub to broadcast messages to all connected clients regardless of which server they are on.

---

## The Scaling Problem

A single WebSocket server maintains an in-memory map of all connected sockets. When you scale to multiple instances behind a load balancer, clients on different servers cannot communicate with each other directly.

Redis Pub/Sub solves this by acting as a shared message bus:

```text
Client A -> Server 1
Client B -> Server 2

Server 1 wants to broadcast to all clients:
1. Server 1 publishes message to Redis channel "broadcast"
2. Both Server 1 and Server 2 are subscribed to "broadcast"
3. Both servers receive the message and forward to their local clients
```

## Socket.io with Redis Adapter

Socket.io has official Redis adapter support:

```bash
npm install socket.io @socket.io/redis-adapter redis
```

```javascript
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

async function main() {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
    });

    socket.on('send-message', ({ roomId, message }) => {
      // This broadcast works across all server instances
      io.to(roomId).emit('new-message', {
        message,
        senderId: socket.id,
        timestamp: new Date().toISOString(),
      });
    });
  });

  httpServer.listen(3000, () => {
    console.log('WebSocket server listening on :3000');
  });
}

main();
```

## Raw WebSocket Server with Redis Pub/Sub

For ws without Socket.io:

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');

const wss = new WebSocket.Server({ port: 8080 });
const publisher = new Redis({ host: process.env.REDIS_HOST });
const subscriber = new Redis({ host: process.env.REDIS_HOST });

// Track local clients by channel
const localClients = new Map();

// Subscribe to the shared broadcast channel
subscriber.subscribe('ws:broadcast');

subscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);

  // Forward to local clients subscribed to this channel
  const clients = localClients.get(channel) ?? new Set();
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }
});

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    const event = JSON.parse(data.toString());

    if (event.type === 'subscribe') {
      const channel = `ws:room:${event.roomId}`;
      if (!localClients.has(channel)) {
        localClients.set(channel, new Set());
        await subscriber.subscribe(channel);
      }
      localClients.get(channel).add(ws);
      ws.currentChannel = channel;
    }

    if (event.type === 'message') {
      // Publish to Redis - all instances receive and forward
      await publisher.publish(
        `ws:room:${event.roomId}`,
        JSON.stringify({ type: 'new-message', data: event.data })
      );
    }
  });

  ws.on('close', () => {
    if (ws.currentChannel) {
      localClients.get(ws.currentChannel)?.delete(ws);
    }
  });
});
```

## Publishing Server-Side Events to WebSocket Clients

```javascript
// From any microservice or background job - push to WebSocket clients
const publisher = new Redis({ host: process.env.REDIS_HOST });

async function notifyUser(userId, event) {
  await publisher.publish(
    `ws:user:${userId}`,
    JSON.stringify({ type: 'notification', data: event })
  );
}

async function broadcastToRoom(roomId, event) {
  await publisher.publish(
    `ws:room:${roomId}`,
    JSON.stringify(event)
  );
}

async function broadcastToAll(event) {
  await publisher.publish('ws:broadcast', JSON.stringify(event));
}
```

## Tracking Connected Clients Per Server

```javascript
const serverId = process.env.SERVER_ID ?? `server-${process.pid}`;

async function registerClient(clientId) {
  await publisher.sadd(`ws:server:${serverId}:clients`, clientId);
  await publisher.setex(`ws:client:${clientId}:server`, 300, serverId);
  await publisher.incr('ws:total_connections');
}

async function unregisterClient(clientId) {
  await publisher.srem(`ws:server:${serverId}:clients`, clientId);
  await publisher.del(`ws:client:${clientId}:server`);
  await publisher.decr('ws:total_connections');
}

// Check where a specific client is connected
async function getClientServer(clientId) {
  return publisher.get(`ws:client:${clientId}:server`);
}
```

## Health Check and Monitoring

```javascript
setInterval(async () => {
  const totalConnections = await publisher.get('ws:total_connections');
  const localCount = wss.clients.size;

  console.log({
    serverId,
    localConnections: localCount,
    totalConnections: parseInt(totalConnections ?? '0'),
  });

  // Refresh server health key
  await publisher.setex(`ws:server:${serverId}:health`, 30, localCount.toString());
}, 10000);
```

## Summary

Scaling WebSocket servers with Redis Pub/Sub requires each server instance to subscribe to shared Redis channels and forward messages to locally connected clients. Socket.io's official Redis adapter handles this automatically. For raw WebSocket servers, maintain a local registry of clients and use separate publisher and subscriber Redis connections since a subscribed connection cannot send regular commands.
