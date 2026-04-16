# How to Use LEAD() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, LEAD, Time Series, Analytics

Description: Learn how to use the LEAD() window function in ClickHouse to access values from subsequent rows for forecasting, lookahead, and session duration calculations.

---

## What Is leadInFrame()

`leadInFrame(expr, offset, default)` is ClickHouse's window function that returns the value of `expr` from a row that is `offset` rows **after** the current row within the ordered frame. It is the forward-looking counterpart to `lagInFrame()`. ClickHouse does not implement the standard SQL `LEAD()` function directly — use `leadInFrame()` instead.

```sql
leadInFrame(expr [, offset [, default]]) OVER (
    [PARTITION BY partition_column]
    ORDER BY sort_column
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

- `expr`: the column or expression to look ahead at
- `offset`: how many rows to look forward (default: 1)
- `default`: value returned when the target row falls outside the window frame (uses the column type's default when omitted)

Important: unlike standard SQL `LEAD`, `leadInFrame` respects the window frame. The default frame when `ORDER BY` is specified is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which excludes future rows. To get classic LEAD behavior, explicitly add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

## Basic leadInFrame() Example

```sql
CREATE TABLE events (
    user_id UInt64,
    ts DateTime,
    event_type LowCardinality(String),
    page String
) ENGINE = MergeTree()
ORDER BY (user_id, ts);

-- See what page a user visits next
SELECT
    user_id,
    ts,
    page AS current_page,
    leadInFrame(page, 1) OVER (
        PARTITION BY user_id
        ORDER BY ts
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS next_page
FROM events
WHERE event_type = 'pageview'
ORDER BY user_id, ts;
```

## Calculating Session Duration

```sql
-- Session duration: time until the next event in the session
SELECT
    user_id,
    session_id,
    ts AS session_start,
    leadInFrame(ts, 1) OVER w AS next_event_ts,
    dateDiff('second',
        ts,
        leadInFrame(ts, 1) OVER w
    ) AS seconds_until_next_event
FROM user_events
WINDOW w AS (
    PARTITION BY user_id
    ORDER BY ts
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
ORDER BY user_id, ts;

-- Last event in each session: leadInFrame returns the default (0 for DateTime) when no next event exists
SELECT user_id, ts AS session_end_ts
FROM (
    SELECT
        user_id,
        ts,
        leadInFrame(ts, 1, toDateTime(0)) OVER (
            PARTITION BY user_id
            ORDER BY ts
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS next_ts
    FROM user_events
)
WHERE next_ts = toDateTime(0);
```

## Page Flow Analysis with leadInFrame()

```sql
-- Which pages lead to conversions?
SELECT
    current_page,
    next_page,
    count() AS transitions,
    countIf(next_page = '/checkout') AS led_to_checkout,
    round(countIf(next_page = '/checkout') / count() * 100, 1) AS checkout_rate_pct
FROM (
    SELECT
        page AS current_page,
        leadInFrame(page, 1, '') OVER (
            PARTITION BY session_id
            ORDER BY ts
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS next_page
    FROM pageviews
)
WHERE next_page != ''
GROUP BY current_page, next_page
ORDER BY led_to_checkout DESC
LIMIT 20;
```

## leadInFrame() with Multiple Offsets

```sql
-- Look ahead multiple steps
SELECT
    date,
    value,
    leadInFrame(value, 1) OVER w AS next_1d,
    leadInFrame(value, 7) OVER w AS next_7d,
    leadInFrame(value, 30) OVER w AS next_30d,
    -- Future change calculation
    round(leadInFrame(value, 7) OVER w - value, 2) AS change_in_7d
FROM time_series
WINDOW w AS (
    ORDER BY date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
ORDER BY date;
```

## Detecting Intervals with leadInFrame()

```sql
CREATE TABLE maintenance_windows (
    server_id UInt32,
    start_ts DateTime,
    end_ts DateTime
) ENGINE = MergeTree()
ORDER BY (server_id, start_ts);

-- Gap between consecutive maintenance windows
SELECT
    server_id,
    end_ts,
    next_start,
    dateDiff('hour', end_ts, next_start) AS hours_until_next_maintenance
FROM (
    SELECT
        server_id,
        start_ts,
        end_ts,
        leadInFrame(start_ts, 1, toDateTime(0)) OVER (
            PARTITION BY server_id
            ORDER BY start_ts
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS next_start
    FROM maintenance_windows
)
WHERE next_start != toDateTime(0)
ORDER BY server_id, start_ts;
```

## Practical Example: Sales Forecasting Comparison

```sql
CREATE TABLE monthly_sales (
    month Date,
    product_id UInt32,
    revenue Float64,
    forecast Float64
) ENGINE = MergeTree()
ORDER BY (product_id, month);

-- Compare actual next month vs forecast for this month
SELECT
    month,
    product_id,
    current_revenue,
    this_month_forecast,
    actual_next_month,
    -- Accuracy: how close was this month's forecast to actual next month?
    round(abs(this_month_forecast - actual_next_month) /
        nullIf(actual_next_month, 0) * 100,
        1) AS forecast_error_pct
FROM (
    SELECT
        month,
        product_id,
        revenue AS current_revenue,
        forecast AS this_month_forecast,
        leadInFrame(revenue, 1, CAST(0 AS Float64)) OVER (
            PARTITION BY product_id
            ORDER BY month
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS actual_next_month,
        leadInFrame(month, 1, toDate(0)) OVER (
            PARTITION BY product_id
            ORDER BY month
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS next_month
    FROM monthly_sales
)
WHERE next_month != toDate(0)
ORDER BY product_id, month;
```

## leadInFrame() vs lagInFrame() Summary

| Function | Direction | Use Case |
|----------|-----------|---------|
| `lagInFrame()` | Look back | Period-over-period comparison, change from past |
| `leadInFrame()` | Look forward | Next step prediction, duration until next event |

```sql
-- Often used together for delta calculations
SELECT
    date,
    revenue,
    lagInFrame(revenue, 1, 0) OVER w AS yesterday,
    leadInFrame(revenue, 1, 0) OVER w AS tomorrow,
    revenue - lagInFrame(revenue, 1, 0) OVER w AS change_from_yesterday,
    leadInFrame(revenue, 1, 0) OVER w - revenue AS expected_change_tomorrow
FROM daily_revenue
WINDOW w AS (
    ORDER BY date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
ORDER BY date;
```

## Summary

`leadInFrame()` in ClickHouse accesses values from subsequent rows within an ordered window, making it ideal for session duration calculations, page flow analysis, and future period comparisons. ClickHouse does not implement the standard SQL `LEAD()` function, so use `leadInFrame()` and remember that it respects the window frame — add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to look at rows beyond the current one. The optional default value handles the last rows where no next value exists. Use `leadInFrame()` with `PARTITION BY` to analyze sequences within groups (sessions, users, products), and combine it with `lagInFrame()` when you need both backward and forward context in the same query.
