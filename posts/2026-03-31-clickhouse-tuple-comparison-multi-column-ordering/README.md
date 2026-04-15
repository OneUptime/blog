# How to Use Tuple Comparison for Multi-Column Ordering in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Tuple, Comparison, ORDER BY, SQL, Keyset Pagination

Description: Learn how to use tuple comparison in ClickHouse for efficient multi-column ordering, keyset pagination, and composite key filtering.

---

Tuple comparison in ClickHouse enables lexicographic multi-column comparisons in a single expression. This is particularly useful for keyset pagination, range filtering on composite keys, and ORDER BY expressions.

## What Is Tuple Comparison?

A tuple comparison compares multiple values as a unit, left to right:

```sql
-- (a, b) > (c, d) is equivalent to: a > c OR (a = c AND b > d)
SELECT (1, 2) > (1, 1);  -- returns 1 (true)
SELECT (1, 2) > (2, 1);  -- returns 0 (false)
SELECT (2, 1) > (1, 9);  -- returns 1 (true)
```

## Keyset Pagination

Standard OFFSET pagination degrades with large offsets. Tuple comparison enables efficient keyset pagination:

```sql
-- First page
SELECT event_id, timestamp, user_id
FROM events
ORDER BY timestamp DESC, event_id DESC
LIMIT 20;

-- Next page (using last row's values)
SELECT event_id, timestamp, user_id
FROM events
WHERE (timestamp, event_id) < ('2026-01-01 12:30:00', 'evt-1000')
ORDER BY timestamp DESC, event_id DESC
LIMIT 20;
```

This avoids full-table scans that `OFFSET 10000` would require.

## Range Filtering on Composite Keys

Filter a range on multiple columns efficiently:

```sql
SELECT *
FROM orders
WHERE (year, month, day) BETWEEN (2025, 11, 1) AND (2026, 1, 31)
ORDER BY year, month, day;
```

Equivalent without tuples (more verbose):

```sql
SELECT *
FROM orders
WHERE
    (year > 2025 OR (year = 2025 AND month > 11) OR (year = 2025 AND month = 11 AND day >= 1))
    AND
    (year < 2026 OR (year = 2026 AND month < 1) OR (year = 2026 AND month = 1 AND day <= 31));
```

## Finding Top N per Group

Use tuple comparison to implement a "last seen" type query:

```sql
SELECT
    user_id,
    max((timestamp, event_id)).1 AS last_timestamp,
    max((timestamp, event_id)).2 AS last_event_id
FROM events
GROUP BY user_id;
```

The `max()` of a tuple is lexicographic, so this finds the event with the latest timestamp, breaking ties by event_id.

## Tuple IN Expressions

Filter on multiple column combinations at once:

```sql
SELECT *
FROM events
WHERE (user_id, event_type) IN (
    (1001, 'purchase'),
    (1002, 'signup'),
    (1003, 'purchase')
);
```

This is more concise and often faster than OR-chained conditions.

## Creating Tuples

Build tuples from columns using the `tuple()` function:

```sql
SELECT
    user_id,
    tuple(timestamp, event_id) AS cursor_key
FROM events
ORDER BY cursor_key DESC
LIMIT 10;
```

## Summary

Tuple comparison in ClickHouse provides a clean, efficient syntax for multi-column filtering, keyset pagination, and composite key ranges. It is especially powerful for pagination patterns where OFFSET is too slow, and for expressing complex multi-column conditions concisely.
