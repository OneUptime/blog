# How to Handle Schema Migrations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Migration, ALTER TABLE, DevOps, Database

Description: Learn how to safely handle schema migrations in ClickHouse, including adding columns, changing types, and managing distributed cluster changes.

---

## Schema Migrations in ClickHouse

ClickHouse schema migrations differ significantly from traditional relational databases. Most `ALTER TABLE` operations are metadata changes and complete instantly. However, modifying sort keys or changing data types requires more careful planning.

## Adding Columns

Adding a new nullable or default column is instant and non-blocking:

```sql
ALTER TABLE events
ADD COLUMN browser LowCardinality(String) DEFAULT '';

ALTER TABLE events
ADD COLUMN session_duration UInt32 DEFAULT 0 AFTER user_id;
```

New parts get the column immediately. Old parts return the default value until they are merged.

## Dropping Columns

Dropping a column is also a metadata operation:

```sql
ALTER TABLE events
DROP COLUMN legacy_field;
```

The column data is removed during the next merge. Use `CLEAR COLUMN` if you need to free disk space sooner:

```sql
ALTER TABLE events
CLEAR COLUMN legacy_field IN PARTITION '202601';
```

## Renaming Columns

```sql
ALTER TABLE events
RENAME COLUMN old_name TO new_name;
```

This is a metadata-only change and completes instantly.

## Changing Column Types

Type changes require data conversion and are not instant:

```sql
ALTER TABLE events
MODIFY COLUMN value Float64;
```

For large tables, run this during low-traffic periods and monitor with:

```sql
SELECT * FROM system.mutations
WHERE table = 'events' AND is_done = 0;
```

## Migration Tracking Table

Track applied migrations in a dedicated table:

```sql
CREATE TABLE schema_migrations
(
    version     String,
    applied_at  DateTime DEFAULT now(),
    checksum    String
)
ENGINE = MergeTree()
ORDER BY version;
```

Check before running a migration:

```sql
SELECT count() FROM schema_migrations WHERE version = '20260331_001';
```

## Distributed Table Migrations

On a cluster, run DDL with `ON CLUSTER`:

```sql
ALTER TABLE events ON CLUSTER '{cluster}'
ADD COLUMN new_field String DEFAULT '';
```

This propagates the change to all shards and replicas. The query is eventually executed on each host, even if some nodes are temporarily unavailable.

## Summary

ClickHouse schema migrations are mostly low-risk because most `ALTER TABLE` operations are instant metadata changes. Track migrations in a dedicated table, use `ON CLUSTER` for distributed deployments, and monitor `system.mutations` when performing type conversions. Avoid modifying sort keys or partition expressions on large tables without careful planning.
