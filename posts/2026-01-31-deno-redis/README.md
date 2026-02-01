# How to Use Redis with Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, Redis, Caching, Database

Description: Learn how to integrate Redis with Deno for caching, session management, pub/sub messaging, and high-performance data operations.

---

Redis is a powerful in-memory data store that excels at caching, session management, real-time messaging, and much more. Deno, the modern JavaScript and TypeScript runtime, pairs excellently with Redis to build fast, scalable applications. In this guide, we will explore how to use Redis with Deno, covering everything from basic operations to advanced patterns like pub/sub and transactions.

## Prerequisites

Before we begin, make sure you have the following installed:

- Deno 1.x or later
- Redis server running locally or accessible remotely
- Basic knowledge of TypeScript

## Installing the Redis Client

Deno uses URL-based imports, and the most popular Redis client for Deno is `redis` from deno.land/x. You can import it directly in your code without any package manager.

This import brings in the necessary functions to connect to Redis:

```typescript
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";
```

## Connecting to Redis

The first step is establishing a connection to your Redis server. The `connect` function accepts configuration options including hostname, port, and optional authentication.

Here is how to create a basic connection to a local Redis instance:

```typescript
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

console.log("Connected to Redis successfully!");
```

For production environments, you will likely need authentication. Here is how to connect with a password:

```typescript
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

const redis = await connect({
  hostname: "your-redis-host.com",
  port: 6379,
  password: Deno.env.get("REDIS_PASSWORD"),
  tls: true, // Enable TLS for secure connections
});
```

## Working with Strings

Strings are the most basic Redis data type. They can store text, numbers, or serialized objects. Redis strings are binary-safe and can hold up to 512 MB of data.

This example demonstrates setting and getting string values:

```typescript
// Set a simple string value
await redis.set("greeting", "Hello from Deno!");

// Get the value back
const greeting = await redis.get("greeting");
console.log(greeting); // Output: Hello from Deno!

// Set a value with expiration (in seconds)
await redis.set("temporary_key", "This will expire", { ex: 60 });

// Set only if key does not exist (useful for locks)
const wasSet = await redis.setnx("unique_key", "first_value");
console.log(wasSet); // Output: 1 (success) or 0 (key already exists)
```

You can also work with numeric values using increment and decrement operations:

```typescript
// Set an initial counter
await redis.set("page_views", "0");

// Increment the counter
await redis.incr("page_views");
await redis.incrby("page_views", 10);

// Get the current count
const views = await redis.get("page_views");
console.log(`Page views: ${views}`); // Output: Page views: 11

// Decrement operations
await redis.decr("page_views");
await redis.decrby("page_views", 5);
```

## Working with Hashes

Hashes are perfect for storing objects with multiple fields. They are memory-efficient and allow you to access individual fields without retrieving the entire object.

Here is how to store and retrieve user data using hashes:

```typescript
// Store a user object as a hash
await redis.hset("user:1001", {
  name: "Alice Johnson",
  email: "alice@example.com",
  role: "admin",
  created_at: new Date().toISOString(),
});

// Get a single field
const userName = await redis.hget("user:1001", "name");
console.log(`User name: ${userName}`);

// Get multiple fields at once
const userFields = await redis.hmget("user:1001", "name", "email");
console.log(userFields); // Output: ["Alice Johnson", "alice@example.com"]

// Get all fields and values
const fullUser = await redis.hgetall("user:1001");
console.log(fullUser);
// Output: { name: "Alice Johnson", email: "alice@example.com", ... }

// Check if a field exists
const hasEmail = await redis.hexists("user:1001", "email");
console.log(`Has email: ${hasEmail === 1}`);

// Delete a specific field
await redis.hdel("user:1001", "role");

// Increment a numeric field in a hash
await redis.hset("user:1001", { login_count: "0" });
await redis.hincrby("user:1001", "login_count", 1);
```

## Working with Lists

Redis lists are linked lists of strings. They are useful for queues, recent items, and any ordered collection of elements.

This example shows common list operations:

```typescript
// Add items to the right of the list (end)
await redis.rpush("task_queue", "task1", "task2", "task3");

// Add items to the left of the list (beginning)
await redis.lpush("task_queue", "urgent_task");

// Get the length of the list
const queueLength = await redis.llen("task_queue");
console.log(`Queue length: ${queueLength}`);

// Get items by index range (0-based, inclusive)
const allTasks = await redis.lrange("task_queue", 0, -1);
console.log(allTasks); // Output: ["urgent_task", "task1", "task2", "task3"]

// Pop an item from the left (FIFO queue behavior)
const nextTask = await redis.lpop("task_queue");
console.log(`Processing: ${nextTask}`);

// Pop an item from the right (LIFO stack behavior)
const lastTask = await redis.rpop("task_queue");
console.log(`Last task: ${lastTask}`);

// Blocking pop - waits for an item if the list is empty
// Useful for worker queues
const result = await redis.blpop(5, "task_queue"); // 5 second timeout
if (result) {
  console.log(`Received task from ${result.key}: ${result.value}`);
}
```

