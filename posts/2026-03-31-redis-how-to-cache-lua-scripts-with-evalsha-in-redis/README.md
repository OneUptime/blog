# How to Cache Lua Scripts with EVALSHA in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, EVALSHA, Scripting, Performance, Caching

Description: Use SCRIPT LOAD and EVALSHA to cache Lua scripts server-side in Redis, avoiding repeated script transmission and reducing network overhead.

---

## Why Use EVALSHA Instead of EVAL

`EVAL` sends the full Lua script text with every call. For scripts that are called thousands of times per second, this wastes network bandwidth. `EVALSHA` sends only the 40-character SHA1 hash of the script, which Redis maps to the already-cached script. While Redis does cache compiled scripts after the first `EVAL` call, `EVALSHA` avoids retransmitting the script body on every request.

Benefits of EVALSHA:

- Smaller network payload (40 bytes vs. potentially kilobytes)
- Script is compiled once and reused
- Atomic execution is preserved
- Works with scripting best practices in Redis Cluster

## Step 1 - Load the Script with SCRIPT LOAD

`SCRIPT LOAD` uploads the Lua script to the Redis script cache and returns its SHA1 hash:

```bash
redis-cli SCRIPT LOAD "return redis.call('SET', KEYS[1], ARGV[1])"
```

Output:

```text
"d8f2fad9f8e86a53d2a6ebd960b33c4972cacc37"
```

Store this hash in your application's configuration or compute it at startup.

## Step 2 - Call the Cached Script with EVALSHA

```bash
# EVALSHA sha1 numkeys [key ...] [arg ...]
redis-cli EVALSHA d8f2fad9f8e86a53d2a6ebd960b33c4972cacc37 1 mykey myvalue
```

## Step 3 - Compute SHA1 at Application Startup

In Python, compute the SHA1 locally to avoid an extra network round-trip:

```python
import redis
import hashlib

r = redis.Redis(host='localhost', port=6379)

SCRIPT = """
local current = redis.call('GET', KEYS[1])
if current == false then
    redis.call('SET', KEYS[1], ARGV[1])
    redis.call('EXPIRE', KEYS[1], ARGV[2])
    return 1
end
return 0
"""

def get_sha1(script):
    return hashlib.sha1(script.encode()).hexdigest()

SCRIPT_SHA = get_sha1(SCRIPT)

# Load script on startup (idempotent)
r.script_load(SCRIPT)

# Call with EVALSHA
result = r.evalsha(SCRIPT_SHA, 1, 'mykey', 'myvalue', '3600')
print(result)  # 1 if set, 0 if already exists
```

## Step 4 - Handle NOSCRIPT Errors

If Redis restarts or flushes its script cache (`SCRIPT FLUSH`), calling EVALSHA returns:

```text
NOSCRIPT No matching script. Please use EVAL.
```

Handle this gracefully by re-loading the script and retrying with EVALSHA:

```python
from redis.exceptions import ResponseError

def call_script(r, sha, script, numkeys, *args):
    try:
        return r.evalsha(sha, numkeys, *args)
    except ResponseError as e:
        if 'NOSCRIPT' in str(e):
            # Re-load the script and retry
            r.script_load(script)
            return r.evalsha(sha, numkeys, *args)
        raise

result = call_script(r, SCRIPT_SHA, SCRIPT, 1, 'mykey', 'myvalue', '3600')
```

## Step 5 - Check if a Script is Cached

```bash
# Returns 1 if cached, 0 if not
redis-cli SCRIPT EXISTS d8f2fad9f8e86a53d2a6ebd960b33c4972cacc37
```

In Python:

```python
exists = r.script_exists(SCRIPT_SHA)
print(exists)  # [True] or [False]
```

## Step 6 - Practical Example - Atomic Counter with Expiry Reset

```python
import redis
import hashlib

r = redis.Redis(host='localhost', port=6379)

# Increment a counter, set TTL only if key is new
COUNTER_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
"""

COUNTER_SHA = hashlib.sha1(COUNTER_SCRIPT.encode()).hexdigest()
r.script_load(COUNTER_SCRIPT)

def increment_counter(key, ttl_seconds):
    try:
        return r.evalsha(COUNTER_SHA, 1, key, ttl_seconds)
    except Exception as e:
        if 'NOSCRIPT' in str(e):
            r.script_load(COUNTER_SCRIPT)
            return r.evalsha(COUNTER_SHA, 1, key, ttl_seconds)
        raise

count = increment_counter('api:limit:user:123', 60)
print(f"Request count: {count}")
```

## Step 7 - Flush the Script Cache

When deploying new script versions, flush the cache and reload:

```bash
redis-cli SCRIPT FLUSH
```

Or flush asynchronously (Redis 6.2+):

```bash
redis-cli SCRIPT FLUSH ASYNC
```

## Summary

EVALSHA reduces network overhead by sending only a SHA1 hash instead of the full Lua script text on every call. Load scripts at application startup with `SCRIPT LOAD`, compute or cache the SHA1, and always handle `NOSCRIPT` errors by re-loading and retrying. This pattern is especially valuable for frequently called scripts like rate limiters, atomic counters, and conditional set operations.
