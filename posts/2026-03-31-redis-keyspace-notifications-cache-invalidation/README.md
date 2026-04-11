# How to Use Keyspace Notifications for Cache Invalidation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Cache, Invalidation

Description: Use Redis keyspace notifications to drive precise cache invalidation, removing stale entries from local or distributed caches when source data changes.

---

Cache invalidation is one of the hardest problems in distributed systems. Redis keyspace notifications provide a server-push mechanism to invalidate caches exactly when the underlying data changes, rather than using TTL-based expiry alone.

## The Problem with TTL-Only Invalidation

When you rely solely on TTL for cache expiry, stale data lives in the cache until the TTL expires. If a product price changes 30 seconds after a 5-minute cache entry was written, users see wrong prices for up to 5 minutes.

Keyspace notifications let Redis push an event immediately when a key changes.

## Architecture Overview

```text
Write Service --SET product:123 price--> Redis
                                          |
                              keyevent: "set" notification
                                          |
                          Invalidation Listener (your service)
                                          |
                          Remove product:123 from L1 cache
```

## Setup

```bash
# Enable string command events, generic events (for DEL/EXPIRE), and expired events
redis-cli CONFIG SET notify-keyspace-events "KE$gx"
```

## Invalidation Listener in Python

```python
import redis
import threading

class CacheInvalidationListener:
    def __init__(self, redis_client, local_cache):
        self.r = redis_client
        self.cache = local_cache
        self.pubsub = self.r.pubsub()

    def start(self):
        # Watch for SET and DEL on any key
        self.pubsub.psubscribe(
            "__keyevent@0__:set",
            "__keyevent@0__:del",
            "__keyevent@0__:expired"
        )
        thread = threading.Thread(
            target=self._listen, daemon=True
        )
        thread.start()

    def _listen(self):
        for message in self.pubsub.listen():
            if message["type"] in ("message", "pmessage"):
                key = message["data"]
                if key in self.cache:
                    del self.cache[key]
                    print(f"Invalidated cache entry: {key}")

local_cache = {}
r = redis.Redis(decode_responses=True)
listener = CacheInvalidationListener(r, local_cache)
listener.start()
```

## Combining TTL with Notification-Based Invalidation

Use TTL as a safety net and notifications for immediate invalidation:

```python
def write_through(r, key, value, ttl=300):
    """Write to Redis and let notifications propagate invalidation."""
    r.setex(key, ttl, value)
    # Subscribers will receive a "set" event and clear their local caches

def read_through(r, local_cache, key, fetch_fn):
    if key in local_cache:
        return local_cache[key]
    value = r.get(key)
    if value is None:
        value = fetch_fn(key)
        write_through(r, key, value)
    local_cache[key] = value
    return value
```

## Multi-Node Cache Invalidation

Each application node subscribes to the same keyspace notification channel. When any node writes a key, all nodes receive the invalidation event:

```text
Node A writes:  SET product:99 updated_data
                       |
           Redis publishes keyevent
                /      |      \
          Node A    Node B    Node C
          (skip)  invalidate  invalidate
```

## Handling Bulk Operations

If you flush many keys at once (e.g., a batch import), individual notifications may overwhelm subscribers. Use a debounce pattern:

```python
import time

pending_invalidations = set()
last_flush = time.time()

def on_event(key):
    global last_flush
    pending_invalidations.add(key)
    now = time.time()
    if now - last_flush > 0.1:  # flush every 100ms
        for k in pending_invalidations:
            local_cache.pop(k, None)
        pending_invalidations.clear()
        last_flush = now
```

## Limitations to Know

- Notifications are fire-and-forget: if the subscriber is down, it misses events
- Delivery is at-most-once: no persistence, no acknowledgment
- Only the key name is delivered, not the old or new value

For critical applications, pair keyspace notifications with a versioned cache where each value includes a version counter, and use `WATCH` + transactions for coordinated invalidation.

## Summary

Redis keyspace notifications enable push-based cache invalidation, eliminating stale-data windows caused by TTL-only strategies. Subscribe to `set`, `del`, and `expired` events to remove local cache entries immediately when source data changes. Combine notifications with TTL as a fallback and add debouncing for high-write scenarios.
