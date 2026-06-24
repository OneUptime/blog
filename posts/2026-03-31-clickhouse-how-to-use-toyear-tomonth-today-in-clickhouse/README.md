# How to Use toYear(), toMonth(), toDay() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, toYear, toMonth, toDay, Time Series

Description: Learn how to use toYear(), toMonth(), and toDay() functions in ClickHouse to extract date components for grouping, filtering, and time-based analytics.

---

## Date Component Extraction Functions

ClickHouse provides a comprehensive set of functions for extracting individual components from Date and DateTime values:

| Function | Returns | Example Input | Output |
|----------|---------|---------------|--------|
| `toYear(dt)` | Year as UInt16 | `2024-03-15` | `2024` |
| `toMonth(dt)` | Month (1-12) as UInt8 | `2024-03-15` | `3` |
| `toDayOfMonth(dt)` (alias `DAY`) | Day of month (1-31) as UInt8 | `2024-03-15` | `15` |
| `toDayOfWeek(dt)` | Day of week (1=Mon..7=Sun) | `2024-03-15` | `5` (Friday) |
| `toDayOfYear(dt)` | Day of year (1-366) | `2024-03-15` | `75` |
| `toHour(dt)` | Hour (0-23) | `2024-03-15 14:30:00` | `14` |
| `toMinute(dt)` | Minute (0-59) | `2024-03-15 14:30:00` | `30` |
| `toSecond(dt)` | Second (0-59) | `2024-03-15 14:30:00` | `0` |
| `toQuarter(dt)` | Quarter (1-4) | `2024-03-15` | `1` |
| `toWeek(dt[, mode])` | Week number (0-53, mode 0 default) | `2024-03-15` | `10` |

## Basic Usage

```sql
-- Extract components from a date
SELECT
    today() AS current_date,
    toYear(today()) AS year,
    toMonth(today()) AS month,
    toDayOfMonth(today()) AS day_of_month,
    toDayOfWeek(today()) AS day_of_week,
    toQuarter(today()) AS quarter;

-- From DateTime
SELECT
    now() AS current_datetime,
    toYear(now()) AS year,
    toMonth(now()) AS month,
    toDayOfMonth(now()) AS day,
    toHour(now()) AS hour,
    toMinute(now()) AS minute;
```

## Grouping by Date Components

```sql
CREATE TABLE sales_events (
    ts DateTime,
    amount Float64,
    product_id UInt32,
    country LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY ts;

-- Group by year
SELECT toYear(ts) AS year, sum(amount) AS annual_revenue
FROM sales_events
GROUP BY year
ORDER BY year;

-- Group by month across years
SELECT
    toYear(ts) AS year,
    toMonth(ts) AS month,
    sum(amount) AS monthly_revenue,
    count() AS order_count
FROM sales_events
GROUP BY year, month
ORDER BY year, month;

-- Group by day of week (Monday=1 to Sunday=7)
SELECT
    toDayOfWeek(ts) AS dow,
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][toDayOfWeek(ts)] AS day_name,
    sum(amount) AS total_revenue,
    avg(amount) AS avg_order_value
FROM sales_events
GROUP BY dow
ORDER BY dow;
```

## Filtering by Date Components

```sql
-- Filter to specific months (e.g., holiday season: Nov-Dec)
SELECT sum(amount) AS holiday_revenue
FROM sales_events
WHERE toMonth(ts) IN (11, 12);

-- Filter to weekdays only
SELECT count() AS weekday_orders
FROM sales_events
WHERE toDayOfWeek(ts) BETWEEN 1 AND 5;  -- Mon-Fri

-- Filter to business hours
SELECT count() AS business_hour_events
FROM sales_events
WHERE toHour(ts) BETWEEN 9 AND 17;

-- Year-to-date filter
SELECT sum(amount) AS ytd_revenue
FROM sales_events
WHERE toYear(ts) = toYear(today())
  AND ts <= today();
```

## Seasonality Analysis

```sql
-- Monthly seasonality: compare same month across years
SELECT
    toMonth(ts) AS month,
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][toMonth(ts)] AS month_name,
    avg(amount) AS avg_monthly_revenue,
    count() AS avg_orders
FROM sales_events
GROUP BY month
ORDER BY month;

-- Hour-of-day traffic pattern
SELECT
    toHour(ts) AS hour_of_day,
    count() AS total_events,
    sum(amount) AS total_revenue
FROM sales_events
GROUP BY hour_of_day
ORDER BY hour_of_day;

-- Quarter-over-quarter growth
SELECT
    toYear(ts) AS year,
    toQuarter(ts) AS quarter,
    sum(amount) AS quarterly_revenue
FROM sales_events
GROUP BY year, quarter
ORDER BY year, quarter;
```

## Building Date Labels

```sql
-- Format year-month as string label
SELECT
    toYear(ts) || '-' || leftPad(toString(toMonth(ts)), 2, '0') AS year_month,
    sum(amount) AS revenue
FROM sales_events
GROUP BY year_month
ORDER BY year_month;

-- Quarter label
SELECT
    toYear(ts) || ' Q' || toString(toQuarter(ts)) AS quarter_label,
    sum(amount) AS quarterly_revenue
FROM sales_events
GROUP BY quarter_label
ORDER BY quarter_label;
```

## Practical Example: SLA Analysis by Time of Day

```sql
CREATE TABLE support_tickets (
    ticket_id UInt64,
    created_at DateTime,
    resolved_at Nullable(DateTime),
    priority LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY created_at;

-- Ticket volume and resolution by hour of day
SELECT
    toHour(created_at) AS hour_of_day,
    count() AS tickets_created,
    countIf(isNotNull(resolved_at)) AS tickets_resolved,
    round(avg(dateDiff('minute', created_at,
        coalesce(resolved_at, now()))), 0) AS avg_resolution_minutes
FROM support_tickets
WHERE priority = 'high'
  AND toYear(created_at) = toYear(today())
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## Summary

ClickHouse's date component functions - `toYear()`, `toMonth()`, `toDayOfMonth()`, `toDayOfWeek()`, `toHour()`, and others - extract individual parts from Date and DateTime values. They are essential for time-series grouping (GROUP BY year, month, hour), seasonality analysis, business-hours filtering, and creating human-readable date labels. Use them in combination with aggregate functions to build period comparisons, traffic patterns, and SLA reports.
