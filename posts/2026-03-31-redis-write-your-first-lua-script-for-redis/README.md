# How to Write Your First Lua Script for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Automation, Atomicity

Description: Learn how to write and run your first Lua script in Redis using EVAL, enabling atomic multi-step operations that cannot be interrupted.

---

Lua scripts in Redis let you run multiple commands atomically on the server side. The entire script executes without interruption, making it ideal for operations that require read-modify-write cycles without race conditions.

## Why Use Lua Scripts?

A common problem without Lua:

```bash
# Race condition - another client can modify the key between GET and SET
GET counter
# ... another client modifies counter here
SET counter <new_value>
```

With a Lua script, both operations run atomically:

```bash
redis-cli EVAL "
  local current = redis.call('GET', KEYS[1])
  local new_val = (tonumber(current) or 0) + tonumber(ARGV[1])
  redis.call('SET', KEYS[1], new_val)
  return new_val
" 1 counter 5
```

## Anatomy of EVAL

The `EVAL` command syntax:

```bash
EVAL script numkeys [key [key ...]] [arg [arg ...]]
```

- `script` - The Lua code as a string
- `numkeys` - Number of keys (can be 0)
- `key ...` - Redis keys (accessed as `KEYS[1]`, `KEYS[2]`, etc.)
- `arg ...` - Additional arguments (accessed as `ARGV[1]`, `ARGV[2]`, etc.)

## Your First Script

A simple script that sets a key and returns the value:

```bash
redis-cli EVAL "
  redis.call('SET', KEYS[1], ARGV[1])
  return redis.call('GET', KEYS[1])
" 1 mykey hello
```

Expected output:

```text
"hello"
```

## Writing Scripts in Files

For longer scripts, write to a file and pass it to redis-cli:

```lua
-- increment_by.lua
local key = KEYS[1]
local amount = tonumber(ARGV[1])
local current = tonumber(redis.call('GET', key)) or 0
local new_value = current + amount
redis.call('SET', key, new_value)
return new_value
```

```bash
redis-cli EVAL "$(cat increment_by.lua)" 1 my-counter 10
```

## Running from Python

Use the `redis-py` library to execute Lua scripts:

```python
import redis

r = redis.Redis()

script = """
local current = redis.call('GET', KEYS[1])
local new_val = (tonumber(current) or 0) + tonumber(ARGV[1])
redis.call('SET', KEYS[1], new_val)
return new_val
"""

result = r.eval(script, 1, "my-counter", 5)
print(f"New counter value: {result}")
```

## Script Execution Rules

Key constraints to keep in mind:

1. Before Redis 7.0, scripts had to be deterministic (no `math.random()` or time functions in write scripts). Since Redis 7.0, this restriction is removed and you can freely use `redis.call('TIME')` or non-deterministic commands
2. Blocking commands (like BLPOP) can be called but behave as their non-blocking equivalents, so they are rarely useful in scripts
3. All keys accessed must be declared in `KEYS[]` for cluster compatibility
4. Default execution time limit is 5 seconds (`lua-time-limit`)

```bash
redis-cli CONFIG GET lua-time-limit
```

## Verify Your Script Works

Test the counter script:

```bash
redis-cli SET my-counter 0
redis-cli EVAL "
  local n = tonumber(redis.call('GET', KEYS[1])) or 0
  n = n + tonumber(ARGV[1])
  redis.call('SET', KEYS[1], n)
  return n
" 1 my-counter 1
# Returns: 1
redis-cli EVAL "... same script ..." 1 my-counter 1
# Returns: 2
```

## Summary

Lua scripts in Redis execute atomically using the `EVAL` command. Keys are passed via `KEYS[]` and additional arguments via `ARGV[]`. Scripts eliminate race conditions in read-modify-write operations and are ideal for complex multi-step logic. Keep scripts short, deterministic, and declare all accessed keys explicitly for Redis Cluster compatibility.
