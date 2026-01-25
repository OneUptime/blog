# How to Reduce Redis Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory Optimization, Performance, DevOps, Cost Optimization

Description: Learn practical techniques to reduce Redis memory consumption without sacrificing performance. This guide covers data structure optimization, key design, compression, and memory policies.

---

Redis stores everything in memory, and memory is expensive. A Redis instance that starts small can quickly grow to consume gigabytes as your application scales. This guide covers proven techniques to reduce memory usage while maintaining the performance that makes Redis valuable.

## Understanding Redis Memory Usage

Before optimizing, you need to understand where memory is going. Redis provides detailed memory statistics.

```bash
# Get memory overview
redis-cli INFO memory

# Get detailed memory breakdown
redis-cli MEMORY STATS

# Analyze a specific key's memory usage
redis-cli MEMORY USAGE user:1001

# Find biggest keys (scan with sampling)
redis-cli --bigkeys
```

Key metrics to watch:

| Metric | What It Means |
|--------|---------------|
| used_memory | Total bytes allocated |
| used_memory_rss | Actual memory from OS |
| mem_fragmentation_ratio | RSS / used_memory (ideally 1.0-1.5) |
| used_memory_dataset | Memory used by actual data |
| used_memory_overhead | Memory used by metadata |

## Optimize Key Names

Key names are stored for every entry. Short, consistent naming saves significant memory at scale.

```javascript
// key-optimization.js
// Strategies for optimizing Redis key names

// Bad: Long, verbose key names
const badKeys = {
  user: 'application:users:profile:user_id:1001:data',
  session: 'user_session_data_for_user_1001_current_session',
  cache: 'api_response_cache:endpoint:/users/profile:timestamp:1699123456',
};

// Good: Short, structured key names
const goodKeys = {
  user: 'u:1001', // 6 bytes vs 42 bytes
  session: 's:1001', // 6 bytes vs 44 bytes
  cache: 'c:up:1699123456', // 15 bytes vs 52 bytes
};

// Use a key builder for consistency
class KeyBuilder {
  static user(id) {
    return `u:${id}`;
  }

  static userProfile(id) {
    return `u:${id}:p`;
  }

  static session(userId) {
    return `s:${userId}`;
  }

  static cache(endpoint, timestamp) {
    // Create short endpoint codes
    const endpointCodes = {
      '/users/profile': 'up',
      '/users/settings': 'us',
      '/orders/list': 'ol',
    };
    const code = endpointCodes[endpoint] || this.hashEndpoint(endpoint);
    return `c:${code}:${timestamp}`;
  }

  static hashEndpoint(endpoint) {
    // Create 4-char hash for unknown endpoints
    let hash = 0;
    for (let i = 0; i < endpoint.length; i++) {
      hash = ((hash << 5) - hash) + endpoint.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 4);
  }
}

module.exports = KeyBuilder;
```

## Use Efficient Data Structures

Redis has optimized internal encodings for small data. Choose the right structure and keep collections small.

```javascript
// data-structures.js
// Choosing memory-efficient data structures
const Redis = require('ioredis');
const redis = new Redis();

// BAD: Separate keys for each field
async function storeUserBad(user) {
  await redis.set(`user:${user.id}:name`, user.name);
  await redis.set(`user:${user.id}:email`, user.email);
  await redis.set(`user:${user.id}:age`, user.age);
  // Each key has overhead: ~50 bytes per key
  // 3 fields = ~150 bytes overhead
}

// GOOD: Hash for related fields
async function storeUserGood(user) {
  await redis.hset(`u:${user.id}`, {
    n: user.name,
    e: user.email,
    a: user.age,
  });
  // Single key overhead: ~50 bytes
  // Fields use ziplist encoding if small enough
}

// BETTER: Aggregate users into buckets
// Redis uses ziplist encoding for small hashes (huge memory savings)
async function storeUserBetter(user) {
  // Group users into buckets of 100
  const bucket = Math.floor(user.id / 100);
  const userData = JSON.stringify({
    n: user.name,
    e: user.email,
    a: user.age,
  });
  await redis.hset(`ub:${bucket}`, user.id, userData);
  // 100 users share one key's overhead
}

async function getUserBetter(userId) {
  const bucket = Math.floor(userId / 100);
  const data = await redis.hget(`ub:${bucket}`, userId);
  return data ? JSON.parse(data) : null;
}

// Configure hash optimization in redis.conf:
// hash-max-ziplist-entries 512  (default)
// hash-max-ziplist-value 64     (default)
// When hash has <= 512 entries and values <= 64 bytes, uses ziplist

module.exports = { storeUserGood, storeUserBetter, getUserBetter };
```

## Compress Values

For larger values, compression can significantly reduce memory usage.

