# How to Generate Time Series Data in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQL, Time Series, generate_series, Date Ranges, Reporting

Description: Learn how to generate continuous time series data in PostgreSQL using generate_series. This guide covers date ranges, filling gaps in data, and building time-based reports.

---

Time series data powers dashboards, analytics, and monitoring systems. PostgreSQL's `generate_series` function creates continuous sequences of timestamps, enabling you to fill gaps in sparse data and build comprehensive time-based reports. This guide shows you how to generate and work with time series effectively.

## Basic generate_series Syntax

The `generate_series` function creates a set of values from a start to an end point with a specified interval.

```sql
-- Generate a series of integers
SELECT generate_series(1, 10);

-- Generate dates for the current month
SELECT generate_series(
    DATE '2026-01-01',
    DATE '2026-01-31',
    INTERVAL '1 day'
)::DATE AS date;

-- Generate timestamps at hourly intervals
SELECT generate_series(
    TIMESTAMP '2026-01-25 00:00:00',
    TIMESTAMP '2026-01-25 23:00:00',
    INTERVAL '1 hour'
) AS hour;
```

## Creating Date Ranges

Generate date ranges for reports and calendar-based queries.

```sql
-- All days in January 2026
SELECT d::DATE AS date
FROM generate_series(
    '2026-01-01'::DATE,
    '2026-01-31'::DATE,
    '1 day'::INTERVAL
) AS d;

-- All months in a year
SELECT date_trunc('month', d)::DATE AS month_start
FROM generate_series(
    '2026-01-01'::DATE,
    '2026-12-01'::DATE,
    '1 month'::INTERVAL
) AS d;

-- Business days only (Monday through Friday)
SELECT d::DATE AS business_day
FROM generate_series(
    '2026-01-01'::DATE,
    '2026-01-31'::DATE,
    '1 day'::INTERVAL
) AS d
WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);  -- 0=Sunday, 6=Saturday
```

## Filling Gaps in Time Series Data

Real data often has gaps. Use generate_series to create a complete timeline, then LEFT JOIN your data.

```sql
-- Sample data with gaps
CREATE TABLE daily_metrics (
    metric_date DATE PRIMARY KEY,
    page_views INTEGER,
    unique_visitors INTEGER
);

INSERT INTO daily_metrics VALUES
    ('2026-01-01', 1000, 450),
    ('2026-01-02', 1200, 520),
    -- Gap on 2026-01-03
    ('2026-01-04', 950, 400),
    ('2026-01-05', 1100, 480);

-- Fill gaps with zeros
SELECT
    dates.d AS date,
    COALESCE(m.page_views, 0) AS page_views,
    COALESCE(m.unique_visitors, 0) AS unique_visitors
FROM generate_series(
    '2026-01-01'::DATE,
    '2026-01-05'::DATE,
    '1 day'::INTERVAL
) AS dates(d)
LEFT JOIN daily_metrics m ON m.metric_date = dates.d
ORDER BY dates.d;
```

## Hourly Time Series for Dashboards

Generate hourly buckets for monitoring and operational dashboards.

```sql
-- Create sample event data
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    occurred_at TIMESTAMP
);

-- Insert some sample events
INSERT INTO events (event_type, occurred_at)
SELECT
    (ARRAY['login', 'purchase', 'pageview'])[1 + (random() * 2)::INTEGER],
    '2026-01-25 00:00:00'::TIMESTAMP + (random() * INTERVAL '24 hours')
FROM generate_series(1, 1000);

-- Hourly event counts with all hours represented
SELECT
    hours.hour,
    COUNT(e.id) AS event_count
FROM generate_series(
    '2026-01-25 00:00:00'::TIMESTAMP,
    '2026-01-25 23:00:00'::TIMESTAMP,
    '1 hour'::INTERVAL
) AS hours(hour)
LEFT JOIN events e ON date_trunc('hour', e.occurred_at) = hours.hour
GROUP BY hours.hour
ORDER BY hours.hour;
```

## Dynamic Date Ranges

Generate series based on calculated or dynamic boundaries.

```sql
-- Last 30 days from today
SELECT d::DATE AS date
FROM generate_series(
    CURRENT_DATE - INTERVAL '29 days',
    CURRENT_DATE,
    '1 day'::INTERVAL
) AS d;

-- This week (Monday to Sunday)
SELECT d::DATE AS date
FROM generate_series(
    date_trunc('week', CURRENT_DATE)::DATE,
    (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE,
    '1 day'::INTERVAL
) AS d;

-- First and last day of each month in current year
SELECT
    date_trunc('month', d)::DATE AS month_start,
    (date_trunc('month', d) + INTERVAL '1 month - 1 day')::DATE AS month_end
FROM generate_series(
    date_trunc('year', CURRENT_DATE)::DATE,
    (date_trunc('year', CURRENT_DATE) + INTERVAL '11 months')::DATE,
    '1 month'::INTERVAL
) AS d;
```

## Timezone-Aware Time Series

Handle timezones correctly when generating timestamps.

```sql
-- Generate UTC timestamps
SELECT generate_series(
    '2026-01-25 00:00:00+00'::TIMESTAMPTZ,
    '2026-01-25 23:00:00+00'::TIMESTAMPTZ,
    '1 hour'::INTERVAL
) AS utc_hour;

-- Generate in a specific timezone, display in UTC
SELECT
    tz_hour AS local_time,
    tz_hour AT TIME ZONE 'UTC' AS utc_time
FROM generate_series(
    '2026-01-25 00:00:00 America/New_York'::TIMESTAMPTZ,
    '2026-01-25 23:00:00 America/New_York'::TIMESTAMPTZ,
    '1 hour'::INTERVAL
) AS tz_hour;
```

