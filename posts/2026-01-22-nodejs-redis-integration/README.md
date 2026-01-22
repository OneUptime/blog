# How to Use Redis with Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Redis, Caching, Database, Performance

Description: Learn how to integrate Redis with Node.js for caching, session storage, pub/sub messaging, rate limiting, and real-time features.

---

Redis is an in-memory data store that can be used as a database, cache, and message broker. It provides extremely fast read and write operations, making it ideal for performance-critical applications.

## Installation

```bash
npm install ioredis
# or
npm install redis
```

## Basic Connection

### Using ioredis (Recommended)

```javascript
const Redis = require('ioredis');

// Simple connection
const redis = new Redis();

// With options
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  db: 0,
  
  // Connection options
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
  
  // Reconnection strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Using URL
const redis = new Redis(process.env.REDIS_URL);
// redis://user:password@host:port/db

// Event handlers
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});
```

### Using node-redis

```javascript
const { createClient } = require('redis');

const redis = createClient({
  url: 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('Redis error:', err));

await redis.connect();
```

## Basic Operations

### Strings

```javascript
// Set and get
await redis.set('key', 'value');
const value = await redis.get('key');

// Set with expiration
await redis.set('key', 'value', 'EX', 3600);  // Expires in 1 hour
await redis.setex('key', 3600, 'value');       // Same as above

// Set only if not exists
await redis.setnx('key', 'value');

// Set only if exists
await redis.set('key', 'value', 'XX');

// Increment/Decrement
await redis.incr('counter');
await redis.incrby('counter', 10);
await redis.decr('counter');
await redis.decrby('counter', 5);

// Multiple operations
await redis.mset('key1', 'value1', 'key2', 'value2');
const values = await redis.mget('key1', 'key2');
```

### Hashes

```javascript
// Set hash fields
await redis.hset('user:1', 'name', 'John', 'email', 'john@example.com');
await redis.hset('user:1', { name: 'John', email: 'john@example.com' });

// Get hash fields
const name = await redis.hget('user:1', 'name');
const user = await redis.hgetall('user:1');

// Check if field exists
const exists = await redis.hexists('user:1', 'name');

// Delete field
await redis.hdel('user:1', 'email');

// Increment hash field
await redis.hincrby('user:1', 'views', 1);
```

### Lists

```javascript
// Add to list
await redis.lpush('queue', 'item1', 'item2');  // Add to front
await redis.rpush('queue', 'item3', 'item4');  // Add to back

// Get from list
await redis.lpop('queue');  // Remove and return first
await redis.rpop('queue');  // Remove and return last
await redis.lrange('queue', 0, -1);  // Get all items

// Blocking operations (great for job queues)
const [key, value] = await redis.blpop('queue', 0);  // Wait forever
const result = await redis.brpop('queue', 5);        // Wait 5 seconds

// List length
const length = await redis.llen('queue');
```

### Sets

```javascript
// Add members
await redis.sadd('tags', 'nodejs', 'javascript', 'redis');

// Get all members
const tags = await redis.smembers('tags');

// Check membership
const isMember = await redis.sismember('tags', 'nodejs');

// Set operations
await redis.sunion('tags1', 'tags2');        // Union
await redis.sinter('tags1', 'tags2');        // Intersection
await redis.sdiff('tags1', 'tags2');         // Difference

// Random member
const randomTag = await redis.srandmember('tags');
```

### Sorted Sets

```javascript
// Add with scores
await redis.zadd('leaderboard', 100, 'player1', 200, 'player2', 150, 'player3');

// Get by score range
const topPlayers = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');

// Get rank
const rank = await redis.zrevrank('leaderboard', 'player1');

// Increment score
await redis.zincrby('leaderboard', 50, 'player1');

// Get by score
const players = await redis.zrangebyscore('leaderboard', 100, 200);
```

## Caching Patterns

### Cache-Aside Pattern

```javascript
async function getUser(userId) {
  const cacheKey = `user:${userId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const user = await db.users.findById(userId);
  
  if (user) {
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(user));
  }
  
  return user;
}

