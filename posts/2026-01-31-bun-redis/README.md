# How to Use Redis with Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Redis, Caching, Pub/Sub

Description: A comprehensive guide to integrating Redis with Bun for caching, session storage, pub/sub messaging, and high-performance data operations.

---

Redis is one of the most popular in-memory data stores, widely used for caching, session management, real-time analytics, and message brokering. Bun, the fast all-in-one JavaScript runtime, pairs exceptionally well with Redis due to its performance-focused design. In this guide, we will explore how to integrate Redis with Bun, covering everything from basic operations to advanced patterns like pub/sub, transactions, and caching strategies.

## Prerequisites

Before diving in, make sure you have the following installed:

- Bun (version 1.0 or later)
- Redis server (local or remote)
- Basic knowledge of JavaScript/TypeScript

## Installing the Redis Client

Bun works seamlessly with npm packages, so we can use the popular `redis` package or the `ioredis` library. For this tutorial, we will use `ioredis` due to its robust feature set and excellent TypeScript support.

Run the following command to install ioredis:

```bash
bun add ioredis
```

## Connecting to Redis

The first step is establishing a connection to your Redis server. You can connect to a local instance or a remote Redis server.

Here is how to create a basic Redis connection:

```typescript
import Redis from "ioredis";

// Connect to local Redis server on default port 6379
const redis = new Redis();

// Or connect with specific configuration
const redisWithConfig = new Redis({
  host: "localhost",
  port: 6379,
  password: "your-password", // Optional
  db: 0, // Database index
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Test the connection
async function testConnection(): Promise<void> {
  try {
    const pong = await redis.ping();
    console.log("Redis connection successful:", pong);
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
}

testConnection();
```

For production environments, you should use environment variables for configuration:

```typescript
import Redis from "ioredis";

// Production-ready connection using environment variables
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
});

// Handle connection events
redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

redis.on("reconnecting", () => {
  console.log("Reconnecting to Redis...");
});
```

## Working with Strings

Strings are the most basic Redis data type. They can store text, numbers, or serialized objects.

Here is how to perform basic string operations:

```typescript
import Redis from "ioredis";

const redis = new Redis();

async function stringOperations(): Promise<void> {
  // SET: Store a simple string value
  await redis.set("username", "john_doe");

  // GET: Retrieve the stored value
  const username = await redis.get("username");
  console.log("Username:", username); // Output: john_doe

  // SETEX: Set with expiration (in seconds)
  await redis.setex("session_token", 3600, "abc123xyz");

  // SETNX: Set only if key does not exist
  const wasSet = await redis.setnx("unique_key", "value");
  console.log("Key was set:", wasSet === 1);

  // MSET: Set multiple keys at once
  await redis.mset("key1", "value1", "key2", "value2", "key3", "value3");

  // MGET: Get multiple keys at once
  const values = await redis.mget("key1", "key2", "key3");
  console.log("Multiple values:", values);

  // INCR/DECR: Atomic increment and decrement
  await redis.set("counter", "10");
  await redis.incr("counter");
  await redis.incrby("counter", 5);
  const counter = await redis.get("counter");
  console.log("Counter value:", counter); // Output: 16

  // APPEND: Append to existing string
  await redis.append("username", "_admin");
  const updatedUsername = await redis.get("username");
  console.log("Updated username:", updatedUsername); // Output: john_doe_admin
}

stringOperations();
```

## Working with Hashes

Hashes are perfect for storing objects with multiple fields. They are more memory-efficient than storing serialized JSON strings.

Here is how to work with hash data structures:

```typescript
import Redis from "ioredis";

const redis = new Redis();

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

async function hashOperations(): Promise<void> {
  const userId = "user:1001";

  // HSET: Set individual hash fields
  await redis.hset(userId, "name", "Jane Smith");
  await redis.hset(userId, "email", "jane@example.com");

  // HMSET: Set multiple hash fields at once
  await redis.hmset(userId, {
    role: "admin",
    createdAt: new Date().toISOString(),
    id: "1001",
  });

  // HGET: Get a single field
  const name = await redis.hget(userId, "name");
  console.log("User name:", name);

  // HMGET: Get multiple fields
  const fields = await redis.hmget(userId, "name", "email", "role");
  console.log("User fields:", fields);

  // HGETALL: Get all fields and values
  const user = await redis.hgetall(userId);
  console.log("Complete user object:", user);

  // HEXISTS: Check if a field exists
  const hasEmail = await redis.hexists(userId, "email");
  console.log("Has email field:", hasEmail === 1);

  // HDEL: Delete a specific field
  await redis.hdel(userId, "createdAt");

  // HINCRBY: Increment a numeric field
  await redis.hset(userId, "loginCount", "0");
  await redis.hincrby(userId, "loginCount", 1);
  const loginCount = await redis.hget(userId, "loginCount");
  console.log("Login count:", loginCount);

  // HKEYS: Get all field names
  const keys = await redis.hkeys(userId);
  console.log("Hash keys:", keys);

  // HVALS: Get all values
  const values = await redis.hvals(userId);
  console.log("Hash values:", values);
}

hashOperations();
```

## Working with Lists

Lists in Redis are linked lists that support operations on both ends. They are ideal for queues, stacks, and maintaining ordered collections.

Here is how to use Redis lists for queue-like operations:

```typescript
import Redis from "ioredis";

const redis = new Redis();

async function listOperations(): Promise<void> {
  const listKey = "task_queue";

  // Clear any existing data
  await redis.del(listKey);

  // LPUSH: Add items to the left (beginning) of the list
  await redis.lpush(listKey, "task1", "task2", "task3");

  // RPUSH: Add items to the right (end) of the list
  await redis.rpush(listKey, "task4", "task5");

  // LRANGE: Get a range of elements (0 to -1 means all)
  const allTasks = await redis.lrange(listKey, 0, -1);
  console.log("All tasks:", allTasks);

  // LLEN: Get list length
  const length = await redis.llen(listKey);
  console.log("Queue length:", length);

  // LPOP: Remove and return the first element
  const firstTask = await redis.lpop(listKey);
  console.log("Popped first task:", firstTask);

  // RPOP: Remove and return the last element
  const lastTask = await redis.rpop(listKey);
  console.log("Popped last task:", lastTask);

  // LINDEX: Get element at specific index
  const taskAtIndex = await redis.lindex(listKey, 1);
  console.log("Task at index 1:", taskAtIndex);

  // LSET: Set element at specific index
  await redis.lset(listKey, 0, "updated_task");

  // LINSERT: Insert before or after a specific value
  await redis.linsert(listKey, "BEFORE", "task4", "new_task");

  // LTRIM: Keep only elements in specified range
  await redis.ltrim(listKey, 0, 2);

  const finalList = await redis.lrange(listKey, 0, -1);
  console.log("Final list:", finalList);
}

// Implementing a simple job queue
async function jobQueue(): Promise<void> {
  const queueName = "jobs";

  // Producer: Add jobs to the queue
  async function addJob(jobData: object): Promise<void> {
    await redis.rpush(queueName, JSON.stringify(jobData));
    console.log("Job added:", jobData);
  }

  // Consumer: Process jobs from the queue
  async function processJobs(): Promise<void> {
    while (true) {
      // BLPOP: Blocking pop that waits for items
      const result = await redis.blpop(queueName, 5);
      if (result) {
        const [, jobData] = result;
        const job = JSON.parse(jobData);
        console.log("Processing job:", job);
        // Process the job here
      } else {
        console.log("No jobs available, waiting...");
      }
    }
  }

  // Add some sample jobs
  await addJob({ type: "email", to: "user@example.com" });
  await addJob({ type: "notification", userId: 123 });
}

listOperations();
```

