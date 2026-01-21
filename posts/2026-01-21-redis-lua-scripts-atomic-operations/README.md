# How to Write Redis Lua Scripts for Atomic Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Atomic Operations, Performance, Database, Backend

Description: A comprehensive guide to writing Redis Lua scripts for atomic operations, covering EVAL, EVALSHA, script caching, and practical patterns for implementing thread-safe operations.

---

Redis Lua scripting enables you to execute complex operations atomically on the server side, eliminating race conditions and reducing network round-trips. This guide covers everything you need to know about writing effective Lua scripts for Redis, from basic syntax to advanced patterns.

## Why Use Lua Scripts in Redis?

Lua scripts in Redis provide several key benefits:

- **Atomicity**: Scripts execute as a single atomic operation
- **Reduced Latency**: Multiple operations in one network round-trip
- **Server-side Logic**: Complex computations happen on the Redis server
- **Consistency**: No race conditions between read and write operations
- **Reusability**: Scripts can be cached and reused via SHA1 hash

## Basic Lua Script Syntax

### EVAL Command

The basic syntax for executing Lua scripts:

```bash
EVAL script numkeys key [key ...] arg [arg ...]
```

- `script`: The Lua script to execute
- `numkeys`: Number of keys being passed
- `key [key ...]`: Redis keys accessed by the script
- `arg [arg ...]`: Additional arguments

### Simple Example

```bash
# Increment a counter and return the new value
redis-cli EVAL "return redis.call('INCR', KEYS[1])" 1 mycounter
```

### Accessing Keys and Arguments in Lua

```lua
-- KEYS table contains all keys passed to the script
local key1 = KEYS[1]
local key2 = KEYS[2]

-- ARGV table contains all additional arguments
local arg1 = ARGV[1]
local arg2 = ARGV[2]

-- Call Redis commands
redis.call('SET', key1, arg1)
local value = redis.call('GET', key2)

return value
```

## Script Caching with EVALSHA

For production use, cache scripts using `SCRIPT LOAD` and execute with `EVALSHA`:

```python
import redis

class RedisScriptManager:
    """Manage Redis Lua scripts with automatic caching"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self._script_cache = {}

    def register_script(self, name, script):
        """Register and cache a Lua script"""
        sha = self.redis.script_load(script)
        self._script_cache[name] = {
            'sha': sha,
            'script': script
        }
        return sha

    def execute(self, name, keys=None, args=None):
        """Execute a cached script by name"""
        if name not in self._script_cache:
            raise ValueError(f"Script '{name}' not registered")

        keys = keys or []
        args = args or []
        script_info = self._script_cache[name]

        try:
            return self.redis.evalsha(script_info['sha'], len(keys), *keys, *args)
        except redis.exceptions.NoScriptError:
            # Script not in cache, reload and retry
            sha = self.redis.script_load(script_info['script'])
            self._script_cache[name]['sha'] = sha
            return self.redis.evalsha(sha, len(keys), *keys, *args)


# Usage
r = redis.Redis()
scripts = RedisScriptManager(r)

# Register scripts
INCREMENT_SCRIPT = """
local current = redis.call('GET', KEYS[1])
if current then
    current = tonumber(current) + tonumber(ARGV[1])
else
    current = tonumber(ARGV[1])
end
redis.call('SET', KEYS[1], current)
return current
"""

scripts.register_script('increment', INCREMENT_SCRIPT)

# Execute
result = scripts.execute('increment', keys=['counter'], args=[5])
print(f"New counter value: {result}")
```

## Common Atomic Operation Patterns

### 1. Compare and Swap (CAS)

```lua
-- compare_and_swap.lua
-- Only update if current value matches expected
local key = KEYS[1]
local expected = ARGV[1]
local new_value = ARGV[2]

local current = redis.call('GET', key)
if current == expected then
    redis.call('SET', key, new_value)
    return 1  -- Success
else
    return 0  -- Failure, value changed
end
```

Python usage:

```python
COMPARE_AND_SWAP = """
local key = KEYS[1]
local expected = ARGV[1]
local new_value = ARGV[2]

local current = redis.call('GET', key)
if current == expected then
    redis.call('SET', key, new_value)
    return 1
else
    return 0
end
"""

def compare_and_swap(redis_client, key, expected, new_value):
    """Atomic compare-and-swap operation"""
    script = redis_client.register_script(COMPARE_AND_SWAP)
    return script(keys=[key], args=[expected, new_value]) == 1

# Usage
r = redis.Redis()
r.set('config:version', '1.0.0')

# Only update if version is still 1.0.0
success = compare_and_swap(r, 'config:version', '1.0.0', '1.1.0')
print(f"Update successful: {success}")
```

