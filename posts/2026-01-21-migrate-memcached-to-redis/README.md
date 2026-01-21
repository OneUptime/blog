# How to Migrate from Memcached to Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memcached, Migration, Caching, Data Migration, Python, Node.js

Description: A comprehensive guide to migrating from Memcached to Redis, covering data migration strategies, client code changes, compatibility layers, and production rollout patterns.

---

Migrating from Memcached to Redis opens up new possibilities - rich data structures, persistence, replication, and more. This guide provides a complete roadmap for a successful migration, from planning to production rollout.

## Why Migrate from Memcached to Redis?

Common reasons for migration:

- **Data Structures**: Need lists, sets, sorted sets, hashes
- **Persistence**: Want data to survive restarts
- **Replication**: Need high availability
- **Pub/Sub**: Require real-time messaging
- **Atomic Operations**: Need complex atomic transactions
- **Lua Scripting**: Want server-side logic
- **TTL per Field**: Need more granular expiration

## Migration Planning

### Assessment Phase

1. **Inventory Your Usage**:

```bash
# Check Memcached stats
echo "stats" | nc localhost 11211 | grep -E "(bytes|curr_items|get_hits|get_misses)"

# Sample output:
# STAT bytes 1073741824
# STAT curr_items 1500000
# STAT get_hits 50000000
# STAT get_misses 1000000
```

2. **Document Key Patterns**:

```python
# Common Memcached key patterns to document
patterns = [
    "session:{session_id}",
    "user:{user_id}:profile",
    "cache:query:{hash}",
    "ratelimit:{ip}:{endpoint}",
]
```

3. **Identify Value Structures**:

```python
# What data is stored?
# - Simple strings
# - JSON objects
# - Serialized objects
# - Binary data (images, etc.)
```

### Compatibility Mapping

| Memcached | Redis | Notes |
|-----------|-------|-------|
| `set key value` | `SET key value` | Direct mapping |
| `get key` | `GET key` | Direct mapping |
| `delete key` | `DEL key` | Direct mapping |
| `incr key delta` | `INCRBY key delta` | Direct mapping |
| `decr key delta` | `DECRBY key delta` | Direct mapping |
| `add key value` | `SET key value NX` | Only if not exists |
| `replace key value` | `SET key value XX` | Only if exists |
| `append key value` | `APPEND key value` | Direct mapping |
| `prepend key value` | Custom Lua script | No direct equivalent |
| `cas key value cas_token` | `WATCH/MULTI/EXEC` | Different approach |
| `gets key` | `GET` + application logic | No CAS token |

## Data Migration Strategies

### Strategy 1: Cold Migration (Downtime)

Best for: Small datasets, acceptable downtime

```python
import memcache
import redis
import json

def cold_migrate():
    mc = memcache.Client(['memcached:11211'])
    r = redis.Redis(host='redis', port=6379)

    # Note: Memcached doesn't support key enumeration
    # You need to know your keys from application logic or logs

    known_keys = get_all_known_keys()  # Your implementation

    migrated = 0
    failed = 0

    for key in known_keys:
        try:
            value = mc.get(key)
            if value is not None:
                # Preserve TTL if possible (Memcached doesn't expose TTL)
                r.set(key, value)
                migrated += 1
        except Exception as e:
            print(f"Failed to migrate {key}: {e}")
            failed += 1

    print(f"Migrated: {migrated}, Failed: {failed}")

# Run during maintenance window
cold_migrate()
```

### Strategy 2: Warm Migration (Dual Write)

Best for: Zero downtime, gradual migration

```python
class DualWriteCache:
    """Write to both Memcached and Redis during migration."""

    def __init__(self, memcached_client, redis_client, migration_mode='dual'):
        self.mc = memcached_client
        self.r = redis_client
        self.mode = migration_mode  # 'memcached', 'dual', 'redis'

    def set(self, key, value, ttl=0):
        if self.mode in ('memcached', 'dual'):
            try:
                self.mc.set(key, value, time=ttl)
            except Exception as e:
                print(f"Memcached set error: {e}")

        if self.mode in ('redis', 'dual'):
            try:
                if ttl > 0:
                    self.r.setex(key, ttl, value)
                else:
                    self.r.set(key, value)
            except Exception as e:
                print(f"Redis set error: {e}")

    def get(self, key):
        if self.mode == 'redis':
            return self.r.get(key)

        if self.mode == 'dual':
            # Read from Redis first, fall back to Memcached
            value = self.r.get(key)
            if value is not None:
                return value

            value = self.mc.get(key)
            if value is not None:
                # Backfill to Redis
                self.r.set(key, value)
            return value

        return self.mc.get(key)

    def delete(self, key):
        if self.mode in ('memcached', 'dual'):
            try:
                self.mc.delete(key)
            except Exception:
                pass

        if self.mode in ('redis', 'dual'):
            try:
                self.r.delete(key)
            except Exception:
                pass


# Migration phases:
# Phase 1: mode='dual' - Write to both, read from Memcached
# Phase 2: mode='dual' with Redis read preference
# Phase 3: mode='redis' - Full Redis
```

