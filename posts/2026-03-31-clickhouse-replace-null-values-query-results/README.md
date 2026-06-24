# How to Replace NULL Values in ClickHouse Query Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NULL, ifNull, COALESCE, Query, SQL, Analytics

Description: Learn how to replace NULL values in ClickHouse query results using ifNull, coalesce, COALESCE, and fillNull patterns for clean analytics output.

---

NULL values in ClickHouse appear whenever a `Nullable(T)` column contains no value, or when a JOIN finds no matching row. Replacing NULLs before they reach your application or dashboard is essential for clean aggregations and readable output. ClickHouse provides several functions for this: `ifNull`, `COALESCE`, and `multiIf`.

## ifNull: Replace a Single NULL

`ifNull(x, alt)` returns `x` if it is not NULL, otherwise returns `alt`.

```sql
SELECT
    user_id,
    ifNull(display_name, 'Anonymous') AS display_name,
    ifNull(country, 'Unknown')         AS country
FROM users
LIMIT 5;
```

```text
user_id  display_name  country
1        Alice         US
2        Anonymous     Unknown
3        Bob           UK
```

## COALESCE: First Non-NULL from Multiple Columns

`COALESCE(a, b, c, ...)` returns the first non-NULL argument.

```sql
SELECT
    order_id,
    COALESCE(promo_price, sale_price, list_price) AS final_price
FROM orders
LIMIT 5;
```

This is useful when you have a hierarchy of price or name columns and want the most-specific non-NULL value.

## Replacing NULLs in Aggregations

NULL values are ignored by aggregate functions like `sum()` and `avg()`. Use `ifNull` to replace them before aggregation, or use `sumIf` / `countIf` as alternatives.

```sql
-- avg ignores NULLs; to treat NULL as 0, use ifNull
SELECT
    product_id,
    avg(ifNull(rating, 0)) AS avg_rating_with_zero,
    avg(rating)             AS avg_rating_ignore_null
FROM product_reviews
GROUP BY product_id;
```

## Replacing NULLs after a LEFT JOIN

LEFT JOINs produce NULL for unmatched rows. Replace them with defaults:

```sql
SELECT
    u.user_id,
    u.name,
    ifNull(o.order_count, 0) AS order_count,
    ifNull(o.total_spent, 0.0) AS total_spent
FROM users AS u
LEFT JOIN (
    SELECT user_id, count() AS order_count, sum(amount) AS total_spent
    FROM orders
    GROUP BY user_id
) AS o ON u.user_id = o.user_id;
```

## Using toString with NULL Safety

When NULL appears in a `String` or display context, use `ifNull` or `toString`:

```sql
SELECT
    event_id,
    ifNull(toString(error_code), 'no-error') AS error_label
FROM events
WHERE event_type = 'api_call'
LIMIT 10;
```

## Replacing NULLs in Array Operations

If you have a `Nullable` column being mapped or used in array contexts:

```sql
-- Replace NULL scores with 0 before computing array stats
SELECT
    user_id,
    arraySum(arrayMap(x -> ifNull(x, 0), scores)) AS total_score
FROM user_score_arrays;
```

## Batch Replacement with multiIf

For replacing multiple NULL columns in one pass:

```sql
SELECT
    user_id,
    multiIf(
        isNotNull(display_name), display_name,
        isNotNull(email),        splitByChar('@', email)[1],
        'anonymous'
    ) AS best_name
FROM users;
```

## Filling NULL in Time-Series Gaps

When gap-filling a time series via a LEFT JOIN with `numbers()`, replace NULL metric values:

```sql
WITH date_series AS (
    SELECT today() - number AS day
    FROM numbers(30)
)
SELECT
    ds.day,
    ifNull(stats.revenue, 0.0) AS revenue
FROM date_series AS ds
LEFT JOIN (
    SELECT toDate(created_at) AS day, sum(amount) AS revenue
    FROM orders
    GROUP BY day
) AS stats ON ds.day = stats.day
ORDER BY ds.day;
```

## Summary

Use `ifNull(col, default)` for single-column NULL replacement, `COALESCE` when choosing among multiple fallback columns, and `ifNull` after LEFT JOINs to substitute zeros or empty strings for unmatched rows. These patterns ensure aggregations, string outputs, and joined datasets remain clean and predictable in ClickHouse analytics queries.
