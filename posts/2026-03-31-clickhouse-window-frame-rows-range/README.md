# How to Use Window Frame Specifications in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, SQL, Analytics

Description: Learn how ROWS and RANGE frame specifications control which rows are included in a window function calculation, with practical examples.

---

Window functions in ClickHouse operate over a set of rows called a "frame." By default, many window functions use all rows in the partition, but you can narrow or shift that frame using frame specifications. Two frame modes exist: ROWS and RANGE. Understanding the difference is essential for accurate running totals, moving averages, and cumulative calculations.

## ROWS vs RANGE: The Core Difference

ROWS counts physical row positions. RANGE groups rows that share the same ORDER BY value as the current row. When all ORDER BY values are distinct, ROWS and RANGE behave identically. The difference surfaces when ties exist.

The general syntax for a frame clause is:

```text
{ ROWS | RANGE } BETWEEN <frame_start> AND <frame_end>

frame_start / frame_end:
  UNBOUNDED PRECEDING
  N PRECEDING
  CURRENT ROW
  N FOLLOWING
  UNBOUNDED FOLLOWING
```

## Setting Up Sample Data

Create a table of daily sales to experiment with frame modes.

```sql
CREATE TABLE daily_sales
(
    sale_date Date,
    region    String,
    amount    Float64
)
ENGINE = MergeTree()
ORDER BY (region, sale_date);

INSERT INTO daily_sales VALUES
    ('2024-01-01', 'East', 100),
    ('2024-01-02', 'East', 150),
    ('2024-01-03', 'East', 150),
    ('2024-01-04', 'East', 200),
    ('2024-01-05', 'East', 250);
```

## ROWS BETWEEN N PRECEDING AND CURRENT ROW

This frame looks back exactly N physical rows from the current row. The following query computes a 3-row moving average (current row plus the two rows before it).

```sql
SELECT
    sale_date,
    amount,
    round(avg(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_3day
FROM daily_sales
WHERE region = 'East'
ORDER BY sale_date;
```

On January 3rd the average covers Jan 1, Jan 2, and Jan 3. On January 1st (the first row) the frame contains only that single row, so the average equals the amount itself.

## RANGE BETWEEN N PRECEDING AND CURRENT ROW

RANGE works on value distance, not row count. When the ORDER BY column is a date or number, ClickHouse compares the column values directly. Rows whose ORDER BY value falls within N units of the current row are included.

```sql
SELECT
    sale_date,
    amount,
    sum(amount) OVER (
        ORDER BY toInt32(sale_date)
        RANGE BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS range_sum
FROM daily_sales
WHERE region = 'East'
ORDER BY sale_date;
```

Here the ORDER BY column is the integer representation of `sale_date`. Because the dates are consecutive with no gaps, `RANGE BETWEEN 2 PRECEDING AND CURRENT ROW` includes every row whose date integer is within 2 of the current row's — effectively producing the same 3-day window as the ROWS example above. The difference between ROWS and RANGE becomes visible when the ORDER BY column contains ties, as shown in the later section.

## UNBOUNDED PRECEDING: Cumulative Totals

`UNBOUNDED PRECEDING` extends the frame all the way to the first row in the partition, giving a classic running total.

```sql
SELECT
    sale_date,
    region,
    amount,
    sum(amount) OVER (
        PARTITION BY region
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM daily_sales
ORDER BY region, sale_date;
```

Each row's `running_total` is the cumulative sum of all `amount` values from the beginning of that region's partition up to and including the current row.

## UNBOUNDED FOLLOWING: Reverse Cumulative Totals

`UNBOUNDED FOLLOWING` extends the frame to the last row in the partition. Combined with `CURRENT ROW` as the start, you get the amount remaining from the current row to the end.

```sql
SELECT
    sale_date,
    amount,
    sum(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
    ) AS remaining_total
FROM daily_sales
WHERE region = 'East'
ORDER BY sale_date;
```

The first row shows the grand total of all sales. Each subsequent row shows the total for the current and all future rows.

## Combining Preceding and Following

You can build a symmetric window by specifying rows on both sides of the current row. This is useful for smoothing time-series data.

```sql
SELECT
    sale_date,
    amount,
    round(avg(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ), 2) AS centered_moving_avg
FROM daily_sales
WHERE region = 'East'
ORDER BY sale_date;
```

For interior rows, this averages the previous row, the current row, and the next row. For boundary rows (the first and last), the frame simply shrinks to what is available.

## ROWS vs RANGE When Ties Exist

This query shows the difference in output when duplicates are present in the ORDER BY column.

```sql
SELECT
    sale_date,
    amount,
    sum(amount) OVER (
        ORDER BY amount
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS rows_running_total,
    sum(amount) OVER (
        ORDER BY amount
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS range_running_total
FROM daily_sales
WHERE region = 'East'
ORDER BY amount;
```

Both rows with `amount = 150` will show the same `range_running_total` because RANGE includes all rows with the same ORDER BY value. ROWS, by contrast, treats them as separate physical rows and increments one at a time.

## Summary

Window frame specifications give you fine-grained control over which rows participate in a window function calculation. Use ROWS when you need exact row counts (moving averages, N-row lookbacks). Use RANGE when you want value-based grouping that handles ties consistently. `UNBOUNDED PRECEDING` and `UNBOUNDED FOLLOWING` are the building blocks for cumulative and reverse-cumulative aggregations, while `N PRECEDING` and `N FOLLOWING` build fixed-size sliding windows.
