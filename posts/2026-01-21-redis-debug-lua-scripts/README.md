# How to Debug Redis Lua Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Debugging, Performance, Development

Description: A comprehensive guide to debugging Redis Lua scripts, covering development workflows, testing strategies, common errors, and performance optimization techniques.

---

Redis Lua scripts enable atomic, complex operations that would otherwise require multiple round trips. However, debugging them can be challenging since they run on the server. This guide covers effective strategies for developing, testing, and debugging Redis Lua scripts.

## Lua Scripting Basics

### Script Execution

```bash
# EVAL - execute script directly
redis-cli EVAL "return 'Hello, World!'" 0

# With keys and arguments
redis-cli EVAL "return {KEYS[1], ARGV[1]}" 1 mykey myvalue

# EVALSHA - execute cached script by SHA
redis-cli SCRIPT LOAD "return 'Hello'"
# Returns: "502a...hex..."
redis-cli EVALSHA 502a... 0
```

### Script Structure

```lua
-- Basic structure
-- KEYS[1], KEYS[2], ... - key arguments
-- ARGV[1], ARGV[2], ... - non-key arguments

-- Call Redis commands
local value = redis.call('GET', KEYS[1])

-- Return values
return value
```

## Development Workflow

### Local Development

Create a development environment:

```bash
# scripts/dev-setup.sh
mkdir -p lua_scripts
touch lua_scripts/my_script.lua
```

Example script file:

```lua
-- lua_scripts/rate_limiter.lua
-- Rate limiter script
-- KEYS[1] = rate limit key
-- ARGV[1] = limit
-- ARGV[2] = window (seconds)

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)

if current == 1 then
    redis.call('EXPIRE', key, window)
end

if current > limit then
    return 0  -- Rate limited
else
    return 1  -- Allowed
end
```

### Loading Scripts

```python
# scripts/load_scripts.py
import redis
import os
import json

def load_scripts(redis_client, scripts_dir='lua_scripts'):
    """Load all Lua scripts and return their SHAs."""
    scripts = {}

    for filename in os.listdir(scripts_dir):
        if filename.endswith('.lua'):
            filepath = os.path.join(scripts_dir, filename)
            with open(filepath, 'r') as f:
                script_content = f.read()

            sha = redis_client.script_load(script_content)
            script_name = filename.replace('.lua', '')
            scripts[script_name] = sha
            print(f"Loaded {script_name}: {sha}")

    return scripts

# Usage
r = redis.Redis()
scripts = load_scripts(r)
print(f"Loaded scripts: {scripts}")
```

### Python Helper Class

```python
# app/lua_scripts.py
import redis
import os

class LuaScriptManager:
    def __init__(self, redis_client, scripts_dir='lua_scripts'):
        self.r = redis_client
        self.scripts_dir = scripts_dir
        self.scripts = {}
        self.shas = {}
        self._load_scripts()

    def _load_scripts(self):
        """Load all Lua scripts from directory."""
        for filename in os.listdir(self.scripts_dir):
            if filename.endswith('.lua'):
                filepath = os.path.join(self.scripts_dir, filename)
                with open(filepath, 'r') as f:
                    script_content = f.read()

                name = filename.replace('.lua', '')
                self.scripts[name] = script_content
                self.shas[name] = self.r.script_load(script_content)

    def reload_scripts(self):
        """Reload all scripts (for development)."""
        self.scripts.clear()
        self.shas.clear()
        self._load_scripts()

    def execute(self, script_name, keys=None, args=None):
        """Execute a script by name."""
        if script_name not in self.shas:
            raise ValueError(f"Unknown script: {script_name}")

        sha = self.shas[script_name]
        keys = keys or []
        args = args or []

        try:
            return self.r.evalsha(sha, len(keys), *keys, *args)
        except redis.exceptions.NoScriptError:
            # Script not in cache, reload
            self.shas[script_name] = self.r.script_load(self.scripts[script_name])
            return self.r.evalsha(self.shas[script_name], len(keys), *keys, *args)

    def execute_raw(self, script_content, keys=None, args=None):
        """Execute a script directly (for testing)."""
        keys = keys or []
        args = args or []
        return self.r.eval(script_content, len(keys), *keys, *args)


# Usage
r = redis.Redis(decode_responses=True)
lua = LuaScriptManager(r)

result = lua.execute('rate_limiter', keys=['ratelimit:user1'], args=[10, 60])
print(f"Rate limit result: {result}")
```

