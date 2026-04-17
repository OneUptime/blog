# How to Alter Table TTL in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, TTL, Data Retention

Description: Learn how to add, modify, and remove TTL rules in ClickHouse at the column and table level for automatic data retention and expiration policies.

---

TTL (Time-To-Live) in ClickHouse automates data lifecycle management. You can define TTL rules at the column level (to reset a column's value after expiry) or at the table level (to delete or move rows to another storage volume after expiry). This post explains how to add, modify, and remove TTL rules on an existing table using `ALTER TABLE MODIFY TTL` and `ALTER TABLE REMOVE TTL`.

## TTL Basics

A TTL expression is always relative to a `DateTime` or `Date` column. The simplest form is:

```sql
TTL time_column + INTERVAL 30 DAY
```

This means: expire the row (or column value) 30 days after the value in `time_column`.

## Column-Level TTL

Column TTL resets the column value to its default when the row's TTL expires. The row itself is not deleted.

### Add Column TTL

```sql
ALTER TABLE events
    MODIFY COLUMN sensitive_data String TTL created_at + INTERVAL 90 DAY;
```

After 90 days, `sensitive_data` is reset to `''` (the String default) during the next merge.

### Remove Column TTL

```sql
ALTER TABLE events
    MODIFY COLUMN sensitive_data REMOVE TTL;
```

Use `MODIFY COLUMN ... REMOVE TTL` to drop the TTL from a column. Reissuing `MODIFY COLUMN` without the `TTL` clause does **not** remove an existing TTL — the `REMOVE TTL` clause is required.

## Table-Level TTL

Table TTL controls row-level expiry, with optional actions: `DELETE` (default), `TO DISK`, or `TO VOLUME`.

### Add Table TTL

```sql
ALTER TABLE events
    MODIFY TTL created_at + INTERVAL 1 YEAR;
```

Rows older than 1 year are deleted during background merges.

### TTL with Move to Volume

```sql
ALTER TABLE events
    MODIFY TTL
        created_at + INTERVAL 30 DAY  TO VOLUME 'warm',
        created_at + INTERVAL 180 DAY TO VOLUME 'cold',
        created_at + INTERVAL 365 DAY DELETE;
```

This three-tier policy moves data to progressively cheaper storage before final deletion.

### TTL with Move to Disk

```sql
ALTER TABLE metrics
    MODIFY TTL
        recorded_at + INTERVAL 7 DAY  TO DISK 'ssd',
        recorded_at + INTERVAL 90 DAY TO DISK 'hdd';
```

### Remove Table TTL

```sql
ALTER TABLE events
    REMOVE TTL;
```

This removes all table-level TTL rules. Existing data is not immediately deleted - TTL removal stops future expiry operations.

## Complete Example

```sql
-- Create a table with initial TTL
CREATE TABLE audit_logs
(
    event_id    UUID DEFAULT generateUUIDv4(),
    user_id     UInt64,
    action      LowCardinality(String),
    ip_address  String,
    payload     String,
    created_at  DateTime DEFAULT now()
)
ENGINE = MergeTree
ORDER BY (user_id, created_at)
TTL created_at + INTERVAL 90 DAY;

-- Business requirement changes: extend retention to 1 year
ALTER TABLE audit_logs
    MODIFY TTL created_at + INTERVAL 365 DAY;

-- Add column-level TTL to purge raw payload sooner than the row
ALTER TABLE audit_logs
    MODIFY COLUMN payload String TTL created_at + INTERVAL 30 DAY;

-- Later: remove TTL entirely (e.g., regulatory hold)
ALTER TABLE audit_logs
    REMOVE TTL;

-- Verify current TTL rules
SELECT name, engine_full
FROM system.tables
WHERE database = 'default'
  AND name = 'audit_logs';
```

## Triggering TTL Materialization

TTL is enforced during background merges. To apply TTL immediately on existing parts, use:

```sql
ALTER TABLE audit_logs
    MATERIALIZE TTL;
```

This issues a mutation that rewrites all parts and applies current TTL rules.

## Monitoring TTL

Check which parts have TTL-expired rows pending cleanup:

```sql
SELECT
    table,
    name AS part_name,
    min_time,
    max_time,
    rows
FROM system.parts
WHERE database = 'default'
  AND table = 'audit_logs'
  AND active
ORDER BY min_time;
```

Track TTL mutations:

```sql
SELECT mutation_id, command, is_done, parts_to_do
FROM system.mutations
WHERE table = 'audit_logs'
  AND command LIKE '%TTL%'
ORDER BY create_time DESC;
```

## ON CLUSTER for Distributed Setups

```sql
ALTER TABLE audit_logs ON CLUSTER '{cluster}'
    MODIFY TTL created_at + INTERVAL 365 DAY;

ALTER TABLE audit_logs ON CLUSTER '{cluster}'
    MATERIALIZE TTL;
```

## Summary

ClickHouse TTL rules at the column level reset values to defaults on expiry, while table-level TTL deletes or moves rows to other storage tiers. Use `ALTER TABLE MODIFY TTL` to add or change TTL rules, `ALTER TABLE REMOVE TTL` to disable them, and `ALTER TABLE MATERIALIZE TTL` to apply rules to existing data immediately. Always use `ON CLUSTER` in distributed environments.
