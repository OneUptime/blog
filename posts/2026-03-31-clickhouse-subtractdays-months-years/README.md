# How to Use subtractDays(), subtractMonths(), subtractYears() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Date Arithmetic, Lookback Window, Cohort

Description: Learn how subtractDays(), subtractMonths(), and subtractYears() create lookback windows and prior-period comparisons in ClickHouse for retention and cohort queries.

---

`subtractDays()`, `subtractMonths()`, `subtractYears()`, and their sibling functions are the mirror images of the `add*` family. They shift a `Date` or `DateTime` backward by a calendar-aware interval, making them the natural choice for defining lookback windows, computing prior-period baselines, and selecting historical cohorts. The full family also includes `subtractWeeks()`, `subtractQuarters()`, `subtractHours()`, `subtractMinutes()`, and `subtractSeconds()`.

## Function Signatures

```text
subtractDays(dt, n)       -- equivalent to dateAdd('day',   -n, dt)
subtractWeeks(dt, n)      -- equivalent to dateAdd('week',  -n, dt)
subtractMonths(dt, n)     -- equivalent to dateAdd('month', -n, dt)
subtractQuarters(dt, n)   -- equivalent to dateAdd('quarter', -n, dt)
subtractYears(dt, n)      -- equivalent to dateAdd('year',  -n, dt)

subtractHours(dt, n)
subtractMinutes(dt, n)
subtractSeconds(dt, n)
```

All functions return the same type as the input. `n` is an integer; negative values reverse the direction (subtracting a negative value adds time), but for clarity prefer using the corresponding `add*` function instead.

## Basic Usage

The examples below subtract various intervals from the current date.

```sql
SELECT
    today()                          AS today,
    subtractDays(today(), 1)         AS yesterday,
    subtractDays(today(), 7)         AS last_week_same_day,
    subtractDays(today(), 30)        AS thirty_days_ago,
    subtractMonths(today(), 1)       AS one_month_ago,
    subtractMonths(today(), 3)       AS one_quarter_ago,
    subtractYears(today(), 1)        AS one_year_ago;
```

## Defining Lookback Windows

The most common use is anchoring a `WHERE` clause to a recent window without hardcoding date literals.

```sql
SELECT
    date_trunc('day', event_time) AS day,
    count()                       AS events,
    uniq(user_id)                 AS unique_users
FROM page_views
WHERE event_time >= subtractDays(today(), 30)
GROUP BY day
ORDER BY day ASC;
```

Switching the window is a one-character change: replace `30` with the desired lookback. This pattern is easy to parameterise in dashboard tools.

## Current Period vs Prior Period Comparison

A common analytics pattern is comparing the current period to the same period one week, month, or year prior.

```sql
SELECT
    count(CASE WHEN event_time >= subtractDays(today(), 7)  THEN 1 END) AS current_7d,
    count(CASE WHEN event_time >= subtractDays(today(), 14)
               AND event_time <  subtractDays(today(), 7)  THEN 1 END) AS prior_7d,
    round(
        (count(CASE WHEN event_time >= subtractDays(today(), 7) THEN 1 END) -
         count(CASE WHEN event_time >= subtractDays(today(), 14)
                    AND event_time < subtractDays(today(), 7) THEN 1 END)) * 100.0 /
        nullIf(count(CASE WHEN event_time >= subtractDays(today(), 14)
                          AND event_time < subtractDays(today(), 7) THEN 1 END), 0),
        2
    ) AS pct_change
FROM events;
```

## Year-over-Year Revenue Comparison

Comparing revenue against the same calendar period one year ago accounts for seasonal patterns better than comparing to the immediately preceding period.

```sql
SELECT
    date_trunc('month', order_date)                               AS month,
    sumIf(amount, order_date >= subtractYears(today(), 1))        AS current_year,
    sumIf(amount, order_date <  subtractYears(today(), 1)
               AND order_date >= subtractYears(today(), 2))       AS prior_year
FROM orders
WHERE order_date >= subtractYears(today(), 2)
GROUP BY month
ORDER BY month ASC;
```

A cleaner version using explicit date ranges:

```sql
SELECT
    'current_year' AS period,
    sum(amount)    AS revenue
FROM orders
WHERE order_date BETWEEN subtractYears(today(), 1) AND today()

UNION ALL

SELECT
    'prior_year' AS period,
    sum(amount)  AS revenue
FROM orders
WHERE order_date BETWEEN subtractYears(today(), 2) AND subtractYears(today(), 1);
```

## Historical Cohort Queries

Retention analysis groups users by their signup cohort and tracks their behaviour in subsequent periods. `subtractMonths` makes cohort boundaries explicit.

```sql
SELECT
    date_trunc('month', u.signup_date)                          AS cohort_month,
    count(DISTINCT u.user_id)                                   AS cohort_size,
    countDistinctIf(e.user_id,
        e.event_time >= subtractMonths(today(), 1))             AS active_last_month,
    round(countDistinctIf(e.user_id,
        e.event_time >= subtractMonths(today(), 1)) * 100.0 /
        count(DISTINCT u.user_id), 2)                           AS retention_pct
FROM users AS u
LEFT JOIN events AS e ON u.user_id = e.user_id
WHERE u.signup_date >= subtractMonths(today(), 6)
GROUP BY cohort_month
ORDER BY cohort_month ASC;
```

## Rolling 28-Day Active User Count

A window that covers the past 28 complete days is a standard mobile/SaaS metric. The `WHERE` clause uses `subtractDays` to restrict the query to this window.

```sql
SELECT
    date_trunc('day', event_time)                    AS day,
    uniqExact(user_id)                               AS dau
FROM events
WHERE event_time >= subtractDays(today(), 28)
GROUP BY day
ORDER BY day ASC;
```

## Summary

`subtractDays()`, `subtractMonths()`, and `subtractYears()` are the cleanest way to define lookback windows and prior-period anchors in ClickHouse. They are calendar-aware (month-end safe, leap-year safe), return the same type as the input, and read more naturally than negative `addDays` calls. Use them for rolling window WHERE clauses, period-over-period comparisons, historical cohort selection, and any query where you need to step backward in time by a fixed calendar interval.
