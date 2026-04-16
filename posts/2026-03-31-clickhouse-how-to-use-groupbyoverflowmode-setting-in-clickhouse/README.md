# How to Use group_by_overflow_mode Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Settings, GROUP BY, Performance, Memory Management

Description: Learn how to configure group_by_overflow_mode in ClickHouse to control behavior when GROUP BY exceeds memory limits, choosing between throw, break, and any modes.

---

## What Is group_by_overflow_mode

When a `GROUP BY` query in ClickHouse exceeds the unique-key limit set by `max_rows_to_group_by`, ClickHouse needs to decide what to do. The `group_by_overflow_mode` setting controls that behavior.

There are three possible values:

- `throw` - raise an exception and abort the query (default)
- `break` - stop adding new rows to the result and return partial data
- `any` - stop adding new keys but continue aggregating existing ones

## Setting group_by_overflow_mode at Query Level

You can set this on a per-query basis using the `SETTINGS` clause:

```sql
SELECT
    user_id,
    count() AS event_count
FROM events
GROUP BY user_id
SETTINGS
    max_rows_to_group_by = 1000000,
    group_by_overflow_mode = 'any';
```

## Setting group_by_overflow_mode at Session Level

To apply it for the entire session:

```sql
SET group_by_overflow_mode = 'break';
SET max_rows_to_group_by = 5000000;

SELECT
    category,
    sum(revenue) AS total_revenue
FROM sales
GROUP BY category;
```

## Setting group_by_overflow_mode in config.xml

For a server-wide default, edit `users.xml` or a user profile:

```xml
<profiles>
  <default>
    <max_rows_to_group_by>10000000</max_rows_to_group_by>
    <group_by_overflow_mode>any</group_by_overflow_mode>
  </default>
</profiles>
```

## Comparing the Three Modes

### throw mode

```sql
-- This will raise an exception if more than 1M groups are found
SELECT
    ip_address,
    count() AS hits
FROM access_log
GROUP BY ip_address
SETTINGS
    max_rows_to_group_by = 1000000,
    group_by_overflow_mode = 'throw';
```

Use `throw` when correctness is critical and you prefer an error over partial results.

### break mode

```sql
-- This returns partial results when 1M groups are reached
SELECT
    ip_address,
    count() AS hits
FROM access_log
GROUP BY ip_address
SETTINGS
    max_rows_to_group_by = 1000000,
    group_by_overflow_mode = 'break';
```

Use `break` for exploratory queries where approximate top results are acceptable.

### any mode

```sql
-- Groups are capped at 1M, but rows for existing groups keep being aggregated
SELECT
    ip_address,
    count() AS hits
FROM access_log
GROUP BY ip_address
SETTINGS
    max_rows_to_group_by = 1000000,
    group_by_overflow_mode = 'any';
```

Use `any` when you want aggregates over a bounded set of the most common keys.

## Practical Example - Top Products with Memory Cap

```sql
SELECT
    product_id,
    sum(quantity) AS total_sold,
    avg(price) AS avg_price
FROM orders
WHERE order_date >= today() - 30
GROUP BY product_id
ORDER BY total_sold DESC
LIMIT 100
SETTINGS
    max_rows_to_group_by = 500000,
    group_by_overflow_mode = 'any';
```

This query caps aggregation at 500k product groups. Any orders for products that appear after the cap are ignored, but orders for products already seen continue to be counted.

## Monitoring GROUP BY Memory Usage

Check how much memory a GROUP BY is actually using:

```sql
SELECT
    query_id,
    memory_usage,
    query
FROM system.processes
WHERE query LIKE '%GROUP BY%';
```

Or check completed queries in the query log:

```sql
SELECT
    query_id,
    memory_usage,
    toStartOfMinute(event_time) AS minute
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%GROUP BY%'
ORDER BY memory_usage DESC
LIMIT 10;
```

## Combining with max_bytes_before_external_group_by

`max_bytes_before_external_group_by` is a separate, independent mechanism from `group_by_overflow_mode`: when RAM usage crosses that threshold, ClickHouse switches to external (disk-based) aggregation instead of failing. It does not trigger the overflow mode. You can still set both on the same query to cover both memory pressure and unique-key cardinality:

```sql
SELECT
    user_id,
    count() AS sessions
FROM user_events
GROUP BY user_id
SETTINGS
    max_bytes_before_external_group_by = 10000000000,
    max_rows_to_group_by = 50000000,
    group_by_overflow_mode = 'throw';
```

Here ClickHouse spills to disk if memory grows past 10 GB, and throws if the distinct-key count exceeds 50M.

## Summary

The `group_by_overflow_mode` setting gives you fine-grained control over what happens when a GROUP BY query exceeds `max_rows_to_group_by`. Use `throw` for strict correctness, `break` for partial exploration, and `any` for approximate aggregations over a bounded set of keys. Always pair this setting with `max_rows_to_group_by` to trigger it.
