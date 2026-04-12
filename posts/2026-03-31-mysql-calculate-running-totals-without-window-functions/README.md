# How to Calculate Running Totals in MySQL Without Window Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Running Total, Query, Aggregation, LEGACY

Description: Calculate running totals in MySQL 5.6 and 5.7 without window functions using correlated subqueries, user variables, and self-joins.

---

## Why Calculate Without Window Functions?

MySQL 8.0 introduced window functions like `SUM() OVER()` for running totals. However, many production servers still run MySQL 5.6 or 5.7 which lack window function support. The techniques below achieve the same results on older MySQL versions.

## Sample Data

```sql
CREATE TABLE daily_sales (
  sale_date DATE PRIMARY KEY,
  amount DECIMAL(10,2)
);

INSERT INTO daily_sales VALUES
('2024-01-01', 1000),
('2024-01-02', 1500),
('2024-01-03', 800),
('2024-01-04', 2000),
('2024-01-05', 1200);
```

## Method 1 - Correlated Subquery

```sql
SELECT
  s1.sale_date,
  s1.amount,
  (
    SELECT SUM(s2.amount)
    FROM daily_sales s2
    WHERE s2.sale_date <= s1.sale_date
  ) AS running_total
FROM daily_sales s1
ORDER BY s1.sale_date;
```

Result:

```text
+------------+--------+---------------+
| sale_date  | amount | running_total |
+------------+--------+---------------+
| 2024-01-01 |   1000 |          1000 |
| 2024-01-02 |   1500 |          2500 |
| 2024-01-03 |    800 |          3300 |
| 2024-01-04 |   2000 |          5300 |
| 2024-01-05 |   1200 |          6500 |
+------------+--------+---------------+
```

This is readable but slow for large tables because it executes a subquery per row. In this example `sale_date` is already the primary key and therefore indexed, but in tables where the running-total column is not the primary key, add an index on it for better performance:

```sql
ALTER TABLE daily_sales ADD INDEX idx_sale_date (sale_date);
```

## Method 2 - User Variable Accumulation

User variables carry state across rows as MySQL processes them:

```sql
SET @running_total := 0;

SELECT
  sale_date,
  amount,
  (@running_total := @running_total + amount) AS running_total
FROM daily_sales
ORDER BY sale_date;
```

This is significantly faster than correlated subqueries for large datasets because it processes the result set in a single pass.

Note: The ORDER BY must be applied in the same query level where the variable is updated. Wrapping this in a subquery may produce incorrect results.

## Method 3 - Self-Join

```sql
SELECT
  s1.sale_date,
  s1.amount,
  SUM(s2.amount) AS running_total
FROM daily_sales s1
JOIN daily_sales s2 ON s2.sale_date <= s1.sale_date
GROUP BY s1.sale_date, s1.amount
ORDER BY s1.sale_date;
```

This produces the same result but is less efficient than the user variable approach for large tables due to the join overhead.

## Running Total with Partitions (by Category)

User variable technique for per-category running totals:

```sql
SET @running_total := 0;
SET @prev_category := NULL;

SELECT
  category,
  sale_date,
  amount,
  @running_total := IF(@prev_category = category,
    @running_total + amount,
    amount
  ) AS running_total,
  @prev_category := category AS _cat
FROM category_sales
ORDER BY category, sale_date;
```

## Performance Tip

For the correlated subquery approach, always index the column used in the `WHERE` condition. For the user variable approach, ensure the base query's ORDER BY matches the order you expect:

```sql
EXPLAIN SELECT
  s1.sale_date,
  (SELECT SUM(s2.amount) FROM daily_sales s2 WHERE s2.sale_date <= s1.sale_date)
FROM daily_sales s1;
```

## Summary

On MySQL 5.6 and 5.7, running totals use either correlated subqueries (simple but slow at scale), user variable accumulation (fast single-pass), or self-joins. The user variable method is the most performant for large datasets. If you can upgrade to MySQL 8.0+, use `SUM(amount) OVER (ORDER BY sale_date ROWS UNBOUNDED PRECEDING)` instead.
