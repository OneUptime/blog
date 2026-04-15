# How to Optimize ClickHouse Queries with PREWHERE vs WHERE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PREWHERE, WHERE, Query Optimization, Performance

Description: Learn the difference between PREWHERE and WHERE in ClickHouse and how to use PREWHERE to drastically reduce IO for selective filter conditions.

---

`PREWHERE` is a ClickHouse-specific optimization that filters rows before reading all columns, reducing IO significantly when applied to selective conditions on narrow columns. Understanding when and how to use it is key to fast analytical queries.

## How PREWHERE Works

ClickHouse reads data column-by-column from storage. With `WHERE`, all columns in the SELECT are read first, then filtered. With `PREWHERE`, ClickHouse:

1. Reads only the PREWHERE column(s)
2. Evaluates the filter
3. Reads remaining columns only for rows that pass

This can reduce IO by orders of magnitude for selective filters.

## Basic Example

```sql
-- WHERE reads all columns first
SELECT user_id, event_type, properties
FROM events
WHERE country = 'US';

-- PREWHERE reads country first, then only matching rows' other columns
SELECT user_id, event_type, properties
FROM events
PREWHERE country = 'US';
```

If only 5% of rows match `country = 'US'`, `PREWHERE` reads the other columns for just 5% of rows.

## Automatic PREWHERE Optimization

ClickHouse automatically moves eligible `WHERE` conditions to `PREWHERE` via the `optimize_move_to_prewhere` setting (enabled by default):

```sql
SET optimize_move_to_prewhere = 1;

EXPLAIN SYNTAX
SELECT * FROM events WHERE country = 'US' AND ts > now() - INTERVAL 1 DAY;
```

ClickHouse will show that it moved the selective condition to PREWHERE.

## When to Use PREWHERE Manually

Force PREWHERE for conditions you know are highly selective:

```sql
SELECT *
FROM large_events_table
PREWHERE status = 'error'
WHERE ts BETWEEN '2026-01-01' AND '2026-01-31';
```

## PREWHERE Limitations

- Only applies to MergeTree family tables
- The automatic `optimize_move_to_prewhere` will not move conditions containing non-deterministic functions (e.g., `rand()`) to PREWHERE
- ALIAS columns (computed, not stored on disk) are skipped by the automatic PREWHERE optimizer since they require evaluation at query time
- When using `FINAL`, both `optimize_move_to_prewhere` and `optimize_move_to_prewhere_if_final` must be enabled, and results may be incorrect for PREWHERE on columns not in the ORDER BY

## Checking PREWHERE Usage in EXPLAIN

```sql
EXPLAIN SYNTAX
SELECT count()
FROM events
WHERE country = 'US' AND status = 'active';
```

The output will show the rewritten query with eligible conditions moved to a `PREWHERE` clause, confirming the optimization was applied.

## Combining PREWHERE and WHERE

Use PREWHERE for the most selective filter and WHERE for the rest:

```sql
SELECT user_id, event_type
FROM events
PREWHERE status = 'error'
WHERE ts >= today() - 7
  AND severity >= 3;
```

## Performance Measurement

Compare execution with and without PREWHERE:

```sql
-- Check bytes read
SELECT
    query,
    read_bytes,
    result_rows
FROM system.query_log
WHERE query LIKE '%SELECT * FROM events%'
ORDER BY event_time DESC
LIMIT 5;
```

## Summary

`PREWHERE` reduces IO by reading narrow, selective columns before loading full rows. ClickHouse applies it automatically for most cases, but manual use and awareness of when it applies helps you write maximally efficient analytical queries.