async function updateUser(userId, data) {
  // Update database
  const user = await db.users.update(userId, data);
  
  // Invalidate cache
  await redis.del(`user:${userId}`);
  
  return user;
}
```

### Write-Through Cache

```javascript
async function saveUser(user) {
  // Save to database
  const saved = await db.users.save(user);
  
  // Update cache
  await redis.setex(`user:${saved.id}`, 3600, JSON.stringify(saved));
  
  return saved;
}
```

### Cache with Tags

```javascript
async function cacheWithTags(key, value, tags, ttl = 3600) {
  const pipeline = redis.pipeline();
  
  // Store the value
  pipeline.setex(key, ttl, JSON.stringify(value));
  
  // Add key to each tag set
  for (const tag of tags) {
    pipeline.sadd(`tag:${tag}`, key);
  }
  
  await pipeline.exec();
}

async function invalidateByTag(tag) {
  const keys = await redis.smembers(`tag:${tag}`);
  
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(`tag:${tag}`);
  }
}

// Usage
await cacheWithTags('product:123', product, ['products', 'category:electronics']);
await invalidateByTag('products');  // Clear all product caches
```

## Session Storage

### Express Session with Redis

```bash
npm install express-session connect-redis
```

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  },
}));
```

### Custom Session Management

```javascript
class SessionManager {
  constructor(redis) {
    this.redis = redis;
    this.prefix = 'session:';
    this.ttl = 86400;  // 24 hours
  }
  
  async create(userId, data = {}) {
    const sessionId = crypto.randomUUID();
    const session = {
      userId,
      ...data,
      createdAt: Date.now(),
    };
    
    await this.redis.setex(
      this.prefix + sessionId,
      this.ttl,
      JSON.stringify(session)
    );
    
    // Track user sessions
    await this.redis.sadd(`user-sessions:${userId}`, sessionId);
    
    return sessionId;
  }
  
  async get(sessionId) {
    const data = await this.redis.get(this.prefix + sessionId);
    return data ? JSON.parse(data) : null;
  }
  
  async destroy(sessionId) {
    const session = await this.get(sessionId);
    if (session) {
      await this.redis.del(this.prefix + sessionId);
      await this.redis.srem(`user-sessions:${session.userId}`, sessionId);
    }
  }
  
  async destroyAllForUser(userId) {
    const sessions = await this.redis.smembers(`user-sessions:${userId}`);
    
    if (sessions.length > 0) {
      const pipeline = this.redis.pipeline();
      sessions.forEach(id => pipeline.del(this.prefix + id));
      pipeline.del(`user-sessions:${userId}`);
      await pipeline.exec();
    }
  }
}
```

## Pub/Sub Messaging

```javascript
const Redis = require('ioredis');

// Publisher
const publisher = new Redis();

// Subscribers (separate connections)
const subscriber1 = new Redis();
const subscriber2 = new Redis();

// Subscribe to channels
await subscriber1.subscribe('notifications', 'alerts');

subscriber1.on('message', (channel, message) => {
  console.log(`Received on ${channel}:`, message);
  const data = JSON.parse(message);
  // Process message
});

// Pattern subscription
await subscriber2.psubscribe('user:*');

subscriber2.on('pmessage', (pattern, channel, message) => {
  console.log(`Pattern ${pattern}, channel ${channel}:`, message);
});

// Publish messages
await publisher.publish('notifications', JSON.stringify({
  type: 'order_completed',
  orderId: '123',
}));

await publisher.publish('user:456', JSON.stringify({
  type: 'message',
  from: 'user:789',
}));
```

### Real-Time Notifications