## Working with Sets

Sets are unordered collections of unique strings. They are perfect for tracking unique items, tags, or performing set operations like unions and intersections.

Here is how to use sets for tracking unique visitors:

```typescript
// Add members to a set
await redis.sadd("visitors:today", "user:1001", "user:1002", "user:1003");
await redis.sadd("visitors:today", "user:1001"); // Duplicate, won't be added

// Get all members
const todayVisitors = await redis.smembers("visitors:today");
console.log(todayVisitors); // Output: ["user:1001", "user:1002", "user:1003"]

// Check if a member exists
const isVisitor = await redis.sismember("visitors:today", "user:1001");
console.log(`Is visitor: ${isVisitor === 1}`);

// Get the number of members
const visitorCount = await redis.scard("visitors:today");
console.log(`Unique visitors: ${visitorCount}`);

// Remove a member
await redis.srem("visitors:today", "user:1002");

// Set operations for analytics
await redis.sadd("visitors:yesterday", "user:1001", "user:1004", "user:1005");

// Find users who visited both days (intersection)
const returningVisitors = await redis.sinter(
  "visitors:today",
  "visitors:yesterday"
);
console.log(`Returning visitors: ${returningVisitors}`);

// Find all unique visitors across both days (union)
const allVisitors = await redis.sunion(
  "visitors:today",
  "visitors:yesterday"
);
console.log(`Total unique visitors: ${allVisitors}`);

// Find users who visited yesterday but not today (difference)
const lostVisitors = await redis.sdiff(
  "visitors:yesterday",
  "visitors:today"
);
console.log(`Lost visitors: ${lostVisitors}`);
```

## Pub/Sub Messaging

Redis pub/sub allows you to build real-time messaging systems. Publishers send messages to channels, and subscribers receive them instantly.

First, create a subscriber that listens for messages:

```typescript
// subscriber.ts
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

// Subscribe to a channel
const subscription = await redis.subscribe("notifications");

console.log("Listening for notifications...");

// Process incoming messages
for await (const message of subscription.receive()) {
  if (message.channel === "notifications") {
    console.log(`Received: ${message.message}`);
    
    // Parse JSON messages if needed
    try {
      const data = JSON.parse(message.message);
      console.log("Parsed data:", data);
    } catch {
      // Not JSON, use as plain string
    }
  }
}
```

Now create a publisher that sends messages:

```typescript
// publisher.ts
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

// Publish a simple message
await redis.publish("notifications", "User logged in");

// Publish a JSON message
const event = {
  type: "order_created",
  orderId: "ORD-12345",
  timestamp: new Date().toISOString(),
};
await redis.publish("notifications", JSON.stringify(event));

console.log("Messages published!");
await redis.close();
```

You can also subscribe to multiple channels or use pattern matching:

```typescript
// Subscribe to multiple channels
const sub = await redis.subscribe("channel1", "channel2", "channel3");

// Pattern subscription - matches channels like "user:*"
const patternSub = await redis.psubscribe("user:*");

for await (const message of patternSub.receive()) {
  console.log(`Channel: ${message.channel}, Message: ${message.message}`);
}
```

## Transactions

Redis transactions allow you to execute multiple commands atomically. All commands in a transaction are executed sequentially without interruption from other clients.

Here is how to use transactions for safe balance transfers:

```typescript
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

// Initialize account balances
await redis.set("account:alice", "1000");
await redis.set("account:bob", "500");

// Transfer money atomically using a transaction
const transferAmount = 200;

// Start a transaction
const tx = redis.tx();

// Queue commands (they won't execute yet)
tx.decrby("account:alice", transferAmount);
tx.incrby("account:bob", transferAmount);

// Execute all commands atomically
const results = await tx.flush();
console.log("Transaction results:", results);

// Verify the balances
const aliceBalance = await redis.get("account:alice");
const bobBalance = await redis.get("account:bob");
console.log(`Alice: $${aliceBalance}, Bob: $${bobBalance}`);
// Output: Alice: $800, Bob: $700
```

For more complex scenarios, you can use WATCH for optimistic locking:

```typescript
// Watch a key for changes during transaction
await redis.watch("inventory:item123");

const currentStock = await redis.get("inventory:item123");
const stock = parseInt(currentStock || "0");

if (stock > 0) {
  const tx = redis.tx();
  tx.decr("inventory:item123");
  tx.rpush("orders", "order:new");
  
  try {
    await tx.flush();
    console.log("Order placed successfully!");
  } catch (error) {
    // Transaction failed because inventory changed
    console.log("Inventory changed, please retry");
  }
}
```

