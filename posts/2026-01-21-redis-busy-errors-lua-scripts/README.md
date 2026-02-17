# How to Fix Redis 'BUSY' Errors from Lua Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua Scripts, Troubleshooting, Performance, BUSY Errors

Description: A comprehensive guide to diagnosing and resolving Redis BUSY errors caused by long-running Lua scripts, including optimization techniques, timeout configuration, and best practices for script development.

---

Redis Lua scripts provide atomic operations but come with a critical limitation: they block the entire Redis server while executing. When a script runs too long, Redis returns BUSY errors to all other clients. This guide explains how to diagnose, resolve, and prevent BUSY errors in production environments.

## Understanding BUSY Errors

When you see this error:

```
BUSY Redis is busy running a script. You can only call SCRIPT KILL or SHUTDOWN NOSAVE.
```

It means:
1. A Lua script is currently executing
2. The script has been running longer than the `lua-time-limit` (default: 5 seconds)
3. Redis is blocking all other operations
4. You can kill the script or wait for it to complete

## Step 1: Identify the Problem Script

### Kill the Running Script

First, regain control of your Redis instance:

```bash
# Try to kill the script (only works if script hasn't performed writes)
redis-cli SCRIPT KILL

# If script has performed writes, you'll see:
# (error) UNKILLABLE Sorry the script already executed write commands
# In this case, wait for completion or use:
redis-cli SHUTDOWN NOSAVE  # WARNING: Loses all unsaved data!
```

### Find the Culprit

After the immediate crisis:

```bash
# Check slow log for script execution times
redis-cli SLOWLOG GET 20

# Look for EVAL or EVALSHA commands with high duration
# Example output:
# 1) 1) (integer) 12345
#    2) (integer) 1642531234
#    3) (integer) 15000000  # 15 seconds!
#    4) 1) "EVALSHA"
#       2) "a42059b..."
#       3) "1"
#       4) "key:pattern"
```

### List Cached Scripts

```bash
# Check script cache
redis-cli SCRIPT EXISTS <sha1> <sha2> ...

# Debug: see all loaded scripts
redis-cli DEBUG SCRIPT EXISTS
```

## Step 2: Configure Timeout Settings

### Adjust lua-time-limit

```bash
# Check current limit
redis-cli CONFIG GET lua-time-limit
# Default: 5000 (5 seconds)

# Increase limit (temporary fix)
redis-cli CONFIG SET lua-time-limit 10000  # 10 seconds

# Persist change
redis-cli CONFIG REWRITE
```

Note: This does not stop scripts from running - it only determines when Redis starts accepting SCRIPT KILL and returning BUSY errors.

### Configure busy-reply-threshold (Redis 7.0+)

```bash
# Set threshold for BUSY response
redis-cli CONFIG SET busy-reply-threshold 5000
```

## Step 3: Optimize Slow Scripts

### Identify Performance Issues

Common causes of slow Lua scripts:

1. **Large KEYS operations** - Scanning many keys
2. **Unbounded loops** - Processing without limits
3. **Complex string operations** - Large data manipulation
4. **Network calls** - Scripts cannot make external calls, but waiting for large responses

### Example: Bad vs Good Script

**Bad Script** - Processes unlimited keys:

```lua
-- DON'T DO THIS - can take forever
local keys = redis.call('KEYS', 'user:*')
local total = 0
for i, key in ipairs(keys) do
    local value = redis.call('GET', key)
    total = total + tonumber(value or 0)
end
return total
```

**Good Script** - Limited scope:

```lua
-- Better: Accept specific keys from client
local total = 0
for i, key in ipairs(KEYS) do
    local value = redis.call('GET', key)
    total = total + tonumber(value or 0)
end
return total
```

### Use SCAN Instead of KEYS

If you must iterate, use SCAN with pagination:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

def process_keys_safely(pattern, batch_size=1000):
    """Process keys in batches to avoid long scripts"""
    cursor = 0
    total = 0

    while True:
        cursor, keys = r.scan(cursor=cursor, match=pattern, count=batch_size)

        if keys:
            # Process batch with a small script
            script = """
            local total = 0
            for i, key in ipairs(KEYS) do
                local value = redis.call('GET', key)
                total = total + tonumber(value or 0)
            end
            return total
            """
            batch_total = r.eval(script, len(keys), *keys)
            total += batch_total

        if cursor == 0:
            break

    return total
```

## Step 4: Script Design Best Practices

### Keep Scripts Small and Focused

```lua
-- Good: Single-purpose atomic operation
-- Rate limiter script
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current and tonumber(current) >= limit then
    return 0  -- Rate limited
end

local result = redis.call('INCR', key)
if result == 1 then
    redis.call('EXPIRE', key, window)
