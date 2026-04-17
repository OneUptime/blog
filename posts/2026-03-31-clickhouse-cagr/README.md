# How to Calculate Compound Annual Growth Rate (CAGR) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CAGR, Growth Rate, Analytics, SQL

Description: Calculate Compound Annual Growth Rate for revenue, users, or any metric in ClickHouse using start and end period values and the power function.

---

## CAGR Formula

CAGR = (End Value / Start Value) ^ (1 / Years) - 1

Years is typically expressed in fractional years when the period is not exactly 12 months.

## Annual Revenue CAGR

```sql
WITH yearly AS (
    SELECT
        toYear(created_at)  AS yr,
        sum(amount)         AS revenue
    FROM transactions
    WHERE toYear(created_at) BETWEEN 2022 AND 2025
    GROUP BY yr
    ORDER BY yr
),
bounds AS (
    SELECT
        minIf(revenue, yr = 2022) AS start_revenue,
        maxIf(revenue, yr = 2025) AS end_revenue,
        3                         AS years  -- 2022 to 2025
    FROM yearly
)
SELECT
    round(start_revenue, 2)                             AS start_revenue,
    round(end_revenue, 2)                               AS end_revenue,
    round((pow(end_revenue / start_revenue, 1.0 / years) - 1) * 100, 2) AS cagr_pct
FROM bounds;
```

## CAGR for Any Metric with Dynamic Date Range

```sql
WITH monthly AS (
    SELECT
        toStartOfMonth(created_at) AS month,
        uniq(user_id)              AS active_users
    FROM events
    GROUP BY month
    ORDER BY month
),
bounds AS (
    SELECT
        argMin(active_users, month) AS start_val,
        argMax(active_users, month) AS end_val,
        dateDiff('month', min(month), max(month)) / 12.0 AS years
    FROM monthly
)
SELECT
    round((pow(end_val / start_val, 1.0 / years) - 1) * 100, 2) AS cagr_pct
FROM bounds;
```

## CAGR by Product Line

```sql
WITH yearly AS (
    SELECT
        product_line,
        toYear(created_at) AS yr,
        sum(amount)        AS revenue
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    WHERE yr IN (2023, 2025)
    GROUP BY product_line, yr
),
pivoted AS (
    SELECT
        product_line,
        sumIf(revenue, yr = 2023) AS rev_2023,
        sumIf(revenue, yr = 2025) AS rev_2025
    FROM yearly
    GROUP BY product_line
)
SELECT
    product_line,
    round(rev_2023, 2)                                                   AS rev_2023,
    round(rev_2025, 2)                                                   AS rev_2025,
    round((pow(rev_2025 / rev_2023, 0.5) - 1) * 100, 2)                 AS cagr_pct
FROM pivoted
WHERE rev_2023 > 0
ORDER BY cagr_pct DESC;
```

## Handling Zero or Negative Start Values

```sql
SELECT
    CASE
        WHEN start_val <= 0 THEN NULL
        ELSE round((pow(end_val / start_val, 1.0 / years) - 1) * 100, 2)
    END AS cagr_pct
FROM bounds;
```

## Comparing CAGR Across Rolling Windows

Use subqueries with different date ranges to compare 1-year, 3-year, and 5-year CAGRs side by side in a dashboard.

## Summary

ClickHouse calculates CAGR using `pow(end / start, 1/years) - 1` with the built-in `pow` function. Combine `minIf`/`maxIf` or yearly CTEs to extract period boundaries, and handle zero start values with a CASE expression to avoid division errors.
