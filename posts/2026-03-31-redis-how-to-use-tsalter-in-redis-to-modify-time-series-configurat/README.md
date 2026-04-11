# How to Use TS.ALTER in Redis to Modify Time Series Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Configuration, Retention

Description: Learn how to use TS.ALTER in Redis to modify an existing time series key's retention period, labels, and other configuration without losing data.

---

## What Is TS.ALTER?

`TS.ALTER` modifies the configuration of an existing RedisTimeSeries key. It allows you to change properties like retention period, duplicate policy, and labels without affecting the stored data. This is useful for updating time series settings after creation without recreating the key.

## Basic Syntax

```text
TS.ALTER key
  [RETENTION retentionPeriod]
  [CHUNK_SIZE size]
  [DUPLICATE_POLICY <BLOCK | FIRST | LAST | MIN | MAX | SUM>]
  [LABELS [label value ...]]
```

At least one option must be specified. Returns `OK` on success.

## Changing Retention Period

```bash
# Create a time series with 1-day retention
TS.CREATE metrics:cpu RETENTION 86400000

# Change retention to 7 days
TS.ALTER metrics:cpu RETENTION 604800000
# Returns: OK

# Set to keep forever
TS.ALTER metrics:cpu RETENTION 0
# Returns: OK
```

Note: Changing retention applies going forward. Samples older than the new retention period are trimmed immediately.

## Updating Labels

```bash
# Create time series with initial labels
TS.CREATE cpu:server1 LABELS host server1 env staging

# Promote to production
TS.ALTER cpu:server1 LABELS host server1 env production region us-east

# Add a new label (replaces ALL labels - list all you want to keep)
TS.ALTER cpu:server1 LABELS host server1 env production region us-east team platform

# Remove all labels (empty LABELS clause)
TS.ALTER cpu:server1 LABELS
```

Important: `LABELS` in `TS.ALTER` replaces the entire label set, not just adds. Always specify all labels you want to keep.

## Changing Duplicate Policy

```bash
# Create with default duplicate policy
TS.CREATE sensor:temp

# Change to keep the max value on duplicate timestamps
TS.ALTER sensor:temp DUPLICATE_POLICY MAX

# Change to last-write-wins
TS.ALTER sensor:temp DUPLICATE_POLICY LAST
```

## Verifying Changes with TS.INFO

```bash
TS.INFO metrics:cpu
```

```text
1) totalSamples
2) (integer) 5280
3) memoryUsage
4) (integer) 8512
5) firstTimestamp
6) (integer) 1700000000000
7) lastTimestamp
8) (integer) 1700300000000
9) retentionTime
10) (integer) 604800000         <- Updated retention
11) chunkCount
12) (integer) 2
13) chunkSize
14) (integer) 4096
15) chunkType
16) compressed
17) duplicatePolicy
18) (nil)
19) labels
20) 1) 1) "host"
       2) "server1"
    2) 1) "env"
       2) "production"          <- Updated label
```

## Python Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# Create time series
ts.create('metrics:memory',
          retention_msecs=86400000,  # 1 day
          labels={'host': 'server1', 'env': 'staging', 'metric': 'memory'})

# Later: update retention and promote to production
ts.alter('metrics:memory',
         retention_msecs=604800000,  # 7 days
         labels={'host': 'server1', 'env': 'production', 'metric': 'memory', 'region': 'us-east'})

# Verify
info = ts.info('metrics:memory')
print(f"Retention: {info.retention_msecs} ms")
print(f"Labels: {info.labels}")
```

## Batch Updating Labels for Multiple Series

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def update_series_env(series_keys, old_env, new_env):
    """Update environment label for a list of time series."""
    for key in series_keys:
        try:
            info = ts.info(key)
            current_labels = dict(info.labels)

            if current_labels.get('env') == old_env:
                current_labels['env'] = new_env
                # Flatten labels for TS.ALTER
                label_list = [item for kv in current_labels.items() for item in kv]
                r.execute_command('TS.ALTER', key, 'LABELS', *label_list)
                print(f"Updated {key}: env={old_env} -> {new_env}")
        except Exception as e:
            print(f"Error updating {key}: {e}")

# Promote all staging series to production
staging_keys = ['cpu:server1', 'memory:server1', 'disk:server1']
update_series_env(staging_keys, 'staging', 'production')
```

## Extending Retention for Anomalous Data

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def extend_retention_for_investigation(key, days=30):
    """Extend retention for a series that needs longer investigation window."""
    new_retention_ms = days * 24 * 60 * 60 * 1000

    info = ts.info(key)
    current_retention = info.retention_msecs

    if current_retention == 0 or current_retention >= new_retention_ms:
        print(f"{key}: retention already sufficient ({current_retention} ms)")
        return

    ts.alter(key, retention_msecs=new_retention_ms)
    print(f"{key}: extended retention from {current_retention}ms to {new_retention_ms}ms")

extend_retention_for_investigation('cpu:server1', days=30)
```

## Summary

`TS.ALTER` provides a way to update time series configuration in place without recreating keys or losing data. The most common uses are changing retention periods as storage requirements evolve, updating labels when infrastructure is renamed or promoted between environments, and modifying duplicate policies as data quality requirements change. Always include all desired labels when updating via `TS.ALTER` since the label set is completely replaced.