end
return 1  -- Allowed
```

### Add Early Returns

```lua
-- Check conditions early to exit fast
local key = KEYS[1]

-- Quick validation
if not key then
    return redis.error_reply("ERR missing key")
end

local exists = redis.call('EXISTS', key)
if exists == 0 then
    return nil  -- Exit early
end

-- Continue with expensive operations only if needed
local value = redis.call('GET', key)
-- ... process value
```

### Limit Loop Iterations

```lua
-- Add iteration limits to prevent runaway scripts
local MAX_ITERATIONS = 10000
local processed = 0

for i, key in ipairs(KEYS) do
    if processed >= MAX_ITERATIONS then
        return redis.error_reply("ERR max iterations reached")
    end

    -- Process key
    redis.call('GET', key)
    processed = processed + 1
end

return processed
```

## Step 5: Profile Script Performance

### Use Redis DEBUG Tools

```bash
# Enable script debugging (development only!)
redis-cli SCRIPT DEBUG YES

# Run script with debugging
redis-cli EVAL "return redis.call('GET', KEYS[1])" 1 mykey
```

### Measure Script Execution Time

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

def profile_script(script, keys=[], args=[]):
    """Profile Lua script execution time"""

    # First, load the script
    sha = r.script_load(script)

    # Warm up
    for _ in range(10):
        r.evalsha(sha, len(keys), *keys, *args)

    # Measure
    iterations = 100
    start = time.time()

    for _ in range(iterations):
        r.evalsha(sha, len(keys), *keys, *args)

    elapsed = time.time() - start
    avg_time_ms = (elapsed / iterations) * 1000

    print(f"Script SHA: {sha}")
    print(f"Average execution time: {avg_time_ms:.3f} ms")
    print(f"Operations per second: {iterations / elapsed:.0f}")

    return avg_time_ms

# Profile a script
script = """
local total = 0
for i = 1, 1000 do
    total = total + i
end
return total
"""

profile_script(script)
```

## Step 6: Implement Script Monitoring

```python
import redis
import time
from threading import Thread

class ScriptMonitor:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.running = False

    def start(self):
        """Start monitoring for long-running scripts"""
        self.running = True
        self._monitor_thread = Thread(target=self._monitor_loop)
        self._monitor_thread.start()

    def stop(self):
        self.running = False
        self._monitor_thread.join()

    def _monitor_loop(self):
        while self.running:
            try:
                self._check_script_status()
            except Exception as e:
                print(f"Monitor error: {e}")
            time.sleep(1)

    def _check_script_status(self):
        """Check if a script is blocking Redis"""
        try:
            # Quick ping to check responsiveness
            start = time.time()
            self.redis.ping()
            latency = time.time() - start

            if latency > 1.0:  # More than 1 second
                self._alert_slow_response(latency)

        except redis.BusyLoadingError:
            print("Redis is loading data")
        except redis.ResponseError as e:
            if "BUSY" in str(e):
                self._handle_busy_script()

    def _handle_busy_script(self):
        """Handle BUSY script detection"""
        print("ALERT: Redis BUSY - script running too long!")

        # Try to kill the script
        try:
            self.redis.script_kill()
            print("Script killed successfully")
        except redis.ResponseError as e:
            if "UNKILLABLE" in str(e):
                print("WARNING: Script has writes, cannot kill!")

    def _alert_slow_response(self, latency):
        print(f"WARNING: Redis response slow ({latency:.2f}s)")

# Usage
r = redis.Redis(host='localhost', port=6379)
monitor = ScriptMonitor(r)
monitor.start()
```

## Step 7: Use Redis Functions (Redis 7.0+)

Redis Functions provide better management for server-side code:

```bash
# Define a function library
redis-cli FUNCTION LOAD "#!lua name=mylib

-- Rate limiter function
redis.register_function('rate_limit', function(keys, args)
    local key = keys[1]
    local limit = tonumber(args[1])
    local window = tonumber(args[2])

    local current = redis.call('GET', key)
    if current and tonumber(current) >= limit then
        return 0
    end

    local result = redis.call('INCR', key)
    if result == 1 then
        redis.call('EXPIRE', key, window)
    end
    return 1
end)
"

# Call the function
redis-cli FCALL rate_limit 1 user:123:requests 100 60

# List functions
redis-cli FUNCTION LIST

# Delete function library
redis-cli FUNCTION DELETE mylib
```

## Step 8: Implement Circuit Breaker Pattern

Protect your application from BUSY errors:

