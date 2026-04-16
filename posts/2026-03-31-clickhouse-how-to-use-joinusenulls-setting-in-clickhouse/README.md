# How to Use join_use_nulls Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Join, NULL, Query Settings, SQL

Description: Learn how the join_use_nulls setting in ClickHouse controls whether unmatched rows in JOINs return NULL or default values, and when to use each behavior.

---

## What Is join_use_nulls

By default, ClickHouse JOINs return the default value for a column's data type when there is no match - for example `0` for integers and empty string for strings. This differs from standard SQL behavior where unmatched rows return `NULL`.

The `join_use_nulls` setting changes this behavior so that unmatched rows use `NULL` instead.

## Default Behavior Without join_use_nulls

```sql
-- Default: join_use_nulls = 0 (disabled)
SELECT
    u.user_id,
    u.name,
    o.order_id
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id;

-- Unmatched users will have order_id = 0 (default for UInt64)
```

## Enabling join_use_nulls

```sql
-- Enable at query level
SELECT
    u.user_id,
    u.name,
    o.order_id
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
SETTINGS join_use_nulls = 1;

-- Now unmatched users will have order_id = NULL
```

## Enabling at Session Level

```sql
SET join_use_nulls = 1;

SELECT
    p.product_id,
    p.name,
    i.stock_count
FROM products p
LEFT JOIN inventory i ON p.product_id = i.product_id;
```

## Enabling in users.xml

To make NULL-based JOIN the default for all users:

```xml
<profiles>
  <default>
    <join_use_nulls>1</join_use_nulls>
  </default>
</profiles>
```

## Practical Example - Finding Users with No Orders

With `join_use_nulls = 0` (default), you need to check for default values:

```sql
-- Default mode - check for 0 (default int value)
SELECT user_id, name
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE o.order_id = 0;
```

With `join_use_nulls = 1`, standard SQL NULL checks work:

```sql
-- NULL mode - standard SQL pattern
SELECT user_id, name
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE o.order_id IS NULL
SETTINGS join_use_nulls = 1;
```

## Column Type Conversion

When `join_use_nulls = 1`, ClickHouse automatically converts the result column types of the joined side to `Nullable` so that unmatched rows can hold `NULL`. The source table columns do **not** need to be declared `Nullable` — the conversion happens in the query result:

```sql
-- Source columns can be non-Nullable; result columns become Nullable at query time
CREATE TABLE orders (
    order_id    UInt64,
    user_id     UInt64,
    amount      Float64,
    created_at  DateTime
) ENGINE = MergeTree()
ORDER BY order_id;
```

## Using COALESCE with join_use_nulls

When `join_use_nulls = 1`, you can use `COALESCE` to provide fallback values:

```sql
SELECT
    u.user_id,
    u.name,
    COALESCE(o.total_spent, 0) AS total_spent
FROM users u
LEFT JOIN (
    SELECT user_id, sum(amount) AS total_spent
    FROM orders
    GROUP BY user_id
) o ON u.user_id = o.user_id
SETTINGS join_use_nulls = 1;
```

## RIGHT JOIN and FULL JOIN Behavior

The setting also affects RIGHT JOIN and FULL JOIN:

```sql
SELECT
    u.name,
    o.order_id,
    o.amount
FROM users u
FULL JOIN orders o ON u.user_id = o.user_id
SETTINGS join_use_nulls = 1;

-- Rows with no user match: u.name IS NULL
-- Rows with no order match: o.order_id IS NULL, o.amount IS NULL
```

## Performance Considerations

Enabling `join_use_nulls = 1` requires ClickHouse to handle nullable types internally, which can add a small overhead compared to default values. For high-throughput analytical queries over large datasets, benchmark both modes before committing to one.

## Summary

The `join_use_nulls` setting bridges the gap between ClickHouse's default behavior and standard SQL JOIN semantics. Set it to `1` when you need NULL-based filtering with `IS NULL` or `COALESCE`, and leave it at the default `0` for maximum performance in analytical workloads that don't rely on NULL checks after JOINs.
