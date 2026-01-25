# How to Use Redis Lua Scripting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Performance, Atomicity, Backend

Description: Master Redis Lua scripting for atomic operations, complex logic, and performance optimization. Learn script syntax, debugging, and production best practices.

---

Redis Lua scripting executes scripts atomically on the server, enabling complex operations that would otherwise require multiple round trips or WATCH/MULTI/EXEC patterns. Scripts run entirely on the server, providing both performance benefits and guaranteed atomicity.

## Basic Script Execution

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Simple Lua script
script = """
return 'Hello from Lua!'
"""

result = r.eval(script, 0)  # 0 = number of keys
print(result)  # b'Hello from Lua!'

# Script with KEYS and ARGV
script = """
local key = KEYS[1]
local value = ARGV[1]
redis.call('SET', key, value)
return redis.call('GET', key)
"""

result = r.eval(script, 1, 'mykey', 'myvalue')
print(result)  # b'myvalue'
```

## Script Caching

Scripts can be cached using EVALSHA for better performance:

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Method 1: Use register_script (recommended)
increment_script = r.register_script("""
local current = redis.call('GET', KEYS[1])
if current then
    current = tonumber(current)
else
    current = 0
end
local new_value = current + tonumber(ARGV[1])
redis.call('SET', KEYS[1], new_value)
return new_value
""")

# Script is automatically cached
result = increment_script(keys=['counter'], args=[5])
print(f"New value: {result}")

# Method 2: Manual caching
script = """
return redis.call('GET', KEYS[1])
"""

# Load script and get SHA
sha = r.script_load(script)
print(f"Script SHA: {sha}")

# Execute by SHA (faster for repeated calls)
result = r.evalsha(sha, 1, 'mykey')
```

## Common Lua Patterns

### Rate Limiting

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, db=0)

rate_limit_script = r.register_script("""
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])

-- Remove old entries outside the window
local window_start = current_time - window
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count requests in window
local count = redis.call('ZCARD', key)

if count < limit then
    -- Add this request
    redis.call('ZADD', key, current_time, current_time .. math.random())
    redis.call('EXPIRE', key, window)
    return {1, limit - count - 1}  -- allowed, remaining
else
    return {0, 0}  -- denied, no remaining
end
""")

def check_rate_limit(user_id, limit=100, window=60):
    """Check if user is within rate limit"""
    key = f'ratelimit:{user_id}'
    current_time = time.time()

    result = rate_limit_script(
        keys=[key],
        args=[limit, window, current_time]
    )

    allowed = result[0] == 1
    remaining = result[1]

    return allowed, remaining

# Usage
for i in range(5):
    allowed, remaining = check_rate_limit('user:123', limit=3, window=10)
    print(f"Request {i+1}: {'allowed' if allowed else 'denied'}, {remaining} remaining")
```

### Distributed Lock

```python
import redis
import uuid
import time

r = redis.Redis(host='localhost', port=6379, db=0)

# Acquire lock script
acquire_script = r.register_script("""
local key = KEYS[1]
local token = ARGV[1]
local ttl = tonumber(ARGV[2])

if redis.call('SET', key, token, 'NX', 'PX', ttl) then
    return 1
else
    return 0
end
""")

# Release lock script (only if we own it)
release_script = r.register_script("""
local key = KEYS[1]
local token = ARGV[1]

if redis.call('GET', key) == token then
    return redis.call('DEL', key)
else
    return 0
end
""")

class DistributedLock:
    def __init__(self, name, ttl_ms=10000):
        self.key = f'lock:{name}'
        self.token = str(uuid.uuid4())
        self.ttl_ms = ttl_ms

    def acquire(self, timeout=10):
        """Acquire lock with timeout"""
        start = time.time()
        while time.time() - start < timeout:
            if acquire_script(keys=[self.key], args=[self.token, self.ttl_ms]):
                return True
            time.sleep(0.1)
        return False

    def release(self):
        """Release lock if we own it"""
        return release_script(keys=[self.key], args=[self.token]) == 1

    def __enter__(self):
        if not self.acquire():
            raise Exception("Could not acquire lock")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()

# Usage
with DistributedLock('resource:1') as lock:
    # Critical section
    print("Doing exclusive work...")
```

### Atomic Counter with Limit

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

bounded_increment = r.register_script("""
local key = KEYS[1]
local increment = tonumber(ARGV[1])
local max_value = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key) or 0)
local new_value = current + increment

if new_value > max_value then
    return {0, current}  -- Not incremented, return current
else
    redis.call('SET', key, new_value)
    return {1, new_value}  -- Incremented, return new value
end
""")

def increment_with_limit(key, amount, limit):
    """Increment counter but do not exceed limit"""
    success, value = bounded_increment(keys=[key], args=[amount, limit])
    return bool(success), value

# Usage
r.set('inventory', 5)

success, value = increment_with_limit('inventory', 3, 10)
print(f"Increment 1: success={success}, value={value}")  # True, 8

success, value = increment_with_limit('inventory', 5, 10)
print(f"Increment 2: success={success}, value={value}")  # False, 8
```