### Strategy 3: Shadow Mode (Read Comparison)

Best for: High-risk migrations, validation needed

```python
import logging
import hashlib

class ShadowModeCache:
    """Compare results between Memcached and Redis."""

    def __init__(self, memcached_client, redis_client):
        self.mc = memcached_client
        self.r = redis_client
        self.logger = logging.getLogger('shadow_cache')
        self.mismatches = 0

    def set(self, key, value, ttl=0):
        # Write to both
        self.mc.set(key, value, time=ttl)
        if ttl > 0:
            self.r.setex(key, ttl, value)
        else:
            self.r.set(key, value)

    def get(self, key):
        # Read from both and compare
        mc_value = self.mc.get(key)
        redis_value = self.r.get(key)

        # Handle type differences (Redis returns bytes)
        if redis_value is not None and isinstance(redis_value, bytes):
            redis_value = redis_value.decode('utf-8')

        if mc_value != redis_value:
            self.mismatches += 1
            self.logger.warning(
                f"Mismatch for key {key}: "
                f"MC={mc_value[:50] if mc_value else None}, "
                f"Redis={redis_value[:50] if redis_value else None}"
            )

        # Return Memcached value (source of truth during shadow mode)
        return mc_value

    def get_mismatch_rate(self):
        return self.mismatches
```

### Strategy 4: Live Sync with Replication

Use a tool to replicate Memcached to Redis in real-time:

```python
# Using a proxy-based approach
# Configure mcrouter or twemproxy to write to both

# twemproxy configuration (nutcracker.yml)
"""
alpha:
  listen: 127.0.0.1:22121
  hash: fnv1a_64
  distribution: ketama
  auto_eject_hosts: true
  redis: false
  servers:
   - 127.0.0.1:11211:1

beta:
  listen: 127.0.0.1:22122
  hash: fnv1a_64
  distribution: ketama
  auto_eject_hosts: true
  redis: true
  servers:
   - 127.0.0.1:6379:1
"""
```

## Client Code Changes

### Python: From python-memcached to redis-py

**Before (Memcached)**:

```python
import memcache

mc = memcache.Client(['localhost:11211'])

# Set with TTL
mc.set('user:123', '{"name": "Alice"}', time=3600)

# Get
user = mc.get('user:123')

# Increment
mc.incr('counter', 1)

# CAS operation
val, cas = mc.gets('key')
mc.cas('key', 'new_value', cas)

# Multi-get
results = mc.get_multi(['key1', 'key2', 'key3'])
```

**After (Redis)**:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set with TTL
r.setex('user:123', 3600, '{"name": "Alice"}')
# Or: r.set('user:123', '{"name": "Alice"}', ex=3600)

# Get
user = r.get('user:123')

# Increment
r.incr('counter', 1)
# Or: r.incrby('counter', 1)

# Optimistic locking (replaces CAS)
with r.pipeline() as pipe:
    while True:
        try:
            pipe.watch('key')
            current = pipe.get('key')
            pipe.multi()
            pipe.set('key', 'new_value')
            pipe.execute()
            break
        except redis.WatchError:
            continue

# Multi-get
results = r.mget(['key1', 'key2', 'key3'])
# Returns list, convert to dict if needed
results_dict = dict(zip(['key1', 'key2', 'key3'], results))
```

### Node.js: From memcached to ioredis

**Before (Memcached)**:

```javascript
const Memcached = require('memcached');
const memcached = new Memcached('localhost:11211');

// Set
memcached.set('key', 'value', 3600, (err) => {
  if (err) console.error(err);
});

// Get
memcached.get('key', (err, data) => {
  console.log(data);
});

// Increment
memcached.incr('counter', 1, (err, result) => {
  console.log(result);
});

