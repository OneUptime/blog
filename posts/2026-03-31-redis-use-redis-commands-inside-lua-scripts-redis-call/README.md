# How to Use Redis Commands Inside Lua Scripts (redis.call)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, redis.call, Command

Description: Learn how to use redis.call inside Lua scripts to execute Redis commands atomically, handle return values, and avoid blocking operations.

---

The `redis.call()` function is the primary way to execute Redis commands from within a Lua script. It runs a command and returns the result, or raises an error if the command fails.

## Basic Syntax

```lua
redis.call(command, arg1, arg2, ...)
```

Each argument is passed separately, not as a single string:

```bash
# Correct: each arg is separate
redis-cli EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 mykey myvalue

# Wrong: do NOT concatenate into a string
-- redis.call('SET ' .. KEYS[1] .. ' ' .. ARGV[1])  -- NEVER do this
```

## Return Value Types

`redis.call()` returns different Lua types depending on the Redis reply:

| Redis Reply | Lua Type |
|---|---|
| Status (OK) | Status table `{ok="OK"}` |
| Bulk string | Lua string |
| Integer | Lua number |
| Array | Lua table |
| Nil | Lua false |

```bash
redis-cli EVAL "
  local result = redis.call('SET', KEYS[1], ARGV[1])
  return result
" 1 testkey testvalue
# Returns: OK
```

## String Operations

```bash
redis-cli EVAL "
  redis.call('SET', KEYS[1], 'hello')
  local val = redis.call('GET', KEYS[1])
  return val
" 1 greeting
# Returns: "hello"
```

## Numeric Operations

```bash
redis-cli EVAL "
  redis.call('SET', KEYS[1], '10')
  local n = redis.call('INCRBY', KEYS[1], 5)
  return n
" 1 counter
# Returns: 15 (as integer)
```

## Working with Lists and Hashes

```bash
redis-cli EVAL "
  redis.call('RPUSH', KEYS[1], 'a', 'b', 'c')
  local length = redis.call('LLEN', KEYS[1])
  local items = redis.call('LRANGE', KEYS[1], 0, -1)
  return items
" 1 mylist
# Returns: 1) "a"  2) "b"  3) "c"
```

```bash
redis-cli EVAL "
  redis.call('HSET', KEYS[1], 'name', ARGV[1], 'age', ARGV[2])
  return redis.call('HGETALL', KEYS[1])
" 1 user:1 Alice 30
```

## Conditional Command Execution

Check for nil returns (key not found):

```lua
-- Set with expiry only if key doesn't exist
local existing = redis.call('GET', KEYS[1])
if existing == false then
    redis.call('SET', KEYS[1], ARGV[1])
    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
    return 1
end
return 0
```

```bash
redis-cli EVAL "$(cat set_if_absent.lua)" 1 lock:resource token123 30
```

## Commands Not Allowed in Scripts

Some commands cannot be used inside Lua scripts:

- `SUBSCRIBE`, `UNSUBSCRIBE`, `PSUBSCRIBE` - blocking pub/sub
- `WAIT` - waits for replica acknowledgment
- `DEBUG SLEEP` - administrative debug command

Trying to use them will raise:

```text
ERR command not allowed in scripts
```

## Pipeline Multiple Commands

All `redis.call()` invocations in a script execute sequentially and atomically:

```lua
-- Update multiple keys atomically
redis.call('INCR', KEYS[1])             -- page views
redis.call('INCR', KEYS[2])             -- unique sessions
redis.call('EXPIRE', KEYS[1], 86400)    -- reset daily
redis.call('EXPIRE', KEYS[2], 86400)
return redis.call('GET', KEYS[1])
```

## Summary

`redis.call()` executes Redis commands from within Lua scripts and returns typed results. Use separate arguments for each command parameter and check for `false` to detect nil replies. All commands in a script execute atomically without interruption. Avoid blocking commands (SUBSCRIBE, WAIT) inside scripts, and always declare keys via `KEYS[]` for cluster compatibility.
