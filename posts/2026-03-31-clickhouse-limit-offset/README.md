# How to Use LIMIT and OFFSET in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, Limit, Offset, Pagination

Description: Learn the different LIMIT and OFFSET syntaxes in ClickHouse for result trimming and pagination, with performance notes for large offsets.

---

`LIMIT` and `OFFSET` are the standard mechanisms for restricting the number of rows returned by a query and for implementing pagination. ClickHouse supports the standard SQL syntax along with a shorthand comma form. However, ClickHouse's columnar architecture means that naive offset-based pagination at scale has specific performance characteristics you should understand before building production systems on top of it.

## Basic LIMIT Syntax

The simplest form returns the first n rows from the result.

```sql
SELECT event_id, event_type, value
FROM events
ORDER BY created_at DESC
LIMIT 10;
```

Without ORDER BY the row order is non-deterministic in ClickHouse (as in most analytical databases), so always pair LIMIT with ORDER BY when result order matters.

## LIMIT with OFFSET

`OFFSET m` skips the first m rows before returning n rows. This is the standard SQL form.

```sql
-- Return rows 21-30 (skip first 20)
SELECT event_id, event_type, value
FROM events
ORDER BY created_at DESC
LIMIT 10 OFFSET 20;
```

### Alternative Comma Syntax

ClickHouse also supports the MySQL-style `LIMIT m, n` syntax where m is the offset and n is the count.

```sql
-- Equivalent to LIMIT 10 OFFSET 20
SELECT event_id, event_type, value
FROM events
ORDER BY created_at DESC
LIMIT 20, 10;
```

Note the argument order is reversed: `LIMIT offset, count` vs `LIMIT count OFFSET offset`. The standard SQL form (`LIMIT n OFFSET m`) is generally preferred for clarity.

## LIMIT in Subqueries

LIMIT applies independently at each query level, so you can use it in subqueries.

```sql
-- Get buy events from the 100 most recent events
SELECT *
FROM (
    SELECT *
    FROM events
    ORDER BY created_at DESC
    LIMIT 100
)
WHERE event_type = 'buy'
LIMIT 10;
```

## Pagination Pattern

The most common use case is page-based navigation through results.

```sql
-- Page size = 25, retrieve page N (0-indexed)
-- Page 0: LIMIT 25 OFFSET 0
-- Page 1: LIMIT 25 OFFSET 25
-- Page N: LIMIT 25 OFFSET (N * 25)

SELECT
    event_id,
    event_type,
    user_id,
    value,
    created_at
FROM events
ORDER BY created_at DESC
LIMIT 25 OFFSET 0;   -- first page
```

```sql
-- Third page (page index 2)
SELECT
    event_id,
    event_type,
    user_id,
    value,
    created_at
FROM events
ORDER BY created_at DESC
LIMIT 25 OFFSET 50;
```

## Performance Notes for Large Offsets

OFFSET-based pagination in ClickHouse reads and discards skipped rows. For large offsets this becomes increasingly expensive.

```sql
-- Expensive: reads and discards 1,000,000 rows
SELECT event_id, value
FROM events
ORDER BY created_at DESC
LIMIT 10 OFFSET 1000000;
```

For deep pagination, prefer cursor-based pagination using a WHERE condition on the sort key:

```sql
-- Cursor pagination: faster than large OFFSET
-- Store the last seen created_at and event_id from previous page
SELECT
    event_id,
    event_type,
    value,
    created_at
FROM events
WHERE (created_at, event_id) < ('2026-03-01 12:00:00', 9999999)
ORDER BY created_at DESC, event_id DESC
LIMIT 25;
```

## LIMIT with Aggregations

LIMIT is applied after aggregation and ordering.

```sql
-- Top 5 event types by total revenue
SELECT
    event_type,
    sum(value)  AS revenue,
    count()     AS cnt
FROM events
GROUP BY event_type
ORDER BY revenue DESC
LIMIT 5;
```

## LIMIT in System Queries

LIMIT is invaluable when exploring system tables to avoid overwhelming output.

```sql
-- Sample recent query log entries
SELECT
    query_id,
    user,
    query_duration_ms,
    read_rows,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10 OFFSET 0;
```

## Summary

ClickHouse supports both `LIMIT n OFFSET m` and the shorthand `LIMIT m, n` syntax for paging through results. For small result sets and moderate offsets the standard approach works well, but for deep pagination you should switch to cursor-based patterns using WHERE conditions on the sort key to avoid full scans. Always pair LIMIT with ORDER BY to get deterministic results.
