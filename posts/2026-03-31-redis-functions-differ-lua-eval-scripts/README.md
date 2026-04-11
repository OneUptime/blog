# How Redis Functions Differ from Lua EVAL Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Lua, Script, Comparison

Description: Understand the key differences between Redis Functions and Lua EVAL scripts, covering persistence, naming, versioning, and when to choose each approach.

---

Redis has supported Lua scripting since version 2.6 via `EVAL`. Redis 7.0 introduced Functions as a more structured alternative. Understanding their differences helps you choose the right tool for your use case.

## The Core Difference: Persistence and Identity

Lua scripts loaded with `EVAL` are stateless - Redis caches them by SHA1 hash using `SCRIPT LOAD`, but they have no name and are lost on restart unless reloaded. Redis Functions are named, versioned libraries that persist across restarts.

```bash
# EVAL: send the script every time or use cached SHA
redis-cli EVAL "return redis.call('GET', KEYS[1])" 1 mykey

# Load and reuse by SHA
redis-cli SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# Returns: "abc123..."
redis-cli EVALSHA abc123 1 mykey
```

```bash
# Functions: load once, call by name forever
redis-cli FUNCTION LOAD "#!lua name=mylib\nredis.register_function('get_key', function(keys, args) return redis.call('GET', keys[1]) end)"
redis-cli FCALL get_key 1 mykey
```

## Invocation Syntax

`EVAL` embeds the script inline, while `FCALL` uses a registered function name:

```bash
# EVAL - script inline, prone to injection if not handled carefully
redis-cli EVAL "
  local val = redis.call('GET', KEYS[1])
  return val
" 1 user:profile:123

# FCALL - clean invocation by name
redis-cli FCALL get_user_profile 1 user:profile:123
```

## Argument Handling Differences

Both use `KEYS` and `ARGV`/`args`, but the function signature differs:

```lua
-- EVAL style: KEYS and ARGV are globals
local function old_style()
  local key = KEYS[1]
  local value = ARGV[1]
  redis.call('SET', key, value)
end

-- Functions style: keys and args are explicit parameters
redis.register_function('set_value', function(keys, args)
  local key = keys[1]
  local value = args[1]
  redis.call('SET', key, value)
end)
```

## Script Persistence Comparison

| Feature | EVAL / EVALSHA | Functions |
|---|---|---|
| Persists on restart | No | Yes |
| Named identifier | SHA1 hash | Human-readable name |
| Versioning | None | Library-level |
| Backup | Not built-in | FUNCTION DUMP |
| Read-only variant | EVAL_RO / EVALSHA_RO (7.0+) | FCALL_RO |

## Migration Example

Converting an EVAL script to a Function:

```lua
-- Old EVAL script (stored in application code)
-- EVAL "
--   local balance = tonumber(redis.call('GET', KEYS[1]))
--   if balance >= tonumber(ARGV[1]) then
--     redis.call('DECRBY', KEYS[1], ARGV[1])
--     return 1
--   end
--   return 0
-- " 1 account:123 50

-- New Function (deployed to Redis once)
#!lua name=billing

redis.register_function('debit_account', function(keys, args)
  local balance = tonumber(redis.call('GET', keys[1]) or 0)
  local amount = tonumber(args[1])
  if balance >= amount then
    redis.call('DECRBY', keys[1], amount)
    return 1
  end
  return 0
end)
```

## When to Use Each

Use `EVAL` when:
- You need quick, one-off atomic operations
- You're on Redis older than 7.0
- The script is tightly coupled to specific application code

Use Functions when:
- You need persistent, named server-side logic
- Multiple applications or services share the same logic
- You want proper versioning and deployment workflows
- You need read-only safety guarantees with `FCALL_RO`

## Summary

Redis Functions replace the ad-hoc nature of `EVAL` scripts with persistent, named libraries that survive restarts and support structured deployment. The key advantage is operability: functions have names, can be versioned, and integrate into CI/CD pipelines. For new Redis 7.0+ projects, Functions are the preferred approach for server-side logic.
