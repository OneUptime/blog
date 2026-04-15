# How to Use system.settings to View All ClickHouse Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Setting, Configuration, System Table, Administration

Description: Learn how to query system.settings to view current setting values, find changed defaults, understand setting types, and audit session and profile configuration.

---

`system.settings` exposes every ClickHouse setting visible in the current session - including defaults, values changed by the user profile, and values overridden at the session level. It is the definitive way to see exactly what configuration is active when a query runs, and the fastest way to find the name and type of a setting you want to change.

## What system.settings Contains

```sql
DESCRIBE system.settings;
```

Key columns:

| Column | Type | Meaning |
|---|---|---|
| `name` | String | Setting name |
| `value` | String | Current value as a string |
| `changed` | UInt8 | 1 if the value differs from the compiled-in default |
| `description` | String | Human-readable description of what the setting does |
| `min` | Nullable(String) | Minimum allowed value |
| `max` | Nullable(String) | Maximum allowed value |
| `readonly` | UInt8 | 1 if the setting cannot be changed at session level |
| `type` | String | Data type of the setting value |
| `is_obsolete` | UInt8 | 1 if the setting is deprecated |

## List All Settings

```sql
SELECT name, value, changed, type
FROM system.settings
ORDER BY name;
```

## Show Only Changed Settings

```sql
SELECT name, value, description
FROM system.settings
WHERE changed = 1
ORDER BY name;
```

This is the most useful query for auditing what is non-default in your current session or user profile. On a freshly connected session with no profile overrides, this typically returns an empty result.

## Search for a Setting by Keyword

```sql
SELECT name, value, description
FROM system.settings
WHERE name LIKE '%memory%'
ORDER BY name;
```

```sql
SELECT name, value, description
FROM system.settings
WHERE name LIKE '%timeout%'
ORDER BY name;
```

```sql
SELECT name, value, description
FROM system.settings
WHERE lower(description) LIKE '%compression%'
ORDER BY name;
```

## Key Performance Settings

```sql
SELECT name, value, description
FROM system.settings
WHERE name IN (
    'max_memory_usage',
    'max_bytes_before_external_group_by',
    'max_bytes_before_external_sort',
    'max_threads',
    'max_block_size',
    'max_insert_block_size',
    'min_insert_block_size_rows',
    'max_execution_time',
    'distributed_product_mode',
    'allow_experimental_parallel_reading_from_replicas',
    'max_parallel_replicas',
    'use_uncompressed_cache',
    'load_balancing'
)
ORDER BY name;
```

## Key Replication and Consistency Settings

```sql
SELECT name, value, description
FROM system.settings
WHERE name IN (
    'select_sequential_consistency',
    'insert_quorum',
    'insert_quorum_timeout',
    'insert_quorum_parallel',
    'replication_alter_partitions_sync',
    'prefer_localhost_replica'
)
ORDER BY name;
```

## Verify Memory Limits

```sql
SELECT
    name,
    formatReadableSize(toUInt64(value)) AS readable_value,
    description
FROM system.settings
WHERE name IN (
    'max_memory_usage',
    'max_bytes_before_external_group_by',
    'max_bytes_before_external_sort'
)
ORDER BY name;
```

## Change a Setting at Session Level

```sql
-- Set max memory for this session
SET max_memory_usage = 10000000000;  -- 10 GB

-- Verify it was applied
SELECT name, value, changed
FROM system.settings
WHERE name = 'max_memory_usage';
```

## Change a Setting for a Specific Query

```sql
SELECT
    user_id,
    count() AS events
FROM very_large_table
GROUP BY user_id
SETTINGS
    max_memory_usage = 20000000000,
    max_threads = 8;
```

The `SETTINGS` clause at the end of a SELECT overrides values only for that query.

## View Settings Enforced by a User Profile

User profiles in `users.xml` set constraints on settings. The `min` and `max` columns show those constraints:

```sql
SELECT name, value, min, max, readonly, description
FROM system.settings
WHERE min IS NOT NULL OR max IS NOT NULL OR readonly = 1
ORDER BY name;
```

## All Readonly Settings

```sql
SELECT name, value, description
FROM system.settings
WHERE readonly = 1
ORDER BY name;
```

A `readonly` value of 1 means the current user's profile or constraints prevent changing this setting with `SET`. An administrator can adjust these constraints in the user profile configuration without requiring a server restart.

## Deprecated Settings

```sql
SELECT name, value, description
FROM system.settings
WHERE is_obsolete = 1
ORDER BY name;
```

Remove these from your configuration files and client code to avoid warnings.

## Export Settings as Key-Value for Diffing

```bash
#!/usr/bin/env bash
# Export all non-default settings for comparison between nodes

clickhouse-client --query "
    SELECT name, value
    FROM system.settings
    WHERE changed = 1
    ORDER BY name
    FORMAT TSV
" > /tmp/clickhouse-settings-$(hostname).tsv

echo "Saved to /tmp/clickhouse-settings-$(hostname).tsv"
```

Run this on two nodes and diff the output to find configuration discrepancies.

## system.merge_tree_settings for Storage Settings

For MergeTree-specific storage engine settings, use the companion table:

```sql
SELECT name, value, changed, description
FROM system.merge_tree_settings
WHERE changed = 1
ORDER BY name;
```

```sql
-- All merge_tree settings related to parts
SELECT name, value, description
FROM system.merge_tree_settings
WHERE name LIKE '%parts%'
ORDER BY name;
```

## Set MergeTree Settings on a Table

```sql
ALTER TABLE default.events
    MODIFY SETTING
        merge_with_ttl_timeout = 3600,
        max_parts_in_total = 100000;

-- Verify the per-table settings
SHOW CREATE TABLE default.events;
```

## Common Pitfalls

- `system.settings` reflects the session context of the query that reads it. Two connections may see different values if they are using different user profiles or have different `SET` calls in their session.
- Setting values are always returned as strings regardless of their actual type. Use `toUInt64(value)` or `toFloat64(value)` when you need numeric comparison.
- Some settings appear in both `system.settings` and `system.merge_tree_settings`. The storage-level settings in `merge_tree_settings` take precedence for MergeTree tables.

## Summary

`system.settings` is the definitive reference for the configuration active in your current session. Use it to find setting names by keyword, audit non-default values, check enforcement constraints, and verify that `SET` commands took effect. Pair it with `system.merge_tree_settings` to get full coverage of both query-level and storage-level configuration.
