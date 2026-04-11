# How to Connect to Redis from Node.js with node-redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, node-redis, Connection

Description: Learn how to establish and manage Redis connections from Node.js using node-redis, including reconnection strategies, timeouts, and connection pooling.

---

Connecting reliably to Redis from Node.js requires more than just calling `createClient()`. You need to handle reconnection, timeouts, and connection lifecycle correctly - especially in production environments.

## Installation

```bash
npm install redis
```

## Minimal Connection

```javascript
import { createClient } from 'redis';

const client = createClient();

client.on('error', (err) => console.error('Redis Client Error', err));

await client.connect();
```

By default, `createClient()` connects to `redis://localhost:6379`.

## Connecting to a Remote Host

```javascript
const client = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  password: process.env.REDIS_PASSWORD,
});
```

## Connection Events

```javascript
client.on('connect', () => console.log('Connecting to Redis...'));
client.on('ready', () => console.log('Redis client ready'));
client.on('end', () => console.log('Redis connection closed'));
client.on('reconnecting', () => console.log('Reconnecting to Redis...'));
client.on('error', (err) => console.error('Redis error:', err));
```

## Custom Reconnection Strategy

By default, node-redis retries indefinitely with exponential backoff. You can customize it:

```javascript
const client = createClient({
  socket: {
    host: 'localhost',
    port: 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Too many retries, giving up');
        return new Error('Too many retries');
      }
      // Linear backoff capped at 3 seconds
      return Math.min(retries * 100, 3000);
    },
  },
});
```

Returning an `Error` stops retrying. Returning a number (milliseconds) schedules the next attempt.

## Connection Timeouts

```javascript
const client = createClient({
  socket: {
    host: 'localhost',
    port: 6379,
    connectTimeout: 5000,   // 5 seconds to establish connection
  },
});
```

## Multiple Connections (Pub/Sub Pattern)

Pub/Sub requires a dedicated connection because subscribed clients cannot run other commands:

```javascript
const subscriber = client.duplicate();
await subscriber.connect();

await subscriber.subscribe('notifications', (message) => {
  console.log('Received:', message);
});

// Use original client for publishing
await client.publish('notifications', 'Hello!');
```

## Singleton Pattern for Applications

```javascript
// redis.js
import { createClient } from 'redis';

let client;

export async function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    client.on('error', (err) => console.error('Redis error:', err));
    await client.connect();
  }
  return client;
}
```

## Closing the Connection

```javascript
// Graceful shutdown - waits for pending commands
await client.close();

// Immediate close
await client.destroy();
```

## Summary

Connecting to Redis from Node.js with node-redis involves configuring host, port, and auth credentials, then attaching event listeners before calling `connect()`. Custom reconnection strategies and timeout settings are essential for production resilience. For Pub/Sub, duplicate the client so the subscriber connection remains dedicated - the primary client stays free for regular commands.
