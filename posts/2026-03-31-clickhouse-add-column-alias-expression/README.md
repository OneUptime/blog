# How to Add Column with ALIAS Expression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Alias, Virtual Column

Description: Learn how to add ALIAS columns in ClickHouse that compute values at query time without storing data on disk, and how to use them effectively.

---

An `ALIAS` column in ClickHouse is a virtual column whose value is computed on the fly at query time from an expression, without storing any data on disk. Unlike `MATERIALIZED` columns, ALIAS columns consume no storage space - the expression is evaluated each time the column is referenced in a query. They are ideal for backwards-compatible schema evolution, providing alternative names for expressions, and simplifying complex calculations used frequently in queries.

## Syntax

```sql
ALTER TABLE table_name
    ADD COLUMN column_name type ALIAS expression;
```

Or at table creation:

```sql
CREATE TABLE table_name (
    col1 type,
    col2 type ALIAS expression
) ENGINE = MergeTree() ORDER BY col1;
```

## Basic Example

Add an alias column that presents a duration in seconds instead of milliseconds:

```sql
ALTER TABLE events
    ADD COLUMN duration_s Float64 ALIAS duration_ms / 1000.0;
```

Add an alias for a frequently used date extraction:

```sql
ALTER TABLE events
    ADD COLUMN event_date Date ALIAS toDate(event_time);
```

## More Examples

Provide a user-friendly column name as an alias for a technical column:

```sql
ALTER TABLE api_requests
    ADD COLUMN response_time_ms UInt32 ALIAS latency_us / 1000;
```

Compute a derived boolean for convenience:

```sql
ALTER TABLE orders
    ADD COLUMN is_large_order UInt8 ALIAS (total_amount > 1000);
```

Normalize a string at query time without storing the result:

```sql
ALTER TABLE users
    ADD COLUMN email_domain String ALIAS extract(email, '@(.+)$');
```

Combine multiple columns into a label:

```sql
ALTER TABLE metrics
    ADD COLUMN full_metric_name String ALIAS concat(service, '.', metric_name);
```

## Key Difference: ALIAS vs MATERIALIZED vs DEFAULT

```sql
-- DEFAULT: stored if not provided on INSERT, can be overridden
ALTER TABLE events ADD COLUMN status String DEFAULT 'active';

-- MATERIALIZED: always computed at insert time, stored on disk, never supplied by user
ALTER TABLE events ADD COLUMN event_date Date MATERIALIZED toDate(event_time);

-- ALIAS: never stored, computed at query time when explicitly referenced
ALTER TABLE events ADD COLUMN duration_s Float64 ALIAS duration_ms / 1000.0;
```

| Property | DEFAULT | MATERIALIZED | ALIAS |
|---|---|---|---|
| Stored on disk | Yes | Yes | No |
| Supplied on INSERT | Optional | Never | Never |
| Disk space used | Yes | Yes | No |
| Query-time cost | None | None | Expression evaluation |

## Querying ALIAS Columns

ALIAS columns are not included in `SELECT *` by default. They must be referenced explicitly:

```sql
-- event_date ALIAS is NOT included
SELECT * FROM events LIMIT 3;

-- Explicitly reference the alias column
SELECT event_time, event_date, duration_s FROM events LIMIT 3;
```

To include ALIAS columns in `SELECT *`:

```sql
SET asterisk_include_alias_columns = 1;
SELECT * FROM events LIMIT 3;
```

## Using ALIAS Columns in WHERE and ORDER BY

ALIAS columns can be used anywhere a regular column can appear in a query:

```sql
-- Filter using an alias column
SELECT user_id, duration_s
FROM events
WHERE duration_s > 5.0
ORDER BY duration_s DESC
LIMIT 10;

-- Group by an alias column
SELECT event_date, count()
FROM events
GROUP BY event_date
ORDER BY event_date;
```

Note that ALIAS columns cannot be used in the table's `ORDER BY` or `PARTITION BY` clauses, because they are not stored on disk and cannot define physical data layout.

## Schema Evolution: Renaming a Column Transparently

A practical use of ALIAS is to provide backward compatibility when you rename or restructure a column:

```sql
-- Original column: latency_us
-- Rename to response_time_us via ALTER TABLE RENAME COLUMN
ALTER TABLE api_requests
    RENAME COLUMN latency_us TO response_time_us;

-- Add an alias for old queries that still use the old name
ALTER TABLE api_requests
    ADD COLUMN latency_us UInt32 ALIAS response_time_us;
```

Existing queries referencing `latency_us` continue to work without modification.

## Inspecting ALIAS Columns

View alias definitions in `system.columns`:

```sql
SELECT
    name,
    type,
    default_kind,
    default_expression
FROM system.columns
WHERE table = 'events'
  AND database = 'default'
  AND default_kind = 'ALIAS';
```

## Modifying an ALIAS Expression

To change the expression of an existing alias column, use `MODIFY COLUMN`:

```sql
-- Change the alias expression
ALTER TABLE events
    MODIFY COLUMN duration_s Float64 ALIAS duration_ms / 1000.0 + 0.0;

-- Remove the alias default to make it a plain column
ALTER TABLE events
    MODIFY COLUMN duration_s REMOVE ALIAS;
```

## Summary

`ALIAS` columns are virtual, zero-cost computed columns that evaluate their expression at query time and store nothing on disk. They are best used for convenience expressions, backwards-compatible column renaming, and frequently referenced derived values that do not need to be indexed or included in the sort key. Always reference ALIAS columns explicitly in SELECT - they are excluded from `SELECT *` unless `asterisk_include_alias_columns = 1` is set.
