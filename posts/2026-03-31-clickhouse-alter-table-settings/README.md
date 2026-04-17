# How to Alter Table Settings in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Setting

Description: Learn how to change and reset MergeTree table settings in ClickHouse using ALTER TABLE MODIFY SETTING and RESET SETTING without recreating the table.

---

ClickHouse MergeTree tables have many engine-level settings that control merge behavior, storage, deduplication, TTL scheduling, and more. These settings can be changed without recreating the table using `ALTER TABLE MODIFY SETTING` and reverted to their defaults with `ALTER TABLE RESET SETTING`. This makes it straightforward to tune a table's behavior in response to changing workloads.

## MODIFY SETTING Syntax

```sql
ALTER TABLE events
    MODIFY SETTING setting_name = value;
```

Multiple settings can be changed in a single statement:

```sql
ALTER TABLE events
    MODIFY SETTING
        merge_max_block_size = 16384,
        max_bytes_to_merge_at_max_space_in_pool = 161061273600;
```

## RESET SETTING Syntax

Reset a setting back to the server default:

```sql
ALTER TABLE events
    RESET SETTING merge_max_block_size;
```

Reset multiple settings at once:

```sql
ALTER TABLE events
    RESET SETTING merge_max_block_size, max_bytes_to_merge_at_max_space_in_pool;
```

## Commonly Adjusted Settings

### merge_max_block_size

Controls the number of rows per block when merging parts. Larger blocks improve compression but use more memory.

```sql
ALTER TABLE metrics
    MODIFY SETTING merge_max_block_size = 16384;
```

Default: `8192`.

### max_bytes_to_merge_at_max_space_in_pool

The maximum total on-disk size of parts that can be merged in one operation. Increase this to allow merging of larger parts when disk space is abundant.

```sql
ALTER TABLE metrics
    MODIFY SETTING max_bytes_to_merge_at_max_space_in_pool = 161061273600; -- 150 GiB
```

### parts_to_delay_insert and parts_to_throw_insert

Throttle or reject inserts when the number of active parts in a partition exceeds these thresholds. Tune them to combat "too many parts" errors during high-frequency inserts.

```sql
ALTER TABLE events
    MODIFY SETTING
        parts_to_delay_insert = 300,
        parts_to_throw_insert = 600;
```

### min_bytes_for_wide_part and min_rows_for_wide_part

Parts smaller than these thresholds are stored in Compact format (single file). Larger parts use Wide format (one file per column). Adjust to balance write amplification vs. read performance.

```sql
ALTER TABLE events
    MODIFY SETTING
        min_bytes_for_wide_part = 10485760,  -- 10 MiB
        min_rows_for_wide_part  = 512000;
```

### ttl_only_drop_parts

When enabled, TTL-expired rows are removed only by dropping entire parts, not by rewriting parts. This is much cheaper but requires that all rows in a part have expired.

```sql
ALTER TABLE logs
    MODIFY SETTING ttl_only_drop_parts = 1;
```

### index_granularity

Controls the number of rows per index granule. Smaller granules improve query selectivity at the cost of larger primary index files.

```sql
-- Note: index_granularity cannot be changed on a non-empty table.
-- It must be set at CREATE time or on an empty table.
CREATE TABLE new_events
(
    id         UInt64,
    created_at DateTime
)
ENGINE = MergeTree
ORDER BY (id, created_at)
SETTINGS index_granularity = 4096;
```

### storage_policy

Assign a different storage policy to an existing table:

```sql
ALTER TABLE events
    MODIFY SETTING storage_policy = 'hot_to_cold';
```

The `hot_to_cold` policy must be defined in `config.xml`. Moving to a new policy is allowed only if the new policy is a superset of the old one.

## Checking Current Settings

```sql
SELECT name, value, changed, description
FROM system.merge_tree_settings;
```

To see the settings for a specific table:

```sql
SELECT engine_full
FROM system.tables
WHERE database = 'default'
  AND name = 'events';
```

The `engine_full` column includes all non-default SETTINGS in the table definition.

## Complete Example

```sql
CREATE TABLE http_requests
(
    request_id UUID DEFAULT generateUUIDv4(),
    method     LowCardinality(String),
    path       String,
    status     UInt16,
    duration   UInt32,
    logged_at  DateTime DEFAULT now()
)
ENGINE = MergeTree
ORDER BY (status, logged_at);

-- Initial tuning for high-frequency inserts
ALTER TABLE http_requests
    MODIFY SETTING
        parts_to_delay_insert = 200,
        parts_to_throw_insert = 400,
        merge_max_block_size   = 16384;

-- Switch to larger merge budget during maintenance window
ALTER TABLE http_requests
    MODIFY SETTING max_bytes_to_merge_at_max_space_in_pool = 107374182400; -- 100 GiB

-- Reset merge budget back to server default after maintenance
ALTER TABLE http_requests
    RESET SETTING max_bytes_to_merge_at_max_space_in_pool;
```

## ON CLUSTER for Distributed Setups

```sql
ALTER TABLE http_requests ON CLUSTER '{cluster}'
    MODIFY SETTING parts_to_delay_insert = 200;
```

## Summary

`ALTER TABLE MODIFY SETTING` and `ALTER TABLE RESET SETTING` let you tune MergeTree engine behavior without downtime or data migration. Key settings to watch are `parts_to_delay_insert` and `parts_to_throw_insert` for insert-heavy tables, `max_bytes_to_merge_at_max_space_in_pool` for merge tuning, and `ttl_only_drop_parts` for cheaper TTL enforcement. Always use `ON CLUSTER` in distributed environments.
