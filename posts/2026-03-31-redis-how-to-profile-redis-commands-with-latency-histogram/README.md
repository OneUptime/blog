# How to Profile Redis Commands with LATENCY HISTOGRAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Latency, Profiling, Monitoring

Description: Learn how to use the Redis LATENCY HISTOGRAM command to profile command execution times and understand latency distribution across all Redis operations.

---

## What Is LATENCY HISTOGRAM

Introduced in Redis 7.0, `LATENCY HISTOGRAM` provides a high-resolution latency distribution (HDR histogram) for individual Redis commands. Unlike SLOWLOG (which only captures outliers), LATENCY HISTOGRAM tracks every command execution and reports percentile distributions - p50, p90, p99, p99.9 - giving you a complete picture of latency behavior.

This is especially useful for identifying commands with high tail latency even when the average looks acceptable.

## Enabling Latency Tracking

Latency tracking is enabled by default in Redis 7.0+. You can verify or change the setting at runtime:
```bash
# Verify latency tracking is enabled (it is by default)
redis-cli CONFIG GET latency-tracking

# Enable it if it was previously disabled
redis-cli CONFIG SET latency-tracking yes

# Set the percentiles reported in INFO commandstats
redis-cli CONFIG SET latency-tracking-info-percentiles "50 99 99.9"
```

Or in `redis.conf`:
```text
latency-tracking yes
latency-tracking-info-percentiles 50 90 99 99.9
```

## Reading LATENCY HISTOGRAM

Get histograms for specific commands:
```bash
redis-cli LATENCY HISTOGRAM GET SET HSET
```

Get histograms for all commands that have data:
```bash
redis-cli LATENCY HISTOGRAM
```

Sample output:
```text
1) "set"
2) 1) "calls"
   2) (integer) 158432
   3) "histogram_usec"
   4)  1) (integer) 32
       2) (integer) 99456
       3) (integer) 64
       4) (integer) 145678
       5) (integer) 128
       6) (integer) 158000
       7) (integer) 256
       8) (integer) 158200
       9) (integer) 512
      10) (integer) 158400
      11) (integer) 1024
      12) (integer) 158432
```

The histogram returns pairs of `(upper_bound_usec, cumulative_count)`. To compute percentiles, you iterate and find the bucket where the cumulative count crosses the desired percentage of total calls.

## Interpreting the Output

The histogram is in HdrHistogram format (High Dynamic Range). Each bucket represents latencies up to its upper bound. For example:
- `(32, 99456)` means 99,456 calls completed in under 32 microseconds
- `(64, 145678)` means 145,678 calls completed in under 64 microseconds

To find p99: 99% of 158,432 = 156,847. Find the first bucket where cumulative count >= 156,847.

## Python Script to Parse and Print Percentiles

```python
import redis

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

def get_latency_percentiles(command_name):
    raw = r.execute_command('LATENCY HISTOGRAM', command_name)
    if not raw or len(raw) < 2:
        print(f"No data for command: {command_name}")
        return

    # Parse histogram pairs
    hist_data = raw[1]
    calls = None
    histogram = []

    i = 0
    while i < len(hist_data):
        key = hist_data[i]
        val = hist_data[i + 1]
        if key == 'calls':
            calls = int(val)
        elif key == 'histogram_usec':
            # val is a flat list of [upper_bound, cumulative_count, ...]
            pairs = val
            for j in range(0, len(pairs), 2):
                histogram.append((int(pairs[j]), int(pairs[j + 1])))
        i += 2

    if not calls or not histogram:
        return

    print(f"\nLatency histogram for: {command_name.upper()}")
    print(f"Total calls: {calls:,}")

    for pct in [50, 90, 99, 99.9]:
        target = calls * pct / 100
        for upper_us, cumulative in histogram:
            if cumulative >= target:
                print(f"  p{pct}: <= {upper_us} us ({upper_us/1000:.3f} ms)")
                break

get_latency_percentiles('GET')
get_latency_percentiles('SET')
get_latency_percentiles('HSET')
```

## Comparing Commands

Use LATENCY HISTOGRAM to compare similar commands:
```bash
# Compare different write commands
redis-cli LATENCY HISTOGRAM SET HSET ZADD LPUSH

# Compare read commands
redis-cli LATENCY HISTOGRAM GET HGET ZRANK LRANGE
```

This helps you choose the right data structure by comparing their actual latency profiles under your workload.

## Resetting Histogram Data

Reset histograms for a fresh measurement window using `CONFIG RESETSTAT`:
```bash
# Reset all statistics including latency histograms
redis-cli CONFIG RESETSTAT
```

Note: `LATENCY RESET` only resets latency spike events (used by `LATENCY LATEST` and `LATENCY HISTORY`), not histogram data. To clear `LATENCY HISTOGRAM` data, use `CONFIG RESETSTAT`.

## Continuous Profiling Script

Collect histograms periodically for trend analysis:
```python
import redis
import json
import time
from datetime import datetime

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
COMMANDS = ['GET', 'SET', 'HGET', 'HSET', 'ZADD', 'ZRANK', 'LPUSH', 'LPOP']

def collect_snapshot():
    snapshot = {'timestamp': datetime.utcnow().isoformat(), 'commands': {}}
    raw = r.execute_command('LATENCY HISTOGRAM', *COMMANDS)

    # Parse pairs from flat list
    for i in range(0, len(raw), 2):
        cmd = raw[i]
        data = raw[i + 1]
        calls = 0
        histogram = []

        for j in range(0, len(data), 2):
            if data[j] == 'calls':
                calls = int(data[j + 1])
            elif data[j] == 'histogram_usec':
                pairs = data[j + 1]
                for k in range(0, len(pairs), 2):
                    histogram.append((int(pairs[k]), int(pairs[k + 1])))

        if calls > 0 and histogram:
            snapshot['commands'][cmd] = {
                'calls': calls,
                'p99_us': next(
                    (ub for ub, cum in histogram if cum >= calls * 0.99),
                    histogram[-1][0]
                )
            }

    return snapshot

# Collect every 30 seconds
while True:
    snap = collect_snapshot()
    with open('/var/log/redis/latency_snapshots.jsonl', 'a') as f:
        f.write(json.dumps(snap) + '\n')
    time.sleep(30)
```

## Key Differences vs SLOWLOG

| Feature | SLOWLOG | LATENCY HISTOGRAM |
|---------|---------|-------------------|
| What it captures | Individual slow entries | Aggregated distribution |
| Overhead | Negligible | Low |
| Redis version | All versions | Redis 7.0+ |
| Granularity | Per-command call | Per-command type |
| Use case | Find specific slow calls | Understand latency distribution |

## Summary

`LATENCY HISTOGRAM` gives you a statistical view of command latency that SLOWLOG cannot provide. Use it to understand p99 and p99.9 latency for each command type, compare data structures, and track latency trends over time. Pair it with the SLOWLOG for individual outlier investigation and you have a complete latency profiling toolkit.
