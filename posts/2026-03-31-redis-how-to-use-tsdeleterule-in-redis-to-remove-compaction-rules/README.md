# How to Use TS.DELETERULE in Redis to Remove Compaction Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Time Series, Compaction, Configuration

Description: Learn how to use TS.DELETERULE in Redis to remove an existing compaction rule from a time series, stopping automatic downsampling to the destination key.

---

## What Is TS.DELETERULE?

`TS.DELETERULE` removes a compaction rule from a source time series. After deletion, new samples added to the source will no longer be automatically aggregated into the destination series. Existing data in the destination series is not affected - only the automatic forwarding stops.

## Basic Syntax

```text
TS.DELETERULE sourceKey destKey
```

Parameters:
- `sourceKey` - the source time series that has the compaction rule
- `destKey` - the destination time series that receives aggregated data

Returns `OK` on success.

## Basic Usage

```bash
# View existing compaction rules first
TS.INFO sensor:temp:raw
# Shows rules including: sensor:temp:1min (AVG, 60000ms)

# Delete the compaction rule to sensor:temp:1min
TS.DELETERULE sensor:temp:raw sensor:temp:1min
# Returns: OK

# Verify the rule is gone
TS.INFO sensor:temp:raw
# rules section should no longer list sensor:temp:1min
```

## Removing Multiple Rules

Each `TS.DELETERULE` call removes one rule. To remove multiple rules:

```bash
TS.DELETERULE sensor:temp:raw sensor:temp:1min
TS.DELETERULE sensor:temp:raw sensor:temp:1hour
TS.DELETERULE sensor:temp:raw sensor:temp:daily
```

## Python Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

# First, set up a compaction rule
ts.create('cpu:raw', retention_msecs=3600000)
ts.create('cpu:1min', retention_msecs=86400000)
r.execute_command('TS.CREATERULE', 'cpu:raw', 'cpu:1min', 'AGGREGATION', 'AVG', 60000)

# Verify the rule exists
info = ts.info('cpu:raw')
print(f"Rules before: {info.rules}")

# Delete the compaction rule
r.execute_command('TS.DELETERULE', 'cpu:raw', 'cpu:1min')

# Verify it's gone
info = ts.info('cpu:raw')
print(f"Rules after: {info.rules}")
# Should be empty or not contain cpu:1min
```

## When to Use TS.DELETERULE

- **Changing aggregation strategy**: remove the old rule and create a new one with different aggregation function or bucket size
- **Decommissioning a destination series**: remove the rule before deleting the destination key
- **Debugging**: temporarily stop compaction to troubleshoot issues
- **Reconfiguring tiered storage**: restructure your retention hierarchy

## Changing an Existing Compaction Rule

There is no update-in-place for compaction rules. To change a rule:

```bash
# 1. Delete the existing rule
TS.DELETERULE sensor:temp:raw sensor:temp:1min

# 2. Create the new rule with desired configuration
TS.CREATERULE sensor:temp:raw sensor:temp:1min AGGREGATION MAX 60000
```

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def update_compaction_rule(source, dest, new_aggregator, new_bucket_ms):
    """Replace an existing compaction rule with a new one."""
    # Remove old rule
    try:
        r.execute_command('TS.DELETERULE', source, dest)
        print(f"Removed old rule: {source} -> {dest}")
    except redis.ResponseError as e:
        print(f"No existing rule to remove: {e}")

    # Create new rule
    r.execute_command('TS.CREATERULE', source, dest,
                      'AGGREGATION', new_aggregator, new_bucket_ms)
    print(f"Created new rule: {source} -> {dest} ({new_aggregator}, {new_bucket_ms}ms)")

update_compaction_rule('cpu:raw', 'cpu:1min', 'MAX', 60000)
```

## Listing All Rules for a Key

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def get_compaction_rules(key):
    """Return all compaction rules for a time series key."""
    info = ts.info(key)
    return info.rules  # Dict of {dest_key: [bucket_duration, aggregator]}

rules = get_compaction_rules('sensor:temp:raw')
for dest, (bucket_ms, aggregator) in rules.items():
    print(f"  -> {dest} (every {bucket_ms}ms, {aggregator})")
```

## Removing All Rules for a Key

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ts = r.ts()

def remove_all_rules(source_key):
    """Remove all compaction rules from a source time series."""
    info = ts.info(source_key)
    rules = info.rules

    if not rules:
        print(f"No rules to remove from {source_key}")
        return

    for dest_key in rules:
        r.execute_command('TS.DELETERULE', source_key, dest_key)
        print(f"Removed rule: {source_key} -> {dest_key}")

remove_all_rules('sensor:temp:raw')
```

## Error Cases

```bash
# Non-existent rule
TS.DELETERULE sensor:temp:raw nonexistent:dest
# Returns: (error) TSDB: compaction rule does not exist

# Non-existent source key
TS.DELETERULE nonexistent:key dest:key
# Returns: (error) TSDB: the key does not exist
```

## Summary

`TS.DELETERULE` cleanly removes a compaction rule from a source time series, stopping automatic aggregation to the destination. It does not affect existing data in either the source or destination series - it only prevents future automated writes. Use it when restructuring your time series retention hierarchy, updating aggregation functions, or decommissioning part of your metrics pipeline. Always verify the removal by checking `TS.INFO` on the source key afterward.
