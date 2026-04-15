# How to Use ORDER BY in ClickHouse with NULLS FIRST/LAST

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, ORDER BY, NULL, Sort

Description: A complete guide to ORDER BY in ClickHouse, covering ASC/DESC, NULLS FIRST/LAST, collation for strings, and performance impact of sorting.

---

Sorting query results correctly - including handling NULL values and string collation - is essential for producing predictable output in ClickHouse. Unlike some databases that always place NULLs at one end, ClickHouse gives you explicit control with `NULLS FIRST` and `NULLS LAST` modifiers. This post covers all aspects of `ORDER BY` syntax along with performance considerations for large datasets.

## Basic ORDER BY Syntax

Sort ascending (default) or descending with `ASC` and `DESC`.

```sql
SELECT
    event_type,
    count()    AS cnt,
    sum(value) AS revenue
FROM events
GROUP BY event_type
ORDER BY revenue DESC;
```

```sql
-- Sort by multiple columns
SELECT
    toDate(created_at) AS event_date,
    event_type,
    count() AS cnt
FROM events
GROUP BY event_date, event_type
ORDER BY event_date ASC, cnt DESC;
```

## NULLS FIRST and NULLS LAST

By default, ClickHouse places NULLs at the end of sorted results (NULLS LAST) for both ascending and descending sorts. The sort order is: values, then NaN, then NULL. Use the explicit modifiers to override this behavior.

```sql
-- Default: NULLs appear last in ASC order
SELECT user_id, cancelled_at
FROM orders
ORDER BY cancelled_at ASC;

-- Explicit: NULLs at the beginning in ASC order
SELECT user_id, cancelled_at
FROM orders
ORDER BY cancelled_at ASC NULLS FIRST;

-- Explicit: NULLs at the beginning in DESC order
SELECT user_id, cancelled_at
FROM orders
ORDER BY cancelled_at DESC NULLS FIRST;
```

### Combining NULLS Modifiers with Multiple Columns

Each column in the ORDER BY list can have its own NULLS modifier.

```sql
SELECT
    department,
    manager_id,
    salary
FROM employees
ORDER BY
    department ASC NULLS LAST,
    manager_id DESC NULLS FIRST,
    salary DESC;
```

## String Collation

By default, ClickHouse sorts strings byte-by-byte (binary order). To sort using locale-aware rules, use the `COLLATE` modifier.

```sql
-- Binary sort (default): uppercase before lowercase
SELECT name FROM products ORDER BY name ASC;

-- Locale-aware sort using German collation
SELECT name FROM products ORDER BY name ASC COLLATE 'de';

-- Case-insensitive sort
SELECT name FROM products ORDER BY name ASC COLLATE 'en';
```

Available collations depend on the ICU library version bundled with ClickHouse. Use `system.collations` to list what is available.

```sql
SELECT name FROM system.collations ORDER BY name;
```

## Ordering by Expressions and Aliases

You can ORDER BY computed expressions or aliases defined in the SELECT list.

```sql
SELECT
    user_id,
    sum(value)     AS total_spent,
    count()        AS order_count,
    sum(value) / count() AS avg_order
FROM events
WHERE event_type = 'buy'
GROUP BY user_id
ORDER BY avg_order DESC, total_spent DESC;
```

```sql
-- Order by a function applied to a column
SELECT event_id, created_at
FROM events
ORDER BY toStartOfHour(created_at) DESC, event_id ASC;
```

## ORDER BY with LIMIT

Combining ORDER BY with LIMIT is the most common pattern for top-N queries.

```sql
-- Top 10 users by revenue
SELECT
    user_id,
    sum(value) AS revenue
FROM events
WHERE event_type = 'buy'
GROUP BY user_id
ORDER BY revenue DESC
LIMIT 10;
```

ClickHouse can optimize `ORDER BY ... LIMIT n` using a partial sort, keeping only the top n rows in memory rather than sorting the entire dataset.

## Performance Impact of Sorting

Sorting is an expensive operation on large datasets. Keep these points in mind:

- If the table is ordered by the same key (its MergeTree `ORDER BY`), ClickHouse may skip the sort entirely.
- Use `LIMIT` with `ORDER BY` when you only need the top or bottom rows.
- Avoid sorting on high-cardinality string columns in unbounded queries.

```sql
-- Check if the query optimizer uses the table sort order
EXPLAIN
SELECT event_id, created_at
FROM events
ORDER BY created_at ASC
LIMIT 1000;
```

## Practical Example

```sql
-- Find the top 20 high-value purchases, ordered by user and recency,
-- with NULLable refund_at placed last
SELECT
    user_id,
    event_id,
    value,
    created_at,
    refund_at
FROM events
WHERE event_type = 'buy'
  AND value >= 100.0
ORDER BY
    user_id    ASC,
    created_at DESC,
    refund_at  DESC NULLS LAST
LIMIT 20;
```

## Summary

ClickHouse ORDER BY supports ASC/DESC per column, explicit NULLS FIRST/LAST control, and locale-aware string collation via COLLATE. Pair ORDER BY with LIMIT to enable partial sort optimizations and avoid sorting more data than necessary. When the query key matches the table's storage order, ClickHouse can often skip the sort step entirely.
