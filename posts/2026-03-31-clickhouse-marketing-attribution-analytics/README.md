# How to Use ClickHouse for Marketing Attribution Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Marketing Attribution, Multi-Touch Attribution, Conversion Tracking, Analytics

Description: Build multi-touch marketing attribution models in ClickHouse to understand which channels drive conversions and optimize marketing spend allocation.

---

## Why Attribution Analysis Needs ClickHouse

Marketing attribution requires joining touchpoint events with conversion events across potentially billions of rows. Models like first-touch, last-touch, linear, and time-decay require window functions and complex aggregations that would take hours in traditional databases but run in seconds in ClickHouse.

## Touchpoint Events Schema

```sql
CREATE TABLE marketing_touchpoints
(
    event_time DateTime,
    user_id UInt64,
    session_id UInt64,
    channel LowCardinality(String),
    campaign LowCardinality(String),
    medium LowCardinality(String),
    source LowCardinality(String),
    keyword String,
    landing_page String,
    device_type LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);

CREATE TABLE conversions
(
    conversion_time DateTime,
    user_id UInt64,
    conversion_type LowCardinality(String),
    revenue Decimal(10, 2),
    order_id UInt64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(conversion_time)
ORDER BY (user_id, conversion_time);
```

## Last-Touch Attribution

```sql
-- Last channel touched before conversion
SELECT
    channel,
    campaign,
    count() AS conversions,
    sum(revenue) AS attributed_revenue
FROM (
    SELECT
        t.channel,
        t.campaign,
        c.revenue,
        row_number() OVER (
            PARTITION BY c.user_id, c.conversion_time
            ORDER BY t.event_time DESC
        ) AS rn
    FROM conversions AS c
    JOIN marketing_touchpoints AS t
        ON c.user_id = t.user_id
        AND t.event_time <= c.conversion_time
    WHERE c.conversion_time >= today() - 90
      AND t.event_time >= today() - 90
)
WHERE rn = 1
GROUP BY channel, campaign
ORDER BY attributed_revenue DESC;
```

## Linear Attribution

```sql
-- Equal credit to all touchpoints in 30-day window
WITH user_touchpoints AS (
    SELECT
        t.user_id,
        t.channel,
        t.campaign,
        c.revenue,
        c.conversion_time,
        count() OVER (PARTITION BY t.user_id, c.conversion_time) AS touch_count
    FROM marketing_touchpoints AS t
    JOIN conversions AS c ON t.user_id = c.user_id
    WHERE t.event_time >= c.conversion_time - INTERVAL 30 DAY
      AND t.event_time <= c.conversion_time
      AND c.conversion_time >= today() - 90
)
SELECT
    channel,
    campaign,
    count() AS touchpoints,
    sum(revenue / touch_count) AS attributed_revenue
FROM user_touchpoints
GROUP BY channel, campaign
ORDER BY attributed_revenue DESC;
```

## Time-Decay Attribution

```sql
-- More credit to recent touchpoints (half-life = 7 days)
WITH decay_scores AS (
    SELECT
        t.user_id,
        t.channel,
        t.campaign,
        c.revenue,
        c.conversion_time,
        exp(
            -0.693 * dateDiff('day', t.event_time, c.conversion_time) / 7.0
        ) AS decay_weight
    FROM marketing_touchpoints AS t
    JOIN conversions AS c ON t.user_id = c.user_id
    WHERE t.event_time >= c.conversion_time - INTERVAL 30 DAY
      AND t.event_time <= c.conversion_time
      AND c.conversion_time >= today() - 90
),
total_weights AS (
    SELECT user_id, conversion_time, sum(decay_weight) AS total_weight
    FROM decay_scores
    GROUP BY user_id, conversion_time
)
SELECT
    d.channel,
    d.campaign,
    sum(d.revenue * d.decay_weight / w.total_weight) AS attributed_revenue
FROM decay_scores AS d
JOIN total_weights AS w USING (user_id, conversion_time)
GROUP BY d.channel, d.campaign
ORDER BY attributed_revenue DESC;
```

## Summary

ClickHouse enables fast multi-touch marketing attribution with its window function support and efficient join performance. Build last-touch, linear, and time-decay models by joining touchpoint events with conversions and applying the appropriate credit allocation formula. These queries run in seconds even on billions of touchpoint rows, making real-time attribution dashboards practical.
