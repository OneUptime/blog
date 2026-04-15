# How to Use toStartOfMonth() and toStartOfQuarter() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Analytics, Aggregation, Cohort

Description: Learn how to use toStartOfMonth() and toStartOfQuarter() in ClickHouse for monthly and quarterly cohort analysis and period-over-period comparisons.

---

Monthly and quarterly reporting are two of the most important cadences in business analytics. ClickHouse makes both straightforward with `toStartOfMonth()` and `toStartOfQuarter()`. These functions snap any date or timestamp to the first day of its containing month or quarter, giving you a clean bucketing key for `GROUP BY` expressions.

This post explains how both functions work, when to use each, and shows practical SQL patterns for cohort analysis and period-over-period comparisons.

## toStartOfMonth() - First Day of the Month

`toStartOfMonth(dt)` returns a `Date` value representing the first day of the calendar month that contains the input. It accepts both `Date` and `DateTime` values.

```sql
SELECT
    toDate('2026-03-31')                   AS input_date,
    toStartOfMonth(toDate('2026-03-31'))   AS month_start;
```

```text
input_date   month_start
------------ ------------
2026-03-31   2026-03-01
```

Every day in March maps to March 1st, every day in April maps to April 1st, and so on.

## Monthly Aggregations

The most common use is grouping metrics by calendar month:

```sql
SELECT
    toStartOfMonth(sale_date)  AS month,
    count()                    AS orders,
    sum(revenue)               AS monthly_revenue,
    uniq(customer_id)          AS unique_customers
FROM sales
WHERE sale_date >= toDate('2025-01-01')
GROUP BY month
ORDER BY month;
```

## Month-over-Month Comparison

Use a window function to calculate month-over-month growth in a single query:

```sql
SELECT
    month,
    monthly_revenue,
    lagInFrame(monthly_revenue) OVER (ORDER BY month) AS prev_month_revenue,
    round(
        (monthly_revenue - lagInFrame(monthly_revenue) OVER (ORDER BY month))
        / lagInFrame(monthly_revenue) OVER (ORDER BY month) * 100,
        2
    ) AS mom_growth_pct
FROM (
    SELECT
        toStartOfMonth(sale_date)  AS month,
        sum(revenue)               AS monthly_revenue
    FROM sales
    WHERE sale_date >= toDate('2024-01-01')
    GROUP BY month
)
ORDER BY month;
```

## Monthly Cohort Retention

Monthly cohort analysis groups users by the month they first signed up, then tracks how many of them returned in subsequent months. `toStartOfMonth()` is the natural bucketing function here:

```sql
SELECT
    toStartOfMonth(first_seen)  AS cohort_month,
    toStartOfMonth(event_date)  AS activity_month,
    uniq(user_id)               AS active_users
FROM (
    SELECT
        user_id,
        min(event_date) OVER (PARTITION BY user_id) AS first_seen,
        event_date
    FROM user_events
)
GROUP BY cohort_month, activity_month
ORDER BY cohort_month, activity_month;
```

## toStartOfQuarter() - First Day of the Quarter

`toStartOfQuarter(dt)` returns a `Date` representing the first day of the calendar quarter (Q1 = January 1, Q2 = April 1, Q3 = July 1, Q4 = October 1) that contains the input date.

```sql
SELECT
    toDate('2026-03-31')                      AS input_date,
    toStartOfQuarter(toDate('2026-03-31'))    AS quarter_start,

    toDate('2026-05-15')                      AS may_date,
    toStartOfQuarter(toDate('2026-05-15'))    AS q2_start;
```

```text
input_date   quarter_start   may_date     q2_start
------------ --------------- ------------ -----------
2026-03-31   2026-01-01      2026-05-15   2026-04-01
```

## Quarterly Aggregations

Group revenue by quarter for an executive summary view:

```sql
SELECT
    toStartOfQuarter(sale_date)  AS quarter_start,
    count()                      AS orders,
    sum(revenue)                 AS quarterly_revenue,
    avg(revenue)                 AS avg_order_value
FROM sales
WHERE sale_date >= toDate('2024-01-01')
GROUP BY quarter_start
ORDER BY quarter_start;
```

## Quarter-over-Quarter Comparison

Mirror the month-over-month pattern to compute quarter-over-quarter growth:

```sql
SELECT
    quarter_start,
    quarterly_revenue,
    lagInFrame(quarterly_revenue) OVER (ORDER BY quarter_start) AS prev_quarter,
    round(
        (quarterly_revenue - lagInFrame(quarterly_revenue) OVER (ORDER BY quarter_start))
        / lagInFrame(quarterly_revenue) OVER (ORDER BY quarter_start) * 100,
        2
    ) AS qoq_growth_pct
FROM (
    SELECT
        toStartOfQuarter(sale_date)  AS quarter_start,
        sum(revenue)                 AS quarterly_revenue
    FROM sales
    WHERE sale_date >= toDate('2023-01-01')
    GROUP BY quarter_start
)
ORDER BY quarter_start;
```

## Comparing Monthly and Quarterly Granularity Side by Side

Sometimes you need both granularities in a single result. Use a `GROUP BY ROLLUP` or two separate aggregations joined together:

```sql
SELECT
    toStartOfMonth(sale_date)    AS month,
    toStartOfQuarter(sale_date)  AS quarter,
    sum(revenue)                 AS monthly_revenue
FROM sales
WHERE sale_date >= toDate('2025-01-01')
GROUP BY month, quarter
ORDER BY month;
```

## Filtering for the Current Month or Quarter

Use `toStartOfMonth(today())` and `toStartOfQuarter(today())` to filter for the current period without hardcoding dates:

```sql
-- Current month to date
SELECT sum(revenue) AS mtd_revenue
FROM sales
WHERE sale_date >= toStartOfMonth(today());

-- Current quarter to date
SELECT sum(revenue) AS qtd_revenue
FROM sales
WHERE sale_date >= toStartOfQuarter(today());
```

## Same Period Last Year

Compare current quarter performance to the same quarter in the prior year:

```sql
SELECT
    toYear(sale_date)                         AS year,
    toStartOfQuarter(sale_date)               AS quarter_start,
    sum(revenue)                              AS revenue
FROM sales
WHERE toStartOfQuarter(sale_date) IN (
    toStartOfQuarter(today()),
    toStartOfQuarter(today() - INTERVAL 1 YEAR)
)
GROUP BY year, quarter_start
ORDER BY quarter_start, year;
```

## Summary

`toStartOfMonth()` and `toStartOfQuarter()` are the go-to bucketing functions for monthly and quarterly analytics in ClickHouse. They return `Date` values that work directly in `GROUP BY`, can be used as cohort keys, and make period-over-period comparisons clean to express. Use `toStartOfMonth(today())` and `toStartOfQuarter(today())` to define dynamic date ranges that automatically advance with the calendar.
