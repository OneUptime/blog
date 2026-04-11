# How to Use CLIENT TRACKING in Redis for Client-Side Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client, Caching, RESP3, Performance, Invalidation

Description: Learn how to use Redis CLIENT TRACKING to enable server-assisted client-side caching with automatic invalidation notifications.

---

`CLIENT TRACKING` enables server-assisted client-side caching in Redis. When tracking is enabled, Redis monitors which keys a client has read and sends invalidation messages when those keys are modified. This allows clients to maintain an in-process cache with strong consistency guarantees - without polling.

## How Client-Side Caching Works

The flow is straightforward:

```text
1. Client enables tracking (CLIENT TRACKING ON)
2. Client reads key "user:42" from Redis - value is cached locally
3. Another client modifies "user:42"
4. Redis sends an invalidation message to the first client
5. Client evicts "user:42" from its local cache
6. Next read fetches fresh data from Redis
```

This reduces network round trips dramatically while keeping data fresh.

## Enabling Tracking with RESP3

The cleanest way to use client tracking is with RESP3 protocol (Redis 6+), which delivers invalidation messages on the same connection:

```bash
# Switch to RESP3
127.0.0.1:6379> HELLO 3

# Enable tracking
127.0.0.1:6379> CLIENT TRACKING ON
OK
```

Now Redis automatically tracks every key you read and notifies you when they change.

## Enabling Tracking with RESP2 (Redirect Mode)

With RESP2, invalidation messages must be sent to a separate connection via Pub/Sub:

```bash
# On connection A (the notification connection), get its ID
127.0.0.1:6379> CLIENT ID
(integer) 5

# On connection A, subscribe to the invalidation channel
127.0.0.1:6379> SUBSCRIBE __redis__:invalidate
Reading messages... (subscribed to 1 channel)

# On connection B (the data connection), enable tracking
# and redirect invalidations to connection A
127.0.0.1:6379> CLIENT TRACKING ON REDIRECT 5
OK
```

Connection B is used for reads with tracking enabled. When tracked keys are modified, Redis publishes invalidation messages to connection A via the `__redis__:invalidate` Pub/Sub channel.

## Tracking with BCAST Mode

In broadcast mode, Redis notifies the client about ALL modifications to keys matching specified prefixes, even if the client never read those keys:

```bash
127.0.0.1:6379> CLIENT TRACKING ON BCAST PREFIX user: PREFIX session:
OK
```

This is useful for cache prewarming or when you want proactive invalidation without having to read first.

## Using OPTIN Mode

With `OPTIN`, tracking is disabled by default and you must explicitly opt individual keys in using `CLIENT CACHING yes`:

```bash
127.0.0.1:6379> CLIENT TRACKING ON OPTIN
OK

# Before reading a key you want to cache
127.0.0.1:6379> CLIENT CACHING yes
OK
127.0.0.1:6379> GET user:42
"John"
# user:42 is now tracked

# Reading a key without opting in - not tracked
127.0.0.1:6379> GET temp:value
"abc"
# temp:value is NOT tracked
```

## Using OPTOUT Mode

With `OPTOUT`, all reads are tracked by default and you opt out selectively:

```bash
127.0.0.1:6379> CLIENT TRACKING ON OPTOUT
OK

# Skip tracking for this read
127.0.0.1:6379> CLIENT CACHING no
OK
127.0.0.1:6379> GET high-churn:counter
"99283"
# Not tracked, saving tracking table memory
```

## Disabling Tracking

```bash
127.0.0.1:6379> CLIENT TRACKING OFF
OK
```

## Implementing Client-Side Caching in Python

```python
import redis

local_cache = {}

def handle_invalidation(message):
    """Process RESP3 push invalidation messages from Redis."""
    if message and message[0] == b'invalidate':
        keys = message[1]
        if keys is not None:
            for key in keys:
                key_str = key.decode() if isinstance(key, bytes) else key
                if key_str in local_cache:
                    del local_cache[key_str]
                    print(f"Evicted: {key_str}")

# Use RESP3 with tracking
client = redis.Redis(host='localhost', port=6379, protocol=3)
client.execute_command('CLIENT', 'TRACKING', 'ON')

# Note: To receive invalidation notifications, you must process
# RESP3 push messages from the connection. The exact mechanism
# depends on your redis-py version and event loop setup.

def get_cached(key):
    if key in local_cache:
        return local_cache[key]
    value = client.get(key)
    if value is not None:
        local_cache[key] = value
    return value
```

## Checking Tracking Statistics

```bash
127.0.0.1:6379> CLIENT INFO
# Look for:
# tracking=1 (tracking enabled)
# tracking-redir=5 (redirect target client ID)
```

## Summary

`CLIENT TRACKING` enables a powerful caching strategy where Redis helps clients maintain consistent local caches by pushing invalidation events. Using RESP3 for same-connection push messages, or redirect mode for RESP2 setups, applications can dramatically reduce Redis read load while ensuring cache entries are evicted promptly when source data changes.
