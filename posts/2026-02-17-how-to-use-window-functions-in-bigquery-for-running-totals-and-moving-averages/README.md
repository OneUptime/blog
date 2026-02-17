# How to Use Window Functions in BigQuery for Running Totals and Moving Averages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, SQL, Window Functions, Data Analytics

Description: Master BigQuery window functions to calculate running totals, moving averages, rankings, and other analytical computations without self-joins or subqueries.

---

Window functions are one of the most useful features in SQL, and BigQuery's implementation is particularly powerful. They let you perform calculations across a set of rows that are related to the current row, without collapsing the result into a single row like GROUP BY does. If you have ever tried to calculate a running total or moving average using self-joins, you know how messy that gets. Window functions make these calculations clean and fast.

## The Basics of Window Functions

A window function operates on a "window" of rows defined by the OVER clause. The key parts are:

- **PARTITION BY**: Divides the rows into groups (similar to GROUP BY, but rows are not collapsed)
- **ORDER BY**: Defines the order of rows within each partition
- **Frame specification**: Defines which rows around the current row to include in the calculation

Here is a simple example using a sales table:

```sql
-- Calculate each order's amount alongside the total for that customer
-- The window function adds a column without reducing rows
SELECT
  order_id,
  customer_id,
  order_date,
  amount,
  SUM(amount) OVER (PARTITION BY customer_id) AS customer_total
FROM `my_project.sales.orders`
ORDER BY customer_id, order_date;
```

Each row still appears in the output, but now it also has the customer's total amount alongside it.

## Running Totals

A running total (cumulative sum) adds up values as you move through ordered rows. This is one of the most common use cases for window functions.

```sql
-- Calculate a running total of daily revenue
-- Each row shows the cumulative revenue up to and including that day
SELECT
  order_date,
  daily_revenue,
  SUM(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM (
  -- First aggregate to get daily totals
  SELECT
    DATE(order_timestamp) AS order_date,
    SUM(amount) AS daily_revenue
  FROM `my_project.sales.orders`
  WHERE order_timestamp >= '2025-01-01'
  GROUP BY order_date
)
ORDER BY order_date;
```

The frame `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` means "from the very first row to the current row." This is actually the default frame when ORDER BY is specified, so you can simplify it:

```sql
-- Simplified version - the default frame is UNBOUNDED PRECEDING to CURRENT ROW
SELECT
  order_date,
  daily_revenue,
  SUM(daily_revenue) OVER (ORDER BY order_date) AS running_total
FROM daily_revenue_table
ORDER BY order_date;
```

## Running Totals Per Group

Often you want a running total that resets for each group:

```sql
-- Running total per customer, resetting for each customer
SELECT
  customer_id,
  order_date,
  amount,
  SUM(amount) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
  ) AS customer_running_total
FROM `my_project.sales.orders`
ORDER BY customer_id, order_date;
```

The PARTITION BY resets the running total for each customer.

## Moving Averages

Moving averages smooth out fluctuations in time-series data. A 7-day moving average of daily revenue, for example, gives you a clearer picture of trends than the raw daily numbers.

```sql
-- 7-day moving average of daily revenue
-- Looks at the current day plus the 6 preceding days
SELECT
  order_date,
  daily_revenue,
  AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS moving_avg_7day
FROM daily_revenue_table
ORDER BY order_date;
```

You can also do a centered moving average, which looks at rows on both sides:

```sql
-- Centered 7-day moving average (3 days before and 3 days after)
-- Useful for smoothing that does not lag behind the trend
SELECT
  order_date,
  daily_revenue,
  AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
  ) AS centered_moving_avg
FROM daily_revenue_table
ORDER BY order_date;
```

## ROWS vs RANGE Frames

This is a subtle but important distinction. ROWS counts physical rows, while RANGE considers the actual values:

```sql
-- ROWS frame: exactly 6 rows before the current one
-- If there are gaps in dates, this may span more than 7 calendar days
SELECT
  order_date,
  daily_revenue,
  AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS rows_based_avg
FROM daily_revenue_table;

-- RANGE frame: all rows within 6 units of the current ORDER BY value
-- For dates, use RANGE with interval expressions for calendar-aware windows
SELECT
  order_date,
  daily_revenue,
  AVG(daily_revenue) OVER (
    ORDER BY UNIX_DATE(order_date)
    RANGE BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS range_based_avg
FROM daily_revenue_table;
```

If your data has no gaps, ROWS and RANGE produce the same result. But if you are missing some dates, RANGE gives you a true 7-calendar-day average while ROWS gives you the average of the last 7 available data points.

## Ranking Functions

Window functions also handle ranking, which is useful for finding top performers or assigning positions:

```sql
-- Rank products by revenue within each category
SELECT
  category,
  product_name,
  total_revenue,
  -- ROW_NUMBER: unique sequential numbers, no ties
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_revenue DESC) AS row_num,
  -- RANK: same rank for ties, gaps after ties (1, 2, 2, 4)
  RANK() OVER (PARTITION BY category ORDER BY total_revenue DESC) AS rank,
  -- DENSE_RANK: same rank for ties, no gaps (1, 2, 2, 3)
  DENSE_RANK() OVER (PARTITION BY category ORDER BY total_revenue DESC) AS dense_rank
FROM product_revenue_summary
ORDER BY category, total_revenue DESC;
```

## Lag and Lead for Comparisons

LAG and LEAD let you compare a row with previous or next rows. This is perfect for period-over-period comparisons:

```sql
-- Compare each month's revenue with the previous month
SELECT
  month,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY month) AS prev_month_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY month) AS month_over_month_change,
  ROUND(
    SAFE_DIVIDE(
      revenue - LAG(revenue, 1) OVER (ORDER BY month),
      LAG(revenue, 1) OVER (ORDER BY month)
    ) * 100, 2
  ) AS pct_change
FROM monthly_revenue
ORDER BY month;
```

## First and Last Values

FIRST_VALUE and LAST_VALUE grab specific values from the window:

```sql
-- For each order, show the customer's first and most recent order amounts
SELECT
  customer_id,
  order_date,
  amount,
  FIRST_VALUE(amount) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
  ) AS first_order_amount,
  LAST_VALUE(amount) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS latest_order_amount
FROM orders
ORDER BY customer_id, order_date;
```

Note the explicit frame on LAST_VALUE. Without it, the default frame only goes to the current row, so LAST_VALUE would just return the current row's value.

## Combining Multiple Window Functions

You can use multiple window functions in a single query, and BigQuery optimizes them efficiently:

```sql
-- Comprehensive analytics in a single query
SELECT
  order_date,
  daily_revenue,
  SUM(daily_revenue) OVER w AS running_total,
  AVG(daily_revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d,
  daily_revenue - LAG(daily_revenue) OVER (ORDER BY order_date) AS daily_change,
  RANK() OVER (ORDER BY daily_revenue DESC) AS revenue_rank
FROM daily_revenue_table
WINDOW w AS (ORDER BY order_date)
ORDER BY order_date;
```

The WINDOW clause lets you define a named window that you can reuse, keeping the query cleaner.

## Performance Considerations

Window functions in BigQuery are generally efficient, but a few things to keep in mind. Large partitions (millions of rows in a single partition) can slow things down. If you can pre-filter data before applying window functions, do it. Using multiple window functions with different PARTITION BY or ORDER BY clauses forces BigQuery to re-sort data, which adds cost. Try to use compatible window definitions when possible.

Window functions are one of those SQL features that, once you learn them, you will wonder how you ever got by without them. They replace complex self-joins and subqueries with clear, declarative calculations that BigQuery executes efficiently at any scale.
