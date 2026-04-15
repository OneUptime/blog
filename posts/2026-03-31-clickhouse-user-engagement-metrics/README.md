# How to Track User Engagement Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Engagement, Analytics, User Behavior, Retention

Description: Learn how to track and analyze user engagement metrics in ClickHouse, covering DAU, session depth, and feature adoption.

---

User engagement metrics reveal how deeply users interact with your product. ClickHouse's columnar storage and fast aggregation functions let you compute DAU, WAU, session depth, and feature adoption across millions of events in real time.

## Events Table

```sql
CREATE TABLE user_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    user_id UInt64,
    session_id UUID,
    event_type LowCardinality(String),
    feature LowCardinality(String),
    page String,
    duration_ms UInt32,
    event_time DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);
```

## Daily Active Users (DAU)

```sql
SELECT
    toDate(event_time) AS day,
    countDistinct(user_id) AS dau
FROM user_events
WHERE event_time >= now() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day;
```

## Weekly and Monthly Active Users

```sql
SELECT
    toMonday(event_time) AS week_start,
    countDistinct(user_id) AS wau
FROM user_events
WHERE event_time >= now() - INTERVAL 12 WEEK
GROUP BY week_start
ORDER BY week_start;
```

## Session Depth - Average Events per Session

```sql
SELECT
    toDate(event_time) AS day,
    countDistinct(session_id) AS sessions,
    count() AS total_events,
    round(count() / countDistinct(session_id), 1) AS avg_events_per_session
FROM user_events
WHERE event_time >= now() - INTERVAL 14 DAY
GROUP BY day
ORDER BY day;
```

## Feature Adoption Rate

Measure what percentage of active users engage with each feature.

```sql
WITH dau AS (
    SELECT toDate(event_time) AS day, countDistinct(user_id) AS active_users
    FROM user_events
    GROUP BY day
)
SELECT
    toDate(e.event_time) AS day,
    e.feature,
    countDistinct(e.user_id) AS feature_users,
    d.active_users,
    round(countDistinct(e.user_id) * 100.0 / d.active_users, 1) AS adoption_pct
FROM user_events e
JOIN dau d ON toDate(e.event_time) = d.day
WHERE e.event_time >= now() - INTERVAL 30 DAY
GROUP BY day, e.feature, d.active_users
ORDER BY day, adoption_pct DESC;
```

## Session Duration Distribution

```sql
SELECT
    session_id,
    min(event_time) AS session_start,
    max(event_time) AS session_end,
    dateDiff('second', min(event_time), max(event_time)) AS duration_sec
FROM user_events
WHERE event_time >= now() - INTERVAL 7 DAY
GROUP BY session_id
ORDER BY duration_sec DESC
LIMIT 100;
```

## Stickiness Ratio (DAU/MAU)

Stickiness measures how often monthly users return each day.

```sql
WITH daily AS (
    SELECT
        toDate(event_time) AS day,
        toStartOfMonth(event_time) AS mau_month,
        countDistinct(user_id) AS dau
    FROM user_events
    GROUP BY day, mau_month
),
monthly AS (
    SELECT
        toStartOfMonth(event_time) AS mau_month,
        countDistinct(user_id) AS mau
    FROM user_events
    GROUP BY mau_month
)
SELECT
    m.mau_month,
    round(avg(d.dau), 1) AS avg_dau,
    m.mau,
    round(avg(d.dau) * 100.0 / m.mau, 1) AS stickiness_pct
FROM daily d
JOIN monthly m ON d.mau_month = m.mau_month
GROUP BY m.mau_month, m.mau
ORDER BY m.mau_month;
```

## Materialized View for Daily Engagement

```sql
CREATE MATERIALIZED VIEW daily_engagement_mv
ENGINE = AggregatingMergeTree()
ORDER BY (day, feature)
AS
SELECT
    toDate(event_time) AS day,
    feature,
    uniqState(user_id) AS unique_users,
    countState() AS events
FROM user_events
GROUP BY day, feature;
```

To query the materialized view, use the corresponding `-Merge` combinators:

```sql
SELECT
    day,
    feature,
    uniqMerge(unique_users) AS unique_users,
    countMerge(events) AS events
FROM daily_engagement_mv
GROUP BY day, feature
ORDER BY day, unique_users DESC;
```

## Summary

ClickHouse makes engagement analytics fast by combining `countDistinct` for unique user counts, aggregate functions with `GROUP BY` for session analysis, and materialized views for pre-aggregated metrics. Tracking DAU, session depth, feature adoption, and stickiness together gives a complete picture of how users engage with your product over time.