```python
import redis
import time
from functools import wraps

class RedisCircuitBreaker:
    def __init__(self, redis_client, failure_threshold=5, reset_timeout=60):
        self.redis = redis_client
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.last_failure_time = 0
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN

    def execute(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""

        if self.state == 'OPEN':
            if time.time() - self.last_failure_time > self.reset_timeout:
                self.state = 'HALF_OPEN'
            else:
                raise Exception("Circuit breaker is OPEN")

        try:
            result = func(*args, **kwargs)

            if self.state == 'HALF_OPEN':
                self.state = 'CLOSED'
                self.failures = 0

            return result

        except redis.ResponseError as e:
            if 'BUSY' in str(e):
                self._record_failure()
                raise
            raise

    def _record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()

        if self.failures >= self.failure_threshold:
            self.state = 'OPEN'
            print(f"Circuit breaker OPENED after {self.failures} failures")

# Usage
r = redis.Redis(host='localhost', port=6379)
breaker = RedisCircuitBreaker(r)

def safe_eval(script, keys, args):
    return breaker.execute(
        r.eval,
        script, len(keys), *keys, *args
    )
```

## Step 9: Emergency Procedures

### Handling Stuck Scripts in Production

```bash
#!/bin/bash
# emergency-script-kill.sh

REDIS_HOST=${1:-localhost}
REDIS_PORT=${2:-6379}

echo "Attempting to kill stuck script on $REDIS_HOST:$REDIS_PORT"

# Try SCRIPT KILL first
result=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT SCRIPT KILL 2>&1)

if echo "$result" | grep -q "UNKILLABLE"; then
    echo "WARNING: Script has performed writes, cannot kill safely"
    echo "Options:"
    echo "1. Wait for script to complete"
    echo "2. SHUTDOWN NOSAVE (WILL LOSE DATA)"
    read -p "Enter choice (1 or 2): " choice

    if [ "$choice" = "2" ]; then
        echo "Executing SHUTDOWN NOSAVE..."
        redis-cli -h $REDIS_HOST -p $REDIS_PORT SHUTDOWN NOSAVE
    fi
elif echo "$result" | grep -q "OK"; then
    echo "Script killed successfully"
else
    echo "No script running or other error: $result"
fi
```

### Pre-flight Script Validation

```python
import redis
import re

def validate_script(script):
    """Validate Lua script before deployment"""
    issues = []

    # Check for KEYS command (performance killer)
    if re.search(r"redis\.call\s*\(\s*['\"]KEYS['\"]", script, re.IGNORECASE):
        issues.append("ERROR: KEYS command found - use SCAN instead")

    # Check for unbounded loops
    if re.search(r"while\s+true", script, re.IGNORECASE):
        issues.append("ERROR: Unbounded while loop detected")

    # Check for missing key validation
    if "KEYS[1]" in script and "if not KEYS" not in script and "#keys" not in script:
        issues.append("WARNING: No key validation found")

    # Check for large iterations without limits
    if "for " in script and "MAX_" not in script.upper():
        issues.append("WARNING: Consider adding iteration limits")

    # Test syntax with Redis
    r = redis.Redis(host='localhost', port=6379)
    try:
        r.script_load(script)
    except redis.ResponseError as e:
        issues.append(f"SYNTAX ERROR: {e}")

    return issues

# Usage
script = """
local keys = redis.call('KEYS', 'user:*')
for i, key in ipairs(keys) do
    redis.call('DEL', key)
end
return #keys
"""

issues = validate_script(script)
for issue in issues:
    print(issue)
```

## Quick Reference: BUSY Error Resolution

| Situation | Action |
|-----------|--------|
| Script just started | Wait for completion |
| Script running > 30s, read-only | `SCRIPT KILL` |
| Script with writes, must stop | `SHUTDOWN NOSAVE` (data loss!) |
| Frequent BUSY errors | Optimize scripts, increase lua-time-limit |
| Production incident | Kill script, then investigate |

## Prevention Checklist

1. Keep scripts under 100ms execution time
2. Never use KEYS in production scripts
3. Limit iterations with MAX_ITERATIONS
4. Add early return conditions
5. Test scripts with production-sized data
6. Monitor script execution times
7. Use Functions (Redis 7.0+) for better management
8. Implement circuit breakers in application code

## Conclusion

Redis BUSY errors from Lua scripts are preventable with proper script design and monitoring. The key principles are:

1. **Keep scripts fast** - Aim for sub-100ms execution
2. **Limit scope** - Process only what you need
3. **Avoid KEYS** - Use SCAN or pass keys explicitly
4. **Monitor actively** - Alert on slow scripts before they become problems
5. **Have recovery procedures** - Know how to kill stuck scripts

Remember that Lua scripts block Redis completely - there is no parallelism. Design your scripts to be atomic but fast, and your Redis instance will remain responsive under all conditions.
