# How to Handle Errors in Redis Lua Scripts (redis.pcall)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Error Handling, pcall

Description: Learn to use redis.pcall for safe error handling in Redis Lua scripts, catching command errors without aborting script execution.

---

When a Redis command fails inside a Lua script, `redis.call()` raises a Lua error that immediately aborts the script. `redis.pcall()` - protected call - catches that error and returns it as a table, letting your script handle failures gracefully.

## redis.call vs redis.pcall

`redis.call()` - raises error on failure, aborts script:

```bash
redis-cli EVAL "
  redis.call('EXPIRE', 'nonexistent-key', 'not-a-number')
  return 'done'
" 0
# Returns: ERR value is not an integer or out of range
# Script is aborted
```

Lua's native `pcall()` wrapping `redis.call()` - also catches errors:

```bash
redis-cli EVAL "
  local ok, err = pcall(function()
    return redis.call('EXPIRE', 'nonexistent-key', 'not-a-number')
  end)
  if not ok then
    return 'Error caught: ' .. tostring(err)
  end
  return 'done'
" 0
```

A simpler pattern using `redis.pcall` directly:

```lua
local result = redis.pcall('EXPIRE', 'mykey', 'not-a-number')
if type(result) == 'table' and result.err then
    return redis.error_reply('Command failed: ' .. result.err)
end
```

## Detecting Errors from redis.pcall

`redis.pcall()` returns a table with an `err` field when the command fails:

```lua
local result = redis.pcall('GET', KEYS[1])

if type(result) == 'table' and result.err then
    -- Error occurred
    return redis.error_reply(result.err)
else
    -- Success - result is the actual value
    return result
end
```

## Practical Example - Safe Multi-Key Update

```lua
-- Try to update multiple keys, collect errors
local errors = {}

for i = 1, #KEYS do
    local res = redis.pcall('SET', KEYS[i], ARGV[i])
    if type(res) == 'table' and res.err then
        table.insert(errors, 'Failed on key ' .. KEYS[i] .. ': ' .. res.err)
    end
end

if #errors > 0 then
    return redis.error_reply(table.concat(errors, '; '))
end

return 'OK'
```

```bash
redis-cli EVAL "$(cat safe_multi_set.lua)" 3 k1 k2 k3 v1 v2 v3
```

## Custom Error Replies

Return structured errors to your application:

```lua
-- redis.error_reply sends an error response to the client
return redis.error_reply('Custom error message')

-- redis.status_reply sends a status (OK-style) response
return redis.status_reply('Custom status')
```

## Handling Type Errors

A common error is passing wrong types to numeric operations:

```lua
local raw = redis.call('GET', KEYS[1])
local val = tonumber(raw)

if val == nil then
    return redis.error_reply('Key does not contain a valid number: ' .. tostring(raw))
end

return redis.call('SET', KEYS[1], val + tonumber(ARGV[1]))
```

## Script-Level Error Handling with Lua pcall

Use Lua's native `pcall` to catch any Lua runtime error:

```lua
local status, err = pcall(function()
    -- Any Lua error here is caught
    local x = nil + 1  -- This would normally crash
end)

if not status then
    return redis.error_reply('Lua error: ' .. tostring(err))
end
return 'OK'
```

## Summary

Use `redis.pcall()` instead of `redis.call()` when you want to handle Redis command failures gracefully without aborting the entire script. Error results are returned as tables with an `err` field. Combine with `redis.error_reply()` to propagate meaningful errors to the client. Use `tonumber()` with nil checks to catch type conversion errors before they cause runtime failures.
