# How to Rename Columns in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Schema Migration

Description: Learn how to rename columns in ClickHouse using ALTER TABLE RENAME COLUMN, handle dependent views and materialized columns, and apply changes across a cluster.

---

Renaming a column in ClickHouse is a metadata-only operation - no data is rewritten on disk. The column name change is recorded in the table schema and takes effect immediately. However, renaming a column that is referenced by materialized views, other materialized columns, or ordering keys requires extra care, as those references are not updated automatically.

## Basic RENAME COLUMN Syntax

```sql
ALTER TABLE events
    RENAME COLUMN brwsr TO browser;
```

Multiple columns can be renamed in a single statement:

```sql
ALTER TABLE events
    RENAME COLUMN brwsr TO browser,
    RENAME COLUMN usr_id TO user_id,
    RENAME COLUMN ts TO created_at;
```

Batching renames into one statement reduces the number of schema version increments.

## Checking Dependencies Before Renaming

Before renaming a column, check whether it is used in any of these contexts:

### Ordering and Partition Keys

```sql
-- Inspect the table's sorting and partition expressions
SELECT
    name,
    sorting_key,
    partition_key,
    primary_key
FROM system.tables
WHERE database = 'default'
  AND name = 'events';
```

A column that appears in `ORDER BY` or `PRIMARY KEY` cannot be renamed directly - the statement will fail with SQL Error [524]. You must recreate the table to change those column names.

### Materialized Columns

```sql
-- Find columns in this table that have a materialized expression
SELECT name, default_kind, default_expression
FROM system.columns
WHERE database = 'default'
  AND table = 'events'
  AND default_kind IN ('MATERIALIZED', 'ALIAS');
```

If the column you want to rename is referenced by a `MATERIALIZED` or `ALIAS` expression, rename the source column first, then update the dependent column's expression with `MODIFY COLUMN`.

### Materialized Views

```sql
-- Find materialized views that select from this table
SELECT name, create_table_query
FROM system.tables
WHERE engine = 'MaterializedView'
  AND create_table_query LIKE '%events%';
```

Materialized views in ClickHouse store their SELECT query text. A rename does not update the view definition, so the view will break if the old column name no longer exists.

## Handling Materialized View Dependencies

The safest approach when a materialized view depends on the column being renamed is:

1. Drop the materialized view.
2. Rename the column.
3. Recreate the materialized view using the new name.

```sql
-- Step 1: Drop dependent materialized view
DROP TABLE events_by_browser_mv;

-- Step 2: Rename the column
ALTER TABLE events
    RENAME COLUMN brwsr TO browser;

-- Step 3: Recreate the materialized view with new column name
CREATE MATERIALIZED VIEW events_by_browser_mv
ENGINE = SummingMergeTree
ORDER BY (browser, event_date)
POPULATE AS
SELECT
    browser,
    toDate(created_at) AS event_date,
    count()            AS total
FROM events
GROUP BY browser, event_date;
```

## Complete Example

```sql
-- Original table with poorly named columns
CREATE TABLE page_views
(
    pgvw_id  UUID DEFAULT generateUUIDv4(),
    usr      UInt64,
    pg       String,
    ref      String,
    dur_ms   UInt32,
    evt_ts   DateTime
)
ENGINE = MergeTree
ORDER BY (usr, evt_ts);

-- Rename non-key columns to readable names in one statement
-- Note: usr and evt_ts are in the ORDER BY key and cannot be renamed
ALTER TABLE page_views
    RENAME COLUMN pgvw_id TO view_id,
    RENAME COLUMN pg      TO page_path,
    RENAME COLUMN ref     TO referrer,
    RENAME COLUMN dur_ms  TO duration_ms;

-- Verify the updated schema
DESCRIBE TABLE page_views;
```

## ON CLUSTER for Distributed Setups

Apply the rename across all shards and replicas in one command:

```sql
ALTER TABLE page_views ON CLUSTER '{cluster}'
    RENAME COLUMN pg TO page_path;
```

As with other DDL operations, omitting `ON CLUSTER` applies the change only on the receiving node. Queries routed to other nodes will continue to use the old column name and may behave inconsistently.

## Summary

`ALTER TABLE RENAME COLUMN` is a fast, metadata-only operation in ClickHouse. Before renaming, verify the column is not used in ordering/primary keys (which block the rename), materialized expressions, or materialized view queries - materialized expressions and views are not updated automatically. In cluster deployments, always include `ON CLUSTER` to ensure consistent naming across all nodes.
