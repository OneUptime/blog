# How to Handle Schema Evolution in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Evolution, DDL, Migration, MergeTree

Description: Learn how to safely evolve ClickHouse table schemas by adding, modifying, and removing columns without downtime or data loss.

---

## Schema Evolution in an Append-Only Database

ClickHouse supports online schema changes for most operations - adding columns, modifying defaults, and changing codecs - without requiring table rewrites. Understanding which operations are safe and which require careful planning prevents downtime.

## Adding a New Column

Adding columns is safe and instant - existing parts are not rewritten:

```sql
ALTER TABLE http_logs ADD COLUMN region LowCardinality(String) DEFAULT '';
```

Existing rows will return the default value for the new column until parts are merged or explicitly rebuilt.

## Adding a Column with a Materialized Default

Compute the column value from existing data:

```sql
ALTER TABLE http_logs
    ADD COLUMN is_error UInt8 MATERIALIZED (status_code >= 500 ? 1 : 0);
```

## Renaming a Column

```sql
ALTER TABLE http_logs RENAME COLUMN respons_time TO response_time_ms;
```

This is an instant metadata-only operation - no data rewrite.

## Modifying Column Type

Type changes require a mutation (full part rewrite) - plan accordingly:

```sql
-- Widen a type (safe, but triggers mutation)
ALTER TABLE http_logs MODIFY COLUMN user_id UInt64;
```

Monitor mutation progress:

```sql
SELECT command, parts_to_do, is_done
FROM system.mutations
WHERE table = 'http_logs' AND is_done = 0;
```

## Dropping a Column

Column drops are instant - ClickHouse marks the column as dropped in metadata and stops writing it:

```sql
ALTER TABLE http_logs DROP COLUMN legacy_field;
```

Data in existing parts is not immediately reclaimed but disappears after the next merge.

## Handling Nullable Columns

Prefer default values over NULL where possible. If NULL is needed:

```sql
ALTER TABLE http_logs ADD COLUMN user_agent Nullable(String) DEFAULT NULL;
```

But note that Nullable columns have overhead - consider using an empty string sentinel instead.

## Schema Changes Across a Distributed Cluster

Use ON CLUSTER to apply DDL across all nodes in the cluster:

```sql
ALTER TABLE http_logs ON CLUSTER production_cluster
    ADD COLUMN region LowCardinality(String) DEFAULT '';
```

## Versioning Schemas with Comments

Document schema changes inline:

```sql
ALTER TABLE http_logs
    COMMENT COLUMN user_id 'Added v2.3: migrated from String to UInt64 for join performance';
```

## Backward Compatibility Strategy

When removing a column used by application queries:
1. Add a default/alias for the old column name
2. Migrate application queries to the new column
3. Drop the old column after all consumers are updated

```sql
-- Step 1: add alias
ALTER TABLE http_logs ADD COLUMN old_user_id ALIAS toString(user_id);

-- Step 3: drop after migration
ALTER TABLE http_logs DROP COLUMN old_user_id;
```

## Summary

ClickHouse schema evolution is flexible for additive changes - adding columns, changing defaults, and dropping columns are instant metadata operations. Type changes that trigger mutations should be planned for low-traffic windows and monitored via system.mutations. Use ON CLUSTER for coordinated multi-node changes and document schema history with column comments.
