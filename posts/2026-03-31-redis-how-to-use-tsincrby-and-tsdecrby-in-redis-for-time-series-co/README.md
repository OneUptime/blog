# How to Use TS.INCRBY and TS.DECRBY in Redis for Time Series Counters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Counter, Metric

Description: Learn how to use TS.INCRBY and TS.DECRBY in Redis to increment or decrement time series values, enabling counter-style time series tracking.

---

## What Are TS.INCRBY and TS.DECRBY?

`TS.INCRBY` and `TS.DECRBY` are RedisTimeSeries commands that add a new sample to a time series by incrementing or decrementing the last recorded value by a specified amount. They are useful for tracking counters that need to be stored as time series - such as request counts, error counts, or cumulative totals.

Unlike `TS.ADD` (which takes an absolute value), these commands take a delta relative to the previous sample.

## Basic Syntax

```text
TS.INCRBY key value
  [TIMESTAMP timestamp]
  [RETENTION retentionPeriod]
  [ENCODING {COMPRESSED | UNCOMPRESSED}]
  [CHUNK_SIZE size]
  [DUPLICATE_POLICY policy]
  [IGNORE ignoreMaxTimeDiff ignoreMaxValDiff]
  [LABELS {label value}...]

TS.DECRBY key value
  [TIMESTAMP timestamp]
  [same options as above...]
```

Parameters:
- `key` - the time series key
- `value` - the amount to increment (INCRBY) or decrement (DECRBY)
- `TIMESTAMP` - optional explicit timestamp (default: current server time)

Returns the timestamp of the new sample.

## Basic Usage

```bash
# Start tracking request count
TS.INCRBY requests:api 5
# Returns: 1700000000000
# New value: 5 (starts at 0 if no previous sample)

TS.INCRBY requests:api 12
# Returns: 1700000001000
# New value: 17 (5 + 12)

TS.INCRBY requests:api 8
# Returns: 1700000002000
# New value: 25 (17 + 8)

# View the series
TS.RANGE requests:api - +
# 1) [1700000000000, 5]
# 2) [1700000001000, 17]
# 3) [1700000002000, 25]
```

## Decrementing a Counter

```bash
# Track available inventory
TS.INCRBY inventory:item1 100  # Start at 100
TS.DECRBY inventory:item1 5    # Sold 5 items, now 95
TS.DECRBY inventory:item1 10   # Sold 10 more, now 85
TS.INCRBY inventory:item1 50   # Restocked 50, now 135

TS.RANGE inventory:item1 - +
# Tracks the inventory level over time
```

## With Explicit Timestamp

```bash
# Add with a specific timestamp
TS.INCRBY page:views 100 TIMESTAMP 1700000000000
TS.INCRBY page:views 150 TIMESTAMP 1700000060000
TS.INCRBY page:views 80  TIMESTAMP 1700000120000
```

## Auto-Create with Labels and Retention

```bash
# INCRBY creates the key if it doesn't exist
TS.INCRBY errors:host1 1 \
  RETENTION 86400000 \
  LABELS host host1 metric errors type api
```

## Python Example - Request Rate Tracking

```python
import redis
import time
import random

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Initialize counter series
ts.create('api:requests', retention_msecs=86400000,
          labels={'metric': 'requests', 'service': 'api'})

# Simulate incrementing on each request batch
print("Simulating request counting...")
for _ in range(10):
    requests_in_batch = random.randint(10, 100)
    ts.incrby('api:requests', requests_in_batch)
    time.sleep(0.1)

# Query the series
samples = ts.range('api:requests', '-', '+')
print(f"Total samples: {len(samples)}")
if samples:
    total = float(samples[-1][1])  # Latest cumulative value
    print(f"Total requests recorded: {total:.0f}")
```

## Python Example - Error Rate Counter

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def record_errors(service, count):
    """Record error count as a time series sample."""
    ts.incrby(f'errors:{service}', count,
              retention_msecs=604800000,  # 7 days
              labels={'service': service, 'metric': 'errors'})

def get_error_rate(service, window_ms=60000):
    """Calculate error rate over the last window."""
    now = int(time.time() * 1000)
    start = now - window_ms

    samples = ts.range(f'errors:{service}', start, now)

    if len(samples) < 2:
        return 0.0

    # Rate = (latest - earliest) / time_window_seconds
    first_val = float(samples[0][1])
    last_val = float(samples[-1][1])
    elapsed_seconds = window_ms / 1000

    return (last_val - first_val) / elapsed_seconds

# Record some errors
record_errors('api', 5)
time.sleep(1)
record_errors('api', 3)
time.sleep(1)
record_errors('api', 7)

rate = get_error_rate('api', window_ms=10000)
print(f"Error rate: {rate:.2f} errors/second")
```

## Difference from TS.ADD

| Aspect | TS.ADD | TS.INCRBY / TS.DECRBY |
|---|---|---|
| Value type | Absolute value | Delta (relative to last) |
| Use case | Point-in-time measurements | Running counters |
| Example | CPU% = 72.5 | Requests += 100 |
| Series shape | Can go up and down freely | Cumulative (changes by delta) |

## Getting the Current Counter Value

```bash
# Get the latest (most recent) counter value
TS.GET requests:api
# Returns: [timestamp, current_cumulative_value]
```

## Summary

`TS.INCRBY` and `TS.DECRBY` enable counter-style time series in Redis where each new sample is the previous value plus or minus a delta. This is ideal for tracking cumulative counts over time - request totals, error counts, inventory levels - where you want to record both the point-in-time state and the historical progression. Each increment creates a new time-stamped sample, giving you a complete audit trail of how the counter evolved.