## Working with Sets

Sets are unordered collections of unique strings. They are useful for tracking unique items, tags, and performing set operations like unions and intersections.

Here is how to use Redis sets for managing unique collections:

```typescript
import Redis from "ioredis";

const redis = new Redis();

async function setOperations(): Promise<void> {
  // SADD: Add members to a set
  await redis.sadd("tags:post:1", "javascript", "typescript", "bun", "redis");
  await redis.sadd("tags:post:2", "python", "redis", "caching", "performance");

  // SMEMBERS: Get all members of a set
  const postTags = await redis.smembers("tags:post:1");
  console.log("Post 1 tags:", postTags);

  // SISMEMBER: Check if a value is in the set
  const hasTag = await redis.sismember("tags:post:1", "javascript");
  console.log("Has javascript tag:", hasTag === 1);

  // SCARD: Get the number of members
  const tagCount = await redis.scard("tags:post:1");
  console.log("Number of tags:", tagCount);

  // SREM: Remove a member from the set
  await redis.srem("tags:post:1", "bun");

  // SUNION: Get the union of multiple sets
  const allTags = await redis.sunion("tags:post:1", "tags:post:2");
  console.log("All unique tags:", allTags);

  // SINTER: Get the intersection of multiple sets
  const commonTags = await redis.sinter("tags:post:1", "tags:post:2");
  console.log("Common tags:", commonTags);

  // SDIFF: Get the difference between sets
  const uniqueToPost1 = await redis.sdiff("tags:post:1", "tags:post:2");
  console.log("Tags unique to post 1:", uniqueToPost1);

  // SRANDMEMBER: Get random members
  const randomTag = await redis.srandmember("tags:post:1");
  console.log("Random tag:", randomTag);

  // SPOP: Remove and return a random member
  const poppedTag = await redis.spop("tags:post:1");
  console.log("Popped tag:", poppedTag);
}

// Practical example: Online users tracking
async function trackOnlineUsers(): Promise<void> {
  const onlineKey = "users:online";

  // Add users to online set
  await redis.sadd(onlineKey, "user:1", "user:2", "user:3", "user:4");

  // Check if user is online
  const isOnline = await redis.sismember(onlineKey, "user:2");
  console.log("User 2 is online:", isOnline === 1);

  // Get online user count
  const onlineCount = await redis.scard(onlineKey);
  console.log("Online users:", onlineCount);

  // User goes offline
  await redis.srem(onlineKey, "user:3");
}

setOperations();
```

## Pub/Sub Messaging

Redis Pub/Sub allows you to build real-time messaging systems. Publishers send messages to channels, and subscribers receive them instantly.

Here is how to implement a pub/sub messaging system:

```typescript
import Redis from "ioredis";

// Create separate connections for pub and sub
// Subscriber connections enter a special mode and cannot run other commands
const publisher = new Redis();
const subscriber = new Redis();

interface Message {
  type: string;
  data: unknown;
  timestamp: number;
}

async function pubSubExample(): Promise<void> {
  const channel = "notifications";

  // Set up the subscriber
  subscriber.subscribe(channel, (err, count) => {
    if (err) {
      console.error("Failed to subscribe:", err);
      return;
    }
    console.log(`Subscribed to ${count} channel(s)`);
  });

  // Handle incoming messages
  subscriber.on("message", (channel, message) => {
    const parsed: Message = JSON.parse(message);
    console.log(`Received on ${channel}:`, parsed);
  });

  // Give subscriber time to connect
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Publish messages
  const message1: Message = {
    type: "alert",
    data: { severity: "high", service: "api" },
    timestamp: Date.now(),
  };

  const message2: Message = {
    type: "update",
    data: { userId: 123, action: "login" },
    timestamp: Date.now(),
  };

  await publisher.publish(channel, JSON.stringify(message1));
  await publisher.publish(channel, JSON.stringify(message2));

  console.log("Messages published");
}

// Pattern-based subscription for multiple channels
async function patternSubscription(): Promise<void> {
  const patternSubscriber = new Redis();

  // Subscribe to all channels matching a pattern
  patternSubscriber.psubscribe("events:*", (err, count) => {
    if (err) {
      console.error("Failed to psubscribe:", err);
      return;
    }
    console.log(`Pattern subscribed to ${count} pattern(s)`);
  });

  // Handle pattern messages
  patternSubscriber.on("pmessage", (pattern, channel, message) => {
    console.log(`Pattern: ${pattern}, Channel: ${channel}, Message: ${message}`);
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Publish to different event channels
  await publisher.publish("events:user", JSON.stringify({ action: "signup" }));
  await publisher.publish("events:order", JSON.stringify({ orderId: 456 }));
  await publisher.publish("events:system", JSON.stringify({ status: "healthy" }));
}

pubSubExample();
```