### 2. Get and Set with Expiry

```lua
-- get_set_ex.lua
-- Get current value, set new value with expiry
local key = KEYS[1]
local new_value = ARGV[1]
local ttl = tonumber(ARGV[2])

local old_value = redis.call('GET', key)
redis.call('SETEX', key, ttl, new_value)
return old_value
```

### 3. Increment with Maximum Limit

```lua
-- increment_with_max.lua
-- Increment a counter but don't exceed maximum
local key = KEYS[1]
local increment = tonumber(ARGV[1])
local max_value = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key) or 0)
local new_value = current + increment

if new_value > max_value then
    return -1  -- Would exceed maximum
end

redis.call('SET', key, new_value)
return new_value
```

### 4. Conditional Set (Set if Greater)

```lua
-- set_if_greater.lua
-- Only set value if it's greater than current
local key = KEYS[1]
local new_value = tonumber(ARGV[1])

local current = tonumber(redis.call('GET', key) or 0)

if new_value > current then
    redis.call('SET', key, new_value)
    return 1
end
return 0
```

### 5. Atomic Transfer Between Keys

```lua
-- transfer.lua
-- Atomically transfer value from one key to another
local source = KEYS[1]
local dest = KEYS[2]
local amount = tonumber(ARGV[1])

local source_balance = tonumber(redis.call('GET', source) or 0)

if source_balance < amount then
    return -1  -- Insufficient balance
end

redis.call('DECRBY', source, amount)
redis.call('INCRBY', dest, amount)
return 1
```

Python implementation:

```python
TRANSFER_SCRIPT = """
local source = KEYS[1]
local dest = KEYS[2]
local amount = tonumber(ARGV[1])

local source_balance = tonumber(redis.call('GET', source) or 0)

if source_balance < amount then
    return -1
end

redis.call('DECRBY', source, amount)
redis.call('INCRBY', dest, amount)
return 1
"""

def transfer(redis_client, source_key, dest_key, amount):
    """Atomically transfer amount between two keys"""
    script = redis_client.register_script(TRANSFER_SCRIPT)
    result = script(keys=[source_key, dest_key], args=[amount])
    return result == 1

# Usage
r = redis.Redis()
r.set('account:alice', 100)
r.set('account:bob', 50)

success = transfer(r, 'account:alice', 'account:bob', 30)
print(f"Transfer successful: {success}")
print(f"Alice: {r.get('account:alice')}")  # 70
print(f"Bob: {r.get('account:bob')}")      # 80
```

## Rate Limiting with Lua

### Sliding Window Rate Limiter

```lua
-- sliding_window_rate_limit.lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current requests
local count = redis.call('ZCARD', key)

if count < limit then
    -- Add current request
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('EXPIRE', key, window)
    return 1  -- Allowed
else
    return 0  -- Rate limited
end
```

Python implementation:

```python
import time

SLIDING_WINDOW_LIMITER = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('EXPIRE', key, window)
    return 1
else
    return 0
end
"""

class SlidingWindowRateLimiter:
    def __init__(self, redis_client, limit, window_seconds):
        self.redis = redis_client
        self.limit = limit
        self.window = window_seconds
        self.script = redis_client.register_script(SLIDING_WINDOW_LIMITER)

    def is_allowed(self, identifier):
        """Check if request is allowed"""
        key = f"ratelimit:{identifier}"
        now = int(time.time() * 1000)  # Milliseconds
        result = self.script(
            keys=[key],
            args=[self.limit, self.window * 1000, now]
        )
        return result == 1

# Usage
r = redis.Redis()
limiter = SlidingWindowRateLimiter(r, limit=100, window_seconds=60)

# Check rate limit for user
if limiter.is_allowed('user:123'):
    print("Request allowed")
else:
    print("Rate limited")
```

### Token Bucket Rate Limiter

```lua
-- token_bucket.lua
local key = KEYS[1]
local max_tokens = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])  -- tokens per second
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_update')
local tokens = tonumber(bucket[1]) or max_tokens
local last_update = tonumber(bucket[2]) or now

-- Calculate tokens to add based on time elapsed
local elapsed = (now - last_update) / 1000
local tokens_to_add = elapsed * refill_rate
tokens = math.min(max_tokens, tokens + tokens_to_add)

if tokens >= requested then
    tokens = tokens - requested
    redis.call('HMSET', key, 'tokens', tokens, 'last_update', now)
    redis.call('EXPIRE', key, 3600)
    return 1  -- Allowed
else
    redis.call('HMSET', key, 'tokens', tokens, 'last_update', now)
    redis.call('EXPIRE', key, 3600)
    return 0  -- Denied
end
```