```javascript
// compression.js
// Compress values before storing in Redis
const Redis = require('ioredis');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const redis = new Redis();

// Compression threshold - don't compress small values
const COMPRESSION_THRESHOLD = 1024; // 1KB

class CompressedCache {
  constructor(options = {}) {
    this.prefix = options.prefix || 'z:';
    this.threshold = options.threshold || COMPRESSION_THRESHOLD;
  }

  async set(key, value, ttl) {
    const serialized = JSON.stringify(value);
    const fullKey = this.prefix + key;

    // Only compress if above threshold
    if (serialized.length > this.threshold) {
      const compressed = await gzip(serialized);

      // Only use compressed if actually smaller
      if (compressed.length < serialized.length) {
        // Store with compression marker
        const stored = Buffer.concat([
          Buffer.from([1]), // Compression flag
          compressed,
        ]);

        if (ttl) {
          await redis.setex(fullKey, ttl, stored);
        } else {
          await redis.set(fullKey, stored);
        }

        console.log(`Compressed ${serialized.length} -> ${compressed.length} bytes`);
        return;
      }
    }

    // Store uncompressed
    const stored = Buffer.concat([
      Buffer.from([0]), // No compression flag
      Buffer.from(serialized),
    ]);

    if (ttl) {
      await redis.setex(fullKey, ttl, stored);
    } else {
      await redis.set(fullKey, stored);
    }
  }

  async get(key) {
    const fullKey = this.prefix + key;
    const data = await redis.getBuffer(fullKey);

    if (!data) return null;

    const isCompressed = data[0] === 1;
    const payload = data.slice(1);

    if (isCompressed) {
      const decompressed = await gunzip(payload);
      return JSON.parse(decompressed.toString());
    }

    return JSON.parse(payload.toString());
  }
}

// Alternative: Use MessagePack for more efficient serialization
const msgpack = require('msgpack-lite');

class PackedCache {
  constructor(options = {}) {
    this.prefix = options.prefix || 'p:';
  }

  async set(key, value, ttl) {
    const packed = msgpack.encode(value);
    const fullKey = this.prefix + key;

    if (ttl) {
      await redis.setex(fullKey, ttl, packed);
    } else {
      await redis.set(fullKey, packed);
    }
  }

  async get(key) {
    const fullKey = this.prefix + key;
    const data = await redis.getBuffer(fullKey);

    if (!data) return null;

    return msgpack.decode(data);
  }
}

module.exports = { CompressedCache, PackedCache };
```

## Configure Memory Policies

Set appropriate memory limits and eviction policies.

```bash
# redis.conf memory settings

# Set maximum memory limit
maxmemory 2gb

# Eviction policy when maxmemory is reached
# Options:
# - volatile-lru: Evict keys with TTL, least recently used first
# - allkeys-lru: Evict any key, least recently used first
# - volatile-lfu: Evict keys with TTL, least frequently used first
# - allkeys-lfu: Evict any key, least frequently used first
# - volatile-random: Evict random keys with TTL
# - allkeys-random: Evict any random key
# - volatile-ttl: Evict keys with shortest TTL first
# - noeviction: Return error when memory limit reached

maxmemory-policy allkeys-lru

# LRU/LFU sampling size (higher = more accurate, slower)
maxmemory-samples 10
```

## Implement TTL Everywhere

Keys without TTL live forever. Set expiration on everything that can expire.

```javascript
// ttl-management.js
// Enforce TTL on all cache entries
const Redis = require('ioredis');
const redis = new Redis();

// Default TTLs by category
const TTL_CONFIG = {
  session: 24 * 60 * 60,      // 24 hours
  cache: 60 * 60,             // 1 hour
  rateLimit: 60,              // 1 minute
  tempData: 5 * 60,           // 5 minutes
  userProfile: 7 * 24 * 60 * 60, // 7 days
};

class TTLCache {
  constructor(category) {
    this.ttl = TTL_CONFIG[category] || 3600;
    this.prefix = category.substring(0, 2) + ':';
  }

  async set(key, value) {
    // Always use SETEX, never SET without TTL
    await redis.setex(
      this.prefix + key,
      this.ttl,
      JSON.stringify(value)
    );
  }

  async get(key) {
    const data = await redis.get(this.prefix + key);
    return data ? JSON.parse(data) : null;
  }

  async getWithRefresh(key) {
    const fullKey = this.prefix + key;

    // Get value and refresh TTL atomically
    const pipeline = redis.pipeline();
    pipeline.get(fullKey);
    pipeline.expire(fullKey, this.ttl);

    const [[, data]] = await pipeline.exec();
    return data ? JSON.parse(data) : null;
  }
}

// Find and fix keys without TTL
async function findKeysWithoutTTL(pattern = '*', limit = 100) {
  let cursor = '0';
  const keysWithoutTTL = [];

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) { // -1 means no TTL
        keysWithoutTTL.push(key);
        if (keysWithoutTTL.length >= limit) {
          return keysWithoutTTL;
        }
      }
    }
  } while (cursor !== '0');

  return keysWithoutTTL;
}

// Set default TTL on keys missing it
async function setDefaultTTL(keys, ttl) {
  const pipeline = redis.pipeline();

  for (const key of keys) {
    pipeline.expire(key, ttl);
  }

  await pipeline.exec();
  console.log(`Set TTL on ${keys.length} keys`);
}

module.exports = { TTLCache, findKeysWithoutTTL, setDefaultTTL };
```

