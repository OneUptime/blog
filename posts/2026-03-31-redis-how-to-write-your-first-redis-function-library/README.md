# How to Write Your First Redis Function Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Lua, Redis 7, Scripting

Description: Create and deploy a Redis Function library using Redis 7.0 FUNCTION LOAD, register callable functions, and understand the advantages over Lua EVAL scripts.

---

## Redis Functions vs Lua Scripts

Redis 7.0 introduced Functions as a first-class replacement for EVAL/EVALSHA scripting. Key differences:

| Feature | EVAL/EVALSHA | Functions |
|---|---|---|
| Persistence | Not persisted (lost on restart) | Persisted with the dataset |
| Registration | Ad-hoc SHA | Named library + function |
| Cluster replication | Not replicated | Replicated automatically |
| Versioning | Manual | Library-level versioning |
| Language | Lua only | Lua (more engines planned) |

Functions solve the main pain point of EVALSHA: scripts are lost when Redis restarts or when `SCRIPT FLUSH` is called.

## Step 1 - Write a Function Library

A Function library is a Lua file that calls `redis.register_function` to register named functions:

```lua
#!lua name=mylib

-- A simple SET with TTL function
redis.register_function('setex_if_new', function(keys, args)
    local key = keys[1]
    local value = args[1]
    local ttl = tonumber(args[2])

    local existing = redis.call('GET', key)
    if existing == false then
        redis.call('SET', key, value, 'EX', ttl)
        return 1
    end
    return 0
end)

-- A counter with automatic expiry on first increment
redis.register_function('count_and_expire', function(keys, args)
    local key = keys[1]
    local ttl = tonumber(args[1])

    local count = redis.call('INCR', key)
    if count == 1 then
        redis.call('EXPIRE', key, ttl)
    end
    return count
end)
```

Save this as `mylib.lua`.

## Step 2 - Load the Library into Redis

```bash
cat mylib.lua | redis-cli -x FUNCTION LOAD
```

A successful load returns:

```text
"mylib"
```

If the library already exists, it returns an error. Use `REPLACE` to update:

```bash
cat mylib.lua | redis-cli -x FUNCTION LOAD REPLACE
```

## Step 3 - Call Functions with FCALL

```bash
# FCALL function_name numkeys [key ...] [arg ...]
redis-cli FCALL setex_if_new 1 mykey myvalue 3600
```

Returns `1` if key was new, `0` if it already existed.

```bash
redis-cli FCALL count_and_expire 1 counter:user:123 60
```

## Step 4 - Load from Python

```python
import redis

r = redis.Redis(host='localhost', port=6379)

LIBRARY_CODE = """
#!lua name=mylib

redis.register_function('setex_if_new', function(keys, args)
    local key = keys[1]
    local value = args[1]
    local ttl = tonumber(args[2])
    local existing = redis.call('GET', key)
    if existing == false then
        redis.call('SET', key, value, 'EX', ttl)
        return 1
    end
    return 0
end)

redis.register_function('count_and_expire', function(keys, args)
    local key = keys[1]
    local ttl = tonumber(args[1])
    local count = redis.call('INCR', key)
    if count == 1 then
        redis.call('EXPIRE', key, ttl)
    end
    return count
end)
"""

# Load library (replace if exists)
try:
    r.function_load(LIBRARY_CODE)
except Exception as e:
    if 'already exists' in str(e):
        r.function_load(LIBRARY_CODE, replace=True)
    else:
        raise

# Call functions
result = r.fcall('setex_if_new', 1, 'mykey', 'hello', 3600)
print(result)  # 1

count = r.fcall('count_and_expire', 1, 'counter:user:123', 60)
print(count)  # 1, 2, 3, ...
```

## Step 5 - List Loaded Libraries

```bash
redis-cli FUNCTION LIST
```

Output:

```text
1) 1) "library_name"
   2) "mylib"
   3) "engine"
   4) "LUA"
   5) "functions"
   6) 1) 1) "name"
            2) "setex_if_new"
            3) "description"
            4) (nil)
            5) "flags"
            6) (empty array)
```

## Step 6 - Add Function Descriptions and Flags

Annotate functions with descriptions and flags:

```lua
redis.register_function{
    function_name = 'setex_if_new',
    callback = function(keys, args)
        -- implementation
    end,
    description = 'SET a key with TTL only if it does not exist'
}
```

Available flags: `no-writes`, `allow-oom`, `allow-stale`, `no-cluster`, `allow-cross-slot-keys`.

## Step 7 - Delete and Dump Libraries

```bash
# Delete a library
redis-cli FUNCTION DELETE mylib

# Dump all libraries as binary for backup
redis-cli FUNCTION DUMP > functions.rdb

# Restore from dump
redis-cli -x FUNCTION RESTORE < functions.rdb
```

## Summary

Redis Functions are the modern replacement for EVAL scripting, offering named registration, persistence across restarts, and automatic replication in clusters. Write a library file with `redis.register_function`, load it with `FUNCTION LOAD`, and call it with `FCALL`. Unlike EVALSHA, functions survive Redis restarts and do not require re-loading after failures.
