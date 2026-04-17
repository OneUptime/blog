# How to Use Column Aliases in ClickHouse WHERE Clauses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Column Alias, WHERE Clause, SQL, Query Writing

Description: Learn how ClickHouse handles column aliases in WHERE clauses and the patterns to use when filtering on computed expressions.

---

In standard SQL, column aliases defined in SELECT cannot be used in the WHERE clause of the same query because WHERE is evaluated before SELECT. ClickHouse, however, supports this as a non-standard extension — aliases defined in SELECT are visible in WHERE for non-aggregate expressions. This post covers how ClickHouse handles aliases in WHERE and the alternative patterns that are useful when the extension doesn't apply or when you want portable SQL.

## The Problem

In standard SQL, the following query fails because `duration_sec` isn't defined when WHERE is evaluated:

```sql
-- This fails in standard SQL
SELECT
    duration_ms / 1000.0 AS duration_sec,
    event_type
FROM events
WHERE duration_sec > 5;  -- Error in standard SQL: column 'duration_sec' does not exist
```

ClickHouse accepts the query above — aliases from SELECT are visible in WHERE. The patterns below are still useful when you want portable SQL, when you filter on an aggregate alias (which must use HAVING), when the same complex expression is reused, or when alias substitution conflicts with a real column name.

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

## Solution 3: Direct Alias Reference (ClickHouse Extension)

ClickHouse lets you reference a SELECT alias directly in WHERE for any non-aggregate expression — no setting required:

```sql
SELECT
    duration_ms / 1000.0 AS duration_sec,
    event_type
FROM events
WHERE duration_sec > 5;  -- works in ClickHouse
```

Caveats: aggregate aliases cannot be used in WHERE (ClickHouse raises `ILLEGAL_AGGREGATION` — use HAVING instead), and when an alias shares its name with a real column, the `prefer_column_name_to_alias` setting controls which one wins during resolution. Unexpected substitution in this case is a common source of confusing errors.

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

ClickHouse allows SELECT aliases in WHERE as a non-standard extension for non-aggregate expressions, so a plain alias reference usually just works. For aggregate filters, portable SQL, reused complex expressions, or to avoid alias/column-name ambiguity, reach for subqueries, CTEs, HAVING, or MATERIALIZED columns. For frequently filtered computed values, a MATERIALIZED column avoids repetition and is stored on insert so filtering is fast.
