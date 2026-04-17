# How to Track Browser and Device Statistics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Web Analytics, Browser, Device, User Agent, LowCardinality, Analytics

Description: Learn how to store and analyze browser and device statistics in ClickHouse using user agent parsing and efficient LowCardinality columns.

---

Browser and device statistics help you understand your audience's technical profile - critical for supporting the right browsers, optimizing for mobile vs desktop, and prioritizing performance improvements. ClickHouse's LowCardinality columns make browser/device analytics highly efficient.

## Schema Design

Parse user agent data server-side before insertion for best performance:

```sql
CREATE TABLE pageviews (
    ts            DateTime64(3),
    visitor_id    String,
    session_id    String,
    url           String,
    browser_name  LowCardinality(String),   -- Chrome, Firefox, Safari
    browser_ver   LowCardinality(String),   -- major version only
    os_name       LowCardinality(String),   -- Windows, macOS, iOS, Android
    os_ver        LowCardinality(String),
    device_type   LowCardinality(String),   -- Desktop, Mobile, Tablet
    device_brand  LowCardinality(String),   -- Apple, Samsung, etc.
    screen_width  UInt16,
    screen_height UInt16
) ENGINE = MergeTree
PARTITION BY toYYYYMMDD(ts)
ORDER BY (visitor_id, ts);
```

Using `LowCardinality(String)` for browser/device columns dramatically reduces storage and improves GROUP BY performance since these fields have low cardinality (< 10,000 distinct values).

## Browser Share Analysis

```sql
SELECT
    browser_name,
    uniq(visitor_id)                                     AS unique_visitors,
    round(uniq(visitor_id) * 100.0 / sum(uniq(visitor_id)) OVER (), 2) AS share_pct
FROM pageviews
WHERE ts >= today() - 30
GROUP BY browser_name
ORDER BY unique_visitors DESC;
```

## Browser Version Distribution

```sql
SELECT
    browser_name,
    browser_ver,
    uniq(visitor_id)     AS visitors,
    count()              AS pageviews
FROM pageviews
WHERE ts >= today() - 30
  AND browser_name = 'Chrome'
GROUP BY browser_name, browser_ver
ORDER BY visitors DESC
LIMIT 15;
```

## Device Type Breakdown

```sql
SELECT
    device_type,
    uniq(visitor_id)     AS visitors,
    uniq(session_id)     AS sessions,
    avg(screen_width)    AS avg_screen_width
FROM pageviews
WHERE ts >= today() - 30
GROUP BY device_type
ORDER BY visitors DESC;
```

## Operating System Stats

```sql
SELECT
    os_name,
    uniq(visitor_id)     AS visitors,
    round(100.0 * uniq(visitor_id) / sum(uniq(visitor_id)) OVER (), 1) AS pct
FROM pageviews
WHERE ts >= today() - 30
GROUP BY os_name
ORDER BY visitors DESC;
```

## Screen Resolution Distribution

```sql
SELECT
    concat(toString(screen_width), 'x', toString(screen_height))   AS resolution,
    count()                                                          AS pageviews,
    uniq(visitor_id)                                                 AS visitors
FROM pageviews
WHERE ts >= today() - 30
  AND screen_width > 0
GROUP BY resolution
ORDER BY pageviews DESC
LIMIT 20;
```

## Mobile vs Desktop Trend

```sql
SELECT
    toStartOfWeek(ts)                       AS week,
    countIf(device_type = 'Mobile')         AS mobile_views,
    countIf(device_type = 'Desktop')        AS desktop_views,
    countIf(device_type = 'Tablet')         AS tablet_views,
    count()                                 AS total_views
FROM pageviews
WHERE ts >= today() - 90
GROUP BY week
ORDER BY week;
```

## Summary

ClickHouse handles browser and device analytics efficiently using `LowCardinality(String)` columns for categorical data like browser name, OS, and device type. Pre-parse user agent strings server-side for best performance. With these query patterns, you can deliver a complete device/browser analytics dashboard with sub-second query times even on hundreds of millions of pageviews.
