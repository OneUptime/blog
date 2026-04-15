# How to Use LIMIT BY in ClickHouse for Top-N Per Group

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, LIMIT BY, Top-N

Description: Learn how to use LIMIT BY in ClickHouse to efficiently retrieve the top N rows per group, with examples and comparisons to window functions.

---

One of the most common analytical patterns is "top N records per group" - for example, the three most recent events per user, or the five highest-revenue products per category. ClickHouse provides a dedicated `LIMIT n BY column` clause that handles this pattern natively and efficiently, without requiring window functions or self-joins. This post explains the syntax, options, and best practices for LIMIT BY.

## Basic LIMIT BY Syntax

`LIMIT n BY col1, col2, ...` returns at most n rows for each distinct combination of the BY columns.

```sql
-- Top 3 most recent events per user
SELECT
    user_id,
    event_id,
    event_type,
    value,
    created_at
FROM events
ORDER BY user_id ASC, created_at DESC
LIMIT 3 BY user_id;
```

The ORDER BY determines which rows are "top" within each group. Always include an ORDER BY when using LIMIT BY to get deterministic results.

## LIMIT BY with Multiple Columns

You can group by multiple columns to get top-N per combination.

```sql
-- Top 2 purchases per (user_id, event_type)
SELECT
    user_id,
    event_type,
    event_id,
    value,
    created_at
FROM events
ORDER BY user_id, event_type, value DESC
LIMIT 2 BY user_id, event_type;
```

## LIMIT BY with OFFSET

Like regular LIMIT, LIMIT BY supports OFFSET to skip rows within each group.

```sql
-- Skip the top result and return the 2nd and 3rd most recent per user
SELECT
    user_id,
    event_id,
    created_at
FROM events
ORDER BY user_id, created_at DESC
LIMIT 2 OFFSET 1 BY user_id;
```

## Combining LIMIT BY with LIMIT

You can use both LIMIT BY and a trailing LIMIT together. LIMIT BY controls the per-group cap, and the final LIMIT caps the total rows returned.

```sql
-- Top 3 events per user, but only return first 100 rows total
SELECT
    user_id,
    event_id,
    event_type,
    value,
    created_at
FROM events
ORDER BY user_id, created_at DESC
LIMIT 3 BY user_id
LIMIT 100;
```

## Practical Top-N Example

```sql
-- Find the 5 most valuable purchases per user in the last 30 days
SELECT
    user_id,
    event_id,
    value,
    created_at
FROM events
WHERE event_type = 'buy'
  AND created_at >= now() - INTERVAL 30 DAY
ORDER BY user_id ASC, value DESC
LIMIT 5 BY user_id;
```

```sql
-- Latest error log entry per service
SELECT
    service_name,
    log_level,
    message,
    created_at
FROM logs
WHERE log_level = 'ERROR'
ORDER BY service_name, created_at DESC
LIMIT 1 BY service_name;
```

## LIMIT BY vs Window Functions

ClickHouse supports window functions (ROW_NUMBER, RANK, etc.) but LIMIT BY is often simpler and can be faster for straightforward top-N patterns.

```sql
-- Window function approach (more flexible but more verbose)
SELECT
    user_id,
    event_id,
    value,
    created_at
FROM (
    SELECT
        user_id,
        event_id,
        value,
        created_at,
        row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM events
    WHERE event_type = 'buy'
)
WHERE rn <= 3
ORDER BY user_id, created_at DESC;
```

```sql
-- LIMIT BY approach (simpler for straightforward top-N)
SELECT
    user_id,
    event_id,
    value,
    created_at
FROM events
WHERE event_type = 'buy'
ORDER BY user_id, created_at DESC
LIMIT 3 BY user_id;
```

Use window functions when you need rank-based deduplication, ties handling, or when the top-N condition involves a computed ranking expression. Use LIMIT BY when you simply want the first n rows per group after ordering.

## LIMIT BY with Aggregations

LIMIT BY operates on rows in the result set, including aggregated rows after GROUP BY. You can use it to pick the top N aggregated rows per group.

```sql
-- Top 3 days by revenue per event_type
SELECT
    event_type,
    toDate(created_at) AS event_date,
    sum(value)         AS daily_revenue
FROM events
GROUP BY event_type, event_date
ORDER BY event_type ASC, daily_revenue DESC
LIMIT 3 BY event_type;
```

## Summary

`LIMIT BY` is a ClickHouse-native clause for selecting the top N rows per group, making it a concise and efficient alternative to window functions for many common analytical patterns. Pair it with ORDER BY to control which rows are "top", and optionally combine it with a trailing LIMIT to cap total output size. For more complex rank-based logic, window functions remain the more expressive choice.
