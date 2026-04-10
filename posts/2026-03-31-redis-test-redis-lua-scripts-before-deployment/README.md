# How to Test Redis Lua Scripts Before Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Testing, Deployment

Description: Learn strategies to test Redis Lua scripts locally before production deployment using redis-cli, unit testing, and integration test environments.

---

Deploying untested Lua scripts to Redis can cause production outages because scripts execute atomically and cannot be partially rolled back. A structured testing approach catches errors before they reach production.

## Step 1 - Test with redis-cli Directly

The fastest way to test a script is to run it directly against a local Redis instance:

```bash
# Start a local Redis for testing
docker run -d -p 6379:6379 redis:latest

# Test a simple script inline
redis-cli EVAL "
  local val = redis.call('INCR', KEYS[1])
  if val > tonumber(ARGV[1]) then
    redis.call('SET', KEYS[1], 0)
    return 0
  end
  return val
" 1 counter 10
```

Run with boundary conditions:
- Empty keys / missing keys
- Zero values
- Maximum expected values
- Invalid argument types

## Step 2 - Test Script Files

Write scripts to files and test with a helper:

```bash
#!/bin/bash
# test_script.sh

SCRIPT_FILE=$1
KEYS_COUNT=$2
shift 2

echo "Testing $SCRIPT_FILE..."
redis-cli EVAL "$(cat $SCRIPT_FILE)" $KEYS_COUNT "$@"
```

```bash
chmod +x test_script.sh
./test_script.sh my_script.lua 1 test-key "arg1" "arg2"
```

## Step 3 - Unit Test with Python

Install `fakeredis` with Lua support (requires the `lupa` library):

```bash
pip install fakeredis[lua]
```

Then test Lua scripts without a real Redis instance:

```python
import fakeredis
import pytest

server = fakeredis.FakeServer()
r = fakeredis.FakeRedis(server=server)

RATE_LIMIT_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end
if current > limit then
    return 0
end
return 1
"""

def test_rate_limit_allows_under_limit():
    r.delete("test:key")
    result = r.eval(RATE_LIMIT_SCRIPT, 1, "test:key", 5, 60)
    assert result == 1

def test_rate_limit_blocks_over_limit():
    r.delete("test:key")
    for _ in range(5):
        r.eval(RATE_LIMIT_SCRIPT, 1, "test:key", 5, 60)
    result = r.eval(RATE_LIMIT_SCRIPT, 1, "test:key", 5, 60)
    assert result == 0

def test_rate_limit_resets_after_window():
    r.delete("test:key")
    r.set("test:key", 5)
    r.expire("test:key", 1)
    import time
    time.sleep(1.1)
    result = r.eval(RATE_LIMIT_SCRIPT, 1, "test:key", 5, 60)
    assert result == 1
```

## Step 4 - Test Edge Cases

```python
def test_missing_key():
    r.delete("missing-key")
    result = r.eval("""
        local val = redis.call('GET', KEYS[1])
        return val or 'default'
    """, 1, "missing-key")
    assert result == b"default"

def test_invalid_argument_type():
    with pytest.raises(Exception):
        r.eval("""
            local n = tonumber(ARGV[1])
            if n == nil then
                return redis.error_reply('Invalid number')
            end
            return n
        """, 0, "not-a-number")
```

## Step 5 - Test Atomicity

Verify that concurrent access behaves correctly:

```python
import threading

def increment_counter():
    for _ in range(100):
        r.eval("""
            local n = tonumber(redis.call('GET', KEYS[1])) or 0
            redis.call('SET', KEYS[1], n + 1)
            return n + 1
        """, 1, "shared-counter")

r.set("shared-counter", 0)
threads = [threading.Thread(target=increment_counter) for _ in range(10)]
for t in threads: t.start()
for t in threads: t.join()

assert int(r.get("shared-counter")) == 1000  # 10 threads x 100 increments
```

## Step 6 - Load Test Before Production

```bash
# Use redis-benchmark with EVAL
redis-benchmark -n 10000 -c 50 EVAL "return redis.call('INCR', KEYS[1])" 1 bench-counter
```

## Summary

Test Redis Lua scripts by running them against a local Redis with `redis-cli` for immediate feedback, using `fakeredis` for unit tests without a live server, and verifying edge cases like missing keys, type errors, and concurrent access. Test atomicity with concurrent threads before deploying to production. Load test scripts with `redis-benchmark` to verify performance under realistic concurrency.
