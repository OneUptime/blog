# How CLIENT TRACKING Works in Redis for Client-Side Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client Tracking, Client-Side Caching, Performance, Internal

Description: A deep dive into how Redis CLIENT TRACKING enables server-assisted client-side caching, covering default mode, BCAST mode, OPTIN/OPTOUT, and invalidation mechanics.

---

## The Problem CLIENT TRACKING Solves

Without server assistance, client-side caches either use TTL-based invalidation (stale data risk) or must poll Redis to detect changes (wasted requests). Redis `CLIENT TRACKING` provides a smarter approach: the server tracks which keys a client has read and pushes invalidation messages when those keys change, keeping the client cache consistent without polling.

## CLIENT TRACKING Command Syntax

```bash
CLIENT TRACKING <ON|OFF>
  [REDIRECT client-id]
  [PREFIX prefix [PREFIX prefix ...]]
  [BCAST]
  [OPTIN]
  [OPTOUT]
  [NOLOOP]
```

Enable tracking on the current connection:
```bash
CLIENT TRACKING ON
```

## Default Mode: Per-Client Key Tracking

In default mode, Redis maintains a per-client tracking table. When a client reads a key (GET, HGET, etc.), Redis adds that key to the client's tracking table. When any client writes to a tracked key, Redis sends an invalidation message to all clients that have that key tracked.

```bash
# Connection 1: enable tracking
CLIENT TRACKING ON

# Connection 1: read a key (Redis now tracks this key for client 1)
GET user:1001

# Connection 2: update the key
SET user:1001 '{"name":"Alice","role":"admin"}'

# Connection 1 receives invalidation:
# *2\r\n$10\r\ninvalidate\r\n*1\r\n$9\r\nuser:1001\r\n
```

## REDIRECT Mode

Most applications use two connections: one for normal commands, one for receiving invalidation messages via Pub/Sub. The `REDIRECT` option routes invalidations from the command connection to the Pub/Sub connection.

```bash
# Step 1: Get the ID of the Pub/Sub connection
# (On the Pub/Sub connection)
CLIENT ID
# -> 42

# Step 2: Subscribe to the invalidation channel
# (On the Pub/Sub connection)
SUBSCRIBE __redis__:invalidate

# Step 3: Enable tracking on the command connection, redirect to Pub/Sub connection
# (On the command connection)
CLIENT TRACKING ON REDIRECT 42
```

Now when tracked keys change, invalidation messages arrive on connection 42 via Pub/Sub.

## BCAST Mode: Broadcasting

In BCAST (broadcasting) mode, Redis does not maintain per-client tracking tables. Instead, it sends invalidation messages for ALL modifications to keys matching the specified prefixes to tracking-enabled clients.

```bash
# Enable BCAST mode for keys with "user:" and "session:" prefixes
CLIENT TRACKING ON BCAST PREFIX user: PREFIX session:
```

Advantages of BCAST mode:
- No server memory overhead for per-key tracking tables
- Scales better with many unique keys
- Simpler to reason about

Disadvantage: clients receive invalidations for keys they may not have cached, generating unnecessary cache evictions.

## OPTIN Mode: Opt-in Tracking

In OPTIN mode, tracking is disabled by default. The client must explicitly opt in to tracking for specific keys using `CLIENT CACHING yes` before reading:

```bash
CLIENT TRACKING ON OPTIN

# Opt in to tracking for this specific key
CLIENT CACHING yes
GET expensive:computation:key

# Not tracked - no invalidation will be sent
GET other:key
```

This is useful when you only want to cache a subset of keys.

## OPTOUT Mode: Opt-out Tracking

The inverse of OPTIN. All reads are tracked by default. Use `CLIENT CACHING no` to opt out for specific reads:

```bash
CLIENT TRACKING ON OPTOUT

# This key IS tracked
GET user:1001

# Opt out - this key will NOT be tracked
CLIENT CACHING no
GET large:dataset:key
```

## NOLOOP: Preventing Self-Invalidation

By default, if a client modifies a key it has tracked, it receives an invalidation for its own write. Use `NOLOOP` to suppress self-invalidations:

```bash
CLIENT TRACKING ON NOLOOP

# Write a key (no invalidation sent back to this client)
SET user:1001 '{"name":"Alice"}'
```

This is useful when the application updates the local cache immediately after writing to Redis.

## Tracking Table Memory

Inspect the current tracking state with `CLIENT TRACKINGINFO`:

```bash
redis-cli CLIENT TRACKINGINFO
```

That reply includes the active flags, redirect client ID, and prefixes. To limit the size of the server-side invalidation table, use `tracking-table-max-keys` (default: 1,000,000). When the table is full, Redis evicts entries by sending invalidation messages to clients even if the key was not modified:

```bash
CONFIG SET tracking-table-max-keys 2000000
```

Alternatively, use BCAST mode, which consumes no server memory for per-key tracking.

## Python Implementation Using REDIRECT

```python
import redis
import threading

def setup_tracking():
    # Pub/Sub connection for invalidations
    inv_conn = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
    inv_id = inv_conn.execute_command('CLIENT ID')

    # Subscribe to invalidation channel
    pubsub = inv_conn.pubsub()
    pubsub.subscribe('__redis__:invalidate')

    # Command connection with tracking enabled
    cmd_conn = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
    cmd_conn.execute_command('CLIENT TRACKING ON REDIRECT', inv_id, 'NOLOOP')

    local_cache = {}

    def handle_invalidations():
        for msg in pubsub.listen():
            if msg['type'] == 'message':
                payload = msg['data']
                if payload is None:
                    local_cache.clear()
                    continue

                keys = payload if isinstance(payload, list) else [payload]
                for k in keys:
                    local_cache.pop(k, None)
                    print(f"Invalidated: {k}")

    t = threading.Thread(target=handle_invalidations, daemon=True)
    t.start()

    return cmd_conn, local_cache

cmd, cache = setup_tracking()

def cached_get(key):
    if key in cache:
        return cache[key]
    val = cmd.get(key)
    if val:
        cache[key] = val
    return val

# Warm the cache
cmd.set('user:1', 'Alice')
print(cached_get('user:1'))   # Miss - fetches from Redis
print(cached_get('user:1'))   # Hit - from local cache

# Simulate another client updating the key
another = redis.StrictRedis(decode_responses=True)
another.set('user:1', 'Alice Updated')  # This triggers invalidation

import time
time.sleep(0.1)  # Wait for invalidation to arrive
print(cached_get('user:1'))   # Miss again - cache was invalidated
```

## Summary

`CLIENT TRACKING` is the server-side mechanism that makes Redis client-side caching reliable and consistent. Default mode tracks keys per client with the lowest overhead per key; BCAST mode trades precision for scalability by sending prefix-based invalidations to tracking-enabled clients. Use `REDIRECT` to receive invalidations on a separate connection, `NOLOOP` to avoid self-invalidations, and `OPTIN` or `OPTOUT` when you need fine-grained control over which keys are cached locally.
