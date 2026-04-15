# How to Handle Schema Changes During ClickHouse Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upgrade, Schema, ALTER TABLE, Migration

Description: Learn how to safely manage schema changes during ClickHouse version upgrades, including column additions, type changes, and engine modifications.

---

ClickHouse upgrades sometimes require schema changes to take advantage of new features or to comply with deprecated behavior. Handling these changes correctly prevents data loss and minimizes downtime.

## Understanding Schema Compatibility

ClickHouse stores table metadata in `/var/lib/clickhouse/metadata/`. Most upgrades are schema-compatible - you can upgrade the server without changing any table definitions. However, some upgrades introduce new table settings or deprecate old syntax.

## Pre-Upgrade Schema Audit

Before upgrading, audit your current schema for potential compatibility issues:

```sql
-- Check for deprecated settings
SELECT
    database,
    name AS table_name,
    engine,
    engine_full
FROM system.tables
WHERE
    database NOT IN ('system', 'information_schema')
    AND (
        engine_full LIKE '%old_setting%'
        OR engine_full LIKE '%deprecated%'
    );
```

```sql
-- Check column types that may be affected
SELECT
    database,
    table,
    name AS column_name,
    type
FROM system.columns
WHERE
    database NOT IN ('system', 'information_schema')
    AND type IN ('Date', 'DateTime')
ORDER BY database, table, column_name;
```

## Adding Columns Safely During Upgrades

New ClickHouse versions often support new column types. Add columns after upgrading all nodes:

```sql
-- Add a new column with a default value (online operation)
ALTER TABLE events
ADD COLUMN user_segment LowCardinality(String) DEFAULT '';

-- Verify the column was added
DESCRIBE TABLE events;
```

## Modifying Column Types

Type changes require care - not all conversions are safe online:

```sql
-- Safe: widening numeric types
ALTER TABLE events MODIFY COLUMN event_count UInt64;

-- Safe: adding Nullable wrapper
ALTER TABLE events MODIFY COLUMN referrer Nullable(String);

-- Requires rewrite (avoid on large tables during upgrade)
-- ALTER TABLE events MODIFY COLUMN timestamp DateTime64(3);
```

For large tables, use a staged migration instead of modifying in place:

```sql
-- 1. Add new column
ALTER TABLE events ADD COLUMN timestamp_ns DateTime64(9) DEFAULT toDateTime64(timestamp, 9);

-- 2. Materialize the column in existing parts
ALTER TABLE events MATERIALIZE COLUMN timestamp_ns;

-- 3. After validation, drop old column
ALTER TABLE events DROP COLUMN timestamp;

-- 4. Rename new column
ALTER TABLE events RENAME COLUMN timestamp_ns TO timestamp;
```

## Handling Deprecated Table Settings

When upgrading to a version that deprecates table settings, update them:

```sql
-- Check current settings
SELECT name, value FROM system.merge_tree_settings
WHERE changed = 1;

-- Update deprecated settings on a table
ALTER TABLE events
MODIFY SETTING
    min_merge_bytes_to_use_direct_io = 10737418240,
    merge_with_ttl_timeout = 86400;
```

## Schema Changes in Replicated Clusters

For replicated tables, schema changes propagate automatically via ZooKeeper:

```sql
-- ALTER on any replica propagates to all replicas
ALTER TABLE events ADD COLUMN new_field String DEFAULT '';

-- Check replication of the ALTER
SELECT
    database,
    table,
    type,
    create_time,
    source_replica
FROM system.replication_queue
WHERE type LIKE 'ALTER%'
ORDER BY create_time;
```

## Validating Schema After Upgrade

After upgrading, verify the schema is intact:

```sql
-- Check all tables are accessible
SELECT database, name, engine, total_rows
FROM system.tables
WHERE database NOT IN ('system', 'information_schema')
ORDER BY database, name;

-- Verify column counts
SELECT database, table, count() AS column_count
FROM system.columns
WHERE database NOT IN ('system', 'information_schema')
GROUP BY database, table
ORDER BY database, table;
```

## Summary

Schema changes during ClickHouse upgrades should be minimal and conservative. Audit your schema before upgrading for deprecated settings and incompatible types, make additive changes (new columns) rather than destructive ones during the upgrade window, and use staged migrations for large table modifications. Always validate schema integrity after completing the upgrade.
