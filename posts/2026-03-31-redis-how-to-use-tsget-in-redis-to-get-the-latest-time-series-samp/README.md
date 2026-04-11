# How to Use TS.GET in Redis to Get the Latest Time Series Sample

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Latest Value, Monitoring

Description: Learn how to use TS.GET in Redis to retrieve the latest sample from a time series key, useful for dashboards and real-time monitoring.

---

## What Is TS.GET?

`TS.GET` returns the most recent sample (timestamp and value) from a RedisTimeSeries key. It is the simplest way to get the current state of a metric - the last data point that was ingested.

For reading the latest values from multiple time series simultaneously, use `TS.MGET`.

## Basic Syntax

```text
TS.GET key [LATEST]
```

Parameters:
- `key` - the time series key
- `LATEST` - (optional) when using compaction rules, also check the latest compacted bucket

Returns an array: `[timestamp, value]`. Returns an empty array if the key has no samples.

## Basic Usage

```bash
# Add some samples
TS.ADD temperature:sensor1 * 22.5
TS.ADD temperature:sensor1 * 23.1
TS.ADD temperature:sensor1 * 21.8

# Get the latest sample
TS.GET temperature:sensor1
# Returns:
# 1) (integer) 1700000002000   (timestamp of last sample)
# 2) "21.8"                    (value)
```

## Empty Time Series

```bash
TS.CREATE new:series
TS.GET new:series
# Returns: (empty array)
```

Check for empty response in code:

```python
result = r.ts().get('new:series')
if result:
    timestamp, value = result
    print(f"Latest: {value} at {timestamp}")
else:
    print("No data yet")
```

## Using LATEST with Compaction Rules

When a time series has compaction rules (downsampling), the last bucket may not be finalized yet. `LATEST` forces inclusion of the current (possibly partial) bucket:

```bash
# Raw time series feeds into a compacted minute-level series
TS.CREATE raw:temp
TS.CREATE compressed:temp:1min
TS.CREATERULE raw:temp compressed:temp:1min AGGREGATION AVG 60000

# Without LATEST - returns last fully closed bucket
TS.GET compressed:temp:1min

# With LATEST - includes the currently open bucket
TS.GET compressed:temp:1min LATEST
```

## Python Example

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Add samples
ts.add('cpu:host1', '*', 72.5)
ts.add('cpu:host1', '*', 78.3)
ts.add('cpu:host1', '*', 81.1)

# Get latest
result = ts.get('cpu:host1')
if result:
    timestamp, value = result
    # Convert ms timestamp to datetime
    import datetime
    dt = datetime.datetime.fromtimestamp(timestamp / 1000)
    print(f"CPU at {dt}: {value}%")
```

## Real-Time Dashboard: Latest Values for Multiple Keys

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def get_current_metrics(host):
    """Get the latest value for each metric of a host."""
    metrics = {
        'cpu': f'cpu:{host}',
        'memory': f'memory:{host}',
        'disk': f'disk:{host}',
    }

    current = {}
    for metric_name, key in metrics.items():
        result = ts.get(key)
        if result:
            timestamp, value = result
            current[metric_name] = float(value)
        else:
            current[metric_name] = None

    return current

metrics = get_current_metrics('host1')
print(f"Current state of host1: {metrics}")
```

## Checking If a Metric Is Stale

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def is_stale(key, max_age_seconds=60):
    """Check if the latest sample is older than max_age_seconds."""
    result = ts.get(key)
    if not result:
        return True  # No data = stale

    timestamp_ms, value = result
    age_seconds = (time.time() * 1000 - timestamp_ms) / 1000
    return age_seconds > max_age_seconds

if is_stale('cpu:host1', max_age_seconds=30):
    print("WARNING: cpu:host1 has not been updated in over 30 seconds")
else:
    print("cpu:host1 is fresh")
```

## TS.GET vs TS.RANGE for Latest Value

| Approach | Command | Use Case |
|---|---|---|
| Single latest sample | `TS.GET key` | Dashboards, alerts |
| Latest N samples | `TS.REVRANGE key - + COUNT N` | Sparklines, recent history |
| Latest across many keys | `TS.MGET FILTER label=value` | Multi-host dashboards |

## Summary

`TS.GET` is the most efficient command for reading the current (latest) value from a RedisTimeSeries key. It is ideal for dashboards, alerting systems, and health checks that need to know the most recent state of a metric. For compacted time series, use the `LATEST` option to include the currently open bucket. When you need the latest value from multiple time series simultaneously, prefer `TS.MGET` with label filters for a single-round-trip operation.
