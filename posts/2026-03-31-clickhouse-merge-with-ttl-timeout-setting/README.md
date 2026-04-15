# How to Use merge_with_ttl_timeout Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, TTL, merge_with_ttl_timeout, Setting, Data Lifecycle, SQL

Description: Learn how merge_with_ttl_timeout controls how often ClickHouse MergeTree triggers TTL-aware merges to expire and delete data, and how to tune it for your retention needs.

---

When ClickHouse MergeTree tables have TTL expressions defined, TTL-aware merges are needed to actually delete expired rows or move them to cold storage. The `merge_with_ttl_timeout` setting controls the minimum interval (in seconds) between two consecutive TTL-triggered merges for the same table. Setting it too high delays data deletion; setting it too low increases merge I/O.

## How TTL Merges Work

ClickHouse schedules TTL merges separately from regular compaction merges. When a part contains rows past their TTL deadline, a merge is triggered to either:
- Delete expired rows (`DELETE` TTL).
- Move them to another disk or volume (`TO DISK`, `TO VOLUME` TTL).

`merge_with_ttl_timeout` sets the minimum seconds between TTL merge triggers per table.

## Default Value

```sql
SELECT value
FROM system.merge_tree_settings
WHERE name = 'merge_with_ttl_timeout';
```

```text
value
14400
```

Default is 4 hours (14,400 seconds).

## Setting merge_with_ttl_timeout at Table Creation

```sql
CREATE TABLE logs (
    ts      DateTime,
    level   LowCardinality(String),
    message String
) ENGINE = MergeTree
PARTITION BY toDate(ts)
ORDER BY ts
TTL ts + INTERVAL 30 DAY DELETE
SETTINGS merge_with_ttl_timeout = 3600;  -- check for TTL merges every 1 hour
```

## Modifying on an Existing Table

```sql
ALTER TABLE logs MODIFY SETTING merge_with_ttl_timeout = 86400;   -- once per day
ALTER TABLE logs MODIFY SETTING merge_with_ttl_timeout = 1800;    -- every 30 minutes
```

## Choosing the Right Value

```text
Scenario                              Recommended Value
Real-time TTL enforcement (GDPR)      900 - 3600 (15 min - 1 hour)
Normal log retention                  3600 - 14400 (1 - 4 hours, default)
Archival / cold storage tiering       86400 (once per day)
Development / testing                 60 - 300 (very frequent)
```

## Using ttl_only_drop_parts for Efficient Deletion

Combined with `ttl_only_drop_parts = 1`, TTL merges drop entire parts rather than rewriting rows:

```sql
CREATE TABLE events (
    ts      DateTime,
    data    String
) ENGINE = MergeTree
PARTITION BY toDate(ts)
ORDER BY ts
TTL ts + INTERVAL 7 DAY DELETE
SETTINGS
    ttl_only_drop_parts = 1,
    merge_with_ttl_timeout = 3600;
```

With `ttl_only_drop_parts`, only a part whose ALL rows are expired is dropped. Align TTL with partition key for this optimization to work.

## Checking TTL Merge Status

```sql
-- View tables with TTL defined
SELECT
    name,
    engine_full,
    total_rows,
    total_bytes
FROM system.tables
WHERE engine LIKE '%MergeTree%'
  AND create_table_query LIKE '%TTL%';
```

```sql
-- Monitor active TTL merges
SELECT
    table,
    partition,
    elapsed,
    progress,
    is_mutation
FROM system.merges
WHERE table = 'logs';
```

## Forcing a TTL Merge Immediately

For testing or emergency data deletion:

```sql
ALTER TABLE logs MATERIALIZE TTL;
```

This triggers an immediate TTL merge on all parts, bypassing `merge_with_ttl_timeout`.

## Summary

`merge_with_ttl_timeout` sets the minimum interval between TTL-triggered merges for a MergeTree table. Lower values enforce data expiration more promptly (useful for GDPR or security requirements); higher values reduce merge I/O overhead. Use `ttl_only_drop_parts = 1` alongside month or day partition keys for maximum TTL efficiency, and use `ALTER TABLE ... MATERIALIZE TTL` to force immediate expiration when needed.
