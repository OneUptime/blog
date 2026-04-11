# How to Debug Redis with SLOWLOG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, SLOWLOG, Performance, Debugging, Latency, Monitoring

Description: Use Redis SLOWLOG to identify and fix slow commands that degrade application performance, with configuration tips and analysis techniques.

---

## What Is Redis SLOWLOG?

Redis SLOWLOG records commands that take longer than a configurable threshold to execute. Unlike a typical slow query log, it measures the time spent processing the command in the Redis server (not including network round-trip time). This makes it precise for identifying CPU-intensive operations like large KEYS scans, complex Lua scripts, or big set operations.

## Configuring SLOWLOG

```bash
# Set threshold in microseconds (1000 = 1ms)
redis-cli CONFIG SET slowlog-log-slower-than 1000

# Set maximum number of entries to keep
redis-cli CONFIG SET slowlog-max-len 256

# Or in redis.conf
# slowlog-log-slower-than 1000
# slowlog-max-len 256
```

To log ALL commands (useful in development):

```bash
redis-cli CONFIG SET slowlog-log-slower-than 0
```

To disable SLOWLOG:

```bash
redis-cli CONFIG SET slowlog-log-slower-than -1
```

## Reading SLOWLOG

```bash
# Get recent slow commands
redis-cli SLOWLOG GET 25

# Get all slow commands
redis-cli SLOWLOG GET

# Check how many entries are in the log
redis-cli SLOWLOG LEN

# Clear the slowlog
redis-cli SLOWLOG RESET
```

Sample output:

```text
1) 1) (integer) 42                    # entry ID
   2) (integer) 1706000000            # Unix timestamp when command ran
   3) (integer) 25341                 # execution time in microseconds (25ms)
   4) 1) "KEYS"                       # command and arguments
      2) "*"
   5) "127.0.0.1:54321"               # client address
   6) ""                              # client name
```

## Analyzing SLOWLOG Programmatically

```python
import redis
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def analyze_slowlog(threshold_ms=10):
    entries = r.slowlog_get(100)
    slow_commands = []

    for entry in entries:
        duration_ms = entry['duration'] / 1000  # microseconds to ms
        command = ' '.join(entry['command'])

        slow_commands.append({
            'id': entry['id'],
            'timestamp': datetime.fromtimestamp(entry['start_time']).isoformat(),
            'duration_ms': round(duration_ms, 2),
            'command': command[:200],
            'client': entry.get('client_address', 'unknown'),
        })

    # Sort by slowest first
    slow_commands.sort(key=lambda x: x['duration_ms'], reverse=True)

    print(f"Top slow commands (>{threshold_ms}ms):")
    for cmd in slow_commands:
        if cmd['duration_ms'] >= threshold_ms:
            print(f"  [{cmd['duration_ms']}ms] {cmd['command'][:80]} @ {cmd['timestamp']}")

    return slow_commands

analyze_slowlog(threshold_ms=5)
```

## Common Slow Commands and Fixes

### Problem: KEYS * scans the entire keyspace

```bash
# SLOWLOG shows:
# KEYS * - took 500ms on 1M keys

# Fix: use SCAN for non-blocking iteration
redis-cli SCAN 0 MATCH "user:*" COUNT 100

# In Python
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match='user:*', count=100)
    for key in keys:
        process(key)
    if cursor == 0:
        break
```

### Problem: SMEMBERS on large sets

```bash
# SLOWLOG shows:
# SMEMBERS large_set - took 200ms (set has 500K members)

# Fix: use SSCAN for incremental iteration
cursor = 0
while True:
    cursor, members = r.sscan('large_set', cursor, count=1000)
    for m in members:
        process(m)
    if cursor == 0:
        break
```

### Problem: SORT on large lists

```bash
# SLOWLOG shows:
# SORT mylist BY weight_* - took 1200ms

# Fix: pre-sort with Sorted Sets, or limit SORT results
redis-cli SORT mylist LIMIT 0 100 ASC
```

### Problem: Large Lua script

```bash
# SLOWLOG shows:
# EVAL ... - took 800ms

# Fix: break into smaller scripts or pipeline multiple commands
# Also use EVALSHA to avoid sending script on every call
redis-cli SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# Returns SHA, then use EVALSHA <sha> 1 mykey
```

## Continuous SLOWLOG Monitoring

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379)

def continuous_slowlog_monitor(poll_interval=60, threshold_ms=50):
    last_id = -1
    print(f"Monitoring SLOWLOG (threshold: {threshold_ms}ms, poll: {poll_interval}s)")

    while True:
        entries = r.slowlog_get(50)

        for entry in entries:
            if entry['id'] <= last_id:
                continue
            last_id = max(last_id, entry['id'])
            duration_ms = entry['duration'] / 1000

            if duration_ms >= threshold_ms:
                cmd = ' '.join(c.decode() if isinstance(c, bytes) else c
                               for c in entry['command'])
                print(f"SLOW [{duration_ms:.1f}ms] {cmd[:100]}")

        time.sleep(poll_interval)

continuous_slowlog_monitor()
```

## Summary

Redis SLOWLOG is your first tool for diagnosing performance problems. Set the threshold to 1ms in production to capture all meaningful slow commands, and analyze the log regularly to find patterns. The most common culprits are KEYS scans (replace with SCAN), large SMEMBERS calls (replace with SSCAN), and expensive Lua scripts. Monitor SLOWLOG continuously in production to catch new performance regressions before users notice.
