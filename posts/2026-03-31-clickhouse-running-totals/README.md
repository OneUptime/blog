# How to Implement Running Totals in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Running Total, Window Function, Cumulative, Analytics

Description: Learn how to implement running totals in ClickHouse using window functions, runningAccumulate, and cumulative sum patterns for financial and time-series analytics.

---

## Running Totals

Running totals accumulate a metric value progressively over an ordered sequence. They are fundamental to financial reporting, inventory tracking, and progress charts. ClickHouse provides multiple mechanisms for efficient running total computation.

## Window Function Running Total

The most readable approach uses `sum() OVER` with an unbounded window:

```sql
SELECT
    toDate(event_time) AS day,
    sum(revenue) AS daily_revenue,
    sum(sum(revenue)) OVER (
        ORDER BY toDate(event_time)
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM sales
WHERE toYear(event_time) = 2026
GROUP BY day
ORDER BY day;
```

## Running Total with Partition Reset

Reset the running total each month:

```sql
SELECT
    toDate(event_time) AS day,
    toYYYYMM(event_time) AS month,
    sum(revenue) AS daily_revenue,
    sum(sum(revenue)) OVER (
        PARTITION BY toYYYYMM(event_time)
        ORDER BY toDate(event_time)
    ) AS mtd_total
FROM sales
WHERE event_time >= toDate('2026-01-01')
GROUP BY day, month
ORDER BY day;
```

## Running Count

Track cumulative user signups:

```sql
SELECT
    toDate(created_at) AS day,
    count() AS new_users,
    sum(count()) OVER (ORDER BY toDate(created_at)) AS total_users
FROM users
WHERE created_at >= toDate('2026-01-01')
GROUP BY day
ORDER BY day;
```

## Running Average

Calculate a running average cost per transaction:

```sql
SELECT
    order_id,
    order_time,
    amount,
    avg(amount) OVER (
        ORDER BY order_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_avg_amount
FROM orders
WHERE order_time >= toDate('2026-01-01')
ORDER BY order_time;
```

## Running Maximum

Track the all-time high value:

```sql
SELECT
    day,
    daily_revenue,
    max(daily_revenue) OVER (
        ORDER BY day
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS all_time_high_revenue
FROM (
    SELECT toDate(event_time) AS day, sum(revenue) AS daily_revenue
    FROM sales GROUP BY day
)
ORDER BY day;
```

## Inventory Running Total

Track stock levels with running add/remove operations:

```sql
SELECT
    event_time,
    product_id,
    quantity_change,
    sum(quantity_change) OVER (
        PARTITION BY product_id
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS stock_level
FROM inventory_events
WHERE product_id = 'SKU-001'
ORDER BY event_time;
```

## Summary

Running totals in ClickHouse use `sum() OVER` with `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Partitioning resets the total per month or product. The same pattern extends to running counts, averages, and maximums. For extremely large tables, `runningAccumulate` with state functions provides better performance.
