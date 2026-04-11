# How to Handle Cache Invalidation with Client-Side Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client-Side Caching, Cache Invalidation, Tracking, Consistency

Description: Learn how to handle cache invalidation reliably in Redis client-side caching, covering reconnection gaps, TTL-based fallbacks, and consistency guarantees.

---

Cache invalidation is the hardest part of client-side caching. Redis's tracking mechanism automatically invalidates local caches when keys change, but you need to handle edge cases: client disconnections, reconnection gaps, and invalidation message delivery failures.

## How Invalidation Works

When a tracked key is modified, Redis sends an `INVALIDATE` payload to the client's redirect connection. In RESP2, the redirect connection typically subscribes to the `__redis__:invalidate` pseudo-channel:

```bash
# Client reads a key - Redis tracks it
GET user:42

# Someone modifies user:42
SET user:42 '{"name":"Alice","role":"admin"}'

# Redis sends to the tracking client's redirect:
# Message on __redis__:invalidate: ["user:42"]
```

The client removes `user:42` from its local cache on receiving this message.

## The Reconnection Problem

When a client disconnects and reconnects, it misses all invalidation messages sent during the outage. The local cache may contain stale data:

```python
import redis
import time

class ResilientCacheClient:
    def __init__(self, host='localhost', port=6379):
        self.r = redis.Redis(host=host, port=port, decode_responses=True)
        self.cache = {}
        self.connected = False
        self._connect()

    def _connect(self):
        try:
            self.inv = redis.Redis(
                host=self.r.connection_pool.connection_kwargs['host'],
                port=self.r.connection_pool.connection_kwargs['port'],
                decode_responses=True
            )
            inv_id = self.inv.client_id()
            self.r.execute_command('CLIENT', 'TRACKING', 'ON', 'REDIRECT', str(inv_id))

            # On reconnect: FLUSH entire local cache to eliminate stale data
            if self.connected:
                print("Reconnected - flushing local cache to ensure consistency")
                self.cache.clear()

            self.connected = True
            self._start_invalidation_listener()
        except redis.ConnectionError as e:
            print(f"Connection failed: {e}")
            self.connected = False

    def _start_invalidation_listener(self):
        pubsub = self.inv.pubsub()
        pubsub.subscribe('__redis__:invalidate')

        import threading
        def listen():
            try:
                for msg in pubsub.listen():
                    if msg['type'] != 'message':
                        continue

                    payload = msg['data']
                    if payload is None:
                        self.cache.clear()
                        continue

                    keys = payload if isinstance(payload, list) else [payload]
                    for key in keys:
                        self._invalidate(key)
            except Exception:
                self.connected = False
                time.sleep(1)
                self._connect()  # Reconnect and flush cache

        threading.Thread(target=listen, daemon=True).start()

    def _invalidate(self, key):
        if key in self.cache:
            del self.cache[key]
```

## TTL-Based Fallback for Stale Data

Always set TTLs on cached values as a fallback for missed invalidations:

```python
    def get(self, key, ttl_seconds=30):
        entry = self.cache.get(key)
        if entry:
            value, cached_at = entry
            # Respect TTL even if no invalidation received
            if time.time() - cached_at < ttl_seconds:
                return value
            else:
                del self.cache[key]

        # Fetch from Redis
        value = self.r.get(key)
        if value is not None:
            self.cache[key] = (value, time.time())
        return value

    def set(self, key, value, ex=None):
        self.r.set(key, value, ex=ex)
```

## Handling Invalidation of Multiple Keys

Redis can send an array of keys in a single invalidation payload, and a flush sends `null`:

```python
def on_invalidate_message(self, msg):
    data = msg['data']
    if data is None:
        # FlushAll / FlushDb invalidation
        self.cache.clear()
    elif isinstance(data, list):
        # Multiple keys invalidated at once
        for key in data:
            if key in self.cache:
                del self.cache[key]
    else:
        if data in self.cache:
            del self.cache[data]
```

## Testing Invalidation Correctness

```python
import unittest

class TestCacheInvalidation(unittest.TestCase):
    def setUp(self):
        self.client = ResilientCacheClient()

    def test_invalidation_on_update(self):
        r = redis.Redis(decode_responses=True)

        # Cache a key
        r.set('test:key', 'original')
        value = self.client.get('test:key')
        self.assertEqual(value, 'original')

        # Update the key
        r.set('test:key', 'updated')
        time.sleep(0.05)  # Allow invalidation to propagate

        # Cache should be cleared - next read fetches fresh value
        value = self.client.get('test:key')
        self.assertEqual(value, 'updated')
```

## Summary

Handle Redis client-side cache invalidation by flushing the entire local cache on reconnection (to prevent stale data from missed invalidations), applying TTLs as a safety fallback, and handling array payloads plus `null` flush invalidations correctly. Reconnection-triggered cache flushes trade a brief performance dip for guaranteed consistency - a sound trade-off for most applications.