## Debugging Techniques

### Using redis.log()

Redis provides logging from Lua scripts:

```lua
-- Debug logging
redis.log(redis.LOG_DEBUG, "Debug message")
redis.log(redis.LOG_VERBOSE, "Verbose message")
redis.log(redis.LOG_NOTICE, "Notice message")
redis.log(redis.LOG_WARNING, "Warning message")

-- Example with variable inspection
local value = redis.call('GET', KEYS[1])
redis.log(redis.LOG_WARNING, "Value for " .. KEYS[1] .. ": " .. tostring(value))
```

Configure Redis to show logs:

```bash
# redis.conf
loglevel debug

# Or at runtime
redis-cli CONFIG SET loglevel debug

# Watch logs
tail -f /var/log/redis/redis-server.log
```

### Debug Wrapper Function

```lua
-- Add to your scripts during development
local function debug_print(...)
    local args = {...}
    local msg = ""
    for i, v in ipairs(args) do
        msg = msg .. tostring(v) .. " "
    end
    redis.log(redis.LOG_WARNING, "[DEBUG] " .. msg)
end

-- Usage
debug_print("Processing key:", KEYS[1], "with value:", value)
```

### Return Debug Information

```lua
-- During development, return debug info
local function execute_with_debug()
    local debug_info = {}

    local value = redis.call('GET', KEYS[1])
    table.insert(debug_info, "Got value: " .. tostring(value))

    local result = tonumber(value) + 1
    table.insert(debug_info, "Computed result: " .. tostring(result))

    redis.call('SET', KEYS[1], result)
    table.insert(debug_info, "Set new value")

    -- Return both result and debug info
    return {result, debug_info}
end

return execute_with_debug()
```

### Error Handling

```lua
-- Proper error handling
local function safe_call(...)
    local ok, result = pcall(redis.call, ...)
    if not ok then
        redis.log(redis.LOG_WARNING, "Error: " .. tostring(result))
        return nil, result
    end
    return result, nil
end

-- Usage
local value, err = safe_call('GET', KEYS[1])
if err then
    return redis.error_reply("Failed to get key: " .. err)
end

-- Or use redis.pcall for non-fatal errors
local result = redis.pcall('HGET', KEYS[1], 'field')
if result['err'] then
    -- Handle error
    return nil
end
```

## Testing Lua Scripts

### Unit Testing Framework

```python
# tests/test_lua_scripts.py
import pytest
import redis

class TestRateLimiterScript:
    @pytest.fixture
    def redis_client(self):
        r = redis.Redis(decode_responses=True)
        yield r
        r.flushdb()

    @pytest.fixture
    def rate_limiter_script(self):
        return """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])

        local current = redis.call('INCR', key)
        if current == 1 then
            redis.call('EXPIRE', key, window)
        end

        if current > limit then
            return 0
        else
            return 1
        end
        """

    def test_allows_requests_under_limit(self, redis_client, rate_limiter_script):
        """Test that requests under limit are allowed."""
        for i in range(5):
            result = redis_client.eval(
                rate_limiter_script,
                1,
                'ratelimit:test',
                5,  # limit
                60  # window
            )
            assert result == 1, f"Request {i+1} should be allowed"

    def test_blocks_requests_over_limit(self, redis_client, rate_limiter_script):
        """Test that requests over limit are blocked."""
        # Use up the limit
        for i in range(5):
            redis_client.eval(rate_limiter_script, 1, 'ratelimit:test', 5, 60)

        # Next request should be blocked
        result = redis_client.eval(rate_limiter_script, 1, 'ratelimit:test', 5, 60)
        assert result == 0, "Request over limit should be blocked"

    def test_sets_expiration(self, redis_client, rate_limiter_script):
        """Test that TTL is set on first request."""
        redis_client.eval(rate_limiter_script, 1, 'ratelimit:test', 5, 60)

        ttl = redis_client.ttl('ratelimit:test')
        assert 55 <= ttl <= 60, f"TTL should be ~60, got {ttl}"


class TestAtomicTransferScript:
    @pytest.fixture
    def transfer_script(self):
        return """
        local from_key = KEYS[1]
        local to_key = KEYS[2]
        local amount = tonumber(ARGV[1])

        local from_balance = tonumber(redis.call('GET', from_key) or 0)

        if from_balance < amount then
            return redis.error_reply("Insufficient balance")
        end

        redis.call('DECRBY', from_key, amount)
        redis.call('INCRBY', to_key, amount)

        return 'OK'
        """

    @pytest.fixture
    def redis_client(self):
        r = redis.Redis(decode_responses=True)
        yield r
        r.flushdb()

    def test_successful_transfer(self, redis_client, transfer_script):
        redis_client.set('balance:alice', 100)
        redis_client.set('balance:bob', 50)

        result = redis_client.eval(
            transfer_script,
            2,
            'balance:alice', 'balance:bob',
            30
        )

        assert result == 'OK'
        assert redis_client.get('balance:alice') == '70'
        assert redis_client.get('balance:bob') == '80'

    def test_insufficient_balance(self, redis_client, transfer_script):
        redis_client.set('balance:alice', 20)
        redis_client.set('balance:bob', 50)

        with pytest.raises(redis.ResponseError) as exc_info:
            redis_client.eval(
                transfer_script,
                2,
                'balance:alice', 'balance:bob',
                30
            )

        assert 'Insufficient balance' in str(exc_info.value)
        # Verify no changes were made
        assert redis_client.get('balance:alice') == '20'
        assert redis_client.get('balance:bob') == '50'
```

