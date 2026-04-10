# How to Use Lua String Operations in Redis Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, String, Text Processing

Description: Learn how to use Lua string functions in Redis scripts for pattern matching, formatting, splitting, and transforming string data.

---

Redis stores most data as strings, and Lua's built-in `string` library provides powerful tools for manipulating them inside scripts. Understanding Lua string operations lets you transform, validate, and parse data without round-trips to your application.

## String Basics in Lua

Lua strings are immutable sequences of bytes. Basic operations:

```lua
local s = "Hello, Redis!"

-- Length
return #s              -- 13

-- Concatenation
return s .. " World"   -- "Hello, Redis! World"

-- Substring (string.sub)
return string.sub(s, 1, 5)    -- "Hello"
return string.sub(s, -6)      -- "Redis!"
```

## String Library Functions

### Find and Match

```lua
local key = "user:profile:12345"

-- string.find: returns start, end positions
local start, finish = string.find(key, "profile")
return start  -- 6

-- string.match: returns matched substring
local user_type = string.match(key, "user:(%w+):")
return user_type  -- "profile"
```

### Replace and Format

```lua
-- string.gsub: global substitution
local result = string.gsub("hello world", "%s+", "-")
return result  -- "hello-world"

-- string.format: printf-style formatting
local formatted = string.format("score:%.2f", tonumber(ARGV[1]))
return formatted  -- "score:98.60"
```

### Case and Repetition

```lua
-- string.upper / string.lower
return string.upper("redis")   -- "REDIS"
return string.lower("REDIS")   -- "redis"

-- string.rep (two arguments only in Redis's Lua 5.1)
return string.rep("ab", 3)     -- "ababab"
```

## Practical Example - Parse a Namespace from a Key

```lua
-- Extract namespace from "namespace:entity:id" format
local key = KEYS[1]
local namespace = string.match(key, "^([^:]+):")

if not namespace then
    return redis.error_reply('Invalid key format: ' .. key)
end

-- Use namespace to track access counts
local count_key = 'stats:' .. namespace
return redis.call('INCR', count_key)
```

```bash
redis-cli EVAL "$(cat namespace_counter.lua)" 1 "users:profile:42"
```

## Splitting a String

Lua has no built-in split function, but you can implement one with `gmatch`:

```lua
-- Split CSV argument into individual items
local function split(str, sep)
    local parts = {}
    for part in string.gmatch(str, '([^' .. sep .. ']+)') do
        table.insert(parts, part)
    end
    return parts
end

local tags = split(ARGV[1], ',')
for _, tag in ipairs(tags) do
    redis.call('SADD', KEYS[1], tag)
end
return redis.call('SCARD', KEYS[1])
```

```bash
redis-cli EVAL "$(cat add_tags.lua)" 1 "article:tags" "redis,lua,scripting"
```

## String Length vs Byte Length

Lua's `#` operator and `string.len()` both return the byte count, not the character count. For ASCII data this is fine since each character is one byte. For multi-byte UTF-8 strings, both will return a larger number than the actual character count. Redis uses Lua 5.1 which has no built-in UTF-8 character counting:

```lua
local s = ARGV[1]
return #s              -- Byte length
-- string.len(s) returns the same byte length
```

## Validate String Input

```lua
-- Validate that ARGV[1] is a valid integer string
local input = ARGV[1]
if not string.match(input, '^-?%d+$') then
    return redis.error_reply('Invalid integer: ' .. input)
end
return redis.call('INCRBY', KEYS[1], tonumber(input))
```

## Summary

Lua's string library provides `find`, `match`, `gsub`, `format`, `upper`, `lower`, and `gmatch` for comprehensive string manipulation in Redis scripts. Use `string.match` with patterns to parse structured key formats, `string.gsub` for replacement, and `string.gmatch` to split delimited strings. Always validate string arguments before converting to numbers to avoid silent `nil` errors.
