# How to Use Window Functions in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQL, Window Functions, Analytics, OVER, PARTITION BY

Description: Master PostgreSQL window functions for advanced analytics. Learn ROW_NUMBER, RANK, LAG, LEAD, running totals, and moving averages with practical examples.

---

Window functions perform calculations across sets of rows related to the current row without collapsing them into a single output row like GROUP BY does. They are essential for ranking, running totals, moving averages, and comparing rows. This guide covers the most useful window functions with practical examples.

## Understanding Window Functions

Unlike aggregate functions with GROUP BY, window functions retain all rows while adding computed values.

```sql
-- Sample data
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    salesperson VARCHAR(50),
    region VARCHAR(50),
    sale_date DATE,
    amount DECIMAL(10,2)
);

INSERT INTO sales (salesperson, region, sale_date, amount) VALUES
    ('Alice', 'North', '2026-01-01', 1000),
    ('Alice', 'North', '2026-01-15', 1500),
    ('Alice', 'North', '2026-02-01', 1200),
    ('Bob', 'North', '2026-01-01', 800),
    ('Bob', 'North', '2026-01-20', 1100),
    ('Carol', 'South', '2026-01-05', 2000),
    ('Carol', 'South', '2026-01-25', 1800),
    ('Carol', 'South', '2026-02-10', 2200);

-- GROUP BY collapses rows
SELECT salesperson, SUM(amount) AS total
FROM sales
GROUP BY salesperson;
-- Returns 3 rows

-- Window function keeps all rows
SELECT
    salesperson,
    sale_date,
    amount,
    SUM(amount) OVER (PARTITION BY salesperson) AS person_total
FROM sales;
-- Returns 8 rows, each with the salesperson's total
```

## Basic Window Function Syntax

The OVER clause defines the window for the function.

```sql
-- Window function syntax
SELECT
    column1,
    column2,
    window_function(column) OVER (
        PARTITION BY partition_column    -- Optional: groups rows
        ORDER BY order_column            -- Optional: orders within partition
        frame_clause                     -- Optional: limits rows in frame
    )
FROM table_name;

-- Example: running total by salesperson
SELECT
    salesperson,
    sale_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
    ) AS running_total
FROM sales
ORDER BY salesperson, sale_date;
```

## ROW_NUMBER, RANK, and DENSE_RANK

Numbering and ranking functions assign values based on row position.

```sql
-- ROW_NUMBER: unique sequential number
SELECT
    salesperson,
    amount,
    ROW_NUMBER() OVER (ORDER BY amount DESC) AS row_num
FROM sales;

-- RANK: same value for ties, gaps after ties
SELECT
    salesperson,
    amount,
    RANK() OVER (ORDER BY amount DESC) AS rank
FROM sales;

-- DENSE_RANK: same value for ties, no gaps
SELECT
    salesperson,
    amount,
    DENSE_RANK() OVER (ORDER BY amount DESC) AS dense_rank
FROM sales;

-- Compare all three
SELECT
    salesperson,
    amount,
    ROW_NUMBER() OVER (ORDER BY amount DESC) AS row_num,
    RANK() OVER (ORDER BY amount DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY amount DESC) AS dense_rank
FROM sales
ORDER BY amount DESC;
```

## Top N Per Group

A common use case: find the top N rows within each category.

```sql
-- Top 2 sales per salesperson
WITH ranked_sales AS (
    SELECT
        salesperson,
        sale_date,
        amount,
        ROW_NUMBER() OVER (
            PARTITION BY salesperson
            ORDER BY amount DESC
        ) AS rn
    FROM sales
)
SELECT salesperson, sale_date, amount
FROM ranked_sales
WHERE rn <= 2;

-- Best sale per region
WITH best_per_region AS (
    SELECT
        region,
        salesperson,
        amount,
        ROW_NUMBER() OVER (
            PARTITION BY region
            ORDER BY amount DESC
        ) AS rn
    FROM sales
)
SELECT region, salesperson, amount
FROM best_per_region
WHERE rn = 1;
```

## LAG and LEAD

Access values from previous or following rows.

```sql
-- LAG: get value from previous row
SELECT
    salesperson,
    sale_date,
    amount,
    LAG(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
    ) AS previous_amount,
    amount - LAG(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
    ) AS change_from_previous
FROM sales
ORDER BY salesperson, sale_date;

-- LEAD: get value from next row
SELECT
    salesperson,
    sale_date,
    amount,
    LEAD(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
    ) AS next_amount
FROM sales
ORDER BY salesperson, sale_date;

-- LAG with offset and default value
SELECT
    salesperson,
    sale_date,
    amount,
    LAG(amount, 2, 0) OVER (  -- 2 rows back, default 0
        PARTITION BY salesperson
        ORDER BY sale_date
    ) AS two_sales_ago
FROM sales;
```

## Running Totals and Moving Averages

Calculate cumulative and rolling statistics.

