# How to Optimize Redis Lua Script Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Performance, Optimization, Scripting, Backend, Database

Description: A comprehensive guide to optimizing Redis Lua script performance, covering common pitfalls, debugging techniques, memory management, and best practices for writing high-performance scripts.

---

Lua scripts in Redis provide atomicity and reduce network round-trips, but poorly written scripts can become performance bottlenecks. This guide covers techniques for optimizing Lua script performance, avoiding common pitfalls, and debugging slow scripts.

## Understanding Lua Script Execution

Before optimizing, understand how Redis executes Lua scripts:

- **Single-threaded**: Scripts block other operations while running
- **Atomic**: Entire script executes without interruption
- **Memory**: Scripts share memory with Redis data
- **Time limit**: Default 5-second timeout (configurable via `lua-time-limit`)

## Profiling Lua Scripts

### Using SLOWLOG

```bash
# Configure slow log threshold (microseconds)
redis-cli CONFIG SET slowlog-log-slower-than 10000  # 10ms

# View slow queries
redis-cli SLOWLOG GET 10
```

### Measuring Script Execution Time

```python
import redis
import time
import statistics

def benchmark_script(redis_client, script, keys, args, iterations=100):
    """Benchmark a Lua script"""
    registered_script = redis_client.register_script(script)
    times = []

    for _ in range(iterations):
        start = time.perf_counter()
        registered_script(keys=keys, args=args)
        elapsed = (time.perf_counter() - start) * 1000  # ms
        times.append(elapsed)

    return {
        'min': min(times),
        'max': max(times),
        'mean': statistics.mean(times),
        'median': statistics.median(times),
        'p95': sorted(times)[int(len(times) * 0.95)],
        'p99': sorted(times)[int(len(times) * 0.99)],
        'std_dev': statistics.stdev(times) if len(times) > 1 else 0
    }

# Usage
r = redis.Redis()

slow_script = """
local result = {}
for i = 1, 10000 do
    table.insert(result, redis.call('GET', KEYS[1]))
end
return #result
"""

r.set('test_key', 'test_value')
metrics = benchmark_script(r, slow_script, ['test_key'], [])
print(f"Script metrics: {metrics}")
```

### Using Debug Logging

```lua
-- Add timing to script sections
local start_time = redis.call('TIME')

-- Your logic here
local result = redis.call('GET', KEYS[1])

local end_time = redis.call('TIME')
local elapsed_us = (end_time[1] - start_time[1]) * 1000000 + (end_time[2] - start_time[2])

redis.log(redis.LOG_WARNING, 'Script execution time: ' .. elapsed_us .. ' microseconds')

return result
```

## Common Performance Pitfalls

### Pitfall 1: Excessive Redis Calls in Loops

```lua
-- BAD: Making Redis calls in a loop
local results = {}
for i = 1, 1000 do
    local value = redis.call('GET', 'key:' .. i)
    table.insert(results, value)
end

-- GOOD: Use MGET for batch operations
local keys = {}
for i = 1, 1000 do
    table.insert(keys, 'key:' .. i)
end
local results = redis.call('MGET', unpack(keys))
```

### Pitfall 2: Large Table Operations

```lua
-- BAD: Creating large tables unnecessarily
local huge_table = {}
for i = 1, 100000 do
    huge_table[i] = {
        id = i,
        data = 'some data'
    }
end

-- GOOD: Process in chunks or stream results
local chunk_size = 1000
local cursor = 0
repeat
    local result = redis.call('SCAN', cursor, 'COUNT', chunk_size)
    cursor = tonumber(result[1])
    local keys = result[2]
    -- Process this chunk
    for _, key in ipairs(keys) do
        -- Process each key
    end
until cursor == 0
```

### Pitfall 3: String Concatenation in Loops

```lua
-- BAD: String concatenation creates new strings each time
local result = ''
for i = 1, 10000 do
    result = result .. 'item' .. i .. ','  -- O(n^2) complexity
end

-- GOOD: Use table.concat
local parts = {}
for i = 1, 10000 do
    table.insert(parts, 'item' .. i)
end
local result = table.concat(parts, ',')  -- O(n) complexity
```

### Pitfall 4: Not Using Local Variables

```lua
-- BAD: Global variable access is slower
for i = 1, 10000 do
    x = i * 2  -- Global
end

-- GOOD: Local variables are faster
local x
for i = 1, 10000 do
    x = i * 2  -- Local
end

-- BETTER: Cache frequently used functions as locals
local redis_call = redis.call
local tonumber = tonumber

for i = 1, 1000 do
    local value = tonumber(redis_call('GET', KEYS[i]))
end
```

### Pitfall 5: Unnecessary JSON Encoding/Decoding

```lua
-- BAD: Encoding/decoding in loops
for i = 1, 1000 do
    local data = cjson.decode(redis.call('GET', 'json:' .. i))
    -- Process data
    redis.call('SET', 'json:' .. i, cjson.encode(data))
end

-- GOOD: Use Redis hashes instead of JSON when possible
for i = 1, 1000 do
    local data = redis.call('HGETALL', 'hash:' .. i)
    -- Process data directly
end
```

