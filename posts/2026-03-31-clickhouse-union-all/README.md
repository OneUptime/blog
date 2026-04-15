# How to Use UNION ALL in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, UNION ALL

Description: Learn how to combine query results in ClickHouse using UNION ALL and UNION DISTINCT, with column alignment rules and practical examples.

---

`UNION ALL` combines the result sets of two or more SELECT queries into a single result, preserving all rows including duplicates. It is one of the fundamental tools for merging data from multiple tables, time periods, or query conditions. ClickHouse also supports `UNION DISTINCT` for automatic deduplication across the combined set. This post covers both forms with practical patterns and rules you need to follow.

## Basic UNION ALL Syntax

Each SELECT must return the same number of columns, and corresponding columns must have compatible types.

```sql
-- Combine events from two separate daily tables
SELECT event_id, user_id, event_type, value, created_at
FROM events_2026_03
UNION ALL
SELECT event_id, user_id, event_type, value, created_at
FROM events_2026_04;
```

`UNION ALL` is generally preferred over `UNION DISTINCT` because it does not perform a deduplication step and is therefore faster.

## Column Alignment Requirements

The column count and types must align across all SELECT branches. Column names from the first SELECT are used for the combined result.

```sql
-- First query defines the column names
SELECT
    user_id,
    'purchase' AS transaction_type,
    amount     AS value,
    created_at
FROM purchases
UNION ALL
SELECT
    user_id,
    'refund'   AS transaction_type,  -- same position as 'purchase'
    amount     AS value,             -- alias matches first query
    created_at
FROM refunds;
```

If types differ, ClickHouse will attempt an implicit cast. Use explicit casts when types may not align.

```sql
SELECT
    user_id,
    toUInt64(order_id) AS id,
    created_at
FROM orders
UNION ALL
SELECT
    user_id,
    toUInt64(ticket_id) AS id,
    created_at
FROM support_tickets;
```

## UNION DISTINCT

`UNION DISTINCT` removes duplicate rows from the combined result. It is equivalent to wrapping `UNION ALL` in a `SELECT DISTINCT`. Note that bare `UNION` (without `ALL` or `DISTINCT`) depends on the `union_default_mode` setting, so always specify the mode explicitly.

```sql
-- Return unique user_ids that appear in either table
SELECT user_id FROM purchases
UNION DISTINCT
SELECT user_id FROM refunds;
```

Because UNION DISTINCT performs deduplication, it is slower than UNION ALL. Only use it when you genuinely need to eliminate cross-query duplicates.

## Chaining Multiple UNION ALL Queries

You can chain more than two SELECT statements.

```sql
SELECT * FROM (
    SELECT 'click'    AS source, count() AS cnt FROM click_events
    UNION ALL
    SELECT 'view'     AS source, count() AS cnt FROM view_events
    UNION ALL
    SELECT 'purchase' AS source, count() AS cnt FROM purchase_events
)
ORDER BY cnt DESC;
```

## Using UNION ALL in Subqueries and CTEs

UNION ALL works inside subqueries and Common Table Expressions.

```sql
-- CTE combining two sources
WITH all_events AS (
    SELECT event_id, user_id, 'web'    AS channel, created_at FROM web_events
    UNION ALL
    SELECT event_id, user_id, 'mobile' AS channel, created_at FROM mobile_events
)
SELECT
    channel,
    count()    AS total,
    uniq(user_id) AS unique_users
FROM all_events
GROUP BY channel;
```

## Practical Example: Multi-Period Comparison

```sql
-- Compare event counts between this week and last week
SELECT * FROM (
    SELECT
        'this_week'  AS period,
        event_type,
        count()      AS cnt
    FROM events
    WHERE created_at >= today() - 7
    GROUP BY event_type

    UNION ALL

    SELECT
        'last_week'  AS period,
        event_type,
        count()      AS cnt
    FROM events
    WHERE created_at >= today() - 14
      AND created_at <  today() - 7
    GROUP BY event_type
)
ORDER BY event_type, period;
```

## Adding ORDER BY and LIMIT to UNION Queries

In ClickHouse, `ORDER BY` and `LIMIT` after a UNION chain are applied to the last individual query, not to the combined result. To sort or limit the full combined result, wrap the entire UNION in a subquery.

```sql
-- Sort the full combined result
SELECT * FROM (
    SELECT event_id, user_id, created_at FROM events_march
    UNION ALL
    SELECT event_id, user_id, created_at FROM events_april
)
ORDER BY created_at DESC
LIMIT 100;
```

```sql
-- LIMIT each branch separately, then sort the combined result
SELECT * FROM (
    SELECT * FROM (
        SELECT event_id, user_id, created_at FROM events_march ORDER BY created_at DESC LIMIT 50
    )
    UNION ALL
    SELECT * FROM (
        SELECT event_id, user_id, created_at FROM events_april ORDER BY created_at DESC LIMIT 50
    )
)
ORDER BY created_at DESC;
```

## Summary

`UNION ALL` is the preferred way to merge result sets in ClickHouse because it avoids the deduplication cost of `UNION DISTINCT`. Always ensure the column count and types match across all branches, using explicit casts when necessary. Use UNION ALL inside CTEs or subqueries to compose more complex multi-source queries. To apply ORDER BY and LIMIT to the combined result, wrap the entire UNION in a subquery, because ClickHouse applies these clauses to the last individual query rather than the full result.
