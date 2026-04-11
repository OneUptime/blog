# How to Use TS.MREVRANGE in Redis for Reverse Multi-Key Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Reverse Query, Multi-Key

Description: Learn how to use TS.MREVRANGE in Redis to query multiple time series in reverse chronological order using label-based filtering.

---

## What Is TS.MREVRANGE?

`TS.MREVRANGE` queries multiple time series matching label filters and returns results in reverse chronological order (newest first). It combines the multi-key capability of `TS.MRANGE` with the reverse ordering of `TS.REVRANGE`.

This is the most efficient way to get the latest N samples from a fleet of time series simultaneously.

## Basic Syntax

```text
TS.MREVRANGE fromTimestamp toTimestamp
  [LATEST]
  [FILTER_BY_TS ts...]
  [FILTER_BY_VALUE min max]
  [WITHLABELS | SELECTED_LABELS label...]
  [COUNT count]
  [[ALIGN align] AGGREGATION aggregator bucketDuration [BUCKETTIMESTAMP bt] [EMPTY]]
  FILTER filterExpr [filterExpr ...]
  [GROUPBY label REDUCE reducer]
```

The `FILTER` clause is required.

## Sample Setup

```bash
TS.CREATE cpu:host1 LABELS host host1 region us-east metric cpu
TS.CREATE cpu:host2 LABELS host host2 region us-east metric cpu
TS.CREATE cpu:host3 LABELS host host3 region eu-west metric cpu

TS.MADD \
  cpu:host1 1700000000000 70.0 \
  cpu:host2 1700000000000 55.0 \
  cpu:host3 1700000000000 85.0 \
  cpu:host1 1700000060000 72.5 \
  cpu:host2 1700000060000 58.3 \
  cpu:host3 1700000060000 88.1 \
  cpu:host1 1700000120000 68.9 \
  cpu:host2 1700000120000 61.0 \
  cpu:host3 1700000120000 92.4
```

## Basic Reverse Multi-Key Query

```bash
# Get all CPU samples, newest first
TS.MREVRANGE - + FILTER metric=cpu
```

```text
1) 1) "cpu:host1"
   2) (empty)
   3) 1) 1) (integer) 1700000120000
         2) "68.9"
      2) 1) (integer) 1700000060000
         2) "72.5"
      3) 1) (integer) 1700000000000
         2) "70.0"
2) 1) "cpu:host2"
   ...
```

## Getting Latest N Samples Per Key

```bash
# Get last 5 samples for all CPU time series, newest first
TS.MREVRANGE - + COUNT 5 FILTER metric=cpu
```

## With Labels

```bash
# Include host label for identification
TS.MREVRANGE - + WITHLABELS COUNT 3 FILTER metric=cpu
```

## With Aggregation - Newest Buckets First

```bash
# Get last 5 one-minute averages per host, newest first
TS.MREVRANGE - + AGGREGATION AVG 60000 COUNT 5 FILTER metric=cpu
```

## Python Example - Latest Metrics per Host

```python
import redis
import time
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Get the 5 most recent 1-minute averages for all CPU time series
results = ts.mrevrange(
    '-', '+',
    filters=['metric=cpu'],
    with_labels=True,
    count=5,
    aggregation_type='avg',
    bucket_size_msec=60000
)

for key, labels, samples in results:
    host = labels.get('host', key)
    print(f"\n{host} - Last 5 minute averages (newest first):")
    for timestamp, value in samples:
        dt = datetime.fromtimestamp(timestamp / 1000)
        print(f"  {dt.strftime('%H:%M')}: {float(value):.1f}%")
```

## Fleet Health Check

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def fleet_health_check(metric, threshold, lookback_ms=300000):
    """Check if any host exceeded a threshold in the last N ms."""
    now = int(time.time() * 1000)
    from_ts = now - lookback_ms

    results = ts.mrevrange(
        from_ts, now,
        filters=[f'metric={metric}'],
        with_labels=True
    )

    alerts = []
    for key, labels, samples in results:
        host = labels.get('host', key)
        for timestamp, value in samples:
            if float(value) > threshold:
                alerts.append({
                    'host': host,
                    'value': float(value),
                    'timestamp': timestamp,
                })
                break  # Only first violation per host

    return alerts

alerts = fleet_health_check('cpu', threshold=85.0)
if alerts:
    print(f"High CPU alerts ({len(alerts)} hosts):")
    for a in alerts:
        print(f"  {a['host']}: {a['value']:.1f}%")
else:
    print("All hosts within normal CPU range")
```

## GROUPBY with REVRANGE

```bash
# Get average CPU per region, newest buckets first
TS.MREVRANGE - + \
  AGGREGATION AVG 60000 \
  COUNT 10 \
  FILTER metric=cpu \
  GROUPBY region REDUCE AVG
```

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

results = ts.mrevrange(
    '-', '+',
    filters=['metric=cpu'],
    aggregation_type='avg',
    bucket_size_msec=300000,
    count=6,
    groupby='region',
    reduce='avg'
)

for key, labels, samples in results:
    region = key.replace('GROUPBY:region=', '')
    print(f"\nRegion: {region}")
    for timestamp, value in samples:
        print(f"  {timestamp}: {float(value):.1f}%")
```

## TS.MREVRANGE vs TS.MRANGE

| Feature | TS.MRANGE | TS.MREVRANGE |
|---|---|---|
| Result order | Oldest first | Newest first |
| Getting latest N | Requires COUNT + post-processing | Natural with COUNT |
| Same aggregation support | Yes | Yes |
| Same filter support | Yes | Yes |

## Summary

`TS.MREVRANGE` is the ideal command for fleet-wide monitoring scenarios where you need the most recent data across many time series simultaneously. It returns results in reverse chronological order, making it natural to pair with `COUNT` for "last N samples per key" queries. All the same aggregation, grouping, and label filtering options from `TS.MRANGE` are available, making it a versatile tool for real-time dashboards and alert systems.