## Pipelining

Pipelining sends multiple commands to Redis without waiting for individual responses. This reduces network round trips and dramatically improves performance for bulk operations.

Here is how to use pipelining for efficient bulk operations:

```typescript
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

// Create a pipeline
const pipeline = redis.pipeline();

// Queue multiple commands
for (let i = 0; i < 100; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}

// Execute all commands at once
const results = await pipeline.flush();
console.log(`Executed ${results.length} commands`);

// Pipeline for reading multiple keys
const readPipeline = redis.pipeline();
for (let i = 0; i < 10; i++) {
  readPipeline.get(`key:${i}`);
}

const values = await readPipeline.flush();
console.log("Retrieved values:", values);
```

## Session Storage

Redis is excellent for storing user sessions due to its speed and built-in expiration features. Here is a complete session management implementation:

```typescript
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

// Session configuration
const SESSION_PREFIX = "session:";
const SESSION_TTL = 3600; // 1 hour in seconds

// Generate a random session ID
function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// Create a new session
async function createSession(
  userId: string,
  userData: Record<string, string>
): Promise<string> {
  const sessionId = generateSessionId();
  const sessionKey = `${SESSION_PREFIX}${sessionId}`;

  await redis.hset(sessionKey, {
    userId,
    createdAt: new Date().toISOString(),
    ...userData,
  });

  // Set expiration
  await redis.expire(sessionKey, SESSION_TTL);

  return sessionId;
}

// Get session data
async function getSession(
  sessionId: string
): Promise<Record<string, string> | null> {
  const sessionKey = `${SESSION_PREFIX}${sessionId}`;
  const data = await redis.hgetall(sessionKey);

  if (Object.keys(data).length === 0) {
    return null;
  }

  // Refresh the session TTL on access
  await redis.expire(sessionKey, SESSION_TTL);

  return data;
}

// Update session data
async function updateSession(
  sessionId: string,
  updates: Record<string, string>
): Promise<boolean> {
  const sessionKey = `${SESSION_PREFIX}${sessionId}`;
  const exists = await redis.exists(sessionKey);

  if (exists === 0) {
    return false;
  }

  await redis.hset(sessionKey, updates);
  await redis.expire(sessionKey, SESSION_TTL);
  return true;
}

// Destroy a session
async function destroySession(sessionId: string): Promise<void> {
  const sessionKey = `${SESSION_PREFIX}${sessionId}`;
  await redis.del(sessionKey);
}

// Usage example
const sessionId = await createSession("user:1001", {
  name: "Alice",
  role: "admin",
});
console.log(`Created session: ${sessionId}`);

const session = await getSession(sessionId);
console.log("Session data:", session);

await updateSession(sessionId, { lastActivity: new Date().toISOString() });

await destroySession(sessionId);
console.log("Session destroyed");
```

## Caching Patterns

Implementing effective caching can dramatically improve your application's performance. Here are common caching patterns with Redis:

This example shows the cache-aside pattern (lazy loading):

```typescript
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

const CACHE_TTL = 300; // 5 minutes

// Simulated database fetch
async function fetchFromDatabase(userId: string): Promise<object> {
  console.log(`Fetching user ${userId} from database...`);
  // Simulate database delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return {
    id: userId,
    name: "John Doe",
    email: "john@example.com",
  };
}

// Cache-aside pattern
async function getUser(userId: string): Promise<object> {
  const cacheKey = `user:${userId}`;

  // Try to get from cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log("Cache hit!");
    return JSON.parse(cached);
  }

  // Cache miss - fetch from database
  console.log("Cache miss!");
  const user = await fetchFromDatabase(userId);

  // Store in cache for future requests
  await redis.set(cacheKey, JSON.stringify(user), { ex: CACHE_TTL });

  return user;
}

// First call - cache miss
const user1 = await getUser("1001");
console.log(user1);

// Second call - cache hit
const user2 = await getUser("1001");
console.log(user2);
```

Here is the write-through caching pattern:

```typescript
// Write-through cache - update cache when data changes
async function updateUser(
  userId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const cacheKey = `user:${userId}`;

  // Update database first (simulated)
  console.log(`Updating user ${userId} in database...`);

  // Then update cache
  const currentUser = await getUser(userId);
  const updatedUser = { ...currentUser, ...updates };
  await redis.set(cacheKey, JSON.stringify(updatedUser), { ex: CACHE_TTL });

  console.log("Cache updated");
}

// Cache invalidation
async function invalidateUserCache(userId: string): Promise<void> {
  const cacheKey = `user:${userId}`;
  await redis.del(cacheKey);
  console.log(`Cache invalidated for user ${userId}`);
}

// Bulk cache invalidation with pattern
async function invalidateAllUserCaches(): Promise<void> {
  const keys = await redis.keys("user:*");
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Invalidated ${keys.length} user caches`);
  }
}
```

## Error Handling

Proper error handling is crucial for production applications. Here is how to handle common Redis errors gracefully:

```typescript
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

