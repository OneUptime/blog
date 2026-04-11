# How to Debug Redis in Production Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, Production

Description: Learn safe techniques for debugging Redis in production including MONITOR usage limits, slowlog analysis, keyspace notifications, and non-blocking diagnostic commands.

---

Debugging Redis in production requires care - some diagnostic commands can cause significant performance degradation or even outages if misused. This guide covers safe techniques that give you visibility without risking your production environment.

## Safe Diagnostic Commands

Always start with read-only, low-impact commands:

```bash
# Server info (no performance impact)
redis-cli INFO all

# Check connected clients
redis-cli CLIENT LIST

# Check slow queries
redis-cli SLOWLOG GET 25
redis-cli SLOWLOG LEN

# Memory analysis
redis-cli MEMORY DOCTOR
redis-cli INFO memory

# Check replication
redis-cli INFO replication
```

## Using MONITOR Safely

`MONITOR` streams every command - it can cut throughput by 50% on busy servers:

```bash
# ONLY run for 5-10 seconds max on production
timeout 10 redis-cli MONITOR | head -200

# Filter for specific patterns
timeout 5 redis-cli MONITOR | grep "\"SET\"\|\"GET\"" | head -100

# Capture to file then analyze offline
timeout 5 redis-cli MONITOR > /tmp/redis-monitor.log 2>&1
wc -l /tmp/redis-monitor.log  # ops/5sec = ops rate
```

Never run MONITOR for extended periods on a busy production server.

## Slowlog Analysis

Slowlog captures commands exceeding a threshold without impacting performance:

```bash
# Set threshold (in microseconds) - 10000 = 10ms
redis-cli CONFIG SET slowlog-log-slower-than 10000
redis-cli CONFIG SET slowlog-max-len 256

# Read slowlog
redis-cli SLOWLOG GET 50

# Summarize slowlog entries
redis-cli SLOWLOG GET 100 | grep "^[0-9]" -A 4 | grep -E "^--|^\s+[0-9]" | head -40
```

## Keyspace Notifications for Debugging

Enable notifications to trace specific operations:

```bash
# Enable key event notifications (K=keyspace, x=expired, g=generic)
redis-cli CONFIG SET notify-keyspace-events "Kxg"

# Subscribe and watch
redis-cli PSUBSCRIBE "__keyevent@0__:*"

# Reset when done (notifications add CPU overhead)
redis-cli CONFIG SET notify-keyspace-events ""
```

## Analyzing Key Distribution

```bash
# Scan keyspace without blocking (use -i for sleep between iterations)
redis-cli --scan --count 100 -i 0.01 | head -1000 > /tmp/keys.txt

# Analyze patterns
awk -F: '{print $1}' /tmp/keys.txt | sort | uniq -c | sort -rn | head -20

# Check specific key TTLs
redis-cli TTL "session:user:1234"
redis-cli OBJECT ENCODING "session:user:1234"
redis-cli OBJECT IDLETIME "session:user:1234"
```

## Latency Analysis

```bash
# Real-time latency monitoring (non-blocking)
redis-cli --latency -h 127.0.0.1 -p 6379

# Latency histogram (run briefly)
redis-cli --latency-history -h 127.0.0.1

# Intrinsic latency (OS-level, not Redis)
redis-cli --intrinsic-latency 10  # 10 second test
```

## Commands to Avoid in Production

```bash
# NEVER run these without extreme caution:
KEYS *          # Blocks server, scans all keys - use SCAN instead
FLUSHALL        # Deletes everything
DEBUG SLEEP     # Intentionally delays responses
DEBUG RELOAD    # Reloads RDB, blocks server
OBJECT FREQ     # Only works with LFU eviction policy
```

Safe alternative to KEYS:

```bash
# Use SCAN instead of KEYS *
redis-cli SCAN 0 MATCH "user:*" COUNT 100
# Returns cursor + batch of results, non-blocking
```

## Summary

Safe Redis production debugging relies on INFO commands, SLOWLOG analysis, brief MONITOR captures, and SCAN for key discovery. Configure keyspace notifications temporarily for tracing specific operations. Avoid KEYS, FLUSHALL, and extended MONITOR use on busy servers. Always prefer non-blocking alternatives that give visibility without impacting client latency.
