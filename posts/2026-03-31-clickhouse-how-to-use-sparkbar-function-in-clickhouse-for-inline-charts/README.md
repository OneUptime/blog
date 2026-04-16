# How to Use sparkBar() Function in ClickHouse for Inline Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Visualization, SparkBar, Analytics, Terminal

Description: Learn how to use the sparkBar() function in ClickHouse to generate inline bar charts directly in query results for quick data visualization.

---

## Overview

`sparkbar()` is a ClickHouse aggregate function that renders a bar chart as a Unicode string directly in query output. It is useful for quickly visualizing distributions, histograms, and time-series in a terminal or log output without external tools.

## Basic Syntax

```sql
SELECT sparkbar(buckets[, min_x, max_x])(x, y)
FROM table;
```

- `buckets`: number of segments in the output string
- `min_x`, `max_x`: optional range of x values
- `x`: the field used to bucket rows into segments
- `y`: the field whose sum within each bucket determines bar height

Because `sparkbar` is an aggregate function, it consumes all rows in its group and returns a single string representing the chart. `sparkBar` is accepted as an alias.

## Simple Histogram Example

Show a distribution of response times bucketed by 100ms:

```sql
SELECT sparkbar(5, 0, 400)(bucket, cnt)
FROM (
    SELECT intDiv(response_ms, 100) * 100 AS bucket,
           count()                        AS cnt
    FROM api_requests
    WHERE response_ms <= 400
    GROUP BY bucket
);
```

```text
█▇▅▃▁
```

Each segment corresponds to a 100ms bucket; heights reflect how many requests fell into each bucket.

## Daily Active Users Chart

```sql
SELECT sparkbar(14, today() - 14, today())(event_date, dau)
FROM (
    SELECT event_date,
           uniq(user_id) AS dau
    FROM page_views
    WHERE event_date >= today() - 14
    GROUP BY event_date
);
```

## Per-Endpoint Request Rate

Render a 60-segment sparkline of request counts per minute, one row per endpoint:

```sql
SELECT
    endpoint,
    count()                                            AS requests,
    sparkbar(60)(toStartOfMinute(event_time), 1)       AS pattern
FROM http_access_log
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY endpoint
ORDER BY requests DESC
LIMIT 10;
```

## Visualizing Error Rate by Hour

```sql
SELECT sparkbar(24, 0, 23)(hour, error_pct)
FROM (
    SELECT
        toHour(event_time)                            AS hour,
        countIf(status_code >= 500) / count() * 100.0 AS error_pct
    FROM http_access_log
    WHERE event_date = today()
    GROUP BY hour
);
```

## Multi-Column Spark Bars

```sql
SELECT
    endpoint,
    sparkbar(15)(toStartOfMinute(event_time), 1)                       AS request_bar,
    sparkbar(15)(toStartOfMinute(event_time), if(status >= 500, 1, 0)) AS error_bar,
    count()                                                            AS total,
    countIf(status >= 500)                                             AS errors
FROM http_access_log
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY endpoint
ORDER BY total DESC
LIMIT 7;
```

## Notes on Usage

- The output uses Unicode block characters: `▁▂▃▄▅▆▇█` (plus a space for empty buckets).
- Works well in ClickHouse CLI, `clickhouse-client`, and log pipelines.
- Bars are auto-scaled relative to the largest summed `y` value across buckets.
- `sparkbar` is an aggregate function, so it appears alongside `GROUP BY` or in a subquery.

```sql
-- Fixed x-range keeps the bucketing consistent across runs
SELECT
    sparkbar(20, toDate('2025-01-01'), toDate('2025-12-31'))(event_date, event_count) AS bar
FROM daily_stats;
```

## Summary

`sparkbar()` lets you render inline Unicode bar charts directly inside ClickHouse query results. It is ideal for quick terminal dashboards, anomaly spotting, and data exploration without external visualization tools. Combine it with `GROUP BY` or subqueries to generate a chart per category.
