# How to Implement Client-Side Caching in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Client-Side Caching, ioredis, Tracking

Description: Learn how to implement Redis client-side caching in Node.js using ioredis with CLIENT TRACKING, Map-based local cache, and automatic invalidation via Pub/Sub.

---

Redis client-side caching keeps a local in-process cache in your Node.js application that Redis invalidates automatically when keys change. This eliminates round trips for frequently read keys while maintaining consistency.

## Setup

Install ioredis:

```bash
npm install ioredis
```

## Client-Side Cache Implementation

```javascript
const Redis = require('ioredis');

class RedisClientSideCache {
  constructor(options = { host: 'localhost', port: 6379 }) {
    // Data connection
    this.redis = new Redis(options);

    // Dedicated connection for invalidation messages
    this.invalidationConn = new Redis(options);

    this.localCache = new Map();
    this.setupTracking();
  }

  async setupTracking() {
    // Get client ID before entering subscriber mode
    const invClientId = await this.invalidationConn.client('ID');

    // Subscribe to the invalidation channel
    await this.invalidationConn.subscribe('__redis__:invalidate');

    this.invalidationConn.on('message', (channel, payload) => {
      if (channel !== '__redis__:invalidate') {
        return;
      }

      // Flush invalidation (e.g. FLUSHDB) arrives as empty string
      if (!payload) {
        this.localCache.clear();
        return;
      }

      // ioredis delivers invalidated keys as a comma-separated string
      const keys = payload.split(',');
      for (const key of keys) {
        if (this.localCache.has(key)) {
          this.localCache.delete(key);
          console.log(`Invalidated: ${key}`);
        }
      }
    });

    // Enable CLIENT TRACKING with redirect
    await this.redis.call('CLIENT', 'TRACKING', 'ON', 'REDIRECT', invClientId);

    console.log(`Tracking enabled, redirecting to client ${invClientId}`);
  }

  async get(key) {
    // Return from local cache if present
    if (this.localCache.has(key)) {
      return this.localCache.get(key);
    }

    // Fetch from Redis - registers key in tracking table
    const value = await this.redis.get(key);

    if (value !== null) {
      this.localCache.set(key, value);
    }

    return value;
  }

  async set(key, value, exSeconds = null) {
    if (exSeconds) {
      await this.redis.set(key, value, 'EX', exSeconds);
    } else {
      await this.redis.set(key, value);
    }
    // Redis will send invalidation - no need to manually update cache
  }

  async delete(key) {
    await this.redis.del(key);
    // Invalidation will clear local cache
  }

  cacheSize() {
    return this.localCache.size;
  }

  async close() {
    await this.redis.call('CLIENT', 'TRACKING', 'OFF');
    this.redis.disconnect();
    this.invalidationConn.disconnect();
  }
}
```

## Usage Example

```javascript
async function main() {
  const cache = new RedisClientSideCache();

  // Wait for tracking setup
  await new Promise(resolve => setTimeout(resolve, 100));

  // Set a value
  await cache.set('user:42', JSON.stringify({ name: 'Alice', role: 'admin' }));

  // First read - fetches from Redis
  const val1 = await cache.get('user:42');
  console.log('Miss:', val1);
  console.log('Cache size:', cache.cacheSize()); // 1

  // Second read - served from local Map
  const val2 = await cache.get('user:42');
  console.log('Hit:', val2); // No Redis round trip

  // Update from another client
  const other = new Redis();
  await other.set('user:42', JSON.stringify({ name: 'Alice', role: 'superadmin' }));

  // Wait for invalidation to arrive
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log('Cache size after update:', cache.cacheSize()); // 0 - key evicted

  // Next read fetches fresh data
  const val3 = await cache.get('user:42');
  console.log('Fresh:', val3);

  await cache.close();
  await other.quit();
}

main().catch(console.error);
```

## Handling Disconnections

Flush the local cache on reconnect to avoid serving stale data:

```javascript
class ResilientCache extends RedisClientSideCache {
  constructor(options) {
    super(options);

    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting - flushing local cache');
      this.localCache.clear();
    });
  }
}
```

## Adding TTL Protection

```javascript
class TtlCache extends RedisClientSideCache {
  async getWithTtl(key, maxAgeMs = 30000) {
    const entry = this.localCache.get(key);
    if (entry) {
      const { value, cachedAt } = entry;
      if (Date.now() - cachedAt < maxAgeMs) return value;
      this.localCache.delete(key);
    }

    const value = await this.redis.get(key);
    if (value !== null) {
      this.localCache.set(key, { value, cachedAt: Date.now() });
    }
    return value;
  }
}
```

## Summary

Implement Redis client-side caching in Node.js using two ioredis connections: one for data operations and one for receiving `__redis__:invalidate` Pub/Sub messages. Store cached values in a `Map` and delete entries on invalidation. Flush the entire cache on reconnect to prevent stale reads caused by missed invalidation messages during disconnection periods.
