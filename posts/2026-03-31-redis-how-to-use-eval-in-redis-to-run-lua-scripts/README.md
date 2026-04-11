# How to Use EVAL in Redis to Run Lua Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Atomicity, Command

Description: Learn how to use the EVAL command in Redis to execute Lua scripts atomically, enabling complex multi-step operations without race conditions.

---

## What Is EVAL in Redis

`EVAL` executes a Lua script on the Redis server. The script runs atomically - no other command can execute while the script is running. This makes `EVAL` ideal for complex operations that must be atomic, like conditional updates, compare-and-swap patterns, and multi-key transactions.

```text
EVAL script numkeys [key [key ...]] [arg [arg ...]]
```

- `script` - the Lua code as a string
- `numkeys` - number of key names that follow
- `key` - key names accessible in Lua as `KEYS[1]`, `KEYS[2]`, etc.
- `arg` - additional arguments accessible as `ARGV[1]`, `ARGV[2]`, etc.

## Basic Example

```bash
# Simple set and get
EVAL "redis.call('SET', KEYS[1], ARGV[1]); return redis.call('GET', KEYS[1])" 1 mykey hello

# Returns: "hello"
```

## Calling Redis Commands from Lua

Use `redis.call()` to run Redis commands. It raises an error if the command fails:

```lua
redis.call('SET', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return redis.call('GET', KEYS[1])
```

Use `redis.pcall()` for error-safe calls that return error objects instead of raising:

```lua
local reply = redis.pcall('GET', KEYS[1])
if reply['err'] ~= nil then
  return redis.error_reply("Error: " .. reply['err'])
end
return reply
```

## Compare-and-Swap Pattern

A classic use case - atomically update a key only if its current value matches:

```bash
EVAL "
  local current = redis.call('GET', KEYS[1])
  if current == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2])
    return 1
  end
  return 0
" 1 mykey old-value new-value
```

## Atomic Counter with Cap

Increment a counter but cap it at a maximum value:

```bash
EVAL "
  local val = tonumber(redis.call('GET', KEYS[1])) or 0
  local max = tonumber(ARGV[1])
  if val < max then
    redis.call('INCR', KEYS[1])
    return val + 1
  end
  return val
" 1 counter:requests 100
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Lua script for rate limiting
rate_limit_script = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key)) or 0
if current >= limit then
  return 0
end

redis.call('INCR', key)
if current == 0 then
  redis.call('EXPIRE', key, window)
end
return 1
"""

def check_rate_limit(user_id, limit=10, window=60):
    key = f"rate:{user_id}"
    result = client.eval(rate_limit_script, 1, key, limit, window)
    return bool(result)

# Test it
for i in range(12):
    allowed = check_rate_limit("user:123")
    print(f"Request {i+1}: {'allowed' if allowed else 'blocked'}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Lua: get-and-delete atomically
const getAndDelete = `
  local val = redis.call('GET', KEYS[1])
  if val then
    redis.call('DEL', KEYS[1])
    return val
  end
  return false
`;

const value = await client.eval(getAndDelete, {
  keys: ['session:abc123'],
  arguments: []
});

console.log('Got and deleted:', value);
```

## Multi-Key Atomic Operations

```bash
# Atomically transfer between two keys
EVAL "
  local from_bal = tonumber(redis.call('GET', KEYS[1])) or 0
  local amount = tonumber(ARGV[1])
  if from_bal < amount then
    return redis.error_reply('Insufficient balance')
  end
  redis.call('DECRBY', KEYS[1], amount)
  redis.call('INCRBY', KEYS[2], amount)
  return 1
" 2 account:1:balance account:2:balance 50
```

## Return Types

Lua values map to Redis return types:

```text
Lua number    -> Redis integer
Lua string    -> Redis bulk string
Lua table     -> Redis array
Lua true      -> Redis integer 1
Lua false/nil -> Redis nil
```

## Performance Considerations

- Scripts are single-threaded and block other commands while running
- Keep scripts short and focused
- Use `SCRIPT LOAD` + `EVALSHA` to cache compiled scripts
- Set `lua-time-limit` (default 5 seconds) to prevent runaway scripts

## Debugging Lua Scripts

```bash
# Use redis-cli for interactive debugging
redis-cli --ldb --eval my_script.lua key1 key2 , arg1 arg2
```

## Summary

`EVAL` lets you run Lua scripts atomically on the Redis server, enabling complex multi-step operations like compare-and-swap, conditional updates, and multi-key transactions without race conditions. For frequently used scripts, load them with `SCRIPT LOAD` and call with `EVALSHA` to avoid resending the script text on every call.