// Multi-get
memcached.getMulti(['key1', 'key2'], (err, data) => {
  console.log(data);
});
```

**After (Redis)**:

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

// Set (async/await)
await redis.setex('key', 3600, 'value');
// Or: await redis.set('key', 'value', 'EX', 3600);

// Get
const value = await redis.get('key');

// Increment
const result = await redis.incr('counter');
// Or: await redis.incrby('counter', 1);

// Multi-get
const values = await redis.mget('key1', 'key2');
// Returns array: ['value1', 'value2']
```

### Java: From spymemcached to Jedis

**Before (Memcached)**:

```java
import net.spy.memcached.MemcachedClient;

MemcachedClient mc = new MemcachedClient(
    new InetSocketAddress("localhost", 11211));

// Set
mc.set("key", 3600, "value");

// Get
Object value = mc.get("key");

// Async get
Future<Object> future = mc.asyncGet("key");
```

**After (Redis)**:

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

JedisPool pool = new JedisPool("localhost", 6379);

try (Jedis jedis = pool.getResource()) {
    // Set
    jedis.setex("key", 3600, "value");

    // Get
    String value = jedis.get("key");

    // Pipeline for batch operations
    Pipeline pipe = jedis.pipelined();
    pipe.get("key1");
    pipe.get("key2");
    List<Object> results = pipe.syncAndReturnAll();
}
```

## Compatibility Layer

Create a drop-in replacement layer for gradual migration:

```python
class RedisMemcacheCompat:
    """
    Redis client with Memcached-compatible interface.
    Drop-in replacement for memcache.Client
    """

    def __init__(self, servers=None, host='localhost', port=6379, **kwargs):
        self.r = redis.Redis(host=host, port=port, decode_responses=True, **kwargs)

    def set(self, key, value, time=0, min_compress_len=0):
        """Memcached-style set."""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        elif not isinstance(value, str):
            value = str(value)

        if time > 0:
            return self.r.setex(key, time, value)
        return self.r.set(key, value)

    def get(self, key):
        """Memcached-style get."""
        return self.r.get(key)

    def delete(self, key):
        """Delete a key."""
        return self.r.delete(key) > 0

    def incr(self, key, delta=1):
        """Increment a value."""
        try:
            return self.r.incrby(key, delta)
        except redis.ResponseError:
            return None

    def decr(self, key, delta=1):
        """Decrement a value."""
        try:
            return self.r.decrby(key, delta)
        except redis.ResponseError:
            return None

    def add(self, key, value, time=0):
        """Set only if key doesn't exist."""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)

        if time > 0:
            return self.r.set(key, value, ex=time, nx=True)
        return self.r.set(key, value, nx=True)

    def replace(self, key, value, time=0):
        """Set only if key exists."""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)

        if time > 0:
            return self.r.set(key, value, ex=time, xx=True)
        return self.r.set(key, value, xx=True)

    def append(self, key, value):
        """Append to a value."""
        return self.r.append(key, value)

    def get_multi(self, keys):
        """Get multiple keys at once."""
        values = self.r.mget(keys)
        return {k: v for k, v in zip(keys, values) if v is not None}

    def set_multi(self, mapping, time=0):
        """Set multiple keys at once."""
        pipe = self.r.pipeline()
        for key, value in mapping.items():
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            if time > 0:
                pipe.setex(key, time, value)
            else:
                pipe.set(key, value)
        return pipe.execute()

    def delete_multi(self, keys):
        """Delete multiple keys."""
        if keys:
            return self.r.delete(*keys)
        return 0

    def flush_all(self):
        """Clear all keys."""
        return self.r.flushdb()

    def gets(self, key):
        """Get with CAS token (not directly supported, returns mock)."""
        value = self.r.get(key)
        # Return value with a mock CAS token
        return value, hash(value) if value else None

    def cas(self, key, value, cas_token, time=0):
        """CAS operation (implemented via WATCH)."""
        try:
            with self.r.pipeline() as pipe:
                pipe.watch(key)
                current = pipe.get(key)
                if hash(current) != cas_token:
                    pipe.unwatch()
                    return False
                pipe.multi()
                if time > 0:
                    pipe.setex(key, time, value)
                else:
                    pipe.set(key, value)
                pipe.execute()
                return True
        except redis.WatchError:
            return False


# Usage - drop-in replacement
# Before: mc = memcache.Client(['localhost:11211'])
# After:  mc = RedisMemcacheCompat(host='localhost', port=6379)
```

## Testing the Migration

### Unit Tests

```python
import pytest