## Creating Calendar Tables

A permanent calendar table improves query performance for date-based analytics.

```sql
-- Create a calendar table
CREATE TABLE calendar (
    date_key DATE PRIMARY KEY,
    year INTEGER,
    quarter INTEGER,
    month INTEGER,
    month_name VARCHAR(20),
    week INTEGER,
    day_of_week INTEGER,
    day_name VARCHAR(20),
    is_weekend BOOLEAN,
    is_holiday BOOLEAN DEFAULT false
);

-- Populate with 10 years of dates
INSERT INTO calendar (
    date_key, year, quarter, month, month_name,
    week, day_of_week, day_name, is_weekend
)
SELECT
    d::DATE,
    EXTRACT(YEAR FROM d),
    EXTRACT(QUARTER FROM d),
    EXTRACT(MONTH FROM d),
    TO_CHAR(d, 'Month'),
    EXTRACT(WEEK FROM d),
    EXTRACT(DOW FROM d),
    TO_CHAR(d, 'Day'),
    EXTRACT(DOW FROM d) IN (0, 6)
FROM generate_series(
    '2020-01-01'::DATE,
    '2030-12-31'::DATE,
    '1 day'::INTERVAL
) AS d;

-- Create indexes for common queries
CREATE INDEX idx_calendar_year_month ON calendar (year, month);
CREATE INDEX idx_calendar_is_weekend ON calendar (is_weekend);

-- Use in queries
SELECT
    c.month_name,
    COUNT(o.id) AS order_count
FROM calendar c
LEFT JOIN orders o ON o.order_date = c.date_key
WHERE c.year = 2026 AND NOT c.is_weekend
GROUP BY c.month, c.month_name
ORDER BY c.month;
```

## Minute and Second Level Granularity

For high-resolution time series like monitoring data.

```sql
-- Generate minute-level data for one hour
SELECT minute
FROM generate_series(
    '2026-01-25 14:00:00'::TIMESTAMP,
    '2026-01-25 14:59:00'::TIMESTAMP,
    '1 minute'::INTERVAL
) AS minute;

-- Generate 15-second intervals
SELECT ts
FROM generate_series(
    '2026-01-25 14:00:00'::TIMESTAMP,
    '2026-01-25 14:05:00'::TIMESTAMP,
    '15 seconds'::INTERVAL
) AS ts;

-- Aggregate metrics into 5-minute buckets
SELECT
    date_trunc('hour', bucket) +
    (EXTRACT(MINUTE FROM bucket)::INTEGER / 5 * 5) * INTERVAL '1 minute' AS five_min_bucket,
    AVG(value) AS avg_value
FROM generate_series(
    '2026-01-25 14:00:00'::TIMESTAMP,
    '2026-01-25 14:59:00'::TIMESTAMP,
    '1 minute'::INTERVAL
) AS bucket
CROSS JOIN (SELECT random() * 100 AS value) AS sample
GROUP BY 1
ORDER BY 1;
```

## Cumulative and Running Totals

Combine time series with window functions for cumulative metrics.

```sql
-- Daily cumulative sum
WITH daily_data AS (
    SELECT
        dates.d AS date,
        COALESCE(SUM(m.page_views), 0) AS daily_views
    FROM generate_series(
        '2026-01-01'::DATE,
        '2026-01-31'::DATE,
        '1 day'::INTERVAL
    ) AS dates(d)
    LEFT JOIN daily_metrics m ON m.metric_date = dates.d
    GROUP BY dates.d
)
SELECT
    date,
    daily_views,
    SUM(daily_views) OVER (ORDER BY date) AS cumulative_views
FROM daily_data
ORDER BY date;
```

## Recurring Events and Schedules

Generate recurring schedules and event patterns.

```sql
-- Weekly team meetings for the year (every Tuesday at 10 AM)
SELECT meeting_time
FROM generate_series(
    '2026-01-06 10:00:00'::TIMESTAMP,  -- First Tuesday of 2026
    '2026-12-29 10:00:00'::TIMESTAMP,
    '1 week'::INTERVAL
) AS meeting_time;

-- Monthly billing dates (15th of each month)
SELECT (date_trunc('month', d) + INTERVAL '14 days')::DATE AS billing_date
FROM generate_series(
    '2026-01-01'::DATE,
    '2026-12-01'::DATE,
    '1 month'::INTERVAL
) AS d;

-- Bi-weekly pay periods
SELECT
    period_start::DATE AS pay_period_start,
    (period_start + INTERVAL '13 days')::DATE AS pay_period_end
FROM generate_series(
    '2026-01-05'::DATE,  -- First pay period start
    '2026-12-31'::DATE,
    '14 days'::INTERVAL
) AS period_start;
```

## Performance Tips

For large time series, consider these optimizations.

```sql
-- Limit series generation to needed range
-- BAD: Generate all dates then filter
SELECT d FROM generate_series('2000-01-01'::DATE, '2030-12-31'::DATE, '1 day') d
WHERE d BETWEEN '2026-01-01' AND '2026-01-31';

-- GOOD: Generate only needed dates
SELECT d FROM generate_series('2026-01-01'::DATE, '2026-01-31'::DATE, '1 day') d;

-- For repeated queries, use a calendar table instead of generate_series
-- The table can be indexed and statistics help the query planner
```

Time series generation with `generate_series` provides the foundation for analytics queries, reporting, and data visualization. By combining it with LEFT JOINs and COALESCE, you ensure complete data coverage even when source data has gaps, making your dashboards and reports reliable and comprehensive.
