# How to Calculate Cumulative Sums in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Cumulative Sum, Window Function, Aggregation, Analytics

Description: Calculate cumulative sums in MySQL using SUM() OVER() window functions in MySQL 8.0+ and correlated subqueries or user variables for older versions.

---

## Cumulative Sum vs Running Total

A cumulative sum adds up all values from the start of a dataset (or partition) up to the current row. This is the standard term in analytics for what is also called a running total. MySQL 8.0 introduced proper window functions for this, making the calculation concise and efficient.

## Sample Data

```sql
CREATE TABLE monthly_revenue (
  month_start DATE NOT NULL,
  region VARCHAR(30) NOT NULL,
  revenue DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (month_start, region)
);

INSERT INTO monthly_revenue VALUES
('2024-01-01', 'North', 12000),
('2024-02-01', 'North', 15000),
('2024-03-01', 'North', 11000),
('2024-01-01', 'South', 9000),
('2024-02-01', 'South', 10500),
('2024-03-01', 'South', 13000);
```

## MySQL 8.0 - Window Function Approach

```sql
SELECT
  month_start,
  region,
  revenue,
  SUM(revenue) OVER (
    PARTITION BY region
    ORDER BY month_start
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_revenue
FROM monthly_revenue
ORDER BY region, month_start;
```

Result:

```text
+------------+--------+---------+--------------------+
| month_start| region | revenue | cumulative_revenue |
+------------+--------+---------+--------------------+
| 2024-01-01 | North  |   12000 |              12000 |
| 2024-02-01 | North  |   15000 |              27000 |
| 2024-03-01 | North  |   11000 |              38000 |
| 2024-01-01 | South  |    9000 |               9000 |
| 2024-02-01 | South  |   10500 |              19500 |
| 2024-03-01 | South  |   13000 |              32500 |
+------------+--------+---------+--------------------+
```

## Shorthand - Default Frame

The default frame when `ORDER BY` is specified is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. For `SUM()`, this produces the same result as the explicit `ROWS` frame when there are no duplicate `ORDER BY` values, so this shorthand works:

```sql
SELECT
  month_start,
  region,
  revenue,
  SUM(revenue) OVER (PARTITION BY region ORDER BY month_start) AS cumulative_revenue
FROM monthly_revenue
ORDER BY region, month_start;
```

## Cumulative Sum as a Percentage of Total

```sql
SELECT
  month_start,
  region,
  revenue,
  SUM(revenue) OVER (PARTITION BY region ORDER BY month_start) AS cumulative,
  ROUND(
    SUM(revenue) OVER (PARTITION BY region ORDER BY month_start)
    / SUM(revenue) OVER (PARTITION BY region)
    * 100, 1
  ) AS pct_of_total
FROM monthly_revenue
ORDER BY region, month_start;
```

## MySQL 5.7 - User Variable Approach

```sql
SET @prev_region := NULL;
SET @cumsum := 0;

SELECT
  month_start,
  region,
  revenue,
  @cumsum := IF(
    @prev_region = region,
    @cumsum + revenue,
    revenue
  ) AS cumulative_revenue,
  @prev_region := region AS _region
FROM monthly_revenue
ORDER BY region, month_start;
```

## Cumulative Average

Using a window function to track a cumulative average alongside the sum:

```sql
SELECT
  month_start,
  region,
  revenue,
  SUM(revenue) OVER (PARTITION BY region ORDER BY month_start) AS cumulative_sum,
  ROUND(
    AVG(revenue) OVER (PARTITION BY region ORDER BY month_start), 2
  ) AS cumulative_avg
FROM monthly_revenue
ORDER BY region, month_start;
```

## Resetting Cumulative Sum by Year

```sql
SELECT
  month_start,
  region,
  revenue,
  SUM(revenue) OVER (
    PARTITION BY region, YEAR(month_start)
    ORDER BY month_start
  ) AS ytd_cumulative
FROM monthly_revenue
ORDER BY region, month_start;
```

## Summary

Cumulative sums in MySQL 8.0+ are best expressed with `SUM() OVER (PARTITION BY ... ORDER BY ...)` which is readable, performant, and correct for all edge cases. For MySQL 5.7 and earlier, use user variables that accumulate across rows ordered by the partition key, resetting when the partition changes. Combine cumulative sums with total window aggregates to derive running percentages.