interface RedisConfig {
  hostname: string;
  port: number;
  password?: string;
  maxRetries?: number;
}

class RedisClient {
  private redis: Awaited<ReturnType<typeof connect>> | null = null;
  private config: RedisConfig;
  private retryCount = 0;

  constructor(config: RedisConfig) {
    this.config = { maxRetries: 3, ...config };
  }

  async connect(): Promise<void> {
    try {
      this.redis = await connect({
        hostname: this.config.hostname,
        port: this.config.port,
        password: this.config.password,
      });
      this.retryCount = 0;
      console.log("Connected to Redis");
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      await this.handleConnectionError();
    }
  }

  private async handleConnectionError(): Promise<void> {
    if (this.retryCount < (this.config.maxRetries || 3)) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
      console.log(`Retrying connection in ${delay}ms (attempt ${this.retryCount})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      await this.connect();
    } else {
      throw new Error("Max retry attempts reached. Could not connect to Redis.");
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.redis) {
      throw new Error("Redis client not connected");
    }

    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error(`Error getting key "${key}":`, error);
      // Attempt reconnection for connection errors
      if (this.isConnectionError(error)) {
        await this.connect();
        return await this.redis!.get(key);
      }
      throw error;
    }
  }

  async set(
    key: string,
    value: string,
    options?: { ex?: number }
  ): Promise<void> {
    if (!this.redis) {
      throw new Error("Redis client not connected");
    }

    try {
      await this.redis.set(key, value, options);
    } catch (error) {
      console.error(`Error setting key "${key}":`, error);
      if (this.isConnectionError(error)) {
        await this.connect();
        await this.redis!.set(key, value, options);
      } else {
        throw error;
      }
    }
  }

  private isConnectionError(error: unknown): boolean {
    const errorMessage = String(error);
    return (
      errorMessage.includes("connection") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    );
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.close();
      this.redis = null;
    }
  }
}

// Usage
const client = new RedisClient({
  hostname: "127.0.0.1",
  port: 6379,
  maxRetries: 5,
});

try {
  await client.connect();
  await client.set("test", "value", { ex: 60 });
  const value = await client.get("test");
  console.log(`Retrieved: ${value}`);
} catch (error) {
  console.error("Redis operation failed:", error);
} finally {
  await client.close();
}
```

## Best Practices Summary

When using Redis with Deno, follow these best practices for optimal performance and reliability:

**Connection Management**
- Reuse connections instead of creating new ones for each operation
- Implement connection pooling for high-concurrency applications
- Always close connections when your application shuts down
- Use TLS for connections to remote Redis servers

**Key Naming**
- Use consistent naming conventions with colons as separators (e.g., `user:1001:profile`)
- Keep keys as short as possible while remaining descriptive
- Use prefixes to namespace your keys and avoid collisions

**Memory Management**
- Always set TTL (expiration) on cache keys to prevent memory bloat
- Use appropriate data structures for your use case
- Monitor memory usage and set maxmemory limits in Redis configuration

**Performance Optimization**
- Use pipelining for bulk operations to reduce network round trips
- Prefer hashes over multiple string keys for objects
- Use SCAN instead of KEYS in production to avoid blocking

**Error Handling**
- Implement retry logic with exponential backoff for transient failures
- Handle connection errors gracefully with fallback mechanisms
- Log errors appropriately for debugging and monitoring

**Security**
- Never expose Redis directly to the internet
- Use strong passwords and enable authentication
- Consider using Redis ACLs for fine-grained access control

## Conclusion

Redis and Deno make a powerful combination for building high-performance applications. Redis provides lightning-fast data storage and retrieval, while Deno offers a modern, secure runtime with first-class TypeScript support. Throughout this guide, we covered the essential operations you need to integrate Redis into your Deno applications.

We started with basic string operations and progressed through more complex data structures like hashes, lists, and sets. We explored real-time messaging with pub/sub, ensured data integrity with transactions, and optimized performance with pipelining. The session storage and caching patterns we implemented are ready to use in production applications.

Remember that Redis is an in-memory store. Always have a persistence strategy in place and design your application to handle Redis unavailability gracefully. With proper error handling and the best practices outlined above, you can build robust, scalable applications that leverage the full power of Redis with Deno.

Start with the simple examples and gradually incorporate more advanced patterns as your application grows. The combination of Redis speed and Deno's modern tooling will help you deliver exceptional user experiences.