## Distributed Locking with Lua

### Acquire Lock

```lua
-- acquire_lock.lua
local key = KEYS[1]
local token = ARGV[1]
local ttl = tonumber(ARGV[2])

-- Only set if not exists
local result = redis.call('SET', key, token, 'NX', 'PX', ttl)
if result then
    return 1
end
return 0
```

### Release Lock

```lua
-- release_lock.lua
local key = KEYS[1]
local token = ARGV[1]

-- Only delete if token matches (we own the lock)
local current = redis.call('GET', key)
if current == token then
    redis.call('DEL', key)
    return 1
end
return 0
```

### Extend Lock

```lua
-- extend_lock.lua
local key = KEYS[1]
local token = ARGV[1]
local ttl = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current == token then
    redis.call('PEXPIRE', key, ttl)
    return 1
end
return 0
```

Complete Python implementation:

```python
import uuid
import time

class DistributedLock:
    """Distributed lock using Redis Lua scripts"""

    ACQUIRE_SCRIPT = """
    local key = KEYS[1]
    local token = ARGV[1]
    local ttl = tonumber(ARGV[2])
    local result = redis.call('SET', key, token, 'NX', 'PX', ttl)
    if result then return 1 end
    return 0
    """

    RELEASE_SCRIPT = """
    local key = KEYS[1]
    local token = ARGV[1]
    local current = redis.call('GET', key)
    if current == token then
        redis.call('DEL', key)
        return 1
    end
    return 0
    """

    EXTEND_SCRIPT = """
    local key = KEYS[1]
    local token = ARGV[1]
    local ttl = tonumber(ARGV[2])
    local current = redis.call('GET', key)
    if current == token then
        redis.call('PEXPIRE', key, ttl)
        return 1
    end
    return 0
    """

    def __init__(self, redis_client, lock_name, ttl_ms=10000):
        self.redis = redis_client
        self.lock_name = f"lock:{lock_name}"
        self.ttl_ms = ttl_ms
        self.token = None

        self._acquire = redis_client.register_script(self.ACQUIRE_SCRIPT)
        self._release = redis_client.register_script(self.RELEASE_SCRIPT)
        self._extend = redis_client.register_script(self.EXTEND_SCRIPT)

    def acquire(self, blocking=True, timeout=None):
        """Acquire the lock"""
        self.token = str(uuid.uuid4())
        start = time.time()

        while True:
            result = self._acquire(
                keys=[self.lock_name],
                args=[self.token, self.ttl_ms]
            )
            if result == 1:
                return True

            if not blocking:
                return False

            if timeout and (time.time() - start) > timeout:
                return False

            time.sleep(0.01)  # Small delay before retry

    def release(self):
        """Release the lock"""
        if self.token:
            result = self._release(
                keys=[self.lock_name],
                args=[self.token]
            )
            self.token = None
            return result == 1
        return False

    def extend(self, additional_ms=None):
        """Extend the lock TTL"""
        if not self.token:
            return False
        ttl = additional_ms or self.ttl_ms
        result = self._extend(
            keys=[self.lock_name],
            args=[self.token, ttl]
        )
        return result == 1

    def __enter__(self):
        if not self.acquire():
            raise RuntimeError("Could not acquire lock")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()


# Usage
r = redis.Redis()

with DistributedLock(r, 'my-resource', ttl_ms=5000) as lock:
    # Do work with exclusive access
    print("Have lock, doing work...")
    time.sleep(1)
    # Lock automatically released
```

## Working with Hash Data Structures

### Atomic Hash Operations

```lua
-- hash_increment_multiple.lua
-- Increment multiple hash fields atomically
local key = KEYS[1]
-- Args come in pairs: field1, increment1, field2, increment2, ...

local results = {}
for i = 1, #ARGV, 2 do
    local field = ARGV[i]
    local increment = tonumber(ARGV[i + 1])
    local new_value = redis.call('HINCRBY', key, field, increment)
    table.insert(results, new_value)
end
return results
```

### Get or Create Hash

```lua
-- hash_get_or_create.lua
local key = KEYS[1]
-- ARGV contains default field-value pairs

local exists = redis.call('EXISTS', key)
if exists == 0 then
    -- Create with defaults
    for i = 1, #ARGV, 2 do
        redis.call('HSET', key, ARGV[i], ARGV[i + 1])
    end
end
return redis.call('HGETALL', key)
```

