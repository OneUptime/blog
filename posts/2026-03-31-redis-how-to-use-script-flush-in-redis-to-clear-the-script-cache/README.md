# How to Use SCRIPT FLUSH in Redis to Clear the Script Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Command, Administration

Description: Learn how to use SCRIPT FLUSH in Redis to clear the Lua script cache, including the ASYNC and SYNC options and when to use this command safely.

---

## What Is SCRIPT FLUSH

`SCRIPT FLUSH` removes all Lua scripts from the Redis server script cache. After calling it, any `EVALSHA` calls will return a `NOSCRIPT` error until scripts are reloaded with `SCRIPT LOAD` or `EVAL`.

```text
SCRIPT FLUSH [ASYNC | SYNC]
```

Returns `OK` on success.

## Basic Usage

```bash
# Flush all cached scripts
SCRIPT FLUSH
# OK

# Verify cache is empty
SCRIPT EXISTS some-sha-here
# 1) (integer) 0
```

## ASYNC vs SYNC Options

Redis 6.2+ added mode options to `SCRIPT FLUSH`:

```bash
# Asynchronous flush - returns immediately, deletion happens in background
SCRIPT FLUSH ASYNC

# Synchronous flush - blocks until all scripts are deleted
SCRIPT FLUSH SYNC
```

The default behavior without a mode option depends on the `lazyfree-lazy-user-flush` configuration:
- If `lazyfree-lazy-user-flush yes` - defaults to ASYNC
- If `lazyfree-lazy-user-flush no` - defaults to SYNC

```bash
# Check current lazyfree setting
CONFIG GET lazyfree-lazy-user-flush
```

## When to Use SCRIPT FLUSH

Common use cases:
- After a major application update when script logic has changed
- When troubleshooting script execution issues
- During server maintenance to reclaim script cache memory
- After accidental loading of incorrect or test scripts
- As part of a controlled deployment pipeline

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Load some scripts
sha1 = client.script_load("return 'script one'")
sha2 = client.script_load("return 'script two'")
sha3 = client.script_load("return redis.call('PING')")

print(f"Loaded: {sha1}, {sha2}, {sha3}")

# Verify they're cached
exists = client.script_exists(sha1, sha2, sha3)
print(f"Cached: {exists}")  # [True, True, True]

# Flush all scripts
client.script_flush()
print("Script cache flushed")

# Verify they're gone
exists = client.script_exists(sha1, sha2, sha3)
print(f"Cached after flush: {exists}")  # [False, False, False]
```

## Practical Example with Async Flush in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Async flush - non-blocking
client.script_flush(sync_type="ASYNC")
print("Async flush initiated")

# Sync flush - blocking
client.script_flush(sync_type="SYNC")
print("Sync flush complete")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Load scripts
const sha = await client.scriptLoad("return 'hello'");
console.log(`Loaded: ${sha}`);

// Check exists
const exists = await client.scriptExists([sha]);
console.log(`Exists: ${exists}`); // [true]

// Flush the cache
await client.scriptFlush();
console.log('Cache flushed');

// Verify gone
const afterFlush = await client.scriptExists([sha]);
console.log(`After flush: ${afterFlush}`); // [false]
```

## Deployment Pattern - Safe Script Rotation

When deploying new script versions, use this pattern:

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

NEW_SCRIPTS = {
    'rate_limit': """
        local current = tonumber(redis.call('GET', KEYS[1])) or 0
        local limit = tonumber(ARGV[1])
        if current >= limit then return 0 end
        redis.call('INCR', KEYS[1])
        redis.call('EXPIRE', KEYS[1], ARGV[2])
        return 1
    """,
    'get_and_delete': """
        local val = redis.call('GET', KEYS[1])
        if val then redis.call('DEL', KEYS[1]) end
        return val
    """
}

def deploy_scripts():
    # Flush old versions
    client.script_flush()
    print("Old scripts cleared")

    # Load new versions
    shas = {}
    for name, code in NEW_SCRIPTS.items():
        shas[name] = client.script_load(code)
        print(f"Loaded '{name}': {shas[name]}")

    return shas

script_shas = deploy_scripts()
```

## Memory Impact of Script Cache

The script cache is stored in memory. While individual scripts are small, a large number of unused cached scripts can consume memory. You can inspect memory usage:

```bash
INFO memory
# Look for: used_memory_scripts
```

## SCRIPT FLUSH in Redis Cluster

In a Redis cluster, `SCRIPT FLUSH` must be sent to each node independently since script caches are per-node. Most client libraries handle this automatically when you flush through the cluster client.

```python
from redis.cluster import RedisCluster

cluster = RedisCluster(host='redis-node', port=7000, decode_responses=True)
# Flushes all nodes automatically
cluster.script_flush()
```

## Summary

`SCRIPT FLUSH` clears all cached Lua scripts from Redis's script cache, causing subsequent `EVALSHA` calls to fail with `NOSCRIPT` until scripts are reloaded. Use the `ASYNC` option for non-blocking flushes in production environments and always reload your application's scripts immediately after flushing during deployments.
