# How to Fix 'BUSY Redis is busy' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Troubleshooting, Database, Performance, DevOps

Description: Learn how to diagnose and fix the 'BUSY Redis is busy running a script' error, understand what causes it, and implement preventive measures to keep your Redis server responsive.

---

If you have worked with Redis long enough, you have probably encountered the dreaded "BUSY Redis is busy running a script" error. This error stops your application in its tracks and can cause cascading failures across your entire system. Let us break down what causes this error and how to fix it.

## Understanding the Error

The "BUSY Redis is busy" error occurs when Redis is executing a Lua script that takes longer than the configured timeout. Redis is single-threaded for command execution, which means while a script is running, nothing else can happen. Every other client has to wait.

```
BUSY Redis is busy running a script. You can only call SCRIPT KILL or SHUTDOWN NOSAVE.
```

This error appears because Redis has a built-in protection mechanism. When a script runs longer than the `lua-time-limit` configuration (default: 5000 milliseconds), Redis starts rejecting new commands with this error.

## Root Causes

Several situations can trigger this error:

### 1. Long-Running Lua Scripts

The most common cause is a Lua script that processes too much data or contains inefficient logic.

```lua
-- Bad: Processing millions of keys in one script
local keys = redis.call('KEYS', 'user:*')
for i, key in ipairs(keys) do
    redis.call('GET', key)
    -- More processing...
end
```

### 2. Large Data Operations

Scripts that manipulate large datasets without pagination will block Redis.

```lua
-- Bad: Loading entire sorted set into memory
local all_members = redis.call('ZRANGE', 'leaderboard', 0, -1, 'WITHSCORES')
```

### 3. Infinite Loops

A bug in your script logic can cause an infinite loop.

```lua
-- Bad: Condition never becomes false
local count = 0
while true do
    count = count + 1
    if count > some_uninitialized_variable then
        break
    end
end
```

## Immediate Fixes

When you encounter this error in production, you have two options:

### Option 1: Kill the Script

If the script has no write operations or you can safely abort it:

```bash
# Connect to Redis and kill the running script
redis-cli SCRIPT KILL
```

This command terminates the currently running Lua script. However, it only works if the script has not performed any write operations yet.

### Option 2: Force Shutdown (Last Resort)

If the script has already written data and SCRIPT KILL fails:

```bash
# Warning: This loses all unsaved data
redis-cli SHUTDOWN NOSAVE
```

Only use this as a last resort because it will lose any data not yet persisted to disk.

## Long-Term Solutions

### 1. Optimize Your Scripts

Break large operations into smaller batches:

```lua
-- Good: Process in batches with SCAN
local cursor = ARGV[1] or "0"
local batch_size = 100
local result = redis.call('SCAN', cursor, 'MATCH', 'user:*', 'COUNT', batch_size)
local next_cursor = result[1]
local keys = result[2]

for i, key in ipairs(keys) do
    redis.call('GET', key)
end

return next_cursor
```

Then call this script repeatedly from your application:

```python
# Python example: Paginated script execution
import redis

r = redis.Redis()

# Load the script
script = r.register_script("""
local cursor = ARGV[1] or "0"
local batch_size = 100
local result = redis.call('SCAN', cursor, 'MATCH', 'user:*', 'COUNT', batch_size)
return result[1]
""")

cursor = "0"
while True:
    cursor = script(args=[cursor])
    if cursor == b"0":
        break
```

### 2. Increase the Timeout (Temporary Measure)

If you need more time for legitimate operations:

```bash
# In redis.conf or via CONFIG SET
CONFIG SET lua-time-limit 10000
```

This increases the timeout to 10 seconds. However, this is just masking the problem, not solving it.

### 3. Use EVALSHA Instead of EVAL

Pre-load scripts to reduce parsing overhead:

```python
import redis
import hashlib

r = redis.Redis()

# Define your script
script_content = """
local key = KEYS[1]
local value = ARGV[1]
return redis.call('SET', key, value)
"""

# Load the script once
sha = r.script_load(script_content)

# Execute using SHA (faster than EVAL)
result = r.evalsha(sha, 1, 'mykey', 'myvalue')
```

### 4. Implement Script Timeouts in Application Code

Add timeout handling in your application:

```python
import redis
from redis.exceptions import BusyLoadingError

r = redis.Redis(socket_timeout=10)

def safe_script_execute(script, keys, args, max_retries=3):
    """Execute a script with retry logic for BUSY errors."""
    for attempt in range(max_retries):
        try:
            return script(keys=keys, args=args)
        except redis.exceptions.ResponseError as e:
            if "BUSY" in str(e):
                print(f"Redis busy, attempt {attempt + 1}/{max_retries}")
                # Try to kill the stuck script
                try:
                    r.script_kill()
                except:
                    pass
                time.sleep(1)
            else:
                raise
    raise Exception("Redis remained busy after max retries")
```

## Prevention Strategies

### Monitor Script Execution Time

Set up monitoring for slow scripts:

```bash
# Enable slow log for scripts
CONFIG SET slowlog-log-slower-than 1000
CONFIG SET slowlog-max-len 128

# Check slow log
SLOWLOG GET 10
```

### Use Read Replicas for Heavy Reads

Offload read-heavy scripts to replicas:

```python
import redis

# Write to primary
primary = redis.Redis(host='redis-primary', port=6379)

# Read from replica
replica = redis.Redis(host='redis-replica', port=6379)

# Heavy read operations go to replica
def get_analytics_data():
    return replica.evalsha(analytics_script_sha, 0)
```

### Implement Circuit Breakers

Prevent cascading failures when Redis is busy:

```python
from functools import wraps
import time

class CircuitBreaker:
    def __init__(self, failure_threshold=5, reset_timeout=30):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.last_failure_time = None
        self.state = "closed"

    def call(self, func, *args, **kwargs):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.reset_timeout:
                self.state = "half-open"
            else:
                raise Exception("Circuit breaker is open")

        try:
            result = func(*args, **kwargs)
            if self.state == "half-open":
                self.state = "closed"
                self.failure_count = 0
            return result
        except redis.exceptions.ResponseError as e:
            if "BUSY" in str(e):
                self.failure_count += 1
                self.last_failure_time = time.time()
                if self.failure_count >= self.failure_threshold:
                    self.state = "open"
            raise

# Usage
breaker = CircuitBreaker()
result = breaker.call(r.evalsha, script_sha, 1, 'key', 'value')
```

## Debugging Scripts

When you need to find which script is causing problems:

```bash
# List all cached scripts
redis-cli DEBUG SLEEP 0

# Get info about currently running script
redis-cli INFO

# Check the clients section for blocked clients
redis-cli CLIENT LIST
```

## Architecture Considerations

If you frequently hit BUSY errors, consider these architectural changes:

1. **Move heavy processing out of Redis** - Use Redis for what it does best: fast key-value operations. Move complex logic to your application server.

2. **Use Redis Cluster** - Distribute load across multiple shards so one busy shard does not affect the entire system.

3. **Implement job queues** - For batch operations, use a job queue (like Redis Streams or a dedicated message broker) instead of running everything synchronously.

---

The "BUSY Redis is busy" error is a sign that something in your system needs optimization. Use it as an opportunity to review your Lua scripts, implement proper error handling, and consider whether your current architecture is appropriate for your workload. With the right approach, you can keep Redis responsive and your application running smoothly.