## Use Redis Hashes for Small Objects

Hashes with fewer entries use ziplist encoding, which is highly memory-efficient.

```javascript
// hash-optimization.js
// Leverage hash ziplist encoding for memory savings
const Redis = require('ioredis');
const redis = new Redis();

// Store configuration data efficiently
class ConfigStore {
  constructor(namespace) {
    this.key = `cfg:${namespace}`;
  }

  async set(field, value) {
    await redis.hset(this.key, field, JSON.stringify(value));
  }

  async get(field) {
    const data = await redis.hget(this.key, field);
    return data ? JSON.parse(data) : null;
  }

  async getAll() {
    const data = await redis.hgetall(this.key);
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = JSON.parse(value);
    }
    return result;
  }

  async setMultiple(fields) {
    const args = [];
    for (const [key, value] of Object.entries(fields)) {
      args.push(key, JSON.stringify(value));
    }
    await redis.hset(this.key, ...args);
  }
}

// Memory-efficient counter storage
// Instead of: counter:page:home, counter:page:about, ...
// Use: counters hash with fields
class CounterStore {
  constructor() {
    this.key = 'counters';
  }

  async increment(name, amount = 1) {
    return redis.hincrby(this.key, name, amount);
  }

  async get(name) {
    const value = await redis.hget(this.key, name);
    return parseInt(value) || 0;
  }

  async getAll() {
    const data = await redis.hgetall(this.key);
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = parseInt(value) || 0;
    }
    return result;
  }
}

module.exports = { ConfigStore, CounterStore };
```

## Monitor and Alert on Memory

Set up monitoring to catch memory issues before they become problems.

```javascript
// memory-monitor.js
// Monitor Redis memory and alert on issues
const Redis = require('ioredis');
const redis = new Redis();

async function getMemoryMetrics() {
  const info = await redis.info('memory');
  const metrics = {};

  // Parse INFO output
  for (const line of info.split('\n')) {
    const [key, value] = line.split(':');
    if (key && value) {
      metrics[key.trim()] = value.trim();
    }
  }

  return {
    usedMemory: parseInt(metrics.used_memory),
    usedMemoryHuman: metrics.used_memory_human,
    usedMemoryPeak: parseInt(metrics.used_memory_peak),
    usedMemoryPeakHuman: metrics.used_memory_peak_human,
    usedMemoryRss: parseInt(metrics.used_memory_rss),
    fragmentation: parseFloat(metrics.mem_fragmentation_ratio),
    maxmemory: parseInt(metrics.maxmemory) || Infinity,
  };
}

async function checkMemoryHealth() {
  const metrics = await getMemoryMetrics();

  const alerts = [];

  // Check memory usage percentage
  if (metrics.maxmemory !== Infinity) {
    const usagePercent = (metrics.usedMemory / metrics.maxmemory) * 100;
    if (usagePercent > 90) {
      alerts.push({
        level: 'critical',
        message: `Memory usage at ${usagePercent.toFixed(1)}%`,
      });
    } else if (usagePercent > 75) {
      alerts.push({
        level: 'warning',
        message: `Memory usage at ${usagePercent.toFixed(1)}%`,
      });
    }
  }

  // Check fragmentation
  if (metrics.fragmentation > 1.5) {
    alerts.push({
      level: 'warning',
      message: `High memory fragmentation: ${metrics.fragmentation.toFixed(2)}`,
    });
  }

  return {
    metrics,
    alerts,
    healthy: alerts.filter((a) => a.level === 'critical').length === 0,
  };
}

// Run periodic checks
setInterval(async () => {
  const health = await checkMemoryHealth();

  if (!health.healthy) {
    console.error('Redis memory alert:', health.alerts);
    // Send to alerting system
  }
}, 60000); // Check every minute

module.exports = { getMemoryMetrics, checkMemoryHealth };
```

## Quick Wins Summary

| Technique | Typical Savings | Effort |
|-----------|-----------------|--------|
| Shorter key names | 10-30% | Low |
| Use hashes for objects | 20-50% | Low |
| Set TTL on all keys | Prevents unbounded growth | Low |
| Compress large values | 50-80% on compressible data | Medium |
| Use MessagePack | 10-30% vs JSON | Low |
| Bucket small objects | 30-60% | Medium |
| Configure maxmemory-policy | Prevents OOM | Low |

Start with the low-effort optimizations and measure the impact. Redis memory usage can often be cut in half with careful attention to data structure choices and key naming conventions.
