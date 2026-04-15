# How to Use toRelativeYearNum() and toRelativeMonthNum() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Analytics, Cohort Analysis, Time Series

Description: Learn how toRelativeYearNum() and toRelativeMonthNum() return epoch-relative offsets for dates, enabling cohort analysis and period-over-period comparisons.

---

ClickHouse provides a family of `toRelative*Num` functions that convert a date or datetime into monotonically increasing integers suitable for period arithmetic. `toRelativeYearNum()` returns the calendar year number (e.g., 2024), and `toRelativeMonthNum()` returns a continuous month number computed as `year * 12 + month`. These compact integer representations make it straightforward to compute period offsets, align cohorts, and perform relative period arithmetic without dealing with complex date subtraction logic.

## Understanding the Epoch-Relative Model

Every date maps to a single integer: `toRelativeYearNum` returns the calendar year, and `toRelativeMonthNum` computes `year * 12 + month`. Because these values increase monotonically, period comparisons become simple integer subtraction.

```sql
-- See the raw values for a few sample dates
SELECT
    toDate('1970-01-01') AS d1,
    toRelativeYearNum(d1) AS year_num_1970,
    toDate('2024-01-15') AS d2,
    toRelativeYearNum(d2) AS year_num_2024,
    toDate('2024-01-15') AS d3,
    toRelativeMonthNum(d3) AS month_num_2024;
```

```text
d1          year_num_1970   d2          year_num_2024   d3          month_num_2024
1970-01-01  1970            2024-01-15  2024            2024-01-15  24289
```

The year number for 2024 is simply 2024. The month number 24289 equals 2024 × 12 + 1 (January). Subtracting two month numbers gives the elapsed months between dates: 24289 − 23641 = 648 months between January 1970 and January 2024.

## Computing Year-Over-Year Offsets

A common use case is comparing a metric from the current period to the same period one year ago. With `toRelativeYearNum`, the offset is simply an integer subtraction.

```sql
-- Count signups per year and compute YoY difference
SELECT
    toRelativeYearNum(signup_date) AS year_offset,
    toYear(signup_date) AS year,
    count() AS signups,
    signups - lagInFrame(signups) OVER (ORDER BY year_offset) AS yoy_change
FROM users
GROUP BY year_offset, year
ORDER BY year_offset;
```

## Cohort Analysis by Signup Month

`toRelativeMonthNum` is particularly useful for cohort analysis. You can assign every user to a cohort number and then express their activity month as an offset from that cohort month.

```sql
-- Build a monthly cohort retention table
SELECT
    toRelativeMonthNum(signup_date) AS cohort_month,
    toRelativeMonthNum(activity_date) - cohort_month AS months_since_signup,
    uniq(user_id) AS active_users
FROM user_activity
GROUP BY cohort_month, months_since_signup
ORDER BY cohort_month, months_since_signup;
```

This query produces rows where `months_since_signup = 0` is the signup month, `1` is one month later, and so on - a classic cohort retention matrix.

## Filtering Rows Within a Rolling Window

Because the result is a plain integer, you can filter rows that fall within a relative window using simple arithmetic.

```sql
-- Find all events from the last 3 calendar months relative to a given date
SELECT
    event_id,
    event_date,
    toRelativeMonthNum(event_date) AS event_month_num
FROM events
WHERE
    toRelativeMonthNum(event_date) BETWEEN
        toRelativeMonthNum(today()) - 3 AND
        toRelativeMonthNum(today())
ORDER BY event_date;
```

## Aligning Multi-Source Data by Month Number

When joining two tables that track metrics at monthly granularity, using `toRelativeMonthNum` as the join key avoids formatting dates into strings.

```sql
-- Join revenue and cost tables on month number
SELECT
    r.month_num,
    r.revenue,
    c.cost,
    r.revenue - c.cost AS profit
FROM (
    SELECT
        toRelativeMonthNum(transaction_date) AS month_num,
        sum(amount) AS revenue
    FROM transactions
    GROUP BY month_num
) AS r
INNER JOIN (
    SELECT
        toRelativeMonthNum(cost_date) AS month_num,
        sum(amount) AS cost
    FROM costs
    GROUP BY month_num
) AS c ON r.month_num = c.month_num
ORDER BY r.month_num;
```

## Converting Back to a Readable Date

The integer values are compact but not human-readable. You can convert a relative month number back to a date by computing its offset from the epoch's month number and adding that many months to 1970-01-01.

```sql
-- Convert a relative month number back to the first day of that month
SELECT
    toRelativeMonthNum(today()) AS current_month_num,
    -- Subtract the epoch's month number, then add that many months to 1970-01-01
    toDate('1970-01-01') + toIntervalMonth(current_month_num - toRelativeMonthNum(toDate('1970-01-01'))) AS first_day_of_month;
```

## Practical Example: Weekly Active Users by Cohort Year

Combining `toRelativeYearNum` with `toRelativeWeekNum` gives you multi-granularity cohort views.

```sql
-- Active users grouped by their signup year and current week
SELECT
    toRelativeYearNum(u.signup_date) AS signup_year_num,
    toYear(u.signup_date) AS signup_year,
    toRelativeWeekNum(e.event_date) - toRelativeWeekNum(u.signup_date) AS weeks_since_signup,
    uniq(e.user_id) AS wau
FROM events AS e
INNER JOIN users AS u ON e.user_id = u.user_id
GROUP BY signup_year_num, signup_year, weeks_since_signup
ORDER BY signup_year_num, weeks_since_signup;
```

## Summary

`toRelativeYearNum()` and `toRelativeMonthNum()` reduce date values to compact, monotonically increasing integers suitable for arithmetic. This makes period-over-period comparisons, cohort assignment, and rolling window filters expressible as integer subtraction. The pattern is especially powerful for cohort retention matrices, where subtracting the cohort month number from the activity month number directly gives the retention period index.