class TestCacheMigration:
    def setup_method(self):
        self.mc = memcache.Client(['localhost:11211'])
        self.redis = RedisMemcacheCompat(host='localhost', port=6379)

    def test_set_get(self):
        # Test on both
        for cache in [self.mc, self.redis]:
            cache.set('test_key', 'test_value', time=60)
            assert cache.get('test_key') == 'test_value'

    def test_increment(self):
        for cache in [self.mc, self.redis]:
            cache.set('counter', '0')
            cache.incr('counter')
            assert int(cache.get('counter')) == 1

    def test_multi_operations(self):
        for cache in [self.mc, self.redis]:
            cache.set_multi({
                'key1': 'value1',
                'key2': 'value2'
            })
            result = cache.get_multi(['key1', 'key2'])
            assert result['key1'] == 'value1'
            assert result['key2'] == 'value2'

    def test_add(self):
        for cache in [self.mc, self.redis]:
            cache.delete('new_key')
            assert cache.add('new_key', 'value')
            assert not cache.add('new_key', 'other_value')

    def test_replace(self):
        for cache in [self.mc, self.redis]:
            cache.delete('replace_key')
            assert not cache.replace('replace_key', 'value')
            cache.set('replace_key', 'original')
            assert cache.replace('replace_key', 'replaced')
```

### Load Testing

```python
import concurrent.futures
import time
import random

def load_test(cache_client, operations=10000, concurrency=50):
    """Load test a cache client."""

    def worker(worker_id):
        errors = 0
        for i in range(operations // concurrency):
            try:
                key = f"loadtest:{worker_id}:{random.randint(1, 1000)}"
                cache_client.set(key, f"value_{i}", time=60)
                value = cache_client.get(key)
                if value is None:
                    errors += 1
            except Exception as e:
                errors += 1
        return errors

    start = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(worker, i) for i in range(concurrency)]
        total_errors = sum(f.result() for f in futures)

    elapsed = time.time() - start
    ops_per_sec = (operations * 2) / elapsed  # set + get

    print(f"Operations: {operations * 2}")
    print(f"Errors: {total_errors}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Throughput: {ops_per_sec:.0f} ops/sec")

# Compare performance
print("Memcached:")
load_test(memcache.Client(['localhost:11211']))

print("\nRedis:")
load_test(RedisMemcacheCompat(host='localhost', port=6379))
```

## Production Rollout

### Phase 1: Deploy Redis Infrastructure

```bash
# Start Redis with persistence
redis-server --appendonly yes --appendfsync everysec

# Verify
redis-cli PING
```

### Phase 2: Deploy Dual-Write

```python
# Enable dual-write mode in application
CACHE_MODE = 'dual'  # Options: 'memcached', 'dual', 'redis'
```

### Phase 3: Monitor and Validate

```python
# Track metrics
import statsd

stats = statsd.StatsClient('localhost', 8125)

class MonitoredCache:
    def __init__(self, cache_client):
        self.cache = cache_client

    def get(self, key):
        start = time.time()
        value = self.cache.get(key)
        elapsed = (time.time() - start) * 1000

        stats.timing('cache.get.latency', elapsed)

        if value is None:
            stats.incr('cache.miss')
        else:
            stats.incr('cache.hit')

        return value

    def set(self, key, value, time=0):
        start = time.time()
        result = self.cache.set(key, value, time=time)
        elapsed = (time.time() - start) * 1000

        stats.timing('cache.set.latency', elapsed)
        return result
```

### Phase 4: Switch to Redis

```python
# After validation period, switch to Redis-only
CACHE_MODE = 'redis'
```

### Phase 5: Decommission Memcached

```bash
# After successful migration
sudo systemctl stop memcached
sudo systemctl disable memcached
```

## Conclusion

Migrating from Memcached to Redis requires careful planning but opens up powerful new capabilities. Key takeaways:

- **Assess your usage** and document key patterns
- Use **dual-write mode** for zero-downtime migration
- Implement a **compatibility layer** for gradual code changes
- **Test thoroughly** before production rollout
- **Monitor metrics** throughout the migration
- Plan for **rollback** if issues arise

With Redis, you gain persistence, replication, rich data structures, and much more - making the migration effort worthwhile for most applications.

## Related Resources

- [Redis Documentation](https://redis.io/documentation)
- [Memcached Wiki](https://github.com/memcached/memcached/wiki)
- [redis-py Documentation](https://redis-py.readthedocs.io/)
