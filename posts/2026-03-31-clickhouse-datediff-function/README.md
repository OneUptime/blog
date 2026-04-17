# How to Use dateDiff() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Date Arithmetic, Analytics, Time Series

Description: Learn how dateDiff() computes the difference between two DateTime values in any unit from seconds to years, with practical examples for age, tenure, and SLA analysis.

---

`dateDiff()` computes the integer difference between two `Date` or `DateTime` values in the unit you specify. It is the correct function to use when you need to answer questions like "how many days since the last login?", "how old is this user?", or "did this ticket breach the SLA?". Unlike subtracting two Unix timestamps and dividing by a fixed number of seconds, `dateDiff` is calendar-aware: it counts calendar boundaries crossed, not elapsed seconds.

## Function Signature

```text
dateDiff(unit, start, end)
dateDiff(unit, start, end, timezone)
```

`unit` is a string constant. Supported units are: `'nanosecond'`, `'microsecond'`, `'millisecond'`, `'second'`, `'minute'`, `'hour'`, `'day'`, `'week'`, `'month'`, `'quarter'`, `'year'`. The result is a signed integer - negative when `start` is after `end`. The optional `timezone` is a constant string that aligns day/week/month boundaries to a local calendar.

## Basic Differences

The examples below demonstrate each unit on the same pair of timestamps.

```sql
SELECT
    dateDiff('second',  toDateTime('2026-01-01 00:00:00'), toDateTime('2026-03-31 14:23:47')) AS diff_seconds,
    dateDiff('minute',  toDateTime('2026-01-01 00:00:00'), toDateTime('2026-03-31 14:23:47')) AS diff_minutes,
    dateDiff('hour',    toDateTime('2026-01-01 00:00:00'), toDateTime('2026-03-31 14:23:47')) AS diff_hours,
    dateDiff('day',     toDate('2026-01-01'),               toDate('2026-03-31'))              AS diff_days,
    dateDiff('week',    toDate('2026-01-01'),               toDate('2026-03-31'))              AS diff_weeks,
    dateDiff('month',   toDate('2026-01-01'),               toDate('2026-03-31'))              AS diff_months,
    dateDiff('quarter', toDate('2026-01-01'),               toDate('2026-03-31'))              AS diff_quarters,
    dateDiff('year',    toDate('2024-03-31'),               toDate('2026-03-31'))              AS diff_years;
```

## Computing User Age

Calculating age in complete years is a classic calendar-aware problem. Subtracting birth year from the current year gives the wrong answer before the birthday. `dateDiff('year', ...)` handles this correctly.

```sql
SELECT
    name,
    birthdate,
    dateDiff('year', birthdate, today()) AS age_years
FROM users
ORDER BY age_years DESC
LIMIT 10;
```

## Days Since Last Activity

Churn models and re-engagement campaigns rely on knowing when a user was last active. The query below calculates days of inactivity per user.

```sql
SELECT
    user_id,
    max(event_time)                              AS last_active,
    dateDiff('day', max(event_time), now())      AS days_inactive
FROM user_events
GROUP BY user_id
HAVING days_inactive > 30
ORDER BY days_inactive DESC;
```

## Subscription Duration Analysis

For subscription businesses, understanding how long customers stay subscribed informs cohort retention. `dateDiff('month', ...)` counts the calendar months between signup and churn.

```sql
SELECT
    user_id,
    plan,
    signup_date,
    coalesce(cancel_date, today())               AS effective_end,
    dateDiff('day',   signup_date, coalesce(cancel_date, today())) AS duration_days,
    dateDiff('month', signup_date, coalesce(cancel_date, today())) AS duration_months
FROM subscriptions
ORDER BY duration_days DESC
LIMIT 20;
```

## SLA Breach Detection

Support teams define SLA targets in hours or minutes. `dateDiff('minute', ...)` tells you exactly how many minutes elapsed between ticket creation and resolution so you can flag breaches.

```sql
SELECT
    ticket_id,
    priority,
    created_at,
    resolved_at,
    dateDiff('minute', created_at, resolved_at)  AS resolution_minutes,
    CASE
        WHEN priority = 'P1' AND dateDiff('minute', created_at, resolved_at) > 60  THEN 'BREACHED'
        WHEN priority = 'P2' AND dateDiff('minute', created_at, resolved_at) > 240 THEN 'BREACHED'
        ELSE 'MET'
    END                                          AS sla_status
FROM support_tickets
WHERE resolved_at IS NOT NULL
ORDER BY resolution_minutes DESC;
```

## Period-over-Period Comparison Using dateDiff

`dateDiff` is useful for classifying rows into "current period" vs "prior period" without hardcoding date literals.

```sql
SELECT
    order_id,
    order_date,
    dateDiff('day', order_date, today()) AS days_ago
FROM orders
WHERE days_ago BETWEEN 0 AND 13   -- last 14 days
ORDER BY order_date DESC;
```

## Timezone-Aware Day Counts

When computing day differences for users in a specific timezone, pass the timezone as a constant string so that day boundaries align to local midnight rather than UTC. Note that the timezone argument must be a constant string literal, not a column reference.

```sql
SELECT
    user_id,
    dateDiff('day', last_login, now(), 'America/New_York') AS days_since_login
FROM users
WHERE days_since_login > 7;
```

## Summary

`dateDiff()` is the correct tool for measuring calendar distance between two timestamps in ClickHouse. It crosses calendar boundaries naturally - counting months, quarters, and years the way a human would rather than dividing elapsed seconds by a fixed factor. Use it for age calculations, churn detection, SLA monitoring, and subscription duration analysis. When day boundaries matter for global users, pass the user's timezone as the fourth argument to align the count to local midnight.