## Transactions with MULTI/EXEC

Transactions in Redis allow you to execute multiple commands atomically. All commands in a transaction are executed sequentially without interruption.

Here is how to use Redis transactions for atomic operations:

```typescript
import Redis from "ioredis";

const redis = new Redis();

async function transactionExample(): Promise<void> {
  // Basic transaction using multi/exec
  const result = await redis
    .multi()
    .set("key1", "value1")
    .set("key2", "value2")
    .incr("counter")
    .get("key1")
    .exec();

  console.log("Transaction results:", result);
  // Each result is [error, value] tuple

  // Practical example: Transfer funds between accounts
  async function transferFunds(
    fromAccount: string,
    toAccount: string,
    amount: number
  ): Promise<boolean> {
    const fromKey = `balance:${fromAccount}`;
    const toKey = `balance:${toAccount}`;

    // Watch keys for optimistic locking
    await redis.watch(fromKey, toKey);

    const fromBalance = parseInt((await redis.get(fromKey)) || "0");

    if (fromBalance < amount) {
      await redis.unwatch();
      console.log("Insufficient funds");
      return false;
    }

    // Execute transaction
    const txResult = await redis
      .multi()
      .decrby(fromKey, amount)
      .incrby(toKey, amount)
      .exec();

    if (txResult === null) {
      // Transaction was aborted due to watched key change
      console.log("Transaction aborted, retrying...");
      return transferFunds(fromAccount, toAccount, amount);
    }

    console.log(`Transferred ${amount} from ${fromAccount} to ${toAccount}`);
    return true;
  }

  // Set up accounts
  await redis.set("balance:account1", "1000");
  await redis.set("balance:account2", "500");

  // Perform transfer
  await transferFunds("account1", "account2", 200);

  // Check balances
  const balance1 = await redis.get("balance:account1");
  const balance2 = await redis.get("balance:account2");
  console.log("Account 1 balance:", balance1); // 800
  console.log("Account 2 balance:", balance2); // 700
}

transactionExample();
```

## Pipelining for Performance

Pipelining allows you to send multiple commands to Redis without waiting for individual responses. This significantly reduces network round-trips and improves performance.

Here is how to use pipelining for batch operations:

```typescript
import Redis from "ioredis";

const redis = new Redis();

async function pipeliningExample(): Promise<void> {
  // Basic pipelining
  const pipeline = redis.pipeline();

  // Queue up multiple commands
  pipeline.set("pipe:key1", "value1");
  pipeline.set("pipe:key2", "value2");
  pipeline.set("pipe:key3", "value3");
  pipeline.get("pipe:key1");
  pipeline.get("pipe:key2");
  pipeline.incr("pipe:counter");

  // Execute all commands at once
  const results = await pipeline.exec();
  console.log("Pipeline results:", results);

  // Practical example: Bulk data insertion
  async function bulkInsert(items: Array<{ id: string; data: object }>): Promise<void> {
    const pipe = redis.pipeline();

    for (const item of items) {
      pipe.hset(`item:${item.id}`, item.data as Record<string, string>);
      pipe.sadd("items:all", item.id);
      pipe.zadd("items:byTime", Date.now(), item.id);
    }

    await pipe.exec();
    console.log(`Inserted ${items.length} items`);
  }

  // Insert sample data
  await bulkInsert([
    { id: "1", data: { name: "Item 1", price: "10" } },
    { id: "2", data: { name: "Item 2", price: "20" } },
    { id: "3", data: { name: "Item 3", price: "30" } },
  ]);

  // Bulk retrieval with pipeline
  async function bulkGet(ids: string[]): Promise<object[]> {
    const pipe = redis.pipeline();

    for (const id of ids) {
      pipe.hgetall(`item:${id}`);
    }

    const results = await pipe.exec();
    return results?.map(([err, data]) => (err ? null : data)) || [];
  }

  const items = await bulkGet(["1", "2", "3"]);
  console.log("Retrieved items:", items);
}

// Performance comparison
async function performanceComparison(): Promise<void> {
  const iterations = 1000;

  // Without pipelining
  const startWithout = Date.now();
  for (let i = 0; i < iterations; i++) {
    await redis.set(`test:${i}`, `value${i}`);
  }
  const timeWithout = Date.now() - startWithout;
  console.log(`Without pipelining: ${timeWithout}ms`);

  // With pipelining
  const startWith = Date.now();
  const pipe = redis.pipeline();
  for (let i = 0; i < iterations; i++) {
    pipe.set(`test:${i}`, `value${i}`);
  }
  await pipe.exec();
  const timeWith = Date.now() - startWith;
  console.log(`With pipelining: ${timeWith}ms`);
  console.log(`Speedup: ${(timeWithout / timeWith).toFixed(2)}x faster`);
}

pipeliningExample();
```

## Session Storage

Redis is an excellent choice for storing user sessions due to its speed and built-in expiration support.

Here is how to implement session storage with Redis:

```typescript
import Redis from "ioredis";
import { randomBytes } from "crypto";

const redis = new Redis();

interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
  lastAccess: number;
}

class SessionStore {
  private prefix = "session:";
  private ttl = 3600; // 1 hour in seconds

  // Generate a unique session ID
  generateSessionId(): string {
    return randomBytes(32).toString("hex");
  }

  // Create a new session
  async createSession(userId: string, userData: Partial<SessionData>): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionKey = `${this.prefix}${sessionId}`;

    const sessionData: SessionData = {
      userId,
      email: userData.email || "",
      role: userData.role || "user",
      createdAt: Date.now(),
      lastAccess: Date.now(),
    };

    // Store session with expiration
    await redis.hmset(sessionKey, sessionData as unknown as Record<string, string>);
    await redis.expire(sessionKey, this.ttl);

    // Track active sessions for user
    await redis.sadd(`user:${userId}:sessions`, sessionId);

    return sessionId;
  }

  // Get session data
  async getSession(sessionId: string): Promise<SessionData | null> {
    const sessionKey = `${this.prefix}${sessionId}`;
    const data = await redis.hgetall(sessionKey);

    if (Object.keys(data).length === 0) {
      return null;
    }

    // Update last access time and refresh TTL
    await redis.hset(sessionKey, "lastAccess", Date.now().toString());
    await redis.expire(sessionKey, this.ttl);

    return {
      userId: data.userId,
      email: data.email,
      role: data.role,
      createdAt: parseInt(data.createdAt),
      lastAccess: parseInt(data.lastAccess),
    };
  }

  // Update session data
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    const sessionKey = `${this.prefix}${sessionId}`;
    const exists = await redis.exists(sessionKey);

    if (!exists) {
      return false;
    }

    await redis.hmset(sessionKey, updates as unknown as Record<string, string>);
    await redis.expire(sessionKey, this.ttl);
    return true;
  }

  // Destroy a session
  async destroySession(sessionId: string): Promise<void> {
    const sessionKey = `${this.prefix}${sessionId}`;
    const session = await this.getSession(sessionId);

    if (session) {
      await redis.srem(`user:${session.userId}:sessions`, sessionId);
    }

    await redis.del(sessionKey);
  }

  // Destroy all sessions for a user
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await redis.smembers(`user:${userId}:sessions`);

    if (sessionIds.length > 0) {
      const pipeline = redis.pipeline();

      for (const sessionId of sessionIds) {
        pipeline.del(`${this.prefix}${sessionId}`);
      }

      pipeline.del(`user:${userId}:sessions`);
      await pipeline.exec();
    }
  }
}

// Usage example
async function sessionExample(): Promise<void> {
  const store = new SessionStore();

  // Create a session
  const sessionId = await store.createSession("user123", {
    email: "user@example.com",
    role: "admin",
  });
  console.log("Created session:", sessionId);

  // Get session
  const session = await store.getSession(sessionId);
  console.log("Session data:", session);

  // Update session
  await store.updateSession(sessionId, { role: "superadmin" });

  // Destroy session
  await store.destroySession(sessionId);
  console.log("Session destroyed");
}

sessionExample();
```

