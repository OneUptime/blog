# How to Use TS.QUERYINDEX in Redis to Find Time Series by Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Labels, Discovery

Description: Learn how to use TS.QUERYINDEX in Redis to find all time series keys matching label filters, enabling dynamic discovery of metrics and monitoring targets.

---

## What Is TS.QUERYINDEX?

`TS.QUERYINDEX` returns a list of all time series keys that match a set of label filter expressions. It enables label-based key discovery without knowing the exact key names in advance. This is useful for dynamic monitoring systems where you need to find all time series for a given host, service, or metric type.

## Basic Syntax

```text
TS.QUERYINDEX filterExpr [filterExpr ...]
```

Parameters:
- `filterExpr` - one or more label filter expressions (at least one required)

Returns an array of matching key names.

## Setting Up Sample Data

```bash
# Create time series with labels
TS.CREATE cpu:host1 LABELS host host1 region us-east env production metric cpu
TS.CREATE cpu:host2 LABELS host host2 region us-east env production metric cpu
TS.CREATE cpu:host3 LABELS host host3 region eu-west env staging metric cpu

TS.CREATE memory:host1 LABELS host host1 region us-east env production metric memory
TS.CREATE memory:host2 LABELS host host2 region us-east env production metric memory

TS.CREATE disk:host1 LABELS host host1 region us-east env production metric disk
```

## Basic Queries

```bash
# Find all CPU time series
TS.QUERYINDEX metric=cpu
# Returns:
# 1) "cpu:host1"
# 2) "cpu:host2"
# 3) "cpu:host3"

# Find all time series for host1
TS.QUERYINDEX host=host1
# Returns:
# 1) "cpu:host1"
# 2) "memory:host1"
# 3) "disk:host1"

# Find all production time series
TS.QUERYINDEX env=production
# Returns all 5 production series
```

## Combining Multiple Filters

Multiple filter expressions are ANDed together:

```bash
# Production CPU time series in us-east
TS.QUERYINDEX metric=cpu env=production region=us-east
# Returns:
# 1) "cpu:host1"
# 2) "cpu:host2"

# Host1's memory metric
TS.QUERYINDEX host=host1 metric=memory
# Returns:
# 1) "memory:host1"
```

## Filter Expression Syntax

| Expression | Meaning |
|---|---|
| `label=value` | Label equals value |
| `label!=value` | Label does not equal value |
| `label=` | Label does not exist |
| `label!=` | Label exists (any value) |
| `label=(v1,v2)` | Label is v1 or v2 |
| `label!=(v1,v2)` | Label is neither v1 nor v2 |

```bash
# Find CPU series for host1 OR host2
TS.QUERYINDEX metric=cpu host=(host1,host2)
# Returns: cpu:host1, cpu:host2

# Find all metrics EXCEPT disk
TS.QUERYINDEX env=production metric!=disk
# Returns: cpu:host1, cpu:host2, memory:host1, memory:host2

# Find series where region label exists (any value)
TS.QUERYINDEX metric=cpu region!=
```

## Python Example - Dynamic Monitoring

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Discover all production series
production_keys = r.execute_command('TS.QUERYINDEX', 'env=production')
print(f"Production time series: {len(production_keys)}")
for key in production_keys:
    print(f"  {key}")
```

## Auto-Discovery for Fleet Monitoring

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def discover_and_monitor(metric, env='production'):
    """Discover all keys for a metric and fetch latest values."""
    keys = r.execute_command('TS.QUERYINDEX', f'metric={metric}', f'env={env}')

    if not keys:
        print(f"No {metric} series found for env={env}")
        return {}

    print(f"Found {len(keys)} {metric} series")
    latest = {}

    for key in keys:
        result = ts.get(key)
        if result:
            timestamp, value = result
            info = ts.info(key)
            host = info.labels.get('host', key)
            latest[host] = float(value)

    return latest

cpu_values = discover_and_monitor('cpu')
for host, cpu in sorted(cpu_values.items()):
    print(f"  {host}: {cpu:.1f}%")
```

## Getting Series with Their Metadata

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def get_series_by_filter(filters):
    """Get series metadata for all keys matching filters."""
    keys = r.execute_command('TS.QUERYINDEX', *filters)
    series_info = []

    for key in keys:
        info = ts.info(key)
        series_info.append({
            'key': key,
            'labels': info.labels,
            'samples': info.total_samples,
            'retention_days': info.retention_msecs / 86400000 if info.retention_msecs else None,
        })

    return series_info

all_cpu = get_series_by_filter(['metric=cpu', 'env=production'])
for s in all_cpu:
    print(f"{s['key']}: {s['samples']} samples, labels={s['labels']}")
```

## Counting Keys by Dimension

```python
import redis
from collections import Counter

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def count_series_by_label(filter_expr, group_label):
    """Count time series grouped by a label value."""
    keys = r.execute_command('TS.QUERYINDEX', filter_expr)
    counts = Counter()

    for key in keys:
        info = ts.info(key)
        label_val = info.labels.get(group_label, 'unknown')
        counts[label_val] += 1

    return dict(counts)

# Count series per region
region_counts = count_series_by_label('env=production', 'region')
for region, count in sorted(region_counts.items()):
    print(f"  {region}: {count} series")
```

## Summary

`TS.QUERYINDEX` is the key discovery command for RedisTimeSeries, returning all time series keys that match label filter expressions. It enables dynamic, label-based fleet discovery without hardcoding key names. This makes it ideal for monitoring systems that need to automatically find all metrics for a given host, environment, or service. Always define meaningful labels when creating time series with `TS.CREATE` to make your series queryable and discoverable.