## Optimized Script Patterns

### Batch Processing with Chunking

```lua
-- process_in_chunks.lua
-- Process large datasets in manageable chunks

local source_set = KEYS[1]
local dest_key = KEYS[2]
local chunk_size = tonumber(ARGV[1]) or 100
local processor_type = ARGV[2]

-- Cache function references
local redis_call = redis.call
local table_insert = table.insert

local cursor = '0'
local total_processed = 0

repeat
    local result = redis_call('SSCAN', source_set, cursor, 'COUNT', chunk_size)
    cursor = result[1]
    local members = result[2]

    if #members > 0 then
        -- Process chunk
        if processor_type == 'copy' then
            redis_call('SADD', dest_key, unpack(members))
        elseif processor_type == 'count' then
            total_processed = total_processed + #members
        end
    end

until cursor == '0'

return total_processed
```

### Efficient Key Scanning

```lua
-- efficient_scan.lua
-- Scan keys with filtering without loading all into memory

local pattern = ARGV[1]
local limit = tonumber(ARGV[2]) or 100
local action = ARGV[3]

local redis_call = redis.call
local results = {}
local count = 0
local cursor = '0'

repeat
    local scan_result = redis_call('SCAN', cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = scan_result[1]
    local keys = scan_result[2]

    for _, key in ipairs(keys) do
        if count >= limit then
            break
        end

        if action == 'delete' then
            redis_call('DEL', key)
        elseif action == 'list' then
            table.insert(results, key)
        elseif action == 'expire' then
            redis_call('EXPIRE', key, tonumber(ARGV[4]) or 3600)
        end

        count = count + 1
    end
until cursor == '0' or count >= limit

if action == 'list' then
    return results
end
return count
```

### Optimized Rate Limiter

```lua
-- optimized_rate_limiter.lua
-- High-performance rate limiter using sorted sets

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local identifier = ARGV[4]

-- Cache function reference
local redis_call = redis.call

-- Calculate window boundaries
local window_start = now - window_ms

-- Remove old entries and count in single pipeline
redis_call('ZREMRANGEBYSCORE', key, 0, window_start)
local current_count = redis_call('ZCARD', key)

if current_count < limit then
    -- Use now + random component for uniqueness
    redis_call('ZADD', key, now, identifier)
    redis_call('PEXPIRE', key, window_ms)
    return {1, limit - current_count - 1}  -- allowed, remaining
end

return {0, 0}  -- denied, remaining
```

### Memory-Efficient Aggregation

```lua
-- efficient_aggregation.lua
-- Aggregate data without building large intermediate tables

local source_pattern = ARGV[1]
local aggregation_type = ARGV[2]

local redis_call = redis.call
local tonumber = tonumber

local sum = 0
local count = 0
local min_val = nil
local max_val = nil

local cursor = '0'
repeat
    local result = redis_call('SCAN', cursor, 'MATCH', source_pattern, 'COUNT', 100)
    cursor = result[1]

    for _, key in ipairs(result[2]) do
        local value = tonumber(redis_call('GET', key))
        if value then
            count = count + 1
            sum = sum + value

            if not min_val or value < min_val then
                min_val = value
            end
            if not max_val or value > max_val then
                max_val = value
            end
        end
    end
until cursor == '0'

if aggregation_type == 'sum' then
    return sum
elseif aggregation_type == 'avg' then
    return count > 0 and (sum / count) or 0
elseif aggregation_type == 'min' then
    return min_val or 0
elseif aggregation_type == 'max' then
    return max_val or 0
elseif aggregation_type == 'count' then
    return count
else
    return cjson.encode({
        sum = sum,
        avg = count > 0 and (sum / count) or 0,
        min = min_val,
        max = max_val,
        count = count
    })
end
```

## Debugging Slow Scripts

### Script Analysis Tool

