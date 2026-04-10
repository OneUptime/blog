# How to Troubleshoot Redis Slow Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Slow Query, Performance, Troubleshooting, SLOWLOG

Description: Find and fix Redis slow queries using SLOWLOG, LATENCY commands, and query profiling techniques to identify O(N) operations and blocking commands.

---

Redis executes commands in a single thread, so a single slow query blocks all other clients. Finding and fixing slow queries is critical for maintaining consistent low latency. This guide covers how to identify, analyze, and eliminate slow operations.

## Configure the Slow Log

```bash
# Set threshold in microseconds (default: 10000 = 10ms)
# Commands slower than this are logged
redis-cli CONFIG SET slowlog-log-slower-than 1000  # 1ms

# Set how many entries to keep (circular buffer)
redis-cli CONFIG SET slowlog-max-len 500

# Check current settings
redis-cli CONFIG GET slowlog-log-slower-than
redis-cli CONFIG GET slowlog-max-len
```

## Read the Slow Log

```bash
# Get last 20 entries
redis-cli SLOWLOG GET 20

# Output fields per entry:
# 1) Unique ID
# 2) Unix timestamp when command started
# 3) Execution time in microseconds
# 4) Command and arguments
# 5) Client IP:port
# 6) Client name

# Example output:
# 1) 1) (integer) 42
#    2) (integer) 1711900000
#    3) (integer) 45231        <- 45ms
#    4) 1) "KEYS"
#       2) "*"
#    5) "127.0.0.1:52341"
#    6) "app-worker"

# Count total slow log entries
redis-cli SLOWLOG LEN

# Clear the slow log
redis-cli SLOWLOG RESET
```

## Most Common Slow Commands

### 1. KEYS with Wildcard - O(N)

```bash
# BAD - scans entire keyspace, blocks the server
redis-cli KEYS "user:*"

# GOOD - use SCAN with cursor (non-blocking)
redis-cli SCAN 0 MATCH "user:*" COUNT 100
# Keep iterating until cursor returns 0
```

### 2. SMEMBERS on Large Sets - O(N)

```bash
# BAD - returns all members of a large set
redis-cli SMEMBERS large-set

# GOOD - use SSCAN to iterate
redis-cli SSCAN large-set 0 COUNT 100
```

### 3. LRANGE Fetching Too Many Elements

```bash
# BAD - fetching 1M items
redis-cli LRANGE my-list 0 -1

# GOOD - fetch in chunks
START=0
CHUNK=500
while true; do
  END=$((START + CHUNK - 1))
  ITEMS=$(redis-cli LRANGE my-list $START $END)
  [ -z "$ITEMS" ] && break
  echo "$ITEMS"
  START=$((START + CHUNK))
done
```

### 4. HGETALL on Large Hashes

```bash
# BAD - returns all fields of a hash with thousands of fields
redis-cli HGETALL large-hash

# GOOD - use HSCAN or fetch specific fields
redis-cli HMGET large-hash field1 field2 field3
redis-cli HSCAN large-hash 0 COUNT 100
```

### 5. SORT without Limits

```bash
# BAD - sorts an entire large set
redis-cli SORT large-set

# GOOD - add LIMIT and use pre-sorted sorted sets instead
redis-cli SORT large-set LIMIT 0 100
# Better: use ZSET with scores for sorted data
```

## Continuous Monitoring

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def monitor_slow_log(interval=60, threshold_ms=5):
    seen_ids = set()

    while True:
        entries = r.slowlog_get(100)

        for entry in entries:
            entry_id = entry["id"]
            if entry_id in seen_ids:
                continue

            seen_ids.add(entry_id)
            duration_ms = entry["duration"] / 1000

            if duration_ms >= threshold_ms:
                cmd = " ".join(str(a) for a in entry["command"][:5])
                print(f"SLOW ({duration_ms:.1f}ms): {cmd}")

        time.sleep(interval)

monitor_slow_log()
```

## Latency Analysis

```bash
# Enable latency monitoring first (disabled by default, threshold in ms)
redis-cli CONFIG SET latency-monitor-threshold 100

# Redis built-in latency monitoring
redis-cli LATENCY LATEST
# Shows max latency for different event types:
# command - slow commands
# fast-command - fast commands that still spiked
# fork - RDB/AOF fork latency

redis-cli LATENCY HISTORY command
redis-cli LATENCY GRAPH command  # ASCII graph in terminal
```

## Use CLIENT LIST to Find Blocked Clients

```bash
# Show all connected clients and what they are doing
redis-cli CLIENT LIST

# Filter for blocked clients
redis-cli CLIENT LIST | grep "flags=b"  # b = blocked

# Find long-running commands
redis-cli CLIENT LIST | awk -F'[ =]' '{
  for(i=1;i<=NF;i++) {
    if($i=="age") age=$(i+1);
    if($i=="cmd") cmd=$(i+1);
  }
  if(age > 5) print age"s", cmd
}'
```

## Prevent Slow Queries in Application Code

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Use pipeline to batch multiple small commands instead of many round trips
def batch_get_users(user_ids):
    pipe = r.pipeline(transaction=False)
    for uid in user_ids:
        pipe.hgetall(f"user:{uid}")
    return pipe.execute()

# Use SCAN instead of KEYS
def find_expired_sessions():
    for key in r.scan_iter("session:*", count=500):
        ttl = r.ttl(key)
        if ttl == -1:  # no expiry
            r.expire(key, 3600)

# Limit result sizes
def get_recent_events(stream_key, count=100):
    return r.xrevrange(stream_key, count=count)
```

## Summary

Slow Redis queries are identified using `SLOWLOG GET` and `LATENCY LATEST`. The most common culprits are `KEYS` (replace with `SCAN`), `SMEMBERS`/`HGETALL` on large structures (replace with `SSCAN`/`HSCAN`), and unbounded `LRANGE` or `SORT` operations. Set `slowlog-log-slower-than` to 1ms in production to catch issues early.