```sql
-- Running total
SELECT
    salesperson,
    sale_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM sales;

-- Moving average (3-row window)
SELECT
    salesperson,
    sale_date,
    amount,
    AVG(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3
FROM sales;

-- Moving sum over previous 7 days
SELECT
    salesperson,
    sale_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
        RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
    ) AS week_total
FROM sales;
```

## FIRST_VALUE, LAST_VALUE, NTH_VALUE

Access specific values within the window frame.

```sql
-- FIRST_VALUE: first amount in partition
SELECT
    salesperson,
    sale_date,
    amount,
    FIRST_VALUE(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
    ) AS first_sale_amount
FROM sales;

-- LAST_VALUE (needs explicit frame)
SELECT
    salesperson,
    sale_date,
    amount,
    LAST_VALUE(amount) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_sale_amount
FROM sales;

-- NTH_VALUE: get second value
SELECT
    salesperson,
    sale_date,
    amount,
    NTH_VALUE(amount, 2) OVER (
        PARTITION BY salesperson
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_sale_amount
FROM sales;
```

## Percent Rank and Cumulative Distribution

Statistical ranking functions.

```sql
-- PERCENT_RANK: relative rank (0 to 1)
SELECT
    salesperson,
    amount,
    PERCENT_RANK() OVER (ORDER BY amount) AS percent_rank
FROM sales;

-- CUME_DIST: cumulative distribution
SELECT
    salesperson,
    amount,
    CUME_DIST() OVER (ORDER BY amount) AS cumulative_dist
FROM sales;

-- NTILE: divide into buckets
SELECT
    salesperson,
    amount,
    NTILE(4) OVER (ORDER BY amount) AS quartile
FROM sales;

-- Percentile calculation
SELECT
    salesperson,
    amount,
    NTILE(100) OVER (ORDER BY amount) AS percentile
FROM sales;
```

## Named Window Definitions

Reuse window definitions for cleaner queries.

```sql
-- Define window once, use multiple times
SELECT
    salesperson,
    sale_date,
    amount,
    SUM(amount) OVER w AS running_total,
    AVG(amount) OVER w AS running_avg,
    COUNT(*) OVER w AS sale_count
FROM sales
WINDOW w AS (
    PARTITION BY salesperson
    ORDER BY sale_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
ORDER BY salesperson, sale_date;

-- Multiple named windows
SELECT
    salesperson,
    region,
    amount,
    SUM(amount) OVER by_person AS person_total,
    SUM(amount) OVER by_region AS region_total,
    SUM(amount) OVER () AS grand_total
FROM sales
WINDOW
    by_person AS (PARTITION BY salesperson),
    by_region AS (PARTITION BY region);
```

## Frame Specifications

Control which rows are included in the window frame.

```sql
-- ROWS: count physical rows
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS sum_3_rows
FROM sales;

-- RANGE: include rows with same ORDER BY value
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY sale_date
        RANGE BETWEEN CURRENT ROW AND CURRENT ROW
    ) AS same_day_total
FROM sales;

-- GROUPS: count distinct ORDER BY values (PostgreSQL 11+)
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY sale_date
        GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW
    ) AS sum_2_days
FROM sales;

-- Common frame clauses
-- ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW (default with ORDER BY)
-- ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
-- ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING (centered window)
```

## Practical Examples

Real-world applications of window functions.

```sql
-- Year-over-year comparison
WITH monthly_totals AS (
    SELECT
        DATE_TRUNC('month', sale_date) AS month,
        SUM(amount) AS total
    FROM sales
    GROUP BY DATE_TRUNC('month', sale_date)
)
SELECT
    month,
    total,
    LAG(total, 12) OVER (ORDER BY month) AS last_year,
    total - LAG(total, 12) OVER (ORDER BY month) AS yoy_change,
    ROUND(100.0 * (total - LAG(total, 12) OVER (ORDER BY month)) /
        NULLIF(LAG(total, 12) OVER (ORDER BY month), 0), 2) AS yoy_percent
FROM monthly_totals;

-- Detect consecutive increases
WITH sales_with_prev AS (
    SELECT
        salesperson,
        sale_date,
        amount,
        LAG(amount) OVER (
            PARTITION BY salesperson ORDER BY sale_date
        ) AS prev_amount
    FROM sales
)
SELECT *,
    CASE WHEN amount > prev_amount THEN 'increase'
         WHEN amount < prev_amount THEN 'decrease'
         ELSE 'no change'
    END AS trend
FROM sales_with_prev;

-- Gap and island detection
SELECT
    salesperson,
    sale_date,
    sale_date - (ROW_NUMBER() OVER (
        PARTITION BY salesperson ORDER BY sale_date
    ))::INTEGER AS island_group
FROM sales;
```

Window functions unlock powerful analytical capabilities in PostgreSQL. They eliminate the need for self-joins and subqueries in many scenarios, resulting in cleaner and often faster queries. Practice with these patterns, and you will find yourself reaching for window functions frequently in data analysis tasks.
