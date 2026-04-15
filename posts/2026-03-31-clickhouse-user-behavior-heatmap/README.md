# How to Build a User Behavior Heatmap with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Heatmap, User Behavior, Analytics, Click Tracking

Description: Learn how to build user behavior heatmaps in ClickHouse by aggregating click coordinates, scroll depths, and interaction patterns for UI analytics.

---

## What Is a Behavior Heatmap

A behavior heatmap visualizes where users click, how far they scroll, and which UI elements they interact with most. It reveals UX friction points and popular content areas. ClickHouse aggregates millions of interaction events into heatmap data that visualization libraries consume.

## Click Event Schema

Store click events with normalized coordinates:

```sql
CREATE TABLE click_events
(
    event_time  DateTime,
    session_id  String,
    user_id     UInt64,
    page_path   LowCardinality(String),
    x_pct       Float32,  -- 0-100 percentage of page width
    y_pct       Float32,  -- 0-100 percentage of page height
    element_id  String,
    device_type LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (page_path, event_time);
```

## Grid Heatmap Aggregation

Group clicks into a grid of cells for heatmap rendering:

```sql
SELECT
    round(x_pct / 5) * 5 AS x_bucket,
    round(y_pct / 5) * 5 AS y_bucket,
    count() AS click_count,
    uniq(user_id) AS unique_users
FROM click_events
WHERE page_path = '/landing'
  AND event_time >= today() - 7
  AND device_type = 'desktop'
GROUP BY x_bucket, y_bucket
ORDER BY click_count DESC;
```

## Scroll Depth Distribution

Measure how far users scroll down each page:

```sql
SELECT
    toUInt8(y_pct / 10) * 10 AS scroll_depth_bucket,
    count() AS reach_count,
    round(count() * 100.0 / max(count()) OVER (), 2) AS pct_of_max_reach
FROM scroll_events
WHERE page_path = '/blog/post-123'
  AND event_time >= today() - 7
GROUP BY scroll_depth_bucket
ORDER BY scroll_depth_bucket;
```

## Click Heatmap by Element

Aggregate clicks by named UI element:

```sql
SELECT
    element_id,
    count() AS clicks,
    uniq(user_id) AS unique_clickers,
    round(uniq(user_id) * 100.0 / (
        SELECT uniq(user_id) FROM click_events
        WHERE page_path = '/pricing' AND event_time >= today() - 7
    ), 2) AS ctr_pct
FROM click_events
WHERE page_path = '/pricing'
  AND event_time >= today() - 7
GROUP BY element_id
ORDER BY clicks DESC;
```

## Rage Click Detection

Identify UI elements where users click repeatedly in frustration:

```sql
SELECT
    session_id,
    element_id,
    count() AS rapid_clicks,
    min(event_time) AS first_click,
    max(event_time) AS last_click
FROM click_events
WHERE event_time >= today() - 1
GROUP BY session_id, element_id
HAVING count() >= 5
   AND dateDiff('second', min(event_time), max(event_time)) < 10
ORDER BY rapid_clicks DESC
LIMIT 50;
```

## Heatmap by Device Type

Compare click patterns between mobile and desktop:

```sql
SELECT
    device_type,
    round(x_pct / 10) * 10 AS x_bucket,
    round(y_pct / 10) * 10 AS y_bucket,
    count() AS clicks
FROM click_events
WHERE page_path = '/home'
  AND event_time >= today() - 7
GROUP BY device_type, x_bucket, y_bucket
ORDER BY device_type, clicks DESC;
```

## Summary

ClickHouse builds behavior heatmaps by bucketing click coordinates into grid cells, aggregating scroll depth distributions, detecting rage clicks, and comparing interaction patterns across devices. Grid-level aggregation reduces millions of events to thousands of heatmap cells that frontend visualization libraries render instantly.
