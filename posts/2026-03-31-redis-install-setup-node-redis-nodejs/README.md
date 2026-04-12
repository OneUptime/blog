# How to Install and Set Up node-redis in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, node-redis, JavaScript

Description: Learn how to install and configure node-redis, the official Redis client for Node.js, with connection options, error handling, and basic commands.

---

node-redis is the official Redis client for Node.js, maintained by the Redis team. It supports Redis 6+ features including ACL authentication, client-side caching, and all Redis data types. This guide covers installation, connection setup, and basic usage.

## Installation

```bash
npm install redis
```

For TypeScript projects, types are included:

```bash
npm install redis
# Types are bundled - no @types/redis needed
```

## Basic Connection

```javascript
const { createClient } = require('redis');

const client = createClient({
  socket: {
    host: 'localhost',
    port: 6379,
  },
});

client.on('error', (err) => console.error('Redis error:', err));

await client.connect();
console.log('Connected to Redis');
```

## Connection with Authentication

```javascript
const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME, // Redis ACL user
});
```

## Connection with URL

```javascript
const client = createClient({
  url: 'redis://username:password@localhost:6379',
});
```

For TLS (e.g., Redis Cloud or Elasticache):

```javascript
const client = createClient({
  url: 'rediss://username:password@your-host:6380',
  socket: {
    tls: true,
  },
});
```

## Basic Commands

```javascript
// String operations
await client.set('greeting', 'Hello, Redis!');
const value = await client.get('greeting');
console.log(value); // Hello, Redis!

// Set with expiry (TTL in seconds)
await client.setEx('session:abc123', 3600, JSON.stringify({ userId: 42 }));

// Increment
await client.set('counter', '0');
await client.incr('counter');
const count = await client.get('counter');
console.log(count); // 1

// Delete
await client.del('greeting');
```

## Graceful Disconnect

```javascript
process.on('SIGINT', async () => {
  await client.quit();
  process.exit(0);
});
```

## TypeScript Example

```typescript
import { createClient, RedisClientType } from 'redis';

const client: RedisClientType = createClient({
  socket: { host: 'localhost', port: 6379 },
});

async function main(): Promise<void> {
  client.on('error', (err: Error) => console.error(err));
  await client.connect();

  await client.set('key', 'value');
  const val = await client.get('key');
  console.log(val);

  await client.disconnect();
}

main();
```

## Checking the Connection

```javascript
// Ping to verify connectivity
const pong = await client.ping();
console.log(pong); // PONG

// Get Redis server info
const info = await client.info('server');
console.log(info);
```

## Summary

node-redis is installed via npm and connects to Redis using `createClient()` with a host/port config or URL string. Always attach an `error` event listener before calling `connect()` to avoid unhandled exceptions. The client is promise-based and works natively with async/await, making it straightforward to integrate into any Node.js or TypeScript project.
