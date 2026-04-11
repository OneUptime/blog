# How to Debug Redis with LATENCY Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, Latency, Performance, Troubleshooting

Description: Use Redis LATENCY commands to detect and diagnose latency spikes caused by slow commands, fork operations, AOF syncs, and system-level events.

---

Redis is designed for sub-millisecond response times. When latency spikes occur, they degrade user experience and can cascade through dependent services. The `LATENCY` command family records and analyzes these spikes, helping you identify their root cause quickly.

## Enabling Latency Monitoring

```bash
# Enable latency monitoring with a 10ms threshold
redis-cli CONFIG SET latency-monitor-threshold 10
```

All events that take longer than the threshold are recorded in the latency history.

## LATENCY LATEST

Shows the most recent latency spike for each event type:

```bash
redis-cli LATENCY LATEST
```

Output:

```text
1) 1) "command"
   2) (integer) 1743427200
   3) (integer) 45
   4) (integer) 87

2) 1) "aof-fsync-always"
   2) (integer) 1743427150
   3) (integer) 12
   4) (integer) 24
```

Fields per row: `event_name, timestamp, latest_latency_ms, max_latency_ms`

Common event types:
- `command` - slow command execution
- `fork` - BGSAVE/BGREWRITEAOF fork latency
- `aof-fsync-always` - AOF fsync when appendfsync is set to always
- `aof-rewrite-diff-write` - AOF rewrite buffer write
- `rdb-unlink-temp-file` - temp RDB file cleanup

## LATENCY HISTORY

Shows the latency spike history for a specific event:

```bash
redis-cli LATENCY HISTORY command
```

Output:

```text
1) 1) (integer) 1743427100
   2) (integer) 23

2) 1) (integer) 1743427150
   2) (integer) 45

3) 1) (integer) 1743427200
   2) (integer) 87
```

Convert timestamps to human-readable:

```bash
redis-cli LATENCY HISTORY command | awk 'NR%2==1{t=$2} NR%2==0{print strftime("%H:%M:%S", t), $2 "ms"}'
```

## LATENCY GRAPH

Displays an ASCII graph of latency over time:

```bash
redis-cli LATENCY GRAPH command
```

Output:

```text
11ms ___#___
 9ms _#_____
 7ms #______
     ^^^^^^^
     |6 events
```

## LATENCY RESET

Clear all recorded latency events:

```bash
redis-cli LATENCY RESET
redis-cli LATENCY RESET command   # Reset only the command event
```

## Diagnosing Fork Latency

BGSAVE and BGREWRITEAOF use `fork()` which can cause latency spikes on large datasets:

```bash
redis-cli LATENCY LATEST | grep fork
redis-cli LATENCY HISTORY fork
```

Reduce fork latency by:

```bash
# Disable transparent huge pages (recommended for Redis)
echo never > /sys/kernel/mm/transparent_hugepage/enabled

# Enable background saving at lower frequency
redis-cli CONFIG SET save "3600 1 300 100"
```

## Diagnosing AOF Sync Latency

If `aof-fsync-always` spikes appear frequently:

```bash
redis-cli LATENCY HISTORY aof-fsync-always
redis-cli CONFIG GET appendfsync
```

Change `appendfsync` from `always` to `everysec` to reduce disk pressure:

```bash
redis-cli CONFIG SET appendfsync everysec
```

## Latency Monitoring in Python

```python
import redis
import time

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

def check_latency():
    latest = client.latency_latest()
    for event in latest:
        name, ts, latest_ms, max_ms = event
        print(f"Event: {name}")
        print(f"  Latest: {latest_ms}ms, Max: {max_ms}ms")
        if max_ms > 100:
            print(f"  WARNING: {name} has spiked to {max_ms}ms")

def measure_command_latency(iterations=100):
    latencies = []
    for _ in range(iterations):
        start = time.time()
        client.ping()
        latencies.append((time.time() - start) * 1000)

    latencies.sort()
    print(f"PING latency p50={latencies[49]:.2f}ms p99={latencies[98]:.2f}ms")

check_latency()
measure_command_latency()
```

## Summary

Redis LATENCY commands provide built-in spike detection and history without external tooling. Configure a latency threshold with `latency-monitor-threshold`, then use `LATENCY LATEST` for a quick overview and `LATENCY HISTORY` for trend analysis. Fork and AOF sync events are the most common non-command latency sources - address them with transparent huge page settings and adjusting `appendfsync`.