## Lua Script Reference

```lua
-- Redis commands
redis.call('SET', key, value)     -- Raises error on failure
redis.pcall('SET', key, value)    -- Returns error object on failure

-- Data types
local str = "hello"
local num = 42
local tbl = {1, 2, 3}
local hash = {key1 = "value1", key2 = "value2"}

-- KEYS and ARGV
-- KEYS[1], KEYS[2], ... - Key names passed to script
-- ARGV[1], ARGV[2], ... - Additional arguments

-- Type conversions
local n = tonumber("42")
local s = tostring(42)

-- String operations
local len = string.len(str)
local sub = string.sub(str, 1, 3)
local upper = string.upper(str)

-- Table operations
local size = #tbl
table.insert(tbl, "new")
table.remove(tbl, 1)

-- Conditionals
if condition then
    -- code
elseif other_condition then
    -- code
else
    -- code
end

-- Loops
for i = 1, 10 do
    -- code
end

for index, value in ipairs(tbl) do
    -- code
end

for key, value in pairs(hash) do
    -- code
end

-- JSON handling (with cjson library)
local encoded = cjson.encode({key = "value"})
local decoded = cjson.decode('{"key": "value"}')

-- Return values
return "string"
return 42
return {1, 2, 3}
return {ok = "success"}
return {err = "error message"}
```

## Complex Example: Leaderboard Update

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

leaderboard_update = r.register_script("""
local leaderboard = KEYS[1]
local user_scores = KEYS[2]
local user_id = ARGV[1]
local score = tonumber(ARGV[2])
local max_entries = tonumber(ARGV[3])

-- Get user's previous score
local prev_score = redis.call('ZSCORE', leaderboard, user_id)

-- Update score in leaderboard
redis.call('ZADD', leaderboard, score, user_id)

-- Store user's score history
redis.call('LPUSH', user_scores, score)
redis.call('LTRIM', user_scores, 0, 99)  -- Keep last 100 scores

-- Trim leaderboard to max entries
local count = redis.call('ZCARD', leaderboard)
if count > max_entries then
    redis.call('ZREMRANGEBYRANK', leaderboard, 0, count - max_entries - 1)
end

-- Get user's new rank
local rank = redis.call('ZREVRANK', leaderboard, user_id)

-- Calculate if it is a personal best
local is_personal_best = 0
if not prev_score or score > tonumber(prev_score) then
    is_personal_best = 1
end

return {rank + 1, is_personal_best, score}
""")

def update_score(user_id, score, max_entries=100):
    """Update user score and get rank"""
    leaderboard_key = 'game:leaderboard'
    user_scores_key = f'user:{user_id}:scores'

    rank, is_pb, final_score = leaderboard_update(
        keys=[leaderboard_key, user_scores_key],
        args=[user_id, score, max_entries]
    )

    return {
        'rank': rank,
        'personal_best': bool(is_pb),
        'score': final_score
    }

# Usage
result = update_score('player1', 1500)
print(f"Rank: #{result['rank']}, PB: {result['personal_best']}")
```

## Debugging Scripts

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Use redis.log for debugging
debug_script = r.register_script("""
local key = KEYS[1]
local value = ARGV[1]

-- Log for debugging (appears in Redis log)
redis.log(redis.LOG_WARNING, 'Processing key: ' .. key)
redis.log(redis.LOG_WARNING, 'Value: ' .. tostring(value))

local result = redis.call('SET', key, value)

redis.log(redis.LOG_WARNING, 'Result: ' .. tostring(result))

return result
""")

# Check script exists
script = "return 1"
sha = r.script_load(script)
exists = r.script_exists(sha)
print(f"Script exists: {exists}")

# Flush all scripts
# r.script_flush()
```

## Summary

| Use Case | Pattern |
|----------|---------|
| Rate limiting | Sliding window with sorted sets |
| Distributed locks | SET NX with token validation |
| Atomic counters | GET, modify, SET in script |
| Cache-aside | Check cache, populate if missing |
| Leaderboards | ZADD with rank calculation |

Best practices:
- Keep scripts short and focused
- Use register_script for automatic caching
- Always use KEYS for key names (for cluster compatibility)
- Handle nil values explicitly
- Test scripts thoroughly before production
- Use redis.log for debugging
- Avoid blocking operations in scripts