```python
import redis
import re
import time

class LuaScriptAnalyzer:
    """Analyze Lua scripts for potential performance issues"""

    PATTERNS = {
        'loop_redis_call': (
            r'for\s+.*\s+do\s*\n.*redis\.call',
            'WARNING: Redis call inside loop - consider batching'
        ),
        'string_concat_loop': (
            r'for\s+.*\s+do\s*\n.*\.\.',
            'WARNING: String concatenation in loop - use table.concat'
        ),
        'no_local': (
            r'^(?!local\s)(\w+)\s*=',
            'WARNING: Possible global variable assignment'
        ),
        'large_unpack': (
            r'unpack\s*\([^)]+\)',
            'INFO: unpack() usage - verify table size is reasonable'
        ),
        'cjson_in_loop': (
            r'for\s+.*\s+do\s*\n.*cjson\.',
            'WARNING: JSON encoding/decoding in loop'
        ),
    }

    @classmethod
    def analyze(cls, script):
        """Analyze script for performance issues"""
        issues = []

        for name, (pattern, message) in cls.PATTERNS.items():
            if re.search(pattern, script, re.MULTILINE | re.IGNORECASE):
                issues.append({
                    'type': name,
                    'message': message
                })

        # Count Redis calls
        redis_calls = len(re.findall(r'redis\.call', script))
        if redis_calls > 10:
            issues.append({
                'type': 'many_redis_calls',
                'message': f'INFO: {redis_calls} Redis calls - ensure batching where possible'
            })

        return issues

    @classmethod
    def profile_script(cls, redis_client, script, keys, args, runs=10):
        """Profile script execution"""
        registered = redis_client.register_script(script)
        times = []

        # Warm up
        for _ in range(3):
            registered(keys=keys, args=args)

        # Measure
        for _ in range(runs):
            start = time.perf_counter()
            registered(keys=keys, args=args)
            times.append((time.perf_counter() - start) * 1000)

        return {
            'script_analysis': cls.analyze(script),
            'execution_times_ms': times,
            'avg_time_ms': sum(times) / len(times),
            'min_time_ms': min(times),
            'max_time_ms': max(times)
        }


# Usage
slow_script = """
local result = ""
for i = 1, 100 do
    local value = redis.call('GET', KEYS[1])
    result = result .. value
end
return result
"""

analysis = LuaScriptAnalyzer.analyze(slow_script)
for issue in analysis:
    print(f"{issue['type']}: {issue['message']}")
```

### Real-time Script Monitoring

```python
import redis
import threading
import time

class ScriptMonitor:
    """Monitor Lua script execution in real-time"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.running = False

    def start(self, threshold_ms=10):
        """Start monitoring slow scripts"""
        self.running = True
        self.threshold_ms = threshold_ms

        def monitor_loop():
            while self.running:
                # Check slowlog for script-related entries
                slowlog = self.redis.slowlog_get(10)
                for entry in slowlog:
                    if entry['command'] and entry['command'][0].upper() in (b'EVAL', b'EVALSHA'):
                        duration_ms = entry['duration'] / 1000
                        if duration_ms >= self.threshold_ms:
                            print(f"Slow script detected:")
                            print(f"  Duration: {duration_ms:.2f}ms")
                            print(f"  Command: {entry['command'][:100]}")
                time.sleep(1)

        thread = threading.Thread(target=monitor_loop, daemon=True)
        thread.start()

    def stop(self):
        """Stop monitoring"""
        self.running = False


# Usage
r = redis.Redis()
monitor = ScriptMonitor(r)
monitor.start(threshold_ms=5)

# Your application runs...
# monitor.stop()
```

## Memory Optimization

### Avoiding Memory Leaks

```lua
-- BAD: Accumulating data in global tables
my_cache = my_cache or {}
table.insert(my_cache, some_data)  -- Grows without bound

-- GOOD: Use Redis for persistent storage, minimize script memory
local result = redis.call('GET', KEYS[1])
-- Process and return, don't store
return result
```

### Efficient Data Structures

```lua
-- For sparse data, use tables as sets
local seen = {}
for _, item in ipairs(items) do
    if not seen[item] then
        seen[item] = true
        -- Process unique item
    end
end

-- For sequential data, use arrays
local results = {}
for i = 1, 100 do
    results[i] = process(i)  -- Array access is faster than table.insert
end
```

## Configuration Tuning

### Adjusting Lua Script Limits

```bash
# Increase Lua script timeout (default 5 seconds)
redis-cli CONFIG SET lua-time-limit 10000  # 10 seconds

# Note: Scripts can still be killed with SCRIPT KILL
# Only works if script hasn't performed writes yet
```

### Memory Limits

```bash
# Set maximum memory for Lua scripts (Redis 7.0+)
redis-cli CONFIG SET lua-replicate-commands yes
```

## Best Practices Summary

### Do's

1. **Cache function references as locals**
```lua
local redis_call = redis.call
local tonumber = tonumber
```

2. **Use batch operations**
```lua
-- MGET, MSET, HMGET, pipeline operations
local values = redis_call('MGET', unpack(keys))
```

3. **Process data in chunks**
```lua
-- Use SCAN with reasonable COUNT
local result = redis_call('SCAN', cursor, 'COUNT', 100)
```

4. **Pre-allocate tables when size is known**
```lua
local results = {}
for i = 1, known_size do
    results[i] = nil  -- Pre-allocate
end
```

5. **Return early on errors**
```lua
if not valid_input then
    return cjson.encode({error = 'INVALID_INPUT'})
end
```

### Don'ts

1. **Don't make Redis calls in tight loops**
2. **Don't concatenate strings in loops**
3. **Don't load entire datasets into memory**
4. **Don't use global variables**
5. **Don't ignore the time limit**

## Conclusion

Optimizing Redis Lua scripts requires understanding both Lua's execution model and Redis's single-threaded architecture. Key takeaways:

- Profile scripts to identify bottlenecks
- Use batch operations instead of loops with individual calls
- Cache function references as locals
- Process large datasets in chunks
- Avoid string concatenation in loops
- Monitor production scripts for performance issues

By following these practices, you can write Lua scripts that maintain Redis's high-performance characteristics while implementing complex server-side logic.
