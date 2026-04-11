# How to Use TS.ADD in Redis to Add Time Series Samples

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Metric, Data Ingestion

Description: Learn how to use TS.ADD in Redis to append timestamped samples to a time series key, with options for auto-timestamps and duplicate handling.

---

## What Is TS.ADD?

`TS.ADD` appends a new timestamped sample (data point) to a RedisTimeSeries key. It is the primary ingestion command for time series data. If the key does not exist, `TS.ADD` will create it automatically with default settings.

## Basic Syntax

```text
TS.ADD key timestamp value
  [RETENTION retentionPeriod]
  [ENCODING [COMPRESSED | UNCOMPRESSED]]
  [CHUNK_SIZE chunkSize]
  [DUPLICATE_POLICY policy]
  [ON_DUPLICATE policy]
  [IGNORE ignoreMaxTimeDiff ignoreMaxValDiff]
  [LABELS {label value}...]
```

Key parameters:
- `key` - the time series key
- `timestamp` - Unix timestamp in milliseconds, or `*` for current time
- `value` - a 64-bit floating point number

Returns the timestamp of the added sample.

## Adding a Sample with Current Timestamp

Use `*` as the timestamp to use the current server time:

```bash
TS.ADD temperature:sensor1 * 22.5
# Returns: 1700000000000  (actual timestamp in ms)

TS.ADD cpu:host1 * 0.75
TS.ADD memory:host1 * 4096
```

## Adding a Sample with Explicit Timestamp

Timestamps are in Unix milliseconds:

```bash
# Add sample at a specific time (e.g., 2024-01-15 12:00:00 UTC)
TS.ADD temperature:sensor1 1705320000000 21.3

# Add historical data
TS.ADD stock:AAPL 1705320000000 185.50
TS.ADD stock:AAPL 1705320060000 185.75
TS.ADD stock:AAPL 1705320120000 184.90
```

## Auto-Create with Labels

If the key doesn't exist, `TS.ADD` creates it with optional settings:

```bash
TS.ADD sensor:outdoor:temp * 18.5 \
  RETENTION 604800000 \
  LABELS location outdoor type temperature unit celsius
```

## Python Example - Single Sample

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Add current timestamp sample
ts = r.ts()
timestamp = ts.add('cpu:host1', '*', 75.3)
print(f"Added sample at timestamp: {timestamp}")

# Add with explicit timestamp
import datetime
dt = datetime.datetime(2024, 1, 15, 12, 0, 0)
ts_ms = int(dt.timestamp() * 1000)
ts.add('cpu:host1', ts_ms, 80.1)
```

## Python Example - Collecting Metrics

```python
import redis
import psutil
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Create time series if they don't exist
ts.create('sys:cpu', retention_msecs=86400000, labels={'type': 'cpu', 'host': 'localhost'})
ts.create('sys:memory', retention_msecs=86400000, labels={'type': 'memory', 'host': 'localhost'})

# Collect metrics every second
print("Collecting metrics... (Ctrl+C to stop)")
try:
    while True:
        cpu_pct = psutil.cpu_percent()
        mem_pct = psutil.virtual_memory().percent

        ts.add('sys:cpu', '*', cpu_pct)
        ts.add('sys:memory', '*', mem_pct)

        time.sleep(1)
except KeyboardInterrupt:
    print("Stopped.")
```

## Handling Duplicates

If two samples have the same timestamp, the behavior depends on the DUPLICATE_POLICY:

```bash
# Using ON_DUPLICATE per-command override
TS.ADD sensor:temp 1700000000000 22.5
TS.ADD sensor:temp 1700000000000 23.1 ON_DUPLICATE LAST
# Returns: 1700000000000 (accepted, overwrote previous)

TS.ADD sensor:temp 1700000000000 21.0 ON_DUPLICATE MAX
# Returns: 1700000000000 (keeps the higher value: max(current, 21.0))
```

## Adding Out-of-Order Samples

RedisTimeSeries supports out-of-order ingestion within limits:

```bash
# Out-of-order sample (older than latest)
TS.ADD sensor:temp 1700000000000 22.5
TS.ADD sensor:temp 1699999999000 21.0  # 1 second earlier
# Returns: 1699999999000 (accepted - within default OOO window)
```

## Ignoring Duplicate Values

```bash
# Ignore sample if value differs by less than 0.1 within 1000ms
TS.ADD sensor:temp * 22.5 IGNORE 1000 0.1
TS.ADD sensor:temp * 22.55 IGNORE 1000 0.1
# Second add may be ignored (difference < 0.1)
```

## Verifying Added Samples

```bash
# Get the latest value
TS.GET temperature:sensor1
# Returns: 1) (timestamp) 2) (value)

# Get range of samples
TS.RANGE temperature:sensor1 - +
# Returns all samples
```

## Summary

`TS.ADD` is the core data ingestion command for RedisTimeSeries, supporting current-time auto-stamping, explicit timestamps, out-of-order writes, and per-insert duplicate policies. Use `*` for real-time data collection and explicit timestamps for backfill operations. Combine with `TS.MADD` for batch ingestion when collecting multiple metrics simultaneously. The command also supports auto-creating the time series key with labels and retention on the first write, simplifying initialization code.
