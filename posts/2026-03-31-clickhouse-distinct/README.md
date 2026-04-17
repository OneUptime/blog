# How to Use DISTINCT in ClickHouse Efficiently

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, Distinct, Deduplication

Description: Learn how to use SELECT DISTINCT in ClickHouse for deduplication, when GROUP BY or uniq() is more efficient, and key performance considerations.

---

`SELECT DISTINCT` removes duplicate rows from query results. In ClickHouse, this operation can be expensive on large datasets because it requires a full deduplication step. Understanding how DISTINCT works under the hood - and when to prefer `GROUP BY` or approximate functions like `uniq()` - is key to writing fast deduplication queries. This post covers all the angles.

## Basic SELECT DISTINCT

`DISTINCT` returns only unique combinations of the selected columns.

```sql
-- All unique event types
SELECT DISTINCT event_type
FROM events
ORDER BY event_type;
```

```sql
-- All unique (user_id, event_type) combinations
SELECT DISTINCT
    user_id,
    event_type
FROM events
ORDER BY user_id, event_type;
```

## DISTINCT vs GROUP BY

For deduplication without aggregation, `DISTINCT` and `GROUP BY` produce the same result. In ClickHouse, `GROUP BY` is often faster because the optimizer has more tuning options for it.

```sql
-- These two queries are equivalent
SELECT DISTINCT user_id, event_type
FROM events;

SELECT user_id, event_type
FROM events
GROUP BY user_id, event_type;
```

The GROUP BY approach also lets you add aggregate columns cleanly.

```sql
-- With GROUP BY you can also compute aggregates at the same time
SELECT
    user_id,
    event_type,
    count()    AS occurrences,
    max(value) AS max_value
FROM events
GROUP BY user_id, event_type
ORDER BY user_id, event_type;
```

## DISTINCT with Expressions

DISTINCT applies to the entire row of selected values after expression evaluation.

```sql
-- Unique event dates (not full timestamps)
SELECT DISTINCT toDate(created_at) AS event_date
FROM events
ORDER BY event_date;
```

```sql
-- Unique active users per day
SELECT DISTINCT
    toDate(created_at) AS event_date,
    user_id
FROM events
ORDER BY event_date, user_id;
```

## Counting Distinct Values with uniq()

When you only need the count of distinct values (not the values themselves), use `uniq()` instead of `COUNT(DISTINCT ...)`. `uniq()` uses a compact approximate-distinct algorithm and is significantly faster on large datasets.

```sql
-- Approximate distinct user count (fast, slightly imprecise)
SELECT uniq(user_id) AS approx_unique_users
FROM events;

-- Exact distinct user count (slower)
SELECT count(DISTINCT user_id) AS exact_unique_users
FROM events;

-- uniqExact for exact count
SELECT uniqExact(user_id) AS exact_unique_users
FROM events;
```

```sql
-- Daily unique user counts using uniq()
SELECT
    toDate(created_at) AS event_date,
    uniq(user_id)      AS approx_dau
FROM events
GROUP BY event_date
ORDER BY event_date;
```

## Performance Considerations

DISTINCT forces ClickHouse to read all selected columns, deduplicate rows in memory (or spill to disk), and then return results. On billion-row tables this can be slow.

### Strategies for Better Performance

```sql
-- 1. Filter first to reduce data before DISTINCT
SELECT DISTINCT user_id
FROM events
WHERE event_type = 'buy'
  AND created_at >= today() - 7;

-- 2. Use uniq() when only the count is needed
SELECT uniq(user_id) AS weekly_buyers
FROM events
WHERE event_type = 'buy'
  AND created_at >= today() - 7;

-- 3. Use GROUP BY for multiple columns - optimizer handles it better
SELECT user_id, event_type
FROM events
WHERE created_at >= today() - 7
GROUP BY user_id, event_type;
```

### Checking DISTINCT Behavior with EXPLAIN

```sql
EXPLAIN
SELECT DISTINCT user_id, event_type
FROM events
WHERE created_at >= today() - 30;
```

## DISTINCT in Subqueries

DISTINCT works inside subqueries and CTEs.

```sql
-- Users who made a purchase but never viewed anything
SELECT user_id
FROM (
    SELECT DISTINCT user_id FROM events WHERE event_type = 'buy'
)
WHERE user_id NOT IN (
    SELECT DISTINCT user_id FROM events WHERE event_type = 'view'
);
```

## Summary

`SELECT DISTINCT` is convenient but can be expensive in ClickHouse at scale. Prefer `GROUP BY` for multi-column deduplication where the optimizer can apply better strategies, and use `uniq()` or `uniqExact()` when only a count of distinct values is needed. Always filter with `WHERE` before applying DISTINCT to minimize the data the deduplication step must process.
