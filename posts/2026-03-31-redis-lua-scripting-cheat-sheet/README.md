# Redis Lua Scripting Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Script, Cheat Sheet, Atomic

Description: Complete Redis Lua scripting reference covering EVAL, EVALSHA, SCRIPT commands, error handling, cjson, and common atomic patterns.

---

Redis Lua scripts execute atomically on the server, enabling complex operations that cannot be done with single commands. Here is the complete reference for Lua scripting in Redis.

## Running Scripts

```bash
# EVAL: run a Lua script inline
# EVAL script numkeys [key ...] [arg ...]
EVAL "return 1" 0
EVAL "return redis.call('GET', KEYS[1])" 1 mykey
EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 mykey myvalue

# Multiple keys and args
EVAL "
  local val = redis.call('GET', KEYS[1])
  redis.call('SET', KEYS[2], val)
  return val
" 2 source dest
```

## Script Cache

```bash
# Load script into cache, returns SHA1 hash
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# Returns: "e0e1f9fabfa9d353eca4c6f67f0e3c79ef4e8e05"

# Run cached script by SHA
EVALSHA e0e1f9fabfa9d353eca4c6f67f0e3c79ef4e8e05 1 mykey

# Check if scripts exist in cache
SCRIPT EXISTS sha1 sha2

# Flush script cache
SCRIPT FLUSH
SCRIPT FLUSH ASYNC   # non-blocking
```

## KEYS and ARGV Arrays

```lua
-- KEYS[1], KEYS[2], ... (1-indexed!)
-- ARGV[1], ARGV[2], ...

local key = KEYS[1]
local value = ARGV[1]
local ttl = tonumber(ARGV[2])

redis.call('SET', key, value)
redis.call('EXPIRE', key, ttl)
return redis.call('GET', key)
```

## Redis Calls in Lua

```lua
-- redis.call: raises error if command fails
redis.call('SET', 'key', 'value')

-- redis.pcall: returns error table instead of raising
local result = redis.pcall('HSET', 'string_key', 'field', 'val')
if type(result) == 'table' and result.err then
    return redis.error_reply("Wrong type")
end

-- Status reply
redis.status_reply("OK")

-- Error reply
redis.error_reply("ERR something went wrong")
```

## Conditionals and Control Flow

```lua
-- If/else
local count = redis.call('INCR', KEYS[1])
if count > tonumber(ARGV[1]) then
    redis.call('SET', KEYS[2], 'rate_limited')
    return 0
end
return 1
```

## Loops

```lua
-- Iterate through KEYS
for i = 1, #KEYS do
    redis.call('DEL', KEYS[i])
end
return #KEYS
```

## JSON with cjson

```lua
-- Encode table to JSON string
local data = {name = "Alice", age = 30}
local json_str = cjson.encode(data)
redis.call('SET', KEYS[1], json_str)

-- Decode JSON string to table
local json_str = redis.call('GET', KEYS[1])
local obj = cjson.decode(json_str)
return obj.name
```

## Time and Randomness

```lua
-- Get current time (seconds, microseconds) - non-deterministic, allowed since Redis 7.0+
local time = redis.call('TIME')
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local ms = seconds * 1000 + math.floor(microseconds / 1000)

-- Note: math.random() is seeded deterministically per-script
local rand = math.random(1, 100)
```

## Logging from Lua

```lua
-- Log levels: redis.LOG_DEBUG, LOG_VERBOSE, LOG_NOTICE, LOG_WARNING
redis.log(redis.LOG_WARNING, "Script executed with key: " .. KEYS[1])
```

## Common Atomic Patterns

### Atomic Check-and-Set

```lua
-- Set key only if current value matches expected
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
    return redis.call('SET', KEYS[1], ARGV[2])
end
return 0
```

### Rate Limiter (Fixed Window)

```lua
local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
if count > tonumber(ARGV[2]) then
    return 0  -- rate limited
end
return 1  -- allowed
```

### Release Distributed Lock

```lua
-- Only release if token matches (prevent releasing others' locks)
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
```

## Redis Functions (Redis 7.0+)

```bash
# Load a function library
FUNCTION LOAD "#!lua name=mylib\n redis.register_function('myfunc', function(keys, args) return args[1] end)"

# Call a function
FCALL myfunc 0 "hello"

# List functions
FUNCTION LIST

# Delete a library
FUNCTION DELETE mylib
```

## Summary

Redis Lua scripting enables complex atomic operations using EVAL and EVALSHA. Use KEYS[] and ARGV[] for parameterized scripts, redis.call() for command execution, and cjson for JSON handling. For production, load scripts with SCRIPT LOAD and call by SHA1 to avoid resending the script body on every call. Redis 7.0+ Functions provide a more structured alternative.
