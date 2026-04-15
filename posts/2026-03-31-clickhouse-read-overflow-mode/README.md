# How to Use read_overflow_mode Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, read_overflow_mode, Query Limit, Resource Control, Setting, Overflow Mode

Description: Learn how read_overflow_mode controls ClickHouse behavior when a query reads more rows or bytes than allowed by max_rows_to_read or max_bytes_to_read.

---

ClickHouse provides resource limits to prevent runaway queries from consuming too much data. When a query exceeds the `max_rows_to_read` or `max_bytes_to_read` limits, `read_overflow_mode` determines what happens next - either throw an error or return partial results.

## What is read_overflow_mode?

`read_overflow_mode` is a setting that takes one of two values:

- `throw` (default) - ClickHouse throws an exception and aborts the query when the read limit is exceeded
- `break` - ClickHouse stops reading and returns whatever results were gathered so far

It pairs with:
- `max_rows_to_read` - maximum number of rows to read from a table
- `max_bytes_to_read` - maximum number of bytes to read from storage

## Basic Usage

Set limits and behavior together:

```sql
SELECT user_id, count() AS events
FROM user_events
GROUP BY user_id
SETTINGS
    max_rows_to_read    = 10000000,
    max_bytes_to_read   = 1073741824,  -- 1 GB
    read_overflow_mode  = 'throw';
```

With `throw`, if more than 10M rows need to be read, the query fails with an error like `Limit for rows (controlled by 'max_rows_to_read' setting) exceeded`.

## Using break Mode for Approximate Results

When you want partial results instead of an error:

```sql
SELECT
    toDate(ts) AS day,
    count()    AS events
FROM clickstream
GROUP BY day
ORDER BY day DESC
SETTINGS
    max_rows_to_read   = 5000000,
    read_overflow_mode = 'break';
```

This returns data from only the rows that were read before the limit was hit. The result is partial but does not raise an exception - useful for dashboard queries where an approximate answer is acceptable.

## Setting User-Level Defaults

You can apply limits per user profile in `users.xml` or via SQL:

```sql
ALTER USER analyst
    SETTINGS
        max_rows_to_read   = 50000000   MAX 100000000,
        read_overflow_mode = 'throw';
```

This prevents analysts from accidentally running full-table scans.

## Checking Current Setting

```sql
SELECT name, value
FROM system.settings
WHERE name IN ('max_rows_to_read', 'max_bytes_to_read', 'read_overflow_mode');
```

## Difference from result_overflow_mode

`read_overflow_mode` controls limits on data **read from storage**. There is a separate `result_overflow_mode` that controls what happens when the **result set** (after filtering and aggregation) exceeds `max_result_rows` or `max_result_bytes`. They serve different purposes:

- Use `read_overflow_mode` to protect against expensive table scans
- Use `result_overflow_mode` to protect against returning massive result sets to clients

## Recommended Usage

For production user-facing queries, use `throw` so engineers notice when queries exceed expected data volumes. For internal sampling or monitoring dashboards that can tolerate incomplete results, `break` gives partial data without disrupting the application.

```sql
-- Monitoring dashboard: partial results acceptable
SELECT metric, avg(value)
FROM metrics
WHERE ts > now() - INTERVAL 1 HOUR
GROUP BY metric
SETTINGS
    max_rows_to_read   = 1000000,
    read_overflow_mode = 'break';
```

## Summary

`read_overflow_mode` lets you choose between hard failures (`throw`) or graceful partial results (`break`) when read limits are exceeded in ClickHouse. Combine it with `max_rows_to_read` and `max_bytes_to_read` to protect your cluster from expensive ad-hoc queries while giving you control over how overruns are handled.