```javascript
// Server
const Redis = require('ioredis');
const { Server } = require('socket.io');

const io = new Server(httpServer);
const subscriber = new Redis();
const publisher = new Redis();

subscriber.subscribe('notifications');

subscriber.on('message', (channel, message) => {
  const data = JSON.parse(message);
  
  // Send to specific user
  if (data.userId) {
    io.to(`user:${data.userId}`).emit('notification', data);
  } else {
    // Broadcast to all
    io.emit('notification', data);
  }
});

// Publish notification from anywhere in your app
async function sendNotification(userId, notification) {
  await publisher.publish('notifications', JSON.stringify({
    userId,
    ...notification,
  }));
}
```

## Rate Limiting

### Fixed Window

```javascript
async function rateLimit(key, limit, windowSeconds) {
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    reset: await redis.ttl(key),
  };
}

// Express middleware
function rateLimitMiddleware(limit = 100, window = 60) {
  return async (req, res, next) => {
    const key = `ratelimit:${req.ip}`;
    const result = await rateLimit(key, limit, window);
    
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': result.reset,
    });
    
    if (!result.allowed) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    next();
  };
}
```

### Sliding Window

```javascript
async function slidingWindowRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const pipeline = redis.pipeline();
  
  // Remove old entries
  pipeline.zremrangebyscore(key, 0, windowStart);
  
  // Count current entries
  pipeline.zcard(key);
  
  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  
  // Set expiration
  pipeline.expire(key, Math.ceil(windowMs / 1000));
  
  const results = await pipeline.exec();
  const count = results[1][1];
  
  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count - 1),
  };
}
```

## Job Queue with Bull

```bash
npm install bull
```

```javascript
const Queue = require('bull');

const emailQueue = new Queue('email', process.env.REDIS_URL);

// Producer: Add jobs
await emailQueue.add('welcome', {
  to: 'user@example.com',
  subject: 'Welcome!',
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
});

// Consumer: Process jobs
emailQueue.process('welcome', async (job) => {
  const { to, subject } = job.data;
  await sendEmail(to, subject);
  return { sent: true };
});

// Events
emailQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

emailQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

## Transactions (Pipelines)

```javascript
// Pipeline for batch operations
const pipeline = redis.pipeline();

pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.incr('counter');
pipeline.hset('hash', 'field', 'value');

const results = await pipeline.exec();
// [[null, 'OK'], [null, 'OK'], [null, 1], [null, 1]]

// Multi for atomic transactions
const multi = redis.multi();

multi.get('balance');
multi.decrby('balance', 100);
multi.incrby('spent', 100);

const results = await multi.exec();
```

### Optimistic Locking with WATCH

```javascript
async function transfer(fromAccount, toAccount, amount) {
  const fromKey = `account:${fromAccount}`;
  const toKey = `account:${toAccount}`;
  
  while (true) {
    await redis.watch(fromKey);
    
    const balance = parseInt(await redis.get(fromKey)) || 0;
    
    if (balance < amount) {
      await redis.unwatch();
      throw new Error('Insufficient funds');
    }
    
    const multi = redis.multi();
    multi.decrby(fromKey, amount);
    multi.incrby(toKey, amount);
    
    const results = await multi.exec();
    
    if (results) {
      return true;  // Success
    }
    // Transaction failed, retry
  }
}
```

## Summary

| Data Type | Use Case |
|-----------|----------|
| Strings | Simple key-value, counters |
| Hashes | Object storage, user profiles |
| Lists | Queues, recent items |
| Sets | Tags, unique values |
| Sorted Sets | Leaderboards, time-series |

| Command | Description |
|---------|-------------|
| `SET/GET` | Store/retrieve strings |
| `HSET/HGETALL` | Hash operations |
| `LPUSH/RPOP` | List operations |
| `SADD/SMEMBERS` | Set operations |
| `ZADD/ZRANGE` | Sorted set operations |
| `PUBLISH/SUBSCRIBE` | Pub/Sub messaging |
| `MULTI/EXEC` | Transactions |

| Pattern | Use Case |
|---------|----------|
| Cache-aside | Read-heavy workloads |
| Write-through | Consistency required |
| Pub/Sub | Real-time notifications |
| Rate limiting | API protection |
| Session storage | User sessions |