## Caching Patterns

Implementing proper caching patterns can dramatically improve application performance.

Here is how to implement common caching patterns with Redis:

```typescript
import Redis from "ioredis";

const redis = new Redis();

// Cache-Aside Pattern (Lazy Loading)
class CacheAside {
  private ttl: number;

  constructor(ttl: number = 300) {
    this.ttl = ttl;
  }

  async get<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // Try to get from cache first
    const cached = await redis.get(key);

    if (cached !== null) {
      console.log("Cache hit:", key);
      return JSON.parse(cached);
    }

    // Cache miss, fetch from source
    console.log("Cache miss:", key);
    const data = await fetchFn();

    // Store in cache
    await redis.setex(key, this.ttl, JSON.stringify(data));

    return data;
  }

  async invalidate(key: string): Promise<void> {
    await redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Write-Through Pattern
class WriteThrough {
  private ttl: number;

  constructor(ttl: number = 300) {
    this.ttl = ttl;
  }

  async write<T>(
    key: string,
    data: T,
    persistFn: (data: T) => Promise<void>
  ): Promise<void> {
    // Write to database first
    await persistFn(data);

    // Then update cache
    await redis.setex(key, this.ttl, JSON.stringify(data));
  }

  async read<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}

// Cache with Stale-While-Revalidate
class StaleWhileRevalidate {
  private ttl: number;
  private staleTime: number;

  constructor(ttl: number = 300, staleTime: number = 60) {
    this.ttl = ttl;
    this.staleTime = staleTime;
  }

  async get<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cacheKey = `swr:${key}`;
    const timestampKey = `swr:ts:${key}`;

    const [cached, timestamp] = await redis.mget(cacheKey, timestampKey);

    if (cached !== null) {
      const age = Date.now() - parseInt(timestamp || "0");

      // If data is fresh, return it
      if (age < this.staleTime * 1000) {
        return JSON.parse(cached);
      }

      // If data is stale but not expired, return it and revalidate in background
      if (age < this.ttl * 1000) {
        // Trigger background refresh
        this.revalidate(key, fetchFn).catch(console.error);
        return JSON.parse(cached);
      }
    }

    // Data is expired or missing, fetch synchronously
    return this.revalidate(key, fetchFn);
  }

  private async revalidate<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const data = await fetchFn();
    const cacheKey = `swr:${key}`;
    const timestampKey = `swr:ts:${key}`;

    await redis
      .pipeline()
      .setex(cacheKey, this.ttl, JSON.stringify(data))
      .setex(timestampKey, this.ttl, Date.now().toString())
      .exec();

    return data;
  }
}

// Usage examples
async function cachingPatternExamples(): Promise<void> {
  const cache = new CacheAside(60);

  // Simulate database fetch
  const fetchUserFromDb = async (userId: string) => {
    console.log("Fetching from database...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { id: userId, name: "John Doe", email: "john@example.com" };
  };

  // First call: cache miss
  const user1 = await cache.get("user:1", () => fetchUserFromDb("1"));
  console.log("User:", user1);

  // Second call: cache hit
  const user2 = await cache.get("user:1", () => fetchUserFromDb("1"));
  console.log("User (cached):", user2);

  // Invalidate cache
  await cache.invalidate("user:1");
}

cachingPatternExamples();
```

