# How to Use TS.RANGE in Redis to Query Time Series Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Range Query, Aggregation

Description: Learn how to use TS.RANGE in Redis to query time series data within a time window with optional aggregation, filtering, and result limiting.

---

## What Is TS.RANGE?

`TS.RANGE` retrieves samples from a time series key within a specified time range. It supports powerful options including aggregation (AVG, SUM, MAX, MIN, etc.), downsampling via time buckets, result limits, and value filtering. It is the primary command for reading historical time series data from a single key.

## Basic Syntax

```text
TS.RANGE key fromTimestamp toTimestamp
  [LATEST]
  [FILTER_BY_TS ts...]
  [FILTER_BY_VALUE min max]
  [COUNT count]
  [[ALIGN align] AGGREGATION aggregator bucketDuration [BUCKETTIMESTAMP bt] [EMPTY]]
```

Key parameters:
- `key` - the time series key
- `fromTimestamp` - start time in ms, or `-` for the earliest
- `toTimestamp` - end time in ms, or `+` for the latest

## Getting All Samples

```bash
# Get all samples in the time series
TS.RANGE cpu:host1 - +

# Returns:
# 1) 1) (integer) 1700000000000
#    2) "72.5"
# 2) 1) (integer) 1700000001000
#    2) "75.3"
# ...
```

## Querying a Specific Time Window

```bash
# Query last 5 minutes (timestamps in ms)
# Current time: 1700000300000
# 5 minutes ago: 1700000000000
TS.RANGE cpu:host1 1700000000000 1700000300000
```

Using Python to compute timestamps:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

now = int(time.time() * 1000)
five_minutes_ago = now - (5 * 60 * 1000)

samples = ts.range('cpu:host1', five_minutes_ago, now)
print(f"Samples in last 5 minutes: {len(samples)}")
for timestamp, value in samples:
    print(f"  {timestamp}: {value}")
```

## Aggregating Data

Use `AGGREGATION` to downsample samples into time buckets:

```bash
# Average CPU over 1-minute buckets for the last hour
TS.RANGE cpu:host1 - + AGGREGATION AVG 60000

# Returns one entry per 60-second bucket with the average value

# Maximum value per 5-minute bucket
TS.RANGE cpu:host1 - + AGGREGATION MAX 300000

# Count samples per minute
TS.RANGE cpu:host1 - + AGGREGATION COUNT 60000
```

Available aggregation functions:

| Function | Description |
|---|---|
| AVG | Average of values |
| SUM | Sum of values |
| MIN | Minimum value |
| MAX | Maximum value |
| COUNT | Number of samples |
| FIRST | First value in bucket |
| LAST | Last value in bucket |
| RANGE | max - min within bucket |
| STD.P | Population standard deviation |
| STD.S | Sample standard deviation |
| VAR.P | Population variance |
| VAR.S | Sample variance |
| TWA | Time-weighted average |

## Limiting Results

```bash
# Get the first 10 samples (TS.RANGE returns in ascending order)
TS.RANGE cpu:host1 - + COUNT 10

# Get first 100 samples
TS.RANGE cpu:host1 - + COUNT 100
```

## Filtering by Value

```bash
# Only return samples where CPU > 80%
TS.RANGE cpu:host1 - + FILTER_BY_VALUE 80 100

# Samples in normal range
TS.RANGE temperature - + FILTER_BY_VALUE 18.0 25.0
```

## Full Python Example

```python
import redis
import time
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Query last 1 hour with 5-minute average buckets
now = int(time.time() * 1000)
one_hour_ago = now - (60 * 60 * 1000)

samples = ts.range(
    'cpu:host1',
    one_hour_ago,
    now,
    aggregation_type='avg',
    bucket_size_msec=300000  # 5 minutes
)

print(f"5-minute CPU averages over the last hour:")
for timestamp, value in samples:
    dt = datetime.fromtimestamp(timestamp / 1000)
    print(f"  {dt.strftime('%H:%M')}: {float(value):.1f}%")
```

## Generating a Summary Report

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def cpu_summary(key, hours=24):
    now = int(time.time() * 1000)
    start = now - (hours * 60 * 60 * 1000)

    raw = ts.range(key, start, now)
    if not raw:
        return {}

    values = [float(v) for _, v in raw]
    return {
        'count': len(values),
        'min': min(values),
        'max': max(values),
        'avg': sum(values) / len(values),
    }

summary = cpu_summary('cpu:host1', hours=24)
print(f"Last 24h CPU - Min: {summary['min']:.1f}%, Max: {summary['max']:.1f}%, Avg: {summary['avg']:.1f}%")
```

## Summary

`TS.RANGE` is the primary command for reading historical time series data from a single key, supporting time window queries, aggregation into time buckets, value filtering, and result limits. Use aggregation to reduce data volume for long time ranges, and use `COUNT` to limit the number of returned samples for preview or sparkline use cases. For querying multiple keys at once with the same time range, use `TS.MRANGE`.
