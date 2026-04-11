# How Client-Side Caching Works in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client-Side Caching, Tracking, Invalidation, Performance

Description: Understand Redis client-side caching with the tracking protocol, how invalidation messages work, and the difference between default and broadcast modes.

---

## What is Client-Side Caching

Client-side caching allows a Redis client to cache key-value pairs in local memory (e.g., a Python dict or a JVM cache). When a cached key is modified in Redis, the server sends an invalidation message to the client, which then removes the stale entry from its local cache.

This eliminates the round-trip to Redis for frequently read, rarely changed data. Common use cases: application configuration, feature flags, user session metadata.

## How it Works: The Tracking Protocol

1. Client connects and sends `CLIENT TRACKING ON`
2. Client reads a key - Redis records this in a tracking table
3. Client stores the value in local memory
4. Another client modifies the same key in Redis
5. Redis sends an invalidation payload to the tracking client
6. Client removes the key from local cache
7. Next read goes to Redis (cache miss), re-populates local cache

```text
Client A                     Redis                    Client B
   |---CLIENT TRACKING ON--->|                            |
   |---GET user:123--------->|                            |
   |<--"Alice"---------------|                            |
   |  (cache "user:123"="Alice" locally)                 |
   |                         |<---SET user:123 "Bob"------|
   |<--invalidate ["user:123"]--|                        |
   |  (remove from local cache)                          |
   |---GET user:123--------->|  (cache miss, re-fetch)   |
   |<--"Bob"-----------------|                            |
```

## Default Mode vs Broadcast Mode

**Default mode:** Redis tracks which keys each client has accessed and sends invalidations only for those specific keys. More precise but requires Redis memory to store the tracking table.

**Broadcast mode:** The client tracks key prefixes. Redis sends invalidations for any key modification matching those prefixes, regardless of whether the client read the key. No per-client tracking table is maintained in Redis.

```bash
# Default mode - track only keys this client reads
CLIENT TRACKING ON

# Broadcast mode - receive invalidations for all keys with these prefixes
CLIENT TRACKING ON BCAST PREFIX user: PREFIX config:
```

## Invalidation Channel

In default mode, invalidation messages arrive on the special `__redis__:invalidate` pseudo-channel. The client must subscribe to this channel on a second connection (since the main connection cannot both read data and subscribe simultaneously).

## Redirect Mode

Use `REDIRECT` to route invalidation messages to a dedicated subscribing connection by its client ID:

```bash
# Get the ID of the subscribing connection
CLIENT ID
# Returns: 42

# On the data connection, redirect invalidations to client 42
CLIENT TRACKING ON REDIRECT 42
```

The subscribing connection (ID 42) then receives invalidation messages:

```bash
SUBSCRIBE __redis__:invalidate
# Receives: ["invalidate", ["user:123", "config:app"]]
```

## Memory and Tracking Table

In default mode, Redis maintains an in-memory table per client recording which keys it has read. Inspect the current tracking state with `CLIENT TRACKINGINFO`:

```bash
redis-cli CLIENT TRACKINGINFO
```

The reply includes the active flags, redirect client ID, and prefixes. Redis provides the `tracking-table-max-keys` configuration option to limit the size of the tracking table. When the limit is reached, Redis evicts entries by sending invalidation messages for tracked keys, even if they were not modified.

## Optin Mode

Track only specific keys you explicitly mark:

```bash
CLIENT TRACKING ON OPTIN

# Only track this key
CLIENT CACHING YES
GET user:123   # This access will be tracked

# Without CLIENT CACHING YES, keys are not tracked by default
GET session:abc  # This access is NOT tracked
```

## Optout Mode

Track all keys except those you mark as excluded:

```bash
CLIENT TRACKING ON OPTOUT

# Do not track this key
CLIENT CACHING NO
GET large-infrequent-key

# All other GETs are tracked
GET user:123
```

## Client-Side Cache Implementation Pattern

```python
import redis
import threading

# Local in-memory cache
local_cache = {}
cache_lock = threading.Lock()

# Main connection for data
data_conn = redis.Redis(host='localhost', port=6379)

# Subscribe connection for invalidations
sub_conn = redis.Redis(host='localhost', port=6379)
pubsub = sub_conn.pubsub()
pubsub.subscribe('__redis__:invalidate')

# Get the subscriber's client ID
sub_id = sub_conn.client_id()

# Enable tracking, redirecting invalidations to sub connection
data_conn.execute_command('CLIENT', 'TRACKING', 'ON', 'REDIRECT', sub_id)

def invalidation_listener():
    for msg in pubsub.listen():
        if msg['type'] == 'message':
            payload = msg['data']
            if payload is None:
                # Full flush
                with cache_lock:
                    local_cache.clear()
            else:
                for key in (payload if isinstance(payload, list) else [payload]):
                    k = key.decode() if isinstance(key, bytes) else key
                    with cache_lock:
                        local_cache.pop(k, None)

threading.Thread(target=invalidation_listener, daemon=True).start()

def get(key):
    with cache_lock:
        if key in local_cache:
            return local_cache[key]  # Cache hit

    value = data_conn.get(key)  # Redis fetch (also registers tracking)
    if value is not None:
        with cache_lock:
            local_cache[key] = value
    return value
```

## Summary

Redis client-side caching uses the tracking protocol to deliver key invalidation payloads to clients when keys they have read are modified. Default mode tracks per-client key access with server-side memory; broadcast mode eliminates per-client tracking overhead by sending prefix-based invalidations to tracking-enabled clients. Implement local caching with an invalidation listener thread that clears stale entries when Redis sends `__redis__:invalidate` payloads, reducing Redis round-trips for hot read-heavy keys.
