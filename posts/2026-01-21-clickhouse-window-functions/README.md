# How to Use ClickHouse Window Functions for Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Functions, Analytics, SQL, ROW_NUMBER, LAG, LEAD, Running Totals, Moving Averages

Description: A comprehensive guide to using ClickHouse window functions for analytics, covering ROW_NUMBER, LAG, LEAD, running totals, moving averages, and advanced analytical patterns.

---

Window functions in ClickHouse enable powerful analytical queries without complex self-joins. This guide covers common window function patterns for analytics workloads.

## Window Function Basics

### Syntax Overview

```sql
-- Basic syntax
function_name(args) OVER (
    [PARTITION BY partition_expression]
    [ORDER BY sort_expression [ASC|DESC]]
    [frame_clause]
)

-- Frame clause options
ROWS BETWEEN start AND end
RANGE BETWEEN start AND end

-- Frame boundaries
UNBOUNDED PRECEDING
n PRECEDING
CURRENT ROW
n FOLLOWING
UNBOUNDED FOLLOWING
```

## Ranking Functions

### ROW_NUMBER

```sql
-- Assign unique row numbers
SELECT
    user_id,
    event_time,
    event_type,
    ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY event_time
    ) AS event_sequence
FROM events
WHERE event_time >= today() - 7;

-- Get first event per user
SELECT *
FROM (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_time) AS rn
    FROM events
)
WHERE rn = 1;
```

### RANK and DENSE_RANK

```sql
-- RANK: Same rank for ties, gaps after
SELECT
    user_id,
    score,
    RANK() OVER (ORDER BY score DESC) AS rank
FROM leaderboard;

-- DENSE_RANK: Same rank for ties, no gaps
SELECT
    user_id,
    score,
    DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank
FROM leaderboard;

-- Compare ranking functions
SELECT
    user_id,
    score,
    ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num,
    RANK() OVER (ORDER BY score DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank
FROM leaderboard;
```

### NTILE

```sql
-- Divide into quartiles
SELECT
    user_id,
    total_purchases,
    NTILE(4) OVER (ORDER BY total_purchases DESC) AS quartile
FROM user_stats;

-- Percentile buckets
SELECT
    user_id,
    total_purchases,
    NTILE(100) OVER (ORDER BY total_purchases DESC) AS percentile
FROM user_stats;
```

## Value Functions

### LAG and LEAD

```sql
-- Previous value
SELECT
    event_time,
    price,
    LAG(price) OVER (ORDER BY event_time) AS prev_price,
    price - LAG(price) OVER (ORDER BY event_time) AS price_change
FROM stock_prices
WHERE symbol = 'AAPL';

-- Next value
SELECT
    event_time,
    event_type,
    LEAD(event_type) OVER (
        PARTITION BY user_id
        ORDER BY event_time
    ) AS next_event
FROM events;

-- With offset and default
SELECT
    event_time,
    price,
    LAG(price, 7, price) OVER (ORDER BY event_time) AS price_7_days_ago
FROM stock_prices;
```

### FIRST_VALUE and LAST_VALUE

```sql
-- First value in window
SELECT
    user_id,
    event_time,
    event_type,
    FIRST_VALUE(event_type) OVER (
        PARTITION BY user_id
        ORDER BY event_time
    ) AS first_event
FROM events;

-- Last value (note the frame)
SELECT
    user_id,
    event_time,
    event_type,
    LAST_VALUE(event_type) OVER (
        PARTITION BY user_id
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_event
FROM events;
```

### NTH_VALUE

```sql
-- Get the 3rd event for each user
SELECT
    user_id,
    event_time,
    NTH_VALUE(event_type, 3) OVER (
        PARTITION BY user_id
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS third_event
FROM events;
```

## Aggregate Window Functions

### Running Totals

```sql
-- Cumulative sum
SELECT
    event_date,
    revenue,
    SUM(revenue) OVER (
        ORDER BY event_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_revenue
FROM daily_revenue;

-- Running count
SELECT
    event_time,
    user_id,
    COUNT(*) OVER (
        PARTITION BY user_id
        ORDER BY event_time
    ) AS event_count_so_far
FROM events;
```

### Moving Averages

```sql
-- 7-day moving average
SELECT
    event_date,
    revenue,
    AVG(revenue) OVER (
        ORDER BY event_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS ma_7day
FROM daily_revenue;

-- Centered moving average
SELECT
    event_date,
    revenue,
    AVG(revenue) OVER (
        ORDER BY event_date
        ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
    ) AS centered_ma_7day
FROM daily_revenue;
```

### Rolling Statistics

```sql
-- Multiple rolling statistics
SELECT
    event_date,
    revenue,
    AVG(revenue) OVER w AS ma_7day,
    MIN(revenue) OVER w AS min_7day,
    MAX(revenue) OVER w AS max_7day,
    stddevPop(revenue) OVER w AS stddev_7day
FROM daily_revenue
WINDOW w AS (
    ORDER BY event_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
);
```

