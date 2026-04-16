# How to Use Running Totals with Window Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, Running Total, Cumulative Sum, Analytics

Description: Learn how to calculate running totals and cumulative aggregations in ClickHouse using window functions with practical business analytics examples.

---

## What Are Running Totals

A running total (cumulative sum) adds each row's value to all previous row values, creating a continuously increasing total. Running totals are essential for:

- Cumulative revenue over time
- Running user count growth
- Progressive goal tracking
- Balance sheet calculations

## Basic Running Total with SUM() OVER

```sql
CREATE TABLE daily_sales (
    sale_date Date,
    revenue Float64,
    orders UInt32
) ENGINE = MergeTree()
ORDER BY sale_date;

-- Running total of revenue
SELECT
    sale_date,
    revenue AS daily_revenue,
    sum(revenue) OVER (ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_revenue
FROM daily_sales
ORDER BY sale_date;
```

## Simplified Running Total Syntax

When `ORDER BY` is specified without an explicit frame, ClickHouse uses the SQL-standard default of `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. This produces the same result as the explicit `ROWS` frame when the `ORDER BY` values are unique, but differs for ties: with `RANGE`, all rows sharing the same `ORDER BY` value receive the same running total.

```sql
-- Equivalent when sale_date is unique per row:
SELECT
    sale_date,
    revenue,
    -- Full explicit ROWS frame
    sum(revenue) OVER (ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_rev_1,
    -- Default frame (RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
    sum(revenue) OVER (ORDER BY sale_date) AS cum_rev_2
FROM daily_sales;
```

## Running Total with PARTITION BY

```sql
-- Cumulative revenue per product category
SELECT
    sale_date,
    category,
    revenue,
    sum(revenue) OVER (
        PARTITION BY category
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS category_cumulative_revenue
FROM category_daily_sales
ORDER BY category, sale_date;
```

## Multiple Running Aggregations

```sql
-- Calculate multiple running statistics in one pass
SELECT
    sale_date,
    revenue,
    orders,
    -- Running sums
    sum(revenue) OVER (ORDER BY sale_date) AS cumulative_revenue,
    sum(orders) OVER (ORDER BY sale_date) AS cumulative_orders,
    -- Running averages
    avg(revenue) OVER (ORDER BY sale_date) AS running_avg_revenue,
    -- Running min/max
    min(revenue) OVER (ORDER BY sale_date) AS running_min,
    max(revenue) OVER (ORDER BY sale_date) AS running_max,
    -- Running count
    count() OVER (ORDER BY sale_date) AS days_elapsed
FROM daily_sales
ORDER BY sale_date;
```

## Running Percentage of Total

```sql
-- What % of the full year's revenue was earned by each date?
SELECT
    sale_date,
    revenue,
    sum(revenue) OVER (ORDER BY sale_date) AS cumulative_revenue,
    sum(revenue) OVER () AS total_year_revenue,
    round(
        sum(revenue) OVER (ORDER BY sale_date) /
        sum(revenue) OVER () * 100,
        1
    ) AS pct_of_total
FROM daily_sales
ORDER BY sale_date;
```

## Running Total with Date Filtering

```sql
-- Year-to-date running totals
SELECT
    sale_date,
    revenue,
    sum(revenue) OVER (
        PARTITION BY toYear(sale_date)
        ORDER BY sale_date
    ) AS ytd_revenue
FROM daily_sales
WHERE sale_date >= '2023-01-01'
ORDER BY sale_date;
```

## Practical Example: Monthly Cohort Revenue Accumulation

```sql
CREATE TABLE subscriptions (
    user_id UInt64,
    cohort_month Date,     -- month user signed up
    revenue_month Date,    -- month revenue was earned
    revenue Float64
) ENGINE = MergeTree()
ORDER BY (cohort_month, revenue_month);

-- Cumulative LTV (lifetime value) per cohort
SELECT
    cohort_month,
    revenue_month,
    revenue AS monthly_cohort_revenue,
    sum(revenue) OVER (
        PARTITION BY cohort_month
        ORDER BY revenue_month
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_ltv,
    dateDiff('month', cohort_month, revenue_month) + 1 AS months_since_signup
FROM subscriptions
ORDER BY cohort_month, revenue_month;
```

## Running Total for Inventory Tracking

```sql
CREATE TABLE inventory_movements (
    product_id UInt32,
    movement_date DateTime,
    quantity_change Int32,   -- positive = received, negative = shipped
    movement_type LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY (product_id, movement_date);

-- Current inventory level (running sum of movements)
SELECT
    product_id,
    movement_date,
    movement_type,
    quantity_change,
    sum(quantity_change) OVER (
        PARTITION BY product_id
        ORDER BY movement_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_inventory
FROM inventory_movements
ORDER BY product_id, movement_date;

-- Current inventory level per product (latest row)
SELECT product_id, running_inventory AS current_stock
FROM (
    SELECT
        product_id,
        sum(quantity_change) OVER (
            PARTITION BY product_id
            ORDER BY movement_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_inventory,
        ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY movement_date DESC) AS rn
    FROM inventory_movements
)
WHERE rn = 1;
```

## Summary

Running totals in ClickHouse use `SUM() OVER (ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` to accumulate values progressively across rows. The `PARTITION BY` clause restarts the accumulation for each group (e.g., per year, per product, per cohort). Combine with other window aggregates like `avg()`, `min()`, `max()`, and `count()` to compute multiple running statistics in a single pass. Running totals are foundational for LTV analysis, inventory tracking, and progressive goal measurement.
