# How to Use TS.DEL in Redis to Delete Time Series Samples

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Data Management, Deletion

Description: Learn how to use TS.DEL in Redis to delete samples from a time series within a specified time range, enabling data correction and compliance workflows.

---

## What Is TS.DEL?

`TS.DEL` deletes all samples in a time series key within a specified time range. Unlike deleting the entire key with `DEL`, `TS.DEL` removes only the data points within a given window, leaving the rest of the time series intact.

This is useful for data correction (removing erroneous samples), compliance requirements (right-to-erasure within a period), and cleaning up test data.

## Basic Syntax

```text
TS.DEL key fromTimestamp toTimestamp
```

Parameters:
- `key` - the time series key
- `fromTimestamp` - start of the range to delete (inclusive), in milliseconds
- `toTimestamp` - end of the range to delete (inclusive), in milliseconds

Returns the number of samples deleted.

## Basic Usage

```bash
# First add some samples
TS.ADD sensor:temp 1700000000000 22.5
TS.ADD sensor:temp 1700000001000 23.1
TS.ADD sensor:temp 1700000002000 99.9    # Erroneous reading
TS.ADD sensor:temp 1700000003000 99.8    # Erroneous reading
TS.ADD sensor:temp 1700000004000 22.8

# Delete the two erroneous samples
TS.DEL sensor:temp 1700000002000 1700000003000
# Returns: 2

# Verify remaining data
TS.RANGE sensor:temp - +
# Returns: 22.5, 23.1, 22.8
```

## Deleting a Time Window

```bash
# Delete all samples from a specific 1-hour window
# 12:00:00 - 12:59:59 UTC on 2024-01-15
TS.DEL sensor:temp 1705320000000 1705323599999
# Returns: number of samples deleted
```

## Deleting All Samples

To delete all data in a time series while keeping the key:

```bash
TS.DEL sensor:temp - +
# Removes all samples but keeps the key with its configuration
```

Note: Use `DEL sensor:temp` to remove both the data and the key itself.

## Python Example - Remove Erroneous Data

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Add data including some outliers
samples_to_add = [
    ('sensor:pressure', 1700000000000, 1013.25),
    ('sensor:pressure', 1700000001000, 1013.30),
    ('sensor:pressure', 1700000002000, 9999.0),   # Error
    ('sensor:pressure', 1700000003000, 9998.5),   # Error
    ('sensor:pressure', 1700000004000, 1013.20),
]
ts.madd(samples_to_add)

# Find and remove outliers
all_samples = ts.range('sensor:pressure', '-', '+')
print(f"Before: {len(all_samples)} samples")

# Delete specific erroneous range
deleted = r.execute_command('TS.DEL', 'sensor:pressure', 1700000002000, 1700000003000)
print(f"Deleted: {deleted} samples")

remaining = ts.range('sensor:pressure', '-', '+')
print(f"After: {len(remaining)} samples")
```

## Automated Outlier Removal

```python
import redis
import statistics

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def remove_outliers(key, z_threshold=3.0):
    """Remove samples that are more than z_threshold standard deviations from mean."""
    samples = ts.range(key, '-', '+')
    if len(samples) < 5:
        return 0

    values = [float(v) for _, v in samples]
    mean = statistics.mean(values)
    stdev = statistics.stdev(values)

    if stdev == 0:
        return 0

    # Find outlier timestamps
    outlier_timestamps = []
    for timestamp, value in samples:
        z_score = abs((float(value) - mean) / stdev)
        if z_score > z_threshold:
            outlier_timestamps.append(timestamp)

    # Delete each outlier individually
    deleted_total = 0
    for ts_ms in outlier_timestamps:
        deleted = r.execute_command('TS.DEL', key, ts_ms, ts_ms)
        deleted_total += deleted

    return deleted_total

removed = remove_outliers('sensor:pressure')
print(f"Removed {removed} outlier samples")
```

## Data Retention Compliance

```python
import redis
from datetime import datetime, timedelta

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def delete_data_before(key, cutoff_date):
    """Delete all samples before a cutoff date for compliance."""
    cutoff_ms = int(cutoff_date.timestamp() * 1000)

    # Delete from beginning up to cutoff
    deleted = r.execute_command('TS.DEL', key, '-', cutoff_ms)
    print(f"Deleted {deleted} samples from {key} before {cutoff_date}")
    return deleted

# Delete data older than 90 days
cutoff = datetime.now() - timedelta(days=90)
delete_data_before('user:activity:123', cutoff)
```

## TS.DEL vs DEL

| Command | Effect |
|---|---|
| `DEL key` | Deletes the entire key including configuration |
| `TS.DEL key - +` | Deletes all samples but keeps key and labels |
| `TS.DEL key t1 t2` | Deletes only samples within the range |

## Summary

`TS.DEL` provides fine-grained deletion of time series samples within a time range, making it possible to remove erroneous readings, comply with data retention policies, or clean up test data without affecting the rest of the time series. It preserves the key structure (labels, retention settings, compaction rules), unlike `DEL` which removes everything. Use it carefully - deleted samples cannot be recovered without re-ingestion.
