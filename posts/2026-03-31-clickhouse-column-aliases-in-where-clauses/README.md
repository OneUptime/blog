# How to Use Column Aliases in ClickHouse WHERE Clauses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Column Alias, WHERE Clause, SQL, Query Writing

Description: Learn how ClickHouse handles column aliases in WHERE clauses and the patterns to use when filtering on computed expressions.

---

In standard SQL, column aliases defined in SELECT cannot be used in the WHERE clause of the same query because WHERE is evaluated before SELECT. ClickHouse follows this rule by default, but provides settings and patterns to work around it cleanly.

## The Problem

This is invalid in standard SQL (and in ClickHouse by default):

```sql
-- This will fail in standard SQL
SELECT
    duration_ms / 1000.0 AS duration_sec,
    event_type
FROM events
WHERE duration_sec > 5;  -- Error: column 'duration_sec' does not exist
```

## Solution 1: Repeat the Expression

The straightforward approach - repeat the computation in WHERE:

```sql
SELECT
    duration_ms / 1000.0 AS duration_sec,
    event_type
FROM events
WHERE duration_ms / 1000.0 > 5;
```

## Solution 2: Use a Subquery or CTE

Wrap the aliased query in a subquery and filter the outer query:

```sql
SELECT * FROM (
    SELECT
        duration_ms / 1000.0 AS duration_sec,
        event_type,
        timestamp
    FROM events
)
WHERE duration_sec > 5;
```

Or equivalently with a CTE:

```sql
WITH base AS (
    SELECT
        duration_ms / 1000.0 AS duration_sec,
        event_type,
        timestamp
    FROM events
)
SELECT * FROM base WHERE duration_sec > 5;
```

## Solution 3: ClickHouse Alias Extension

ClickHouse has a non-standard feature that allows aliases in some filter contexts using HAVING-like semantics. You can filter on SELECT aliases after the fact using subqueries or through ClickHouse's analyzer:

```sql
-- Enable new analyzer which supports alias reuse
SET enable_analyzer = 1;

SELECT
    multiIf(duration_ms < 100, 'fast', duration_ms < 1000, 'normal', 'slow') AS bucket,
    count() AS cnt
FROM events
GROUP BY bucket
HAVING bucket = 'slow';
```

## HAVING for Post-Aggregation Filtering

HAVING always supports aliases that appear in SELECT:

```sql
SELECT
    service,
    count() AS total_requests,
    countIf(status_code >= 500) AS error_count,
    round(countIf(status_code >= 500) / count() * 100, 2) AS error_rate_pct
FROM http_requests
GROUP BY service
HAVING error_rate_pct > 5.0
ORDER BY error_rate_pct DESC;
```

## Practical Pattern: Reusable Expressions in WHERE

For complex repeated expressions, use a MATERIALIZED column:

```sql
ALTER TABLE events
    ADD COLUMN duration_sec Float64 MATERIALIZED duration_ms / 1000.0;

-- Now you can filter on the materialized column
SELECT event_type, duration_sec
FROM events
WHERE duration_sec > 5;
```

Materialized columns are computed on insert and stored, so filtering is fast.

## Summary

ClickHouse follows standard SQL evaluation order - WHERE runs before SELECT aliases are defined. Work around this with subqueries, CTEs, or by repeating expressions in WHERE. Use HAVING for post-aggregation filtering where aliases are available. For frequently filtered computed values, add a MATERIALIZED column to avoid repetition.