## Rate Limiting

Redis is commonly used for implementing rate limiting to protect APIs from abuse.

Here is how to implement a sliding window rate limiter:

```typescript
import Redis from "ioredis";

const redis = new Redis();

class RateLimiter {
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async isAllowed(identifier: string): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Use a sorted set with timestamp as score
    const pipeline = redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);

    // Set expiration
    pipeline.pexpire(key, this.windowMs);

    const results = await pipeline.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;

    const allowed = currentCount < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - currentCount - 1);

    // Get oldest entry to calculate reset time
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    const resetIn = oldest.length > 1 ? parseInt(oldest[1]) + this.windowMs - now : this.windowMs;

    return { allowed, remaining, resetIn };
  }
}

// Usage example
async function rateLimitExample(): Promise<void> {
  // Allow 10 requests per minute
  const limiter = new RateLimiter(60000, 10);

  const clientId = "client:192.168.1.1";

  for (let i = 0; i < 12; i++) {
    const result = await limiter.isAllowed(clientId);
    console.log(`Request ${i + 1}:`, {
      allowed: result.allowed,
      remaining: result.remaining,
      resetIn: `${result.resetIn}ms`,
    });
  }
}

rateLimitExample();
```

## Best Practices Summary

When working with Redis and Bun, follow these best practices for optimal performance and reliability:

**Connection Management**
- Use connection pooling for high-throughput applications
- Implement proper error handling and reconnection logic
- Close connections gracefully when shutting down

**Key Design**
- Use descriptive, namespaced key names (e.g., `user:123:profile`)
- Keep keys short but meaningful to save memory
- Use colons as separators for hierarchical data

**Performance**
- Use pipelining for batch operations to reduce network round-trips
- Prefer hash types over JSON strings for structured data
- Set appropriate TTLs to prevent memory bloat
- Use SCAN instead of KEYS in production to avoid blocking

**Data Integrity**
- Use transactions (MULTI/EXEC) for atomic operations
- Implement optimistic locking with WATCH for concurrent updates
- Consider using Lua scripts for complex atomic operations

**Memory Management**
- Always set expiration times on cached data
- Monitor memory usage and configure maxmemory policies
- Use appropriate data types for your use case

**Security**
- Use strong passwords and TLS in production
- Limit exposed Redis commands using ACLs
- Never expose Redis directly to the internet

## Conclusion

Redis and Bun make an excellent combination for building high-performance applications. Bun's speed and modern JavaScript features complement Redis's low-latency data operations perfectly. In this guide, we covered the essential Redis operations including strings, hashes, lists, sets, pub/sub messaging, transactions, and pipelining.

We also explored practical patterns like session storage, caching strategies, and rate limiting that you can apply directly to your production applications. The key to success with Redis is choosing the right data structure for your use case and leveraging features like pipelining and transactions to maximize performance.

Whether you are building a real-time chat application, implementing a caching layer, or managing user sessions, Redis provides the tools you need. Combined with Bun's exceptional performance, you can build applications that scale efficiently while maintaining low response times.

Start with simple use cases like caching and session storage, then gradually explore more advanced patterns as your application grows. Remember to monitor your Redis instance and tune configurations based on your specific workload characteristics.