## Percentage and Ratio Calculations

### Percent of Total

```sql
-- Percentage of total
SELECT
    product_category,
    revenue,
    revenue / SUM(revenue) OVER () * 100 AS pct_of_total
FROM category_sales;

-- Percentage within partition
SELECT
    region,
    product_category,
    revenue,
    revenue / SUM(revenue) OVER (PARTITION BY region) * 100 AS pct_of_region
FROM sales;
```

### Year-over-Year Comparison

```sql
-- YoY growth
SELECT
    event_month,
    revenue,
    LAG(revenue, 12) OVER (ORDER BY event_month) AS revenue_last_year,
    (revenue - LAG(revenue, 12) OVER (ORDER BY event_month)) /
        LAG(revenue, 12) OVER (ORDER BY event_month) * 100 AS yoy_growth
FROM monthly_revenue;
```

### Period-over-Period Change

```sql
-- Day-over-day change
SELECT
    event_date,
    users,
    users - LAG(users) OVER (ORDER BY event_date) AS dod_change,
    (users - LAG(users) OVER (ORDER BY event_date)) /
        LAG(users) OVER (ORDER BY event_date) * 100 AS dod_pct_change
FROM daily_users;
```

## Session Analysis

### Session Boundaries

```sql
-- Identify session starts (30-minute gap)
SELECT
    user_id,
    event_time,
    event_type,
    if(
        dateDiff('minute',
            LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time),
            event_time
        ) > 30
        OR LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL,
        1, 0
    ) AS is_session_start
FROM events;

-- Assign session IDs
SELECT
    user_id,
    event_time,
    event_type,
    SUM(is_session_start) OVER (
        PARTITION BY user_id
        ORDER BY event_time
    ) AS session_id
FROM (
    SELECT
        *,
        if(
            dateDiff('minute',
                LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time),
                event_time
            ) > 30
            OR LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL,
            1, 0
        ) AS is_session_start
    FROM events
);
```

### Time Between Events

```sql
-- Time since previous event
SELECT
    user_id,
    event_time,
    event_type,
    dateDiff('second',
        LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time),
        event_time
    ) AS seconds_since_last_event
FROM events;
```

## Funnel Analysis with Window Functions

### Event Sequence

```sql
-- Track event sequence
SELECT
    user_id,
    event_time,
    event_type,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_time) AS step,
    LEAD(event_type) OVER (PARTITION BY user_id ORDER BY event_time) AS next_event,
    dateDiff('second', event_time,
        LEAD(event_time) OVER (PARTITION BY user_id ORDER BY event_time)
    ) AS time_to_next
FROM events
WHERE event_type IN ('view', 'cart', 'checkout', 'purchase');
```

### Conversion Windows

```sql
-- Time from first event to conversion
SELECT
    user_id,
    event_type,
    event_time,
    FIRST_VALUE(event_time) OVER (
        PARTITION BY user_id
        ORDER BY event_time
    ) AS first_event_time,
    dateDiff('hour', first_event_time, event_time) AS hours_since_first
FROM events
WHERE event_type IN ('signup', 'purchase');
```

## Performance Optimization

### Using WINDOW Clause

```sql
-- Define window once, reuse multiple times
SELECT
    user_id,
    event_time,
    COUNT(*) OVER w AS running_count,
    SUM(value) OVER w AS running_sum,
    AVG(value) OVER w AS running_avg
FROM events
WINDOW w AS (
    PARTITION BY user_id
    ORDER BY event_time
    ROWS UNBOUNDED PRECEDING
);
```

### Materialized Calculations

```sql
-- Pre-compute rankings in materialized view
CREATE MATERIALIZED VIEW user_rankings
ENGINE = ReplacingMergeTree()
ORDER BY (ranking_date, user_id)
AS SELECT
    toDate(now()) AS ranking_date,
    user_id,
    total_score,
    RANK() OVER (ORDER BY total_score DESC) AS global_rank,
    RANK() OVER (PARTITION BY region ORDER BY total_score DESC) AS region_rank
FROM user_scores;
```

### Limiting Window Size

```sql
-- Avoid unbounded windows when possible
-- Instead of: ROWS UNBOUNDED PRECEDING
-- Use bounded: ROWS BETWEEN 30 PRECEDING AND CURRENT ROW

SELECT
    event_date,
    revenue,
    AVG(revenue) OVER (
        ORDER BY event_date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS ma_30day
FROM daily_revenue;
```

---

Window functions in ClickHouse enable powerful analytical queries for rankings, running totals, moving averages, and time-series analysis. Use LAG/LEAD for period comparisons, ROW_NUMBER for deduplication and ranking, and aggregate functions with frames for rolling calculations. For complex queries, define windows with the WINDOW clause and consider materializing frequently-used calculations.