### Test Helpers

```python
# tests/lua_test_helpers.py
import redis
import time

class LuaScriptTester:
    def __init__(self, redis_client):
        self.r = redis_client

    def execute_with_timing(self, script, keys, args):
        """Execute script and measure time."""
        start = time.time()
        result = self.r.eval(script, len(keys), *keys, *args)
        elapsed = time.time() - start
        return result, elapsed

    def test_atomicity(self, script, keys, args, concurrent_runs=10):
        """Test that script behaves atomically under concurrent execution."""
        import threading
        import queue

        results = queue.Queue()
        errors = queue.Queue()

        def worker():
            try:
                result = self.r.eval(script, len(keys), *keys, *args)
                results.put(result)
            except Exception as e:
                errors.put(e)

        threads = []
        for _ in range(concurrent_runs):
            t = threading.Thread(target=worker)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        return {
            'results': [results.get() for _ in range(results.qsize())],
            'errors': [errors.get() for _ in range(errors.qsize())]
        }

    def benchmark(self, script, keys, args, iterations=1000):
        """Benchmark script execution."""
        times = []

        # Warm up
        for _ in range(10):
            self.r.eval(script, len(keys), *keys, *args)

        # Benchmark
        for _ in range(iterations):
            start = time.time()
            self.r.eval(script, len(keys), *keys, *args)
            times.append(time.time() - start)

        return {
            'min': min(times) * 1000,
            'max': max(times) * 1000,
            'avg': (sum(times) / len(times)) * 1000,
            'p50': sorted(times)[len(times) // 2] * 1000,
            'p99': sorted(times)[int(len(times) * 0.99)] * 1000,
        }
```

## Common Errors and Solutions

### 1. NOSCRIPT Error

```python
# Error: NOSCRIPT No matching script
# Solution: Handle gracefully with fallback to EVAL

def execute_script(redis_client, sha, script, keys, args):
    try:
        return redis_client.evalsha(sha, len(keys), *keys, *args)
    except redis.exceptions.NoScriptError:
        return redis_client.eval(script, len(keys), *keys, *args)
```

### 2. Wrong Number of Keys

```lua
-- Error: Wrong number of keys specified
-- Always use KEYS[] for key arguments

-- Wrong
local key = ARGV[1]  -- This should be a KEY

-- Correct
local key = KEYS[1]
local value = ARGV[1]
```

### 3. Type Errors

```lua
-- Error: attempt to perform arithmetic on a nil value
-- Solution: Handle nil values

-- Wrong
local count = redis.call('GET', KEYS[1])
local new_count = count + 1  -- Error if key doesn't exist

-- Correct
local count = redis.call('GET', KEYS[1])
local new_count = (tonumber(count) or 0) + 1
```

### 4. Return Type Issues

