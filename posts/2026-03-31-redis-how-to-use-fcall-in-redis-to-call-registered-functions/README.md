# How to Use FCALL in Redis to Call Registered Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Lua, Command, Redis 7

Description: Learn how to use FCALL in Redis 7.0+ to invoke registered functions from loaded function libraries, offering a more organized alternative to EVAL scripts.

---

## What Is FCALL

Redis 7.0 introduced the Functions API as an evolution of Lua scripting. `FCALL` calls a named function that has been registered via `FUNCTION LOAD`. Unlike `EVAL`, which takes raw Lua code, `FCALL` references functions by name within loaded libraries.

```text
FCALL function numkeys [key [key ...]] [arg [arg ...]]
```

- `function` - the name of the registered function
- `numkeys` - number of key arguments
- `key` - key names accessible as the `keys` parameter in the Lua callback
- `arg` - extra arguments accessible as the `args` parameter in the Lua callback

## Loading a Function Library First

Before using `FCALL`, you need to load a library with `FUNCTION LOAD`:

```bash
FUNCTION LOAD "#!lua name=mylib\n
local function greet(keys, args)
  return 'Hello, ' .. args[1]
end
redis.register_function('greet', greet)
"
```

Now call the registered function:

```bash
FCALL greet 0 World
# "Hello, World"
```

## FCALL vs EVAL Comparison

| Feature | EVAL | FCALL |
|---------|------|-------|
| Code storage | Temporary cache | Persistent library |
| Reference by | SHA1 hash | Function name |
| Organization | Single script | Library with multiple functions |
| Persistence | Cleared on restart | Survives restart (with AOF) |
| Version | All Redis versions | Redis 7.0+ |

## Defining a Library with Multiple Functions

```bash
FUNCTION LOAD "#!lua name=utils\n

local function set_with_expiry(keys, args)
  redis.call('SET', keys[1], args[1])
  redis.call('EXPIRE', keys[1], args[2])
  return redis.call('GET', keys[1])
end

local function atomic_increment(keys, args)
  local val = tonumber(redis.call('GET', keys[1])) or 0
  local step = tonumber(args[1]) or 1
  redis.call('SET', keys[1], val + step)
  return val + step
end

redis.register_function('set_with_expiry', set_with_expiry)
redis.register_function('atomic_increment', atomic_increment)
"
```

Call each function separately:

```bash
FCALL set_with_expiry 1 session:token myvalue 3600
FCALL atomic_increment 1 page:views 5
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Define and load the library
library_code = """#!lua name=business_logic

local function rate_check(keys, args)
  local key = keys[1]
  local limit = tonumber(args[1])
  local window = tonumber(args[2])
  local current = tonumber(redis.call('GET', key)) or 0
  if current >= limit then
    return 0
  end
  redis.call('INCR', key)
  if current == 0 then
    redis.call('EXPIRE', key, window)
  end
  return 1
end

local function get_or_set(keys, args)
  local existing = redis.call('GET', keys[1])
  if existing then
    return existing
  end
  redis.call('SET', keys[1], args[1])
  redis.call('EXPIRE', keys[1], args[2])
  return args[1]
end

redis.register_function('rate_check', rate_check)
redis.register_function('get_or_set', get_or_set)
"""

# Load the library (replace if already loaded)
try:
    client.function_load(library_code)
except redis.ResponseError:
    client.function_load(library_code, replace=True)

print("Library loaded")

# Call the functions
allowed = client.fcall('rate_check', 1, 'rate:user:42', 10, 60)
print(f"Rate check: {'allowed' if allowed else 'blocked'}")

value = client.fcall('get_or_set', 1, 'cache:homepage', 'cached content', 300)
print(f"Cached value: {value}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

const libraryCode = `#!lua name=helpers

local function counter_with_cap(keys, args)
  local key = keys[1]
  local cap = tonumber(args[1])
  local current = tonumber(redis.call('GET', key)) or 0
  if current >= cap then
    return current
  end
  redis.call('INCR', key)
  return current + 1
end

redis.register_function('counter_with_cap', counter_with_cap)
`;

// Load the library
await client.functionLoad(libraryCode, { REPLACE: true });

// Call the function
const count = await client.fcall('counter_with_cap', ['hits:page1'], ['100']);
console.log(`Hit count: ${count}`);
```

## FCALL_RO for Read-Only Functions

Use `FCALL_RO` to call functions that only read data. This enables calling them on replicas:

```bash
FCALL_RO get_cached_value 1 cache:homepage
```

Mark functions as read-only when defining them:

```lua
redis.register_function{
  function_name='get_value',
  callback=function(keys, args)
    return redis.call('GET', keys[1])
  end,
  flags={'no-writes'}
}
```

## Error Handling in FCALL

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

try:
    result = client.fcall('nonexistent_function', 0)
except redis.ResponseError as e:
    print(f"Error: {e}")
    # ERR Function not found
```

## Listing Available Functions

```bash
FUNCTION LIST
# Shows all loaded libraries and their functions

FUNCTION LIST LIBRARYNAME mylib
# Filter by library name
```

## Summary

`FCALL` invokes named functions from Redis function libraries loaded with `FUNCTION LOAD`, providing a more structured and persistent alternative to `EVAL`-based scripting. Functions survive server restarts (with AOF enabled), are organized in named libraries, and can be called by name rather than SHA1 hash, making them easier to manage in production environments.
