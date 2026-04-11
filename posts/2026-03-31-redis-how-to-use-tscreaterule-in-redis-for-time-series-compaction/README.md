# How to Use TS.CREATERULE in Redis for Time Series Compaction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Compaction, Downsampling

Description: Learn how to use TS.CREATERULE in Redis to create compaction rules that automatically downsample time series data into aggregated time buckets.

---

## What Is TS.CREATERULE?

`TS.CREATERULE` creates a compaction rule that automatically aggregates data from a source time series into a destination time series. As new samples arrive in the source, they are aggregated (averaged, summed, max'd, etc.) into fixed time windows and written to the destination.

This enables a tiered storage pattern: keep high-resolution raw data for a short period and automatically maintain downsampled data for longer-term storage.

## Basic Syntax

```text
TS.CREATERULE sourceKey destKey
  AGGREGATION aggregator bucketDuration
  [alignTimestamp]
```

Parameters:
- `sourceKey` - the source time series (raw data flows in here)
- `destKey` - the destination time series (aggregated data is written here)
- `aggregator` - aggregation function: AVG, SUM, MIN, MAX, RANGE, COUNT, FIRST, LAST, STD.P, STD.S, VAR.P, VAR.S, TWA
- `bucketDuration` - bucket size in milliseconds

## Setting Up a Tiered Storage Pattern

```bash
# Create raw data series (keep 1 hour of 1-second resolution)
TS.CREATE sensor:temp:raw RETENTION 3600000

# Create 1-minute average series (keep 24 hours)
TS.CREATE sensor:temp:1min RETENTION 86400000

# Create 1-hour average series (keep 30 days)
TS.CREATE sensor:temp:1hour RETENTION 2592000000

# Create compaction rules
TS.CREATERULE sensor:temp:raw sensor:temp:1min AGGREGATION AVG 60000
TS.CREATERULE sensor:temp:raw sensor:temp:1hour AGGREGATION AVG 3600000
```

Now when data is added to `sensor:temp:raw`, it is automatically aggregated into both destination series.

## Available Aggregation Functions

```bash
# Average temperature per minute
TS.CREATERULE sensor:temp:raw sensor:temp:avg_1min AGGREGATION AVG 60000

# Maximum temperature per hour
TS.CREATERULE sensor:temp:raw sensor:temp:max_1hour AGGREGATION MAX 3600000

# Total request count per minute
TS.CREATERULE requests:api:raw requests:api:sum_1min AGGREGATION SUM 60000

# Sample count per minute (useful for verifying data completeness)
TS.CREATERULE sensor:temp:raw sensor:temp:count_1min AGGREGATION COUNT 60000
```

## Ingesting Data and Observing Compaction

```bash
# Add raw samples
TS.ADD sensor:temp:raw * 22.5
TS.ADD sensor:temp:raw * 23.1
TS.ADD sensor:temp:raw * 21.8
# ... more samples ...

# After 60 seconds, the 1-minute bucket closes and is written to sensor:temp:1min
TS.RANGE sensor:temp:1min - +
# Returns aggregated 1-minute averages
```

## Python Example - Setting Up Tiered Metrics

```python
import redis
import time
import random

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def setup_tiered_series(metric_name, labels=None):
    """Create raw + compacted time series for a metric."""
    raw_key = f'{metric_name}:raw'
    min1_key = f'{metric_name}:1min'
    hour1_key = f'{metric_name}:1hour'

    base_labels = labels or {}

    # Create series
    ts.create(raw_key, retention_msecs=3600000, labels={**base_labels, 'resolution': 'raw'})
    ts.create(min1_key, retention_msecs=86400000, labels={**base_labels, 'resolution': '1min'})
    ts.create(hour1_key, retention_msecs=2592000000, labels={**base_labels, 'resolution': '1hour'})

    # Create compaction rules
    r.execute_command('TS.CREATERULE', raw_key, min1_key, 'AGGREGATION', 'AVG', 60000)
    r.execute_command('TS.CREATERULE', raw_key, hour1_key, 'AGGREGATION', 'AVG', 3600000)

    print(f"Created tiered series for {metric_name}")
    return raw_key, min1_key, hour1_key

raw, min1, hour1 = setup_tiered_series('cpu:host1', labels={'host': 'host1', 'metric': 'cpu'})

# Simulate adding data
for i in range(100):
    ts.add(raw, '*', random.uniform(50, 90))
    time.sleep(0.01)

print(f"Raw samples: {len(ts.range(raw, '-', '+'))}")
```

## Checking Existing Compaction Rules

```bash
TS.INFO sensor:temp:raw
```

Look for the `rules` section in the output:

```text
...
rules
1) 1) "sensor:temp:1min"
   2) (integer) 60000
   3) "AVG"
2) 1) "sensor:temp:1hour"
   2) (integer) 3600000
   3) "AVG"
```

## Aligning Compaction Buckets

By default, buckets are aligned to Unix epoch (timestamp 0). Use the optional `alignTimestamp` parameter to align to a specific time:

```bash
# Align 1-hour buckets to the start of each calendar hour (midnight UTC)
TS.CREATERULE sensor:temp:raw sensor:temp:1hour \
  AGGREGATION AVG 3600000 \
  0
```

## Full Lifecycle Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Setup
ts.create('metrics:requests:raw', retention_msecs=3600000)
ts.create('metrics:requests:1min', retention_msecs=86400000)
ts.create('metrics:requests:daily', retention_msecs=31536000000)

r.execute_command('TS.CREATERULE', 'metrics:requests:raw', 'metrics:requests:1min',
                  'AGGREGATION', 'SUM', 60000)
r.execute_command('TS.CREATERULE', 'metrics:requests:raw', 'metrics:requests:daily',
                  'AGGREGATION', 'SUM', 86400000)

print("Compaction rules created. Raw data automatically flows to aggregated series.")
```

## Summary

`TS.CREATERULE` enables automatic downsampling of time series data, implementing a tiered storage architecture where high-resolution raw data is retained for a short period while aggregated summaries are stored for longer-term analysis. Each source time series can have multiple rules targeting different bucket sizes and aggregation functions. This is the foundation of scalable time series storage in RedisTimeSeries - high write throughput at raw resolution with efficient storage of historical aggregates.
