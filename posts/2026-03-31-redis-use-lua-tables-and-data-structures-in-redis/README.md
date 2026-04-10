# How to Use Lua Tables and Data Structures in Redis Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Table, Data Structure

Description: Learn to use Lua tables as arrays and dictionaries in Redis scripts to build complex logic, aggregate results, and return multiple values.

---

In Lua, tables are the only composite data structure - they serve as arrays, dictionaries, sets, and objects. Mastering tables unlocks the ability to write complex Redis scripts that aggregate data, filter results, and return structured responses.

## Tables as Arrays

Lua arrays are tables with integer keys starting at 1:

```lua
-- Create an array
local fruits = {'apple', 'banana', 'cherry'}

-- Access elements
return fruits[1]  -- "apple"

-- Get length
return #fruits    -- 3

-- Iterate
for i = 1, #fruits do
    redis.call('RPUSH', KEYS[1], fruits[i])
end
```

## Tables as Dictionaries

```lua
-- Create a dictionary
local config = {
    max_retries = 3,
    timeout = 30,
    prefix = 'cache:'
}

-- Access fields
return config.max_retries  -- 3
return config['timeout']   -- 30 (alternative access)
```

## Building Results from Redis Data

Collect data from multiple keys into a table:

```lua
-- Get multiple hash fields as a table
local user = {
    id = redis.call('HGET', KEYS[1], 'id'),
    name = redis.call('HGET', KEYS[1], 'name'),
    score = tonumber(redis.call('ZSCORE', KEYS[2], ARGV[1])) or 0
}

-- Return as an array (Redis can't return nested tables)
return {user.id, user.name, tostring(user.score)}
```

```bash
redis-cli EVAL "$(cat user_info.lua)" 2 user:42 leaderboard 42
```

## Filtering Results

```lua
-- Return only keys with values above a threshold
local results = {}
local threshold = tonumber(ARGV[1])

for i = 1, #KEYS do
    local val = tonumber(redis.call('GET', KEYS[i])) or 0
    if val >= threshold then
        table.insert(results, KEYS[i])
        table.insert(results, tostring(val))
    end
end

return results
```

## Table Utility Functions

Lua's `table` library provides useful operations:

```lua
-- table.insert: append to array
local items = {}
table.insert(items, 'first')
table.insert(items, 'second')

-- table.insert at position
table.insert(items, 1, 'zeroth')  -- Insert at index 1

-- table.remove: remove and return element
local removed = table.remove(items, 1)

-- table.concat: join strings
local csv = table.concat(items, ',')
return csv
```

## Converting Redis Lists to Lua Tables

```lua
-- Get a Redis list and process it as a Lua table
local list = redis.call('LRANGE', KEYS[1], 0, -1)
local count = 0
local sum = 0

for _, v in ipairs(list) do
    sum = sum + (tonumber(v) or 0)
    count = count + 1
end

if count > 0 then
    return tostring(sum / count)  -- Return average as string
end
return '0'
```

## Limitations on Return Types

Redis only serializes integer-indexed (array) entries from Lua tables, ignoring string keys:

```lua
-- This won't work as expected
return {key = "value"}  -- Dictionary tables become empty arrays

-- Return as flat array instead
return {"key", "value"}  -- Client reconstructs the structure
```

In application code, reconstruct the structure:

```python
result = r.eval(script, 1, "user:42")
# result = ["id", "42", "name", "Alice"]
user = dict(zip(result[::2], result[1::2]))
# user = {"id": "42", "name": "Alice"}
```

## Summary

Lua tables are the foundation of data manipulation in Redis scripts. Use them as arrays with integer keys and the `table` library for list operations, or as dictionaries with string keys for structured data. When returning results to Redis clients, flatten dictionary structures into flat arrays, since Redis ignores string keys in Lua tables. Iterate Redis list results with `ipairs()` for clean, readable code.
