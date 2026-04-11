# How to Implement Loops in Redis Lua Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Loop, Iteration

Description: Learn to use for, while, and repeat loops in Redis Lua scripts to iterate over keys, process collections, and execute batch Redis operations.

---

Loops in Redis Lua scripts let you process collections, iterate over multiple keys, and implement batch operations atomically. Lua supports numeric `for`, generic `for`, `while`, and `repeat` loops.

## Numeric For Loop

The numeric `for` loop counts from a start value to an end value:

```lua
-- Insert 5 items into a list
for i = 1, 5 do
    redis.call('RPUSH', KEYS[1], 'item-' .. i)
end
return redis.call('LLEN', KEYS[1])
```

With a step value (negative for countdown):

```lua
-- Count down from 10 to 1
for i = 10, 1, -1 do
    redis.call('RPUSH', KEYS[1], tostring(i))
end
```

## Generic For Loop with ipairs

Use `ipairs` to iterate over array tables (stops at first nil):

```lua
-- Process all passed keys
for i, key in ipairs(KEYS) do
    redis.call('EXPIRE', key, tonumber(ARGV[1]))
end
return #KEYS .. ' keys updated'
```

## Generic For Loop with pairs

Use `pairs` for dictionary tables:

```lua
local stats = {
    hits = tonumber(redis.call('GET', KEYS[1])) or 0,
    misses = tonumber(redis.call('GET', KEYS[2])) or 0,
    errors = tonumber(redis.call('GET', KEYS[3])) or 0
}

local result = {}
for field, value in pairs(stats) do
    table.insert(result, field)
    table.insert(result, tostring(value))
end
return result
```

## While Loop

Use `while` when the exit condition is checked at the start:

```lua
-- Process up to N items from a list
local max = tonumber(ARGV[1]) or 10
local count = 0

while count < max do
    local item = redis.call('LPOP', KEYS[1])
    if not item then
        break  -- List is empty
    end
    redis.call('SADD', KEYS[2], item)  -- Move to a set
    count = count + 1
end

return count
```

## Repeat-Until Loop

Executes at least once, checks condition at the end:

```lua
-- Retry until a condition is met (max 10 times)
local attempts = 0
repeat
    local val = tonumber(redis.call('GET', KEYS[1])) or 0
    if val > 0 then
        redis.call('DECRBY', KEYS[1], 1)
    end
    attempts = attempts + 1
until val <= 0 or attempts >= 10

return attempts
```

## Batch Processing Example

Process all KEYS in a batch operation:

```lua
-- Increment all counters and return total
local total = 0
local results = {}

for i = 1, #KEYS do
    local new_val = redis.call('INCR', KEYS[i])
    total = total + new_val
    table.insert(results, tostring(new_val))
end

-- Store the total
redis.call('SET', ARGV[1], total)
return results
```

```bash
redis-cli EVAL "$(cat batch_incr.lua)" 3 counter1 counter2 counter3 total-key
```

## Avoid Infinite Loops

Always include a loop limit to avoid exceeding the Lua time limit:

```lua
-- Safe loop with hard cap
local MAX_ITERATIONS = 10000
local count = 0

while count < MAX_ITERATIONS do
    local item = redis.call('LPOP', KEYS[1])
    if not item then break end
    -- process item
    count = count + 1
end

return count
```

If a script runs longer than `lua-time-limit` (default 5 seconds), Redis starts rejecting other client commands with a BUSY error. An administrator must then run `SCRIPT KILL` (if no writes were performed) or `SHUTDOWN NOSAVE` to stop the script.

## Summary

Lua supports numeric `for` loops (with optional step), generic `for` with `ipairs`/`pairs`, `while`, and `repeat-until` loops. Use numeric `for` to iterate a fixed count, `ipairs` for KEYS and ARGV arrays, and `while` with `break` for conditional iteration over Redis collections. Always add a maximum iteration cap to prevent scripts from exceeding the Lua time limit.
