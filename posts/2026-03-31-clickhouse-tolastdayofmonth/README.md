# How to Use toLastDayOfMonth() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Month End, Analytics, Reporting

Description: Learn how toLastDayOfMonth() returns the final day of any month, enabling month-end reporting, billing cycle boundaries, and period-close calculations.

---

`toLastDayOfMonth(dt)` returns a `Date` representing the last calendar day of the month that contains the input date. For January it returns the 31st, for February it correctly returns the 28th or 29th depending on whether it is a leap year, for April the 30th, and so on. This function eliminates the need to hard-code month lengths or use awkward arithmetic like "first day of next month minus one day." It is useful for month-end financial reporting, billing cycle boundaries, and any query that needs to anchor to the end of a calendar month.

## Basic Usage

```sql
-- Observe last-day results for various input dates
SELECT
    toDate('2024-01-15') AS jan_15,
    toLastDayOfMonth(jan_15) AS last_day_jan,
    toDate('2024-02-10') AS feb_10,
    toLastDayOfMonth(feb_10) AS last_day_feb_leap,
    toDate('2023-02-10') AS feb_10_non_leap,
    toLastDayOfMonth(feb_10_non_leap) AS last_day_feb_non_leap,
    toDate('2024-04-01') AS apr_1,
    toLastDayOfMonth(apr_1) AS last_day_apr;
```

```text
jan_15      last_day_jan  feb_10      last_day_feb_leap  feb_10_non_leap  last_day_feb_non_leap  apr_1       last_day_apr
2024-01-15  2024-01-31    2024-02-10  2024-02-29         2023-02-10       2023-02-28             2024-04-01  2024-04-30
```

2024 is a leap year, so February ends on the 29th. 2023 is not, so it ends on the 28th. The function handles this automatically.

## Month-End Reporting: Revenue Through End of Month

A common reporting pattern is computing a running total that resets each month, anchored to the end of the month period.

```sql
-- Monthly revenue summary with period-end boundary
SELECT
    toStartOfMonth(sale_date)    AS month_start,
    toLastDayOfMonth(sale_date)  AS month_end,
    count()                      AS transaction_count,
    sum(amount)                  AS total_revenue,
    avg(amount)                  AS avg_transaction
FROM sales
WHERE sale_date >= '2024-01-01'
GROUP BY month_start, month_end
ORDER BY month_start;
```

## Billing Cycle Boundaries

For subscription systems where billing cycles align with calendar months, `toLastDayOfMonth` defines the natural cycle end.

```sql
-- Compute the billing period for each active subscription
SELECT
    subscription_id,
    customer_id,
    toStartOfMonth(today()) AS billing_period_start,
    toLastDayOfMonth(today()) AS billing_period_end,
    plan_amount AS amount_due
FROM subscriptions
WHERE
    status = 'active'
    AND billing_cycle = 'monthly'
ORDER BY customer_id;
```

## Identifying Records Created on the Last Day of the Month

```sql
-- Find orders placed on the last day of their respective months
SELECT
    order_id,
    customer_id,
    order_date,
    amount
FROM orders
WHERE order_date = toLastDayOfMonth(order_date)
ORDER BY order_date DESC
LIMIT 20;
```

## Filtering for the Current Month

Use `toLastDayOfMonth` to build a filter for the current calendar month.

```sql
-- All events in the current calendar month
SELECT
    event_id,
    event_type,
    event_date
FROM events
WHERE
    event_date >= toStartOfMonth(today())
    AND event_date <= toLastDayOfMonth(today())
ORDER BY event_date;
```

## Computing Days Remaining in the Month

Subtracting today from the last day of the month gives the number of days left in the current month.

```sql
-- Days remaining in the current month and month completion percentage
SELECT
    today() AS today,
    toLastDayOfMonth(today()) AS month_end,
    dateDiff('day', today(), toLastDayOfMonth(today())) AS days_remaining,
    toDayOfMonth(today()) AS day_of_month,
    toDayOfMonth(toLastDayOfMonth(today())) AS days_in_month,
    round(toDayOfMonth(today()) * 100.0 / toDayOfMonth(toLastDayOfMonth(today())), 1) AS pct_of_month_elapsed;
```

## Month-End Closing Snapshot

For financial period-close workflows, inserting a snapshot row at the last day of each month is a common pattern.

```sql
-- Insert month-end balance snapshot
INSERT INTO account_balance_snapshots
SELECT
    account_id,
    toLastDayOfMonth(today()) AS snapshot_date,
    balance,
    now() AS captured_at
FROM accounts
WHERE status = 'active'
  AND toLastDayOfMonth(today()) = today(); -- only run on the last day of the month
```

## Generating Last Days for All Months in a Year

Combine `toLastDayOfMonth` with `toStartOfMonth` and an interval to generate the last day of each month for a full year.

```sql
-- Generate the last day of every month in 2024
SELECT
    toLastDayOfMonth(
        toStartOfMonth(toDate('2024-01-01')) + toIntervalMonth(number)
    ) AS last_day_of_month
FROM numbers(12)
ORDER BY last_day_of_month;
```

```text
last_day_of_month
2024-01-31
2024-02-29
2024-03-31
2024-04-30
2024-05-31
2024-06-30
2024-07-31
2024-08-31
2024-09-30
2024-10-31
2024-11-30
2024-12-31
```

## Summary

`toLastDayOfMonth(dt)` returns the last calendar day of the month containing the input date, correctly handling month-length variation and leap years. It is the cleanest way to define month-end boundaries for reporting, billing, and period-close queries. Combined with `toStartOfMonth`, it provides complete month-range boundaries without any hard-coded day counts or arithmetic on the first day of the following month.
