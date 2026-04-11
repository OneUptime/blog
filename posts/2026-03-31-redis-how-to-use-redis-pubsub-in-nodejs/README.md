# How to Use Redis Pub/Sub in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Pub/Sub, ioredis, Real-Time, Messaging

Description: Learn how to implement Redis Pub/Sub in Node.js with ioredis, including publishers, subscribers, pattern subscriptions, and real-time event broadcasting.

---

## Redis Pub/Sub in Node.js

ioredis requires separate Redis client instances for pub/sub - a subscriber connection enters a special mode and cannot run normal commands. This is a critical design point.

## Basic Publisher and Subscriber

Publisher:

```javascript
const Redis = require('ioredis');
const publisher = new Redis();

async function publishMessage(channel, message) {
  const subscriberCount = await publisher.publish(channel, message);
  console.log(`Message published to ${subscriberCount} subscribers`);
}

publishMessage('news:tech', 'Redis 8.0 released!');
```

Subscriber (separate connection required):

```javascript
const Redis = require('ioredis');
const subscriber = new Redis();

// Subscribe to a channel
subscriber.subscribe('news:tech', (err, count) => {
  if (err) {
    console.error('Subscribe failed:', err);
    return;
  }
  console.log(`Subscribed to ${count} channel(s)`);
});

// Handle incoming messages
subscriber.on('message', (channel, message) => {
  console.log(`[${channel}] ${message}`);
});
```

## Subscribing to Multiple Channels

```javascript
const Redis = require('ioredis');
const subscriber = new Redis();

subscriber.subscribe('news:tech', 'news:sports', 'news:finance', (err, count) => {
  if (err) {
    console.error('Failed to subscribe:', err);
    return;
  }
  console.log(`Subscribed to ${count} channels`);
});

subscriber.on('message', (channel, message) => {
  switch (channel) {
    case 'news:tech':
      console.log(`[TECH] ${message}`);
      break;
    case 'news:sports':
      console.log(`[SPORTS] ${message}`);
      break;
    case 'news:finance':
      console.log(`[FINANCE] ${message}`);
      break;
    default:
      console.log(`[${channel}] ${message}`);
  }
});
```

## Pattern Subscriptions

```javascript
const Redis = require('ioredis');
const subscriber = new Redis();

// Subscribe to all news channels using a pattern
subscriber.psubscribe('news:*', (err, count) => {
  if (err) {
    console.error('Pattern subscribe failed:', err);
    return;
  }
  console.log(`Pattern subscriptions: ${count}`);
});

// pmessage event for pattern subscriptions
subscriber.on('pmessage', (pattern, channel, message) => {
  console.log(`Pattern: ${pattern}, Channel: ${channel}, Message: ${message}`);
});

// Also subscribe to another pattern at the same time
subscriber.psubscribe('user:*:events');
```

## Real-Time Notification System

```javascript
const Redis = require('ioredis');

class NotificationBus {
  constructor(redisOptions = {}) {
    this.publisher = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);
    this.handlers = new Map();

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      const handler = this.handlers.get(pattern);
      if (handler) {
        try {
          const data = JSON.parse(message);
          handler(channel, data);
        } catch (e) {
          handler(channel, message);
        }
      }
    });
  }

  async notify(userId, type, payload) {
    const channel = `user:${userId}:events`;
    const message = JSON.stringify({ type, payload, timestamp: Date.now() });
    return this.publisher.publish(channel, message);
  }

  watchUser(userId, callback) {
    const pattern = `user:${userId}:events`;
    this.handlers.set(pattern, (channel, data) => callback(data));
    this.subscriber.psubscribe(pattern);
  }

  watchAllUsers(callback) {
    const pattern = 'user:*:events';
    this.handlers.set(pattern, callback);
    this.subscriber.psubscribe(pattern);
  }

  async close() {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}

// Usage
const bus = new NotificationBus();

bus.watchUser('1001', (event) => {
  console.log(`User 1001 event: ${event.type}`, event.payload);
});

// Publish events
(async () => {
  await bus.notify('1001', 'order_shipped', { orderId: 'ORD-123' });
  await bus.notify('1001', 'message_received', { from: 'support' });

  setTimeout(() => bus.close(), 3000);
})();
```

## Unsubscribing

```javascript
const Redis = require('ioredis');
const subscriber = new Redis();

subscriber.subscribe('channel1', 'channel2');

// Unsubscribe from a specific channel
setTimeout(async () => {
  await subscriber.unsubscribe('channel1');
  console.log('Unsubscribed from channel1');
}, 5000);

// Unsubscribe from all channels
setTimeout(async () => {
  await subscriber.unsubscribe();
  console.log('Unsubscribed from all channels');
}, 10000);
```

## Checking Active Subscriptions

```bash
# List all active channels with at least one subscriber
redis-cli PUBSUB CHANNELS

# Count subscribers per channel
redis-cli PUBSUB NUMSUB news:tech news:sports

# Count pattern subscriptions
redis-cli PUBSUB NUMPAT
```

## Using Pub/Sub with Express.js via SSE

```javascript
const express = require('express');
const Redis = require('ioredis');

const app = express();
const publisher = new Redis();

app.get('/events/:userId', (req, res) => {
  const userId = req.params.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Create dedicated subscriber for this connection
  const subscriber = new Redis();
  const channel = `user:${userId}:events`;

  subscriber.subscribe(channel);
  subscriber.on('message', (ch, message) => {
    res.write(`data: ${message}\n\n`);
  });

  // Clean up on client disconnect
  req.on('close', async () => {
    await subscriber.unsubscribe();
    await subscriber.quit();
  });
});

app.post('/notify/:userId', express.json(), async (req, res) => {
  const { userId } = req.params;
  const message = JSON.stringify(req.body);
  await publisher.publish(`user:${userId}:events`, message);
  res.json({ status: 'sent' });
});

app.listen(3000);
```

## Summary

Redis Pub/Sub in Node.js requires separate ioredis instances for publishing and subscribing because subscriber connections enter a dedicated mode. Use `subscribe()` for exact channel names and `psubscribe()` for glob pattern matching, with `message` and `pmessage` event handlers respectively. For production systems, use the notification bus pattern to encapsulate the dual-connection requirement and manage subscriptions cleanly with proper teardown logic.