```lua
-- Issue: Lua tables are returned as arrays in Redis
-- Solution: Be explicit about return format

-- Return as array
return {field1, field2, field3}

-- Return as status reply
return redis.status_reply("OK")

-- Return as error
return redis.error_reply("Error message")

-- Return nil explicitly
return nil
```

### 5. Script Timeout

```bash
# Error: BUSY Redis is busy running a script
# Solution: Optimize script or increase timeout

# Check timeout setting
redis-cli CONFIG GET lua-time-limit

# Increase timeout (milliseconds)
redis-cli CONFIG SET lua-time-limit 10000

# Kill running script (last resort)
redis-cli SCRIPT KILL
```

## Performance Optimization

### Minimize Redis Calls

```lua
-- Inefficient: Multiple calls
local a = redis.call('GET', KEYS[1])
local b = redis.call('GET', KEYS[2])
local c = redis.call('GET', KEYS[3])

-- Better: Use MGET
local values = redis.call('MGET', KEYS[1], KEYS[2], KEYS[3])
local a, b, c = unpack(values)
```

### Use Appropriate Data Types

```lua
-- Use hashes instead of multiple keys
-- Inefficient
redis.call('SET', 'user:1:name', name)
redis.call('SET', 'user:1:email', email)
redis.call('SET', 'user:1:age', age)

-- Better
redis.call('HSET', 'user:1', 'name', name, 'email', email, 'age', age)
```

### Avoid Large Return Values

```lua
-- Avoid returning large datasets
-- Better to process on server or paginate

-- Instead of returning all
local all_keys = redis.call('KEYS', pattern)
return all_keys  -- Could be huge

-- Return count and process in batches
local count = 0
local cursor = "0"
repeat
    local result = redis.call('SCAN', cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = result[1]
    count = count + #result[2]
until cursor == "0"
return count
```

### Profile Scripts

```python
# Measure script performance
import time

def profile_script(redis_client, script, keys, args, runs=100):
    times = []

    for _ in range(runs):
        start = time.perf_counter()
        redis_client.eval(script, len(keys), *keys, *args)
        elapsed = time.perf_counter() - start
        times.append(elapsed * 1000)  # Convert to ms

    return {
        'avg_ms': sum(times) / len(times),
        'min_ms': min(times),
        'max_ms': max(times),
        'p95_ms': sorted(times)[int(len(times) * 0.95)]
    }
```

## Development Best Practices

### 1. Script Organization

```
project/
├── lua_scripts/
│   ├── rate_limiting/
│   │   ├── token_bucket.lua
│   │   └── sliding_window.lua
│   ├── caching/
│   │   ├── cache_aside.lua
│   │   └── write_through.lua
│   └── common/
│       └── helpers.lua
├── tests/
│   └── test_scripts.py
└── app/
    └── lua_manager.py
```

### 2. Documentation

```lua
--[[
    Rate Limiter using Token Bucket Algorithm

    KEYS:
        [1] - Rate limit key (e.g., "ratelimit:user:123")

    ARGV:
        [1] - Maximum tokens (bucket capacity)
        [2] - Refill rate (tokens per second)
        [3] - Requested tokens (usually 1)

    RETURNS:
        1 if allowed, 0 if rate limited

    EXAMPLE:
        EVAL script 1 "ratelimit:user:123" 100 10 1
--]]

-- Implementation follows...
```

### 3. Version Control

```lua
-- Include version in script for tracking
local SCRIPT_VERSION = "1.2.0"

-- Log version on first run (development only)
-- redis.log(redis.LOG_NOTICE, "Running script v" .. SCRIPT_VERSION)
```

## Conclusion

Debugging Redis Lua scripts requires a systematic approach:

- Use **redis.log()** for server-side debugging
- Implement **proper error handling** with pcall
- Write **comprehensive tests** for all scenarios
- **Profile performance** and optimize
- Follow **best practices** for maintainability

Key takeaways:

- Always handle nil values and edge cases
- Use KEYS[] for keys, ARGV[] for arguments
- Test atomicity under concurrent load
- Monitor script execution time
- Document scripts thoroughly

## Related Resources

- [Redis Lua Scripting](https://redis.io/docs/interact/programmability/eval-intro/)
- [Lua 5.1 Reference Manual](https://www.lua.org/manual/5.1/)
- [Redis Commands in Lua](https://redis.io/commands/eval/)
