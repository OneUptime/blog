# How to Handle Zero-Downtime Schema Migrations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Migration, Zero Downtime, ALTER TABLE, Production

Description: Learn techniques for applying ClickHouse schema changes with zero downtime, including additive changes, dual-write patterns, and safe column modifications.

---

ClickHouse supports online schema changes for many operations, but some alterations require careful coordination to avoid impacting running queries. Understanding which changes are safe and how to execute the rest without downtime is critical for production systems.

## Safe Operations (No Downtime)

These operations are online and non-blocking in ClickHouse:

```sql
-- Add a new nullable or default-valued column
ALTER TABLE events ADD COLUMN IF NOT EXISTS country LowCardinality(String) DEFAULT '';

-- Add an index
ALTER TABLE events ADD INDEX idx_event (event_type) TYPE bloom_filter GRANULARITY 4;

-- Add a projection
ALTER TABLE events ADD PROJECTION proj_by_user (SELECT * ORDER BY user_id, ts);

-- Modify column default (metadata only)
ALTER TABLE events MODIFY COLUMN country DEFAULT 'unknown';
```

## Potentially Blocking Operations

```sql
-- Changing column type requires data rewrite
-- Plan this during low-traffic windows
ALTER TABLE events MODIFY COLUMN value Float64;

-- Renaming columns is not supported - requires a workaround
```

## Column Rename Pattern (No Native Support)

ClickHouse does not support `RENAME COLUMN` directly in older versions (added in 20.4+):

```sql
-- 20.4+ only
ALTER TABLE events RENAME COLUMN old_field TO new_field;

-- For older versions - add + migrate + drop
ALTER TABLE events ADD COLUMN new_field String DEFAULT '';
-- Backfill:
ALTER TABLE events UPDATE new_field = old_field WHERE 1;
-- After reads are migrated in application:
ALTER TABLE events DROP COLUMN old_field;
```

## Expand-Contract Pattern

Follow the expand-contract pattern for breaking changes:

1. Expand: Add new column/table alongside the old one
2. Migrate: Backfill data, update application to write to both
3. Switch: Application reads from new column/table only
4. Contract: Drop old column/table after cutover

```sql
-- Step 1: Add new column
ALTER TABLE events ADD COLUMN user_uuid UUID DEFAULT generateUUIDv4();

-- Step 2: Backfill
ALTER TABLE events UPDATE user_uuid = toUUID(user_id) WHERE 1;

-- Step 3: Application switches to user_uuid
-- Step 4: Drop old column (after verification)
ALTER TABLE events DROP COLUMN user_id;
```

## Checking Mutation Progress

```sql
SELECT
    database, table, mutation_id,
    command, is_done, parts_to_do
FROM system.mutations
WHERE is_done = 0;
```

## Distributed Tables

For distributed tables, apply ALTER on each shard's local table then refresh the distributed table:

```bash
# Apply on each shard node
clickhouse-client --host shard1 --query "ALTER TABLE events_local ADD COLUMN ..."
clickhouse-client --host shard2 --query "ALTER TABLE events_local ADD COLUMN ..."
```

## Summary

Zero-downtime schema migrations in ClickHouse rely on additive-first changes, the expand-contract pattern, and careful sequencing. Most column additions are online; column type changes and renames require explicit migration steps.
