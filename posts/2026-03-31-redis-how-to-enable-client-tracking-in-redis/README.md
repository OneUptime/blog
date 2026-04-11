# How to Enable CLIENT TRACKING in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client Tracking, Client-Side Caching, Invalidation, RESP3

Description: Enable Redis CLIENT TRACKING to receive key invalidation notifications for client-side caching, using both RESP2 redirect mode and RESP3 push messages.

---

## What CLIENT TRACKING Does

`CLIENT TRACKING ON` tells Redis to monitor which keys a client reads and send invalidation messages when those keys are modified. This is the foundation of client-side caching in Redis 6.0+.

Two protocol options:

- **RESP2 + redirect**: Invalidations delivered to a second subscriber connection
- **RESP3**: Invalidations delivered as push messages on the same connection

## Enabling Tracking via RESP2 (Redirect Mode)

RESP2 is the default protocol. Use two connections: one for data and one for invalidation messages.

### Step 1 - Set Up the Subscriber Connection

```bash
# On connection 1 (subscriber)
# Get the client ID before subscribing (SUBSCRIBE enters subscriber mode)
CLIENT ID
# Returns: 10
SUBSCRIBE __redis__:invalidate
```

### Step 2 - Enable Tracking on the Data Connection

```bash
# On connection 2 (data connection)
CLIENT TRACKING ON REDIRECT 10
```

Now, when you read a key on connection 2 and it is later modified, connection 1 receives an invalidation.

### Full Example in Python

```python
import redis
import threading

data_conn = redis.Redis(host='localhost', port=6379)
sub_conn = redis.Redis(host='localhost', port=6379)

cache = {}

# Get subscriber client ID
sub_id = sub_conn.client_id()

# Enable tracking with redirect
data_conn.execute_command('CLIENT', 'TRACKING', 'ON', 'REDIRECT', str(sub_id))

def handle_invalidations():
    pubsub = sub_conn.pubsub()
    pubsub.subscribe('__redis__:invalidate')
    for msg in pubsub.listen():
        if msg['type'] == 'message':
            payload = msg['data']
            if payload is None:
                cache.clear()
                print("Full cache flush")
            else:
                for key in (payload if isinstance(payload, list) else [payload]):
                    k = key.decode() if isinstance(key, bytes) else key
                    cache.pop(k, None)
                    print(f"Invalidated: {k}")

threading.Thread(target=handle_invalidations, daemon=True).start()

# Read and cache locally
def get(key):
    if key in cache:
        print(f"Cache hit: {key}")
        return cache[key]
    value = data_conn.get(key)
    if value is not None:
        cache[key] = value
    return value

# Test
data_conn.set('config:timeout', '30')
print(get('config:timeout'))  # Miss - fetches from Redis
print(get('config:timeout'))  # Hit - from local cache

# Simulating another client changing the key
data_conn.set('config:timeout', '60')
# Invalidation received - cache cleared for this key
import time; time.sleep(0.1)
print(get('config:timeout'))  # Miss again - re-fetches '60'
```

## Enabling Tracking via RESP3

RESP3 (Redis 6.0+) supports push messages on the single connection, eliminating the need for a second subscriber connection.

```python
import socket
import ssl

# Low-level RESP3 example
# Most client libraries handle this automatically
```

With the official redis-py client supporting RESP3:

```python
# redis-py supports RESP3 from version 4.2+
import redis

r = redis.Redis(host='localhost', port=6379, protocol=3)

# With RESP3, invalidations arrive as push messages
# redis-py handles them automatically with client-side caching
```

## Broadcast Mode

Receive all invalidations for keys with specific prefixes without per-client tracking overhead:

```bash
# Track all keys with prefix 'user:' or 'config:'
CLIENT TRACKING ON BCAST PREFIX user: PREFIX config:
```

No tracking table in Redis; lower server memory usage but more invalidations sent.

```python
data_conn.execute_command('CLIENT', 'TRACKING', 'ON', 'BCAST', 'PREFIX', 'user:', 'PREFIX', 'config:')
```

## Checking Tracking Status

```bash
CLIENT INFO
```

Look for `flags` field (`t` = tracking on, `B` = broadcast mode) and `redir` field:

```text
id=5 addr=127.0.0.1:54321 fd=8 name= age=0 idle=0 flags=t db=0 sub=0 psub=0 multi=-1 redir=10
```

Or:

```bash
CLIENT NO-TOUCH ON # Prevent this client from updating LRU/LFU idle time on key access (Redis 7.2+)
CLIENT NO-EVICT ON # Prevent this client from being evicted under memory pressure (Redis 7.0+)
```

## Disabling Tracking

```bash
CLIENT TRACKING OFF
```

## Optin and Optout Modes

Control tracking granularity:

```bash
# Optin: only track keys explicitly marked
CLIENT TRACKING ON OPTIN
CLIENT CACHING YES  # Must send before each tracked GET
GET user:123       # This access tracked

# Optout: track all keys except explicitly marked
CLIENT TRACKING ON OPTOUT
CLIENT CACHING NO   # Send before a GET to skip tracking
GET temp-key       # This access NOT tracked
```

## Verify Invalidations Work

```bash
# Terminal 1 - subscriber (note the client ID printed at startup, e.g. id=42)
redis-cli
> CLIENT ID
> SUBSCRIBE __redis__:invalidate

# Terminal 2 - enable tracking and read key (same interactive session)
redis-cli
> CLIENT TRACKING ON REDIRECT 42
> GET mykey

# Terminal 3 - modify the key
redis-cli SET mykey newvalue

# Terminal 1 should print:
# 1) "message"
# 2) "__redis__:invalidate"
# 3) 1) "mykey"
```

## Summary

Enable Redis CLIENT TRACKING with `CLIENT TRACKING ON REDIRECT <id>` for RESP2 connections using a separate subscriber for invalidations, or use RESP3 with push messages for a single-connection approach. Use broadcast mode (`BCAST PREFIX`) to reduce server memory overhead at the cost of receiving more invalidations. Use optin mode for selective tracking of only the most frequently accessed keys.
