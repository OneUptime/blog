# How to Implement Atomic Compare-and-Swap in Redis Lua

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Atomicity, Compare-and-Swap, Concurrency

Description: Implement atomic compare-and-swap (CAS) operations in Redis using Lua scripts to safely update values only when a precondition is met.

---

Compare-and-swap (CAS) is a fundamental concurrency primitive: read the current value, check it matches an expected value, and only then update it. Without atomicity, two clients can race between the read and the write. Lua scripts in Redis execute atomically, making CAS straightforward.

## The Race Condition Problem

Without CAS, updates can be lost:

```bash
# Client A reads: 100
# Client B reads: 100
# Client A sets: 101
# Client B sets: 101  (Client A's increment is lost!)
```

## Basic CAS Script

```lua
-- cas.lua
-- KEYS[1]: the key to update
-- ARGV[1]: expected current value
-- ARGV[2]: new value
-- Returns: 1 if updated, 0 if current value doesn't match

local current = redis.call('GET', KEYS[1])

-- Handle missing key
if current == false then
    current = nil
end

if tostring(current) == tostring(ARGV[1]) then
    redis.call('SET', KEYS[1], ARGV[2])
    return 1
end

return 0
```

```bash
redis-cli SET my-counter 100
redis-cli EVAL "$(cat cas.lua)" 1 my-counter 100 101
# Returns: 1 (updated successfully)

redis-cli EVAL "$(cat cas.lua)" 1 my-counter 100 102
# Returns: 0 (current value is 101, not 100)
```

## CAS with Return Value

Return the current value for the caller to inspect:

```lua
-- cas_return.lua
local current = redis.call('GET', KEYS[1])
local expected = ARGV[1]
local new_val = ARGV[2]

if current == false then
    return {0, false}  -- Key missing
end

if current == expected then
    redis.call('SET', KEYS[1], new_val)
    return {1, new_val}  -- Success, new value
end

return {0, current}  -- Failed, current value
```

## CAS with Expiry

Update a value atomically and refresh its TTL:

```lua
-- cas_with_ttl.lua
local current = redis.call('GET', KEYS[1])

if current ~= ARGV[1] then
    return {0, current or false}
end

redis.call('SET', KEYS[1], ARGV[2])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
return {1, ARGV[2]}
```

## Hash Field CAS

CAS on a specific hash field:

```lua
-- cas_hash.lua
-- KEYS[1]: hash key
-- ARGV[1]: field name
-- ARGV[2]: expected value
-- ARGV[3]: new value

local current = redis.call('HGET', KEYS[1], ARGV[1])

if current == false then
    current = nil
end

if tostring(current) == tostring(ARGV[2]) then
    redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])
    return 1
end

return 0
```

## Optimistic Locking Pattern

CAS enables optimistic locking for read-modify-write operations:

```python
import redis
import time

r = redis.Redis()

CAS_SCRIPT = """
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2])
    return 1
end
return 0
"""

def safe_increment(key: str, max_retries: int = 10) -> bool:
    for attempt in range(max_retries):
        current = r.get(key)
        if current is None:
            # Key doesn't exist; use SETNX to atomically create it
            if r.setnx(key, "1"):
                return True
        else:
            current_val = int(current)
            new_val = current_val + 1

            result = r.eval(
                CAS_SCRIPT, 1, key,
                str(current_val),
                str(new_val)
            )

            if result == 1:
                return True

        # CAS or SETNX failed - another client updated the value
        time.sleep(0.001 * (2 ** attempt))  # Exponential backoff

    return False  # Max retries exceeded
```

## Versioned CAS

Track update version numbers to detect stale updates:

```lua
-- versioned_cas.lua
local data = redis.call('HMGET', KEYS[1], 'value', 'version')
local current_val = data[1]
local current_ver = tonumber(data[2]) or 0
local expected_ver = tonumber(ARGV[1])

if current_ver ~= expected_ver then
    return {0, current_val, current_ver}  -- Version mismatch
end

local new_ver = current_ver + 1
redis.call('HSET', KEYS[1], 'value', ARGV[2], 'version', new_ver)
return {1, ARGV[2], new_ver}
```

## Summary

Atomic compare-and-swap in Redis uses a Lua script to read, compare, and conditionally update a value in a single atomic operation. Return `1` on success and `0` when the expected value doesn't match. For application code, retry CAS operations with exponential backoff on failure. Use versioned CAS with hash fields when you need to track concurrent update history or detect stale writes across multiple fields.
