# How to Optimize Redis with Client-Side Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Performance, Client-Side Caching, Optimization

Description: Learn how Redis client-side caching stores data in application memory and uses server-side invalidation to keep it fresh, reducing Redis round trips dramatically.

---

## What Is Client-Side Caching

Client-side caching (also called near-cache) stores Redis data directly in the application process's memory. When the application requests a key, the client library first checks its local cache. If the key is present and valid, no network call to Redis is needed - response time drops to microseconds instead of milliseconds.

Redis 6.0 introduced the `CLIENT TRACKING` mechanism to keep client-side caches consistent. Redis tracks which keys each client has read and sends invalidation messages when those keys are modified by another client.

## Two Modes of CLIENT TRACKING

### Default Mode
Redis tracks keys per client. When a tracked key changes, Redis sends an invalidation message to the client that read it.

```bash
# Enable tracking, send invalidations to this connection
CLIENT TRACKING ON
```

### Broadcasting Mode
Redis sends invalidation messages for all keys matching a prefix to all subscribed clients - no per-client tracking needed on the server. Better scalability for large deployments.

```bash
# Track all keys with prefix "user:" and "product:"
CLIENT TRACKING ON BCAST PREFIX user: PREFIX product:
```

## Setting Up Client-Side Caching in Python

```python
import redis
import threading

class ClientSideCache:
    def __init__(self, host='localhost', port=6379):
        # Main connection for commands
        self.r = redis.StrictRedis(host=host, port=port, decode_responses=True)
        # Separate connection for invalidation messages
        self.invalidation_conn = redis.StrictRedis(host=host, port=port, decode_responses=True)
        self.local_cache = {}
        self._start_invalidation_listener()

    def _start_invalidation_listener(self):
        # Enable tracking with redirect to invalidation connection
        invalidation_id = self.invalidation_conn.client_id()
        self.r.execute_command('CLIENT TRACKING ON REDIRECT', invalidation_id)

        pubsub = self.invalidation_conn.pubsub()
        pubsub.subscribe('__redis__:invalidate')

        def listen():
            for message in pubsub.listen():
                if message['type'] == 'message':
                    keys = message['data']
                    if isinstance(keys, list):
                        for key in keys:
                            self.local_cache.pop(key, None)
                    elif keys:
                        self.local_cache.pop(keys, None)

        thread = threading.Thread(target=listen, daemon=True)
        thread.start()

    def get(self, key):
        if key in self.local_cache:
            return self.local_cache[key]
        value = self.r.get(key)
        if value is not None:
            self.local_cache[key] = value
        return value

    def set(self, key, value, **kwargs):
        result = self.r.set(key, value, **kwargs)
        self.local_cache[key] = value
        return result

# Usage
cache = ClientSideCache()
cache.set('user:1', 'Alice')
print(cache.get('user:1'))  # From local cache - no Redis round trip
```

## Broadcasting Mode Example

Broadcasting mode is simpler and more scalable - the server doesn't need to track individual clients. RESP2 still requires `REDIRECT`, so we use the same two-connection pattern:
```python
import redis
import threading

class BroadcastCache:
    def __init__(self, prefixes, host='localhost', port=6379):
        self.r = redis.StrictRedis(host=host, port=port, decode_responses=True)
        self.invalidation_conn = redis.StrictRedis(host=host, port=port, decode_responses=True)
        self.local_cache = {}
        self.prefixes = prefixes
        self._setup_tracking()

    def _setup_tracking(self):
        # Redirect invalidations to the invalidation connection
        invalidation_id = self.invalidation_conn.client_id()
        prefix_args = []
        for prefix in self.prefixes:
            prefix_args.extend(['PREFIX', prefix])
        self.r.execute_command(
            'CLIENT TRACKING', 'ON', 'REDIRECT', invalidation_id,
            'BCAST', *prefix_args
        )

        pubsub = self.invalidation_conn.pubsub()
        pubsub.subscribe('__redis__:invalidate')

        def listen():
            for msg in pubsub.listen():
                if msg['type'] == 'message' and msg['data']:
                    keys = msg['data'] if isinstance(msg['data'], list) else [msg['data']]
                    for key in keys:
                        self.local_cache.pop(key, None)

        threading.Thread(target=listen, daemon=True).start()

    def get(self, key):
        if key in self.local_cache:
            return self.local_cache[key]
        value = self.r.get(key)
        if value is not None:
            self.local_cache[key] = value
        return value

# Only cache keys with "user:" or "product:" prefix
cache = BroadcastCache(prefixes=['user:', 'product:'])
```

## Client-Side Caching in Node.js with node-redis

You can implement the same two-connection pattern with `node-redis`:
```javascript
const { createClient } = require('redis');

async function main() {
  // Main connection for commands
  const client = await createClient({ url: 'redis://localhost:6379' }).connect();
  // Separate connection for invalidation messages
  const subscriber = await createClient({ url: 'redis://localhost:6379' }).connect();

  const localCache = new Map();

  // Get subscriber's client ID for REDIRECT
  const subscriberId = await subscriber.sendCommand(['CLIENT', 'ID']);

  // Enable tracking with redirect to subscriber connection
  await client.sendCommand([
    'CLIENT', 'TRACKING', 'ON',
    'REDIRECT', subscriberId.toString(),
    'BCAST', 'PREFIX', 'user:'
  ]);

  // Listen for invalidation messages
  await subscriber.subscribe('__redis__:invalidate', (message) => {
    const keys = Array.isArray(message) ? message : [message];
    keys.forEach(key => localCache.delete(key));
  });

  // Helper for cached reads
  async function cachedGet(key) {
    if (localCache.has(key)) {
      return localCache.get(key);
    }
    const value = await client.get(key);
    if (value !== null) {
      localCache.set(key, value);
    }
    return value;
  }

  // First GET - fetches from Redis
  let val = await cachedGet('user:1');
  console.log('From Redis:', val);

  // Second GET - served from local cache
  val = await cachedGet('user:1');
  console.log('From cache:', val);

  await subscriber.quit();
  await client.quit();
}

main();
```

## Measuring Cache Effectiveness

Track cache hit rate to validate the optimization:
```python
class InstrumentedCache:
    def __init__(self):
        self.hits = 0
        self.misses = 0
        # ... (same setup as above)

    def get(self, key):
        if key in self.local_cache:
            self.hits += 1
            return self.local_cache[key]
        self.misses += 1
        value = self.r.get(key)
        if value is not None:
            self.local_cache[key] = value
        return value

    @property
    def hit_rate(self):
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

# After running workload:
print(f"Cache hit rate: {cache.hit_rate:.1%}")
print(f"Hits: {cache.hits}, Misses: {cache.misses}")
```

## When to Use Client-Side Caching

Best suited for:
- Read-heavy workloads (read/write ratio > 10:1)
- Data that changes infrequently (configuration, user profiles, product catalogs)
- High-throughput services where Redis latency is a bottleneck
- Reducing Redis cluster egress costs in cloud environments

Not recommended for:
- Data that changes very frequently (every few seconds)
- Large values that would exhaust application heap memory
- Applications with hundreds of thousands of unique keys per instance

## Summary

Redis client-side caching moves frequently read data into application memory and uses the `CLIENT TRACKING` mechanism to invalidate stale entries automatically. It can reduce Redis round trips by 80-95% for read-heavy workloads, lowering both latency and Redis server load. Use broadcasting mode for simpler setup and better scalability, and monitor cache hit rates to validate the effectiveness of your key prefixes.
