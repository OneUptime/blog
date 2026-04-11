# How to Use Tracking in Default Mode for Client-Side Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client-Side Caching, Tracking, Invalidation, Cache

Description: Learn how Redis CLIENT TRACKING in default mode works, tracking per-client read keys and sending precise cache invalidation messages when those keys change.

---

Redis client-side caching in default (non-BCAST) mode precisely tracks which keys each client has read and sends invalidation messages only when those specific keys change. This minimizes false invalidations at the cost of server-side memory for the tracking table.

## How Default Tracking Mode Works

When a client enables tracking, Redis adds each key the client reads to a per-client "tracking table". When any of those keys is modified by any client, Redis sends an invalidation message only to the clients that have that key in their tracking table.

```bash
# Enable tracking - use a second connection for invalidation messages
CLIENT TRACKING ON REDIRECT <client-id>

# Now read a key - Redis starts tracking it for this client
GET user:42

# When user:42 is modified by anyone:
# Redis sends: ["user:42"] -> to this client's redirect connection
```

## Setting Up Default Mode Tracking

```python
import redis
import threading

class DefaultTrackingClient:
    def __init__(self, host='localhost', port=6379):
        # Main connection for data operations
        self.main = redis.Redis(host=host, port=port, decode_responses=True)

        # Dedicated connection for receiving invalidation messages
        self.inv = redis.Redis(host=host, port=port, decode_responses=True)

        self.local_cache = {}
        self._setup()

    def _setup(self):
        pubsub = self.inv.pubsub()
        pubsub.subscribe('__redis__:invalidate')

        # Enable tracking with redirect to inv connection
        inv_id = self.inv.client_id()
        self.main.execute_command('CLIENT', 'TRACKING', 'ON', 'REDIRECT', str(inv_id))

        def invalidation_listener():
            for msg in pubsub.listen():
                if msg['type'] != 'message':
                    continue
                payload = msg['data']
                if payload is None:
                    self.local_cache.clear()
                    continue

                keys = payload if isinstance(payload, list) else [payload]
                for key in keys:
                    if key in self.local_cache:
                        del self.local_cache[key]
                        print(f"Invalidated key: {key}")

        t = threading.Thread(target=invalidation_listener, daemon=True)
        t.start()
```

## Caching Reads

```python
    def get(self, key):
        # Return from local cache if available
        cached = self.local_cache.get(key)
        if cached is not None:
            return cached

        # Fetch from Redis - this read registers the key in the tracking table
        value = self.main.get(key)
        if value is not None:
            self.local_cache[key] = value

        return value

    def set(self, key, value, ex=None):
        # Write to Redis - triggers invalidation on all tracking clients
        self.main.set(key, value, ex=ex)
        # Our own cache will be invalidated via the tracking mechanism
```

## Key Tracking Table

Redis maintains a tracking table in memory: a mapping from key to the set of clients that have read that key. The table grows with the number of tracked keys.

## Tracking Table Memory

Inspect the current tracking state with `CLIENT TRACKINGINFO`:

```bash
redis-cli CLIENT TRACKINGINFO
```

That reply includes the active flags, redirect client ID, and prefixes. Redis provides the `tracking-table-max-keys` configuration option (default 1,000,000) to limit the number of keys stored in the invalidation table. When the limit is reached, Redis evicts entries and sends false invalidation messages to reclaim memory. Set it to `0` to disable the limit entirely:

```bash
CONFIG SET tracking-table-max-keys 2000000
```

## OPTIN Mode: Track Only Specific Keys

In OPTIN mode, only keys prefetched with `CLIENT CACHING yes` are tracked:

```bash
# Enable optin mode
CLIENT TRACKING ON OPTIN REDIRECT <id>

# Only track this specific key
CLIENT CACHING yes
GET product:99   # <- this key is tracked

GET session:abc  # <- this key is NOT tracked (no CLIENT CACHING yes before it)
```

```python
def get_with_optin(self, key, should_cache=True):
    if should_cache:
        self.main.execute_command('CLIENT', 'CACHING', 'yes')

    value = self.main.get(key)
    if should_cache and value:
        self.local_cache[key] = value
    return value
```

## Disabling Tracking

```bash
# Disable tracking when done
CLIENT TRACKING OFF
```

## Summary

Redis CLIENT TRACKING in default mode sends precise invalidation messages only for keys a specific client has previously read. This gives exact invalidation with minimal false positives. Use `OPTIN` mode to selectively cache high-value keys while ignoring others, and inspect the current tracking state with `CLIENT TRACKINGINFO` when you need to confirm redirect or prefix settings.
