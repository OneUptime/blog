# How to Add Column with MATERIALIZED Expression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, MATERIALIZED, Computed Column

Description: Learn how to add MATERIALIZED columns in ClickHouse that store computed values on disk, and how to backfill existing data with MATERIALIZE COLUMN.

---

A `MATERIALIZED` column in ClickHouse is a computed column whose value is derived from an expression at insert time and stored on disk like any other column. Unlike `DEFAULT` columns (which can be overridden by INSERT), a MATERIALIZED column is never supplied by the user - it is always computed from the expression. This makes it ideal for pre-computing derived values such as extracted date parts, normalized fields, or hash-based routing keys.

## Syntax

```sql
ALTER TABLE table_name
    ADD COLUMN column_name type MATERIALIZED expression;
```

Or at table creation:

```sql
CREATE TABLE table_name (
    col1 type,
    col2 type MATERIALIZED expression
) ENGINE = MergeTree() ORDER BY col1;
```

## Basic Example

Add a materialized column that extracts the date from a DateTime column:

```sql
ALTER TABLE events
    ADD COLUMN event_date Date MATERIALIZED toDate(event_time);
```

From this point on, every new row inserted into `events` will automatically have `event_date` set to `toDate(event_time)`. The value is stored on disk and does not require recomputation at query time.

## More Examples

Extract the hour from a timestamp for hourly bucketing:

```sql
ALTER TABLE events
    ADD COLUMN event_hour UInt8 MATERIALIZED toHour(event_time);
```

Compute a lowercase version of a string column for case-insensitive lookups:

```sql
ALTER TABLE users
    ADD COLUMN email_lower String MATERIALIZED lower(email);
```

Generate a hash-based shard key:

```sql
ALTER TABLE requests
    ADD COLUMN shard_key UInt32 MATERIALIZED cityHash64(request_id) % 16;
```

Concatenate multiple fields into a composite key:

```sql
ALTER TABLE metrics
    ADD COLUMN composite_key String MATERIALIZED concat(server_id, '-', metric_name);
```

## Behavior at INSERT

You cannot supply a value for a MATERIALIZED column in an INSERT statement - ClickHouse will reject or ignore it depending on settings. The value is always computed from the expression:

```sql
-- Correct: do not include event_date in the INSERT
INSERT INTO events (event_time, event_type, user_id, duration_ms)
VALUES ('2024-03-15 10:30:00', 'click', 42, 120);

-- event_date will be automatically set to '2024-03-15'
SELECT event_time, event_date FROM events LIMIT 1;
```

## Backfilling Existing Data with MATERIALIZE COLUMN

Adding a MATERIALIZED column via `ALTER TABLE` only physically writes the column for new inserts. For existing rows, ClickHouse evaluates the expression on-the-fly at query time (which can be slower on large tables) until you run `MATERIALIZE COLUMN` to write the computed values to disk:

```sql
ALTER TABLE events
    MATERIALIZE COLUMN event_date;
```

This schedules an asynchronous mutation that rewrites all existing parts, computing the expression for every row. Monitor progress:

```sql
SELECT
    mutation_id,
    command,
    is_done,
    parts_to_do,
    latest_fail_reason
FROM system.mutations
WHERE table = 'events'
ORDER BY create_time DESC
LIMIT 5;
```

To backfill only a specific partition:

```sql
ALTER TABLE events
    MATERIALIZE COLUMN event_date IN PARTITION '2024-03';
```

## Using MATERIALIZED Columns in ORDER BY and Indexes

A common pattern is to add a MATERIALIZED column and then use it as part of the sort key or a secondary index:

```sql
-- Add materialized date column
ALTER TABLE events
    ADD COLUMN event_date Date MATERIALIZED toDate(event_time);

-- Add a minmax index on the materialized column
ALTER TABLE events
    ADD INDEX idx_event_date event_date TYPE minmax GRANULARITY 1;

-- Use it in ORDER BY on a new table design
CREATE TABLE events_v2 (
    event_time   DateTime64(3),
    event_date   Date MATERIALIZED toDate(event_time),
    event_type   LowCardinality(String),
    user_id      UInt64,
    duration_ms  UInt32
) ENGINE = MergeTree()
PARTITION BY event_date
ORDER BY (event_date, event_type, user_id);
```

## Querying MATERIALIZED Columns

MATERIALIZED columns are not included in `SELECT *` by default. Reference them explicitly:

```sql
-- This does NOT include event_date
SELECT * FROM events LIMIT 3;

-- This does
SELECT event_time, event_date, event_type FROM events LIMIT 3;
```

To include MATERIALIZED columns in `SELECT *`, set:

```sql
SET asterisk_include_materialized_columns = 1;
SELECT * FROM events LIMIT 3;
```

## Summary

`MATERIALIZED` columns store computed values on disk, computed once at insert time from a fixed expression. They cannot be overridden on INSERT, making them reliable for derived fields like extracted dates, normalized strings, or hash keys. Add them with `ALTER TABLE ADD COLUMN ... MATERIALIZED expr` and backfill existing rows with `MATERIALIZE COLUMN`. Use them in partition keys, sort keys, and indexes to accelerate queries on derived values.
