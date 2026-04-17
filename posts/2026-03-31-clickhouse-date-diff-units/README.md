# How to Use dateDiff() with Different Time Units in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Duration Calculation, Analytics, Time Series

Description: Learn how dateDiff() computes the number of time-unit boundaries crossed between two dates across second, minute, hour, day, week, month, quarter, and year units.

---

`dateDiff('unit', start, end)` is ClickHouse's primary function for computing the difference between two dates or datetimes in a chosen unit. It counts how many unit boundaries are crossed going from `start` to `end`. For example, `dateDiff('day', '2024-06-14 23:59:59', '2024-06-15 00:00:01')` returns `1` because the day boundary at midnight was crossed once - even though only 2 seconds elapsed. Supported units are: `second`, `minute`, `hour`, `day`, `week`, `month`, `quarter`, and `year`. Understanding the boundary-crossing model is the key to using `dateDiff` correctly.

## Basic Examples Across All Units

```sql
-- Demonstrate dateDiff across all supported units for the same date pair
SELECT
    dateDiff('second',  toDateTime('2024-01-01 00:00:00'), toDateTime('2024-06-15 12:30:00')) AS diff_seconds,
    dateDiff('minute',  toDateTime('2024-01-01 00:00:00'), toDateTime('2024-06-15 12:30:00')) AS diff_minutes,
    dateDiff('hour',    toDateTime('2024-01-01 00:00:00'), toDateTime('2024-06-15 12:30:00')) AS diff_hours,
    dateDiff('day',     toDate('2024-01-01'),              toDate('2024-06-15'))              AS diff_days,
    dateDiff('week',    toDate('2024-01-01'),              toDate('2024-06-15'))              AS diff_weeks,
    dateDiff('month',   toDate('2024-01-01'),              toDate('2024-06-15'))              AS diff_months,
    dateDiff('quarter', toDate('2024-01-01'),              toDate('2024-06-15'))              AS diff_quarters,
    dateDiff('year',    toDate('2024-01-01'),              toDate('2024-06-15'))              AS diff_years;
```

```text
diff_seconds  diff_minutes  diff_hours  diff_days  diff_weeks  diff_months  diff_quarters  diff_years
14387400      239790        3996        166        23          5            1              0
```

## Computing Response Times in Seconds

For SLA monitoring, measuring how long a ticket or incident was open in seconds is a common requirement.

```sql
-- Compute incident duration in seconds, minutes, and hours
SELECT
    incident_id,
    opened_at,
    resolved_at,
    dateDiff('second', opened_at, resolved_at) AS duration_seconds,
    dateDiff('minute', opened_at, resolved_at) AS duration_minutes,
    dateDiff('hour',   opened_at, resolved_at) AS duration_hours
FROM incidents
WHERE status = 'resolved'
ORDER BY duration_seconds DESC
LIMIT 20;
```

## Day-Level Differences for Aging Reports

Counting days between a creation date and today is a standard aging calculation for unpaid invoices, open tickets, and stale records.

```sql
-- Invoice aging report
SELECT
    invoice_id,
    customer_id,
    issue_date,
    dateDiff('day', issue_date, today()) AS days_outstanding,
    multiIf(
        dateDiff('day', issue_date, today()) <= 30,  '0-30 days',
        dateDiff('day', issue_date, today()) <= 60,  '31-60 days',
        dateDiff('day', issue_date, today()) <= 90,  '61-90 days',
        'Over 90 days'
    ) AS aging_bucket
FROM invoices
WHERE status = 'unpaid'
ORDER BY days_outstanding DESC;
```

## Monthly Differences for Subscription Analysis

Month-level differences are useful for subscription and churn analytics.

```sql
-- Count how many months each customer has been subscribed
SELECT
    customer_id,
    subscription_start,
    coalesce(cancelled_at, today()) AS effective_end,
    dateDiff('month', subscription_start, coalesce(cancelled_at, today())) AS months_subscribed
FROM subscriptions
ORDER BY months_subscribed DESC
LIMIT 20;
```

## The Boundary-Crossing Subtlety With Months

`dateDiff('month', ...)` counts calendar month boundaries, not 30-day periods. One month boundary is always crossed when the month number changes.

```sql
-- Illustrate boundary-crossing for months
SELECT
    dateDiff('month', toDate('2024-01-31'), toDate('2024-02-01')) AS diff_1_day_apart,
    dateDiff('month', toDate('2024-01-01'), toDate('2024-01-31')) AS diff_30_days_same_month;
```

```text
diff_1_day_apart  diff_30_days_same_month
1                 0
```

January 31 to February 1 crosses one month boundary even though they are one day apart. January 1 to January 31 crosses no month boundary even though they are 30 days apart. Use `age()` if you need full calendar months elapsed.

## Multi-Unit Duration Display

For human-facing displays, decompose a duration into its component units.

```sql
-- Break a duration in seconds into hours, minutes, and seconds
SELECT
    incident_id,
    dateDiff('second', opened_at, resolved_at) AS total_seconds,
    intDiv(total_seconds, 3600)                 AS hours,
    intDiv(total_seconds MOD 3600, 60)          AS minutes,
    total_seconds MOD 60                        AS seconds,
    concat(
        toString(hours), 'h ',
        toString(minutes), 'm ',
        toString(seconds), 's'
    ) AS duration_display
FROM incidents
WHERE status = 'resolved'
LIMIT 10;
```

## Quarterly Analysis

`dateDiff('quarter', ...)` counts quarter boundaries, useful for quarterly business reviews.

```sql
-- Revenue growth quarter over quarter
SELECT
    toQuarter(sale_date) AS quarter,
    toYear(sale_date)    AS year,
    sum(amount)          AS revenue,
    dateDiff('quarter', toDate('2023-01-01'), sale_date) AS quarters_since_baseline
FROM sales
WHERE sale_date >= '2023-01-01'
GROUP BY quarter, year, quarters_since_baseline
ORDER BY year, quarter;
```

## Summary

`dateDiff('unit', start, end)` counts unit boundary crossings between two date or datetime values. Supported units span from `second` up to `year`. The boundary-crossing model means that a tiny time difference can produce a count of 1 if a boundary falls between the two values, and a large time difference can produce 0 if no boundary is crossed. When you need full elapsed calendar units rather than boundary counts, use `age()` instead. For decomposing durations into human-readable multi-unit strings, combine `dateDiff('second', ...)` with integer division and modulo.
