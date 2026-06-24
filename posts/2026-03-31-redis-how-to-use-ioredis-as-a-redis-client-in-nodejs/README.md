# How to Use ioredis as a Redis Client in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, ioredis, JavaScript, TypeScript

Description: Learn how to install and use ioredis as a Redis client in Node.js, including connection setup, basic operations, connection pooling, and error handling.

---

## What Is ioredis?

ioredis is a high-performance Redis client for Node.js with:
- Full Redis command support
- Promise-based and async/await API
- Automatic reconnection with exponential backoff
- Cluster and Sentinel support
- Built-in TypeScript types
- Pipelining and transaction support

## Installation

```bash
npm install ioredis
```

## Basic Connection

```javascript
const Redis = require('ioredis');

// Connect to local Redis
const redis = new Redis();

// With explicit options
const redis2 = new Redis({
  host: 'localhost',
  port: 6379,
  db: 0,
  password: 'yourpassword',
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Test connection
async function testConnection() {
  const pong = await redis.ping();
  console.log(pong); // PONG
}

testConnection();
```

## Connection with URL

```javascript
const Redis = require('ioredis');

// Simple URL
const redis = new Redis('redis://localhost:6379');

// With password
const redis2 = new Redis('redis://:password@localhost:6379/0');

// TLS
const redis3 = new Redis('rediss://redis.example.com:6380');
```

## Basic Operations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function basicOps() {
  // String operations
  await redis.set('username', 'alice');
  const value = await redis.get('username');
  console.log(value); // alice

  // Set with expiry (seconds)
  await redis.setex('session:abc', 3600, 'user_data');

  // Or use SET with EX option
  await redis.set('token:xyz', 'data', 'EX', 3600);

  // Increment
  await redis.set('counter', 0);
  await redis.incr('counter');
  await redis.incrby('counter', 5);
  const count = await redis.get('counter');
  console.log(count); // 6

  // Check existence
  const exists = await redis.exists('username');
  console.log(exists); // 1

  // Delete
  await redis.del('username');

  // TTL
  const ttl = await redis.ttl('session:abc');
  console.log(`Expires in ${ttl} seconds`);
}

basicOps();
```

## Hash Operations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function hashOps() {
  // Set multiple fields
  await redis.hset('user:1001',
    'name', 'Alice',
    'email', 'alice@example.com',
    'age', '30'
  );

  // Get single field
  const name = await redis.hget('user:1001', 'name');
  console.log(name); // Alice

  // Get all fields
  const user = await redis.hgetall('user:1001');
  console.log(user); // { name: 'Alice', email: 'alice@example.com', age: '30' }

  // Update field
  await redis.hset('user:1001', 'age', '31');

  // Delete field
  await redis.hdel('user:1001', 'age');

  // Check field exists
  const hasEmail = await redis.hexists('user:1001', 'email');
  console.log(hasEmail); // 1
}

hashOps();
```

## TypeScript Usage

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  lazyConnect: true, // Don't connect until first command
});

async function main(): Promise<void> {
  await redis.connect();

  await redis.set('key', 'value');
  const result: string | null = await redis.get('key');
  console.log(result);

  await redis.quit();
}

main().catch(console.error);
```

## Handling Reconnection

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => {
    // Reconnect after increasing delays, max 30 seconds
    const delay = Math.min(times * 100, 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('ready', () => console.log('Redis client ready'));
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('close', () => console.log('Connection closed'));
redis.on('reconnecting', (delay) => console.log(`Reconnecting in ${delay}ms`));
```

## Using with Async/Await and Error Handling

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function safeGet(key) {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error(`Failed to get ${key}:`, err);
    return null;
  }
}

async function cacheAside(key, fetchFn, ttl = 300) {
  // Try cache first
  const cached = await safeGet(key);
  if (cached !== null) {
    return JSON.parse(cached);
  }

  // Fetch from source
  const data = await fetchFn();

  // Store in cache
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Usage
const userData = await cacheAside(
  'user:1001',
  () => fetchUserFromDatabase(1001),
  3600
);
```

## Graceful Shutdown

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function shutdown() {
  console.log('Shutting down Redis connection...');
  await redis.quit(); // Sends QUIT command, waits for pending replies
  console.log('Redis disconnected cleanly');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

## Summary

ioredis is the feature-rich Redis client for Node.js, offering Promise-based commands, automatic reconnection, and full TypeScript support. Connect using host/port options or URL strings, use async/await for clean command execution, and configure `retryStrategy` for production resilience. Always handle errors and implement graceful shutdown with `redis.quit()` to avoid connection leaks in long-running applications.
