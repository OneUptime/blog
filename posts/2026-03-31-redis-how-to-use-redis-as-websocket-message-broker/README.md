# How to Use Redis as WebSocket Message Broker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, WebSocket, Message Broker, Pub/Sub, Real-Time

Description: Use Redis as a message broker between WebSocket servers and backend services to decouple producers from consumers and enable reliable real-time message delivery.

---

## Redis as a Message Broker for WebSockets

A message broker decouples message producers from consumers. Using Redis between your backend services and WebSocket servers enables:

- Backend microservices to push events to WebSocket clients without direct connection
- Reliable message buffering with Redis Streams
- Fan-out to multiple WebSocket servers simultaneously
- Replay of missed messages for reconnecting clients

## Architecture

```text
Backend Service -> Redis Pub/Sub or Streams -> WebSocket Server -> Client

Producers (any service):         Consumers (WS servers):
- REST API handlers              - Subscribe to Redis channels
- Background workers             - Forward messages to connected clients
- Scheduled jobs                 - Handle reconnection with buffered messages
- Database change listeners
```

## Basic Pub/Sub Broker

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');

class WebSocketBroker {
  constructor() {
    this.publisher = new Redis({ host: process.env.REDIS_HOST });
    this.subscriber = new Redis({ host: process.env.REDIS_HOST });
    this.clients = new Map(); // userId -> Set<WebSocket>
  }

  async start(port) {
    this.wss = new WebSocket.Server({ port });

    // Subscribe to the user-specific notification channel pattern
    await this.subscriber.psubscribe('notify:user:*');

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      const userId = channel.replace('notify:user:', '');
      this.deliverToUser(userId, JSON.parse(message));
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  handleConnection(ws, req) {
    const userId = this.extractUserId(req);
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);

    ws.on('close', () => {
      this.clients.get(userId)?.delete(ws);
      if (this.clients.get(userId)?.size === 0) {
        this.clients.delete(userId);
      }
    });
  }

  deliverToUser(userId, message) {
    const userSockets = this.clients.get(userId);
    if (!userSockets) return;

    const payload = JSON.stringify(message);
    for (const ws of userSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  // Called by any producer to send a message
  async publish(userId, event) {
    await this.publisher.publish(
      `notify:user:${userId}`,
      JSON.stringify(event)
    );
  }
}
```

## Redis Streams as Reliable Message Broker

Unlike Pub/Sub, Redis Streams persist messages and support consumer groups:

```javascript
const Redis = require('ioredis');
const WebSocket = require('ws');

const redis = new Redis({ host: process.env.REDIS_HOST });
const streamKey = 'ws-messages';
const consumerGroup = 'ws-servers';
const consumerId = `server-${process.pid}`;

async function setupStreamConsumer() {
  // Create consumer group if it doesn't exist
  try {
    await redis.xgroup('CREATE', streamKey, consumerGroup, '$', 'MKSTREAM');
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) throw err;
  }

  // Process messages in a loop
  while (true) {
    const messages = await redis.xreadgroup(
      'GROUP', consumerGroup, consumerId,
      'COUNT', 10,
      'BLOCK', 1000,
      'STREAMS', streamKey, '>'
    );

    if (!messages) continue;

    for (const [stream, entries] of messages) {
      for (const [messageId, fields] of entries) {
        const event = parseStreamEntry(fields);
        await deliverEvent(event);

        // Acknowledge processed message
        await redis.xack(streamKey, consumerGroup, messageId);
      }
    }
  }
}

function parseStreamEntry(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return JSON.parse(obj.payload);
}

// Producer - any service can call this
async function emitEvent(userId, type, data) {
  await redis.xadd(
    streamKey,
    '*', // Auto-generate ID
    'userId', userId,
    'type', type,
    'payload', JSON.stringify({ userId, type, data, timestamp: Date.now() })
  );
}
```

## Broadcasting to Topic Subscribers

```javascript
class TopicBroker {
  constructor(redis) {
    this.redis = redis;
    this.subscriber = redis.duplicate();
    this.topicClients = new Map(); // topic -> Set<WebSocket>

    this.subscriber.on('message', (channel, message) => {
      const channelTopic = channel.replace('topic:', '');
      const clients = this.topicClients.get(channelTopic) ?? new Set();
      const payload = JSON.stringify(JSON.parse(message));

      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    });
  }

  async subscribeClient(ws, topic) {
    if (!this.topicClients.has(topic)) {
      this.topicClients.set(topic, new Set());
      await this.subscriber.subscribe(`topic:${topic}`);
    }
    this.topicClients.get(topic).add(ws);
  }

  async publish(topic, data) {
    await this.redis.publish(`topic:${topic}`, JSON.stringify(data));
  }
}
```

## Dead Letter Queue for Failed Deliveries

```javascript
async function deliverWithRetry(userId, event) {
  const clients = connectedClients.get(userId);

  if (clients && clients.size > 0) {
    // User is connected - deliver immediately
    for (const ws of clients) {
      ws.send(JSON.stringify(event));
    }
    return;
  }

  // User not connected - buffer for later delivery
  await redis.rpush(
    `pending:${userId}`,
    JSON.stringify({ event, retries: 0, timestamp: Date.now() })
  );
  await redis.expire(`pending:${userId}`, 86400); // Expire after 24 hours
}

// Deliver buffered messages when user reconnects
async function deliverPendingMessages(userId, ws) {
  const pending = await redis.lrange(`pending:${userId}`, 0, -1);

  for (const item of pending) {
    const { event } = JSON.parse(item);
    ws.send(JSON.stringify(event));
  }

  await redis.del(`pending:${userId}`);
}
```

## Summary

Redis serves as an effective WebSocket message broker by decoupling backend services from WebSocket connection management. Use Pub/Sub for real-time fire-and-forget broadcasting, and Redis Streams for durable message delivery with consumer group semantics. Buffer messages for offline users using Redis Lists to ensure delivery upon reconnection.
