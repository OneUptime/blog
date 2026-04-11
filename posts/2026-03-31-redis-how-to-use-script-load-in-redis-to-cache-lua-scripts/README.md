# How to Use SCRIPT LOAD in Redis to Cache Lua Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Performance, Command

Description: Learn how to use SCRIPT LOAD in Redis to preload Lua scripts into the server cache and execute them efficiently with EVALSHA using their SHA1 hash.

---

## What Is SCRIPT LOAD

`SCRIPT LOAD` compiles a Lua script and stores it in Redis's script cache, returning a SHA1 digest. You can then execute the cached script using `EVALSHA` with just the hash, avoiding the overhead of sending the full script text on every call.

```text
SCRIPT LOAD script
```

Returns the SHA1 hex digest of the script.

## Basic Usage

```bash
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# Returns: "d3c21d0c2b9ca22f82737626a27bcaf5d288f99f"
```

Now use `EVALSHA` to run the cached script:

```bash
EVALSHA d3c21d0c2b9ca22f82737626a27bcaf5d288f99f 1 mykey
```

## Why Use SCRIPT LOAD + EVALSHA

Benefits over `EVAL`:
- Network efficiency - send the script once, reference by hash forever
- Avoid re-parsing the script on every call
- Scripts persist in cache across connections (until server restart or `SCRIPT FLUSH`)
- Safe to call `SCRIPT LOAD` multiple times - idempotent

## Loading a Complex Script

```bash
SCRIPT LOAD "
  local current = tonumber(redis.call('GET', KEYS[1])) or 0
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  if current >= limit then
    return 0
  end
  redis.call('INCR', KEYS[1])
  if current == 0 then
    redis.call('EXPIRE', KEYS[1], window)
  end
  return 1
"
# Returns: "a1b2c3d4e5f6..."
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Define the script
rate_limit_script = """
local current = tonumber(redis.call('GET', KEYS[1])) or 0
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
if current >= limit then
  return 0
end
redis.call('INCR', KEYS[1])
if current == 0 then
  redis.call('EXPIRE', KEYS[1], window)
end
return 1
"""

# Load the script once at startup
sha = client.script_load(rate_limit_script)
print(f"Script SHA: {sha}")

# Use EVALSHA for all subsequent calls
def check_rate_limit(user_id, limit=10, window=60):
    key = f"rate:{user_id}"
    return bool(client.evalsha(sha, 1, key, limit, window))

# Call many times efficiently
for i in range(15):
    result = check_rate_limit("user:42")
    print(f"Request {i+1}: {'allowed' if result else 'blocked'}")
```

## Using register_script() in Python

The redis-py library provides `register_script()` which handles loading and SHA management automatically:

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Define and register the script
cas_script = client.register_script("""
  local current = redis.call('GET', KEYS[1])
  if current == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2])
    return 1
  end
  return 0
""")

# Call it like a function - uses EVALSHA automatically
result = cas_script(keys=['mykey'], args=['old_value', 'new_value'])
print(f"Updated: {bool(result)}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

const script = `
  local val = redis.call('GET', KEYS[1])
  if val then
    redis.call('DEL', KEYS[1])
    return val
  end
  return false
`;

// Load the script
const sha = await client.scriptLoad(script);
console.log(`Loaded script SHA: ${sha}`);

// Execute using EVALSHA
const result = await client.evalSha(sha, {
  keys: ['session:token123'],
  arguments: []
});

console.log('Session value:', result);
```

## Practical Example in Go

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    script := redis.NewScript(`
        local val = redis.call('INCR', KEYS[1])
        redis.call('EXPIRE', KEYS[1], ARGV[1])
        return val
    `)

    // Run automatically uses EVALSHA, falls back to EVAL if not cached
    result, err := script.Run(ctx, rdb, []string{"counter:hits"}, 3600).Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Counter: %d\n", result)
}
```

## Handling NOSCRIPT Errors

If a script was evicted from cache (e.g., after `SCRIPT FLUSH`), `EVALSHA` returns a `NOSCRIPT` error. Handle this by reloading:

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

script_text = "return redis.call('PING')"
sha = client.script_load(script_text)

def safe_evalsha(sha, script_text, numkeys, *args):
    try:
        return client.evalsha(sha, numkeys, *args)
    except redis.ResponseError as e:
        if 'NOSCRIPT' in str(e):
            # Reload and retry
            sha = client.script_load(script_text)
            return client.evalsha(sha, numkeys, *args)
        raise

result = safe_evalsha(sha, script_text, 0)
print(result)
```

## Script Cache Persistence

Scripts in the cache survive connection drops but are cleared on:
- `SCRIPT FLUSH` command
- Server restart
- `DEBUG RELOAD`

Best practice is to reload scripts at application startup.

## Summary

`SCRIPT LOAD` preloads Lua scripts into Redis's server-side script cache and returns a SHA1 hash for subsequent use with `EVALSHA`. This eliminates the overhead of transmitting script text on every call and is the recommended pattern for frequently executed scripts. Always handle `NOSCRIPT` errors by reloading the script and retrying.
