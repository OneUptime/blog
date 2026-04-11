# How to Use FUNCTION LOAD in Redis to Register Function Libraries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Lua, Redis 7, Command

Description: Learn how to use FUNCTION LOAD in Redis 7.0+ to register Lua function libraries that persist across restarts and provide organized, named callable functions.

---

## What Is FUNCTION LOAD

`FUNCTION LOAD` is the command that registers a function library in Redis 7.0+. Unlike `SCRIPT LOAD` which caches anonymous scripts by SHA1, `FUNCTION LOAD` creates a named library containing one or more callable functions that persist across server restarts (when persistence is enabled).

```text
FUNCTION LOAD [REPLACE] function-code
```

- `REPLACE` - overwrite an existing library with the same name
- `function-code` - the full library source code including a shebang header

## Library Structure

A function library must start with a shebang line declaring the engine and library name:

```lua
#!lua name=mylib

-- Define functions
local function my_function(keys, args)
  return args[1]
end

-- Register functions
redis.register_function('my_function', my_function)
```

Currently only Lua (`#!lua`) is supported.

## Basic Loading Example

```bash
FUNCTION LOAD "#!lua name=greetings\n
local function hello(keys, args)
  return 'Hello, ' .. (args[1] or 'World')
end
redis.register_function('hello', hello)
"

# Returns the library name on success:
# "greetings"
```

## Loading with REPLACE

If a library with the same name already exists, use `REPLACE` to overwrite it:

```bash
FUNCTION LOAD REPLACE "#!lua name=greetings\n
local function hello(keys, args)
  return 'Greetings, ' .. (args[1] or 'World') .. '!'
end
redis.register_function('hello', hello)
"
```

Without `REPLACE`, loading a library with a duplicate name returns an error.

## Multi-Function Library

```lua
#!lua name=cache_utils

local function get_or_set(keys, args)
  local existing = redis.call('GET', keys[1])
  if existing then
    return existing
  end
  redis.call('SET', keys[1], args[1])
  if args[2] then
    redis.call('EXPIRE', keys[1], args[2])
  end
  return args[1]
end

local function invalidate_pattern(keys, args)
  local cursor = '0'
  local count = 0
  repeat
    local result = redis.call('SCAN', cursor, 'MATCH', args[1], 'COUNT', 100)
    cursor = result[1]
    for _, key in ipairs(result[2]) do
      redis.call('DEL', key)
      count = count + 1
    end
  until cursor == '0'
  return count
end

redis.register_function('get_or_set', get_or_set)
redis.register_function('invalidate_pattern', invalidate_pattern)
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

library_code = """#!lua name=session_manager

local function create_session(keys, args)
  local session_key = keys[1]
  local user_id = args[1]
  local ttl = tonumber(args[2]) or 3600
  redis.call('HSET', session_key, 'user_id', user_id, 'created_at', redis.call('TIME')[1])
  redis.call('EXPIRE', session_key, ttl)
  return redis.call('HGETALL', session_key)
end

local function extend_session(keys, args)
  local session_key = keys[1]
  local extra_ttl = tonumber(args[1]) or 1800
  local exists = redis.call('EXISTS', session_key)
  if exists == 0 then
    return redis.error_reply('Session not found')
  end
  redis.call('EXPIRE', session_key, extra_ttl)
  return redis.call('TTL', session_key)
end

redis.register_function('create_session', create_session)
redis.register_function('extend_session', extend_session)
"""

# Load the library
try:
    result = client.function_load(library_code)
    print(f"Loaded library: {result}")
except redis.ResponseError as e:
    if 'already exists' in str(e):
        result = client.function_load(library_code, replace=True)
        print(f"Replaced library: {result}")
    else:
        raise

# Use the functions
session = client.fcall('create_session', 1, 'session:abc123', 'user:42', 3600)
print(f"Session: {session}")

new_ttl = client.fcall('extend_session', 1, 'session:abc123', 1800)
print(f"Extended TTL: {new_ttl}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

const libraryCode = `#!lua name=rate_limiter

local function check_limit(keys, args)
  local key = keys[1]
  local limit = tonumber(args[1])
  local window = tonumber(args[2])
  local current = tonumber(redis.call('GET', key)) or 0
  if current >= limit then
    return {0, current, redis.call('TTL', key)}
  end
  redis.call('INCR', key)
  if current == 0 then
    redis.call('EXPIRE', key, window)
  end
  return {1, current + 1, redis.call('TTL', key)}
end

redis.register_function('check_limit', check_limit)
`;

await client.functionLoad(libraryCode, { REPLACE: true });
console.log('Library loaded');

const result = await client.fCall('check_limit', { keys: ['rate:api:user:1'], arguments: ['10', '60'] });
const [allowed, current, ttl] = result;
console.log(`Allowed: ${allowed}, Current: ${current}, TTL: ${ttl}s`);
```

## Loading from File

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def load_library_from_file(filepath, replace=False):
    with open(filepath, 'r') as f:
        code = f.read()
    return client.function_load(code, replace=replace)

library_name = load_library_from_file('./redis_functions/cache_utils.lua', replace=True)
print(f"Loaded: {library_name}")
```

## Function Registration Options

```lua
-- Register with flags for read-only functions
redis.register_function{
  function_name = 'safe_get',
  callback = function(keys, args)
    return redis.call('GET', keys[1])
  end,
  flags = {'no-writes', 'allow-oom'}
}
```

Available flags:
- `no-writes` - function only reads, can run on replicas with `FCALL_RO`
- `allow-oom` - allow calling even when memory is at `maxmemory`
- `no-cluster` - reject execution in cluster mode

## Persistence and Replication

Functions persist across restarts when using AOF or RDB persistence. They are also replicated to replicas automatically when loaded on the primary. This is a major advantage over `SCRIPT LOAD`, which only caches scripts in memory.

## Summary

`FUNCTION LOAD` registers named Lua function libraries in Redis 7.0+, creating persistent, replicable function collections that survive restarts. Use the `REPLACE` flag to update existing libraries and organize related functions into a single named library for cleaner code management compared to anonymous EVAL scripts.
