# How to Use TS.MRANGE in Redis to Query Multiple Time Series

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Multi-Key, Aggregation

Description: Learn how to use TS.MRANGE in Redis to query time ranges across multiple time series simultaneously using label-based filtering.

---

## What Is TS.MRANGE?

`TS.MRANGE` queries a time range across multiple time series that match specified label filters. It is the multi-key equivalent of `TS.RANGE`, allowing you to retrieve and aggregate data from many time series in a single command. This is essential for querying metrics across fleets of hosts, services, or sensors.

## Basic Syntax

```text
TS.MRANGE fromTimestamp toTimestamp
  [LATEST]
  [FILTER_BY_TS ts...]
  [FILTER_BY_VALUE min max]
  [WITHLABELS | SELECTED_LABELS label...]
  [COUNT count]
  [[ALIGN align] AGGREGATION aggregator bucketDuration [BUCKETTIMESTAMP bt] [EMPTY]]
  FILTER filterExpr [filterExpr ...]
  [GROUPBY label REDUCE reducer]
```

## Setting Up Sample Data

```bash
# Create time series for multiple hosts
TS.CREATE cpu:host1 LABELS host host1 region us-east metric cpu
TS.CREATE cpu:host2 LABELS host host2 region us-east metric cpu
TS.CREATE cpu:host3 LABELS host host3 region eu-west metric cpu

# Add samples
TS.MADD \
  cpu:host1 1700000000000 72.5 \
  cpu:host2 1700000000000 55.3 \
  cpu:host3 1700000000000 88.1 \
  cpu:host1 1700000060000 74.2 \
  cpu:host2 1700000060000 58.7 \
  cpu:host3 1700000060000 91.3
```

## Querying All Matching Time Series

```bash
# Get all CPU samples across all hosts
TS.MRANGE - + FILTER metric=cpu
```

```text
1) 1) "cpu:host1"
   2) (empty)
   3) 1) 1) (integer) 1700000000000
         2) "72.5"
      2) 1) (integer) 1700000060000
         2) "74.2"
2) 1) "cpu:host2"
   ...
```

## With Label Filters

```bash
# Query only us-east region
TS.MRANGE - + FILTER metric=cpu region=us-east

# Query specific hosts
TS.MRANGE - + FILTER metric=cpu host=(host1,host3)

# Exclude a host
TS.MRANGE - + FILTER metric=cpu host!=host2
```

## With Aggregation

```bash
# Average CPU per host in 1-minute buckets
TS.MRANGE - + AGGREGATION AVG 60000 FILTER metric=cpu
```

## GROUPBY and REDUCE

`GROUPBY` merges multiple time series into one by grouping on a label, then applying a reduction function:

```bash
# Get average CPU per region (merging all hosts within a region)
TS.MRANGE - + \
  AGGREGATION AVG 60000 \
  FILTER metric=cpu \
  GROUPBY region REDUCE AVG
```

Available reducers: `SUM`, `MIN`, `MAX`, `AVG`, `COUNT`, `RANGE`, `STD.P`, `STD.S`, `VAR.P`, `VAR.S`

## Including Labels in Response

```bash
# Include all labels to identify which key each result belongs to
TS.MRANGE - + WITHLABELS FILTER metric=cpu

# Include only specific labels
TS.MRANGE - + SELECTED_LABELS host region FILTER metric=cpu
```

## Python Example - Fleet CPU Query

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Query last 30 minutes, 1-minute averages for all hosts
now = int(time.time() * 1000)
thirty_min_ago = now - (30 * 60 * 1000)

results = ts.mrange(
    thirty_min_ago,
    now,
    filters=['metric=cpu'],
    with_labels=True,
    aggregation_type='avg',
    bucket_size_msec=60000
)

for key, labels, samples in results:
    host = labels.get('host', key)
    if samples:
        latest_val = float(samples[-1][1])
        avg_val = sum(float(v) for _, v in samples) / len(samples)
        print(f"{host}: latest={latest_val:.1f}%, 30min_avg={avg_val:.1f}%")
```

## Python Example - Regional Grouping

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

now = int(time.time() * 1000)
one_hour_ago = now - (60 * 60 * 1000)

# Get average CPU per region
results = ts.mrange(
    one_hour_ago,
    now,
    filters=['metric=cpu'],
    aggregation_type='avg',
    bucket_size_msec=300000,  # 5-minute buckets
    groupby='region',
    reduce='avg'
)

print("Average CPU by region (5-minute buckets):")
for key, labels, samples in results:
    region = labels.get('region', key)
    print(f"\n{region}:")
    for timestamp, value in samples[-3:]:  # Last 3 buckets
        print(f"  {timestamp}: {float(value):.1f}%")
```

## Comparing TS.RANGE vs TS.MRANGE

| Feature | TS.RANGE | TS.MRANGE |
|---|---|---|
| Number of keys | Single | Multiple (label-filtered) |
| Label filtering | No | Yes (FILTER required) |
| GROUPBY support | No | Yes |
| Use case | One metric, one host | Fleet-wide queries |

## Summary

`TS.MRANGE` is the fleet-scale query command for RedisTimeSeries, enabling time range queries across any number of time series that share common labels. It supports the same aggregation options as `TS.RANGE` plus a powerful `GROUPBY REDUCE` capability that merges multiple series into single grouped results. Always define labels when creating time series to make them queryable with `TS.MRANGE`.
