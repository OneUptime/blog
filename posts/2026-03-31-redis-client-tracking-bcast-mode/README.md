# How to Use Tracking in BCAST Mode for Client-Side Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client-Side Caching, BCAST, Tracking, Invalidation

Description: Learn how to configure Redis CLIENT TRACKING in BCAST mode for broadcast cache invalidation, enabling efficient client-side caching without per-key tracking overhead.

---

Redis client-side caching in BCAST (broadcast) mode sends invalidation notifications for all keys matching specified key prefixes, without Redis needing to track which keys each client has read. This trades precision for simplicity and scales better for large numbers of clients.

## BCAST Mode vs Default Tracking Mode

In default tracking mode, Redis tracks which keys each client has read and sends targeted invalidations only when those specific keys change.

In BCAST mode, Redis sends an invalidation message to tracking-enabled clients whenever any key matching a prefix changes - regardless of whether the client has read that key.

```bash
# Enable BCAST mode with key prefixes
CLIENT TRACKING ON BCAST PREFIX user: PREFIX product:

# Redis will send invalidation for ANY key starting with user: or product:
# when those keys change - to any client tracking those prefixes
```

## Setting Up BCAST Tracking

```python
import redis
import threading

class BcastCacheClient:
    def __init__(self, host='localhost', port=6379):
        # Main connection for reads/writes
        self.r = redis.Redis(host=host, port=port, decode_responses=True)

        # Dedicated connection for invalidation messages
        self.inv_conn = redis.Redis(host=host, port=port, decode_responses=True)

        self.local_cache = {}
        self._setup_invalidation()

    def _setup_invalidation(self):
        pubsub = self.inv_conn.pubsub()

        # Establish the pubsub connection and get its client ID
        # before subscribing (subscriber mode restricts allowed commands)
        pubsub.connection = pubsub.connection_pool.get_connection(
            'pubsub', pubsub.shard_hint
        )
        pubsub.connection.connect()
        pubsub.connection.send_command('CLIENT', 'ID')
        inv_client_id = pubsub.connection.read_response()

        # Subscribe to invalidation channel
        pubsub.subscribe('__redis__:invalidate')

        # Enable BCAST tracking with prefix filter
        self.r.execute_command(
            'CLIENT', 'TRACKING', 'ON',
            'BCAST',
            'PREFIX', 'user:',
            'PREFIX', 'product:',
            'REDIRECT', inv_client_id
        )

        # Listen for invalidations in a background thread
        def listen():
            for msg in pubsub.listen():
                if msg['type'] == 'message':
                    payload = msg['data']
                    if payload is None:
                        self.local_cache.clear()
                        continue

                    keys = payload if isinstance(payload, list) else [payload]
                    for invalidated_key in keys:
                        if invalidated_key in self.local_cache:
                            del self.local_cache[invalidated_key]
                            print(f"Invalidated: {invalidated_key}")

        thread = threading.Thread(target=listen, daemon=True)
        thread.start()
```

## Reading with BCAST Cache

```python
    def get(self, key):
        # Check local cache first
        if key in self.local_cache:
            print(f"Cache HIT: {key}")
            return self.local_cache[key]

        # Fetch from Redis
        value = self.r.get(key)
        if value is not None:
            self.local_cache[key] = value
            print(f"Cache MISS, fetched and cached: {key}")
        return value

    def set(self, key, value, ex=None):
        self.r.set(key, value, ex=ex)
        # BCAST will automatically invalidate local cache
```

## BCAST Mode Behavior

```python
client = BcastCacheClient()

# Read user:42 - cached locally
client.get('user:42')

# Simulate another client updating user:42
# (any write to a tracked prefix triggers BCAST invalidation)
client.r.set('user:42', 'new value')

# Redis broadcasts invalidation for "user:42" to ALL BCAST clients
# Local cache is cleared automatically
```

## Prefix Selection Strategy

Choose prefixes that match your data access patterns:

```bash
# Broad prefix: all user data invalidated together
CLIENT TRACKING ON BCAST PREFIX user:

# Fine-grained prefixes: separate invalidation per domain
CLIENT TRACKING ON BCAST PREFIX user:profile: PREFIX user:settings: PREFIX product:details:
```

BCAST mode sends more invalidations than default mode (false positives where the client didn't cache that key), but it avoids the per-key tracking table on the server. This is more efficient when clients cache many different keys.

## Checking BCAST Tracking Status

```bash
# Verify tracking is enabled
CLIENT INFO

# View tracking info
CLIENT TRACKINGINFO
# flags: on, bcast
# prefixes: user:, product:
```

## When to Use BCAST vs Default Mode

Use BCAST mode when:
- You have many clients caching many different keys
- You want to avoid server-side key tracking overhead
- Occasional false invalidations are acceptable

Use default mode when:
- You have few keys to cache per client
- You want precise invalidation only for keys actually cached

## Summary

Redis CLIENT TRACKING in BCAST mode sends prefix-based invalidation messages to tracking-enabled clients when any key matching a configured prefix changes. It is more efficient than default mode for clients with large or unpredictable cache key sets, since Redis avoids maintaining a per-client key tracking table. Configure BCAST with narrow prefixes to minimize false invalidations while keeping server overhead low.