## Error Handling in Lua Scripts

### Using pcall for Error Handling

```lua
-- safe_operation.lua
local key = KEYS[1]
local value = ARGV[1]

-- Use pcall to catch errors
local ok, err = pcall(function()
    redis.call('SET', key, value)
end)

if ok then
    return 'OK'
else
    return 'ERROR: ' .. tostring(err)
end
```

### Validation and Error Responses

```lua
-- validated_operation.lua
local key = KEYS[1]
local amount = tonumber(ARGV[1])

-- Validate input
if not amount then
    return redis.error_reply('ERR amount must be a number')
end

if amount < 0 then
    return redis.error_reply('ERR amount must be positive')
end

local current = tonumber(redis.call('GET', key) or 0)
if current + amount > 1000000 then
    return redis.error_reply('ERR would exceed maximum balance')
end

return redis.call('INCRBY', key, amount)
```

## Debugging Lua Scripts

### Using redis.log

```lua
-- debug_script.lua
local key = KEYS[1]
local value = ARGV[1]

-- Log for debugging (visible in Redis logs)
redis.log(redis.LOG_DEBUG, 'Processing key: ' .. key)
redis.log(redis.LOG_WARNING, 'Value provided: ' .. tostring(value))

local current = redis.call('GET', key)
redis.log(redis.LOG_DEBUG, 'Current value: ' .. tostring(current))

redis.call('SET', key, value)
return 'OK'
```

### Script Testing Framework

```python
class LuaScriptTester:
    """Test Lua scripts with assertions"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def test_script(self, script, keys, args, expected_result, setup=None, cleanup=True):
        """Test a Lua script"""
        # Setup
        if setup:
            for key, value in setup.items():
                self.redis.set(key, value)

        # Execute
        result = self.redis.eval(script, len(keys), *keys, *args)

        # Assert
        assert result == expected_result, f"Expected {expected_result}, got {result}"

        # Cleanup
        if cleanup:
            for key in keys:
                self.redis.delete(key)

        return True


# Usage
r = redis.Redis()
tester = LuaScriptTester(r)

# Test compare and swap
CAS_SCRIPT = """
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2])
    return 1
end
return 0
"""

# Test success case
tester.test_script(
    script=CAS_SCRIPT,
    keys=['test_key'],
    args=['old_value', 'new_value'],
    expected_result=1,
    setup={'test_key': 'old_value'}
)

# Test failure case
tester.test_script(
    script=CAS_SCRIPT,
    keys=['test_key'],
    args=['wrong_value', 'new_value'],
    expected_result=0,
    setup={'test_key': 'actual_value'}
)

print("All tests passed!")
```

## Best Practices

### 1. Always Use KEYS and ARGV

```lua
-- GOOD: Use KEYS and ARGV
local result = redis.call('GET', KEYS[1])

-- BAD: Hardcoded key names (breaks cluster compatibility)
local result = redis.call('GET', 'hardcoded_key')
```

### 2. Keep Scripts Short and Focused

```python
# GOOD: Single-purpose scripts
INCREMENT_IF_EXISTS = """
local current = redis.call('GET', KEYS[1])
if current then
    return redis.call('INCR', KEYS[1])
end
return nil
"""

# BAD: Overly complex scripts doing too much
```

### 3. Use Script Caching

```python
# GOOD: Register scripts once, use SHA
script = redis_client.register_script(SCRIPT)
result = script(keys=['key'], args=['value'])

# BAD: Using EVAL every time
result = redis_client.eval(SCRIPT, 1, 'key', 'value')
```

### 4. Handle Type Conversions

```lua
-- Lua numbers from Redis are strings
local count = tonumber(redis.call('GET', KEYS[1]) or 0)

-- Always handle nil
local value = redis.call('GET', KEYS[1])
if not value then
    value = 'default'
end
```

## Conclusion

Redis Lua scripts are a powerful tool for implementing atomic operations that would otherwise require multiple round-trips or be susceptible to race conditions. Key takeaways:

- Use Lua scripts when you need atomicity across multiple Redis operations
- Cache scripts with `SCRIPT LOAD` and execute with `EVALSHA` for production
- Always use `KEYS` and `ARGV` tables for key and argument access
- Keep scripts focused and well-tested
- Use `redis.log` for debugging during development

By mastering Lua scripting in Redis, you can implement complex business logic, rate limiters, distributed locks, and other patterns with guaranteed atomicity and excellent performance.
