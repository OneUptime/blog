# How to Track Ad Revenue Attribution with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Revenue Attribution, Ad Tech, Conversion Tracking, Analytics

Description: Implement multi-touch and last-click ad revenue attribution models in ClickHouse to understand which campaigns drive conversions.

---

Revenue attribution answers the fundamental question: which ad touchpoints led to a purchase? ClickHouse handles the complex window operations and cross-session joins required for both last-click and multi-touch attribution models.

## Touchpoints and Conversions Tables

```sql
CREATE TABLE ad_touchpoints (
    event_time      DateTime,
    user_id         UInt64,
    campaign_id     UInt32,
    channel         LowCardinality(String),
    event_type      LowCardinality(String),
    date            Date DEFAULT toDate(event_time)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (user_id, event_time);

CREATE TABLE conversions (
    convert_time    DateTime,
    user_id         UInt64,
    order_id        String,
    revenue         Float64,
    date            Date DEFAULT toDate(convert_time)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (user_id, convert_time);
```

## Last-Click Attribution

Assign full conversion credit to the last touchpoint before each conversion:

```sql
SELECT
    t.campaign_id,
    t.channel,
    count() AS conversions,
    sum(c.revenue) AS attributed_revenue
FROM conversions AS c
ASOF JOIN (
    SELECT user_id, campaign_id, channel, event_time
    FROM ad_touchpoints
    WHERE event_type IN ('click', 'impression')
) AS t
    ON c.user_id = t.user_id AND c.convert_time >= t.event_time
GROUP BY t.campaign_id, t.channel
ORDER BY attributed_revenue DESC;
```

## Linear Multi-Touch Attribution

Split conversion credit evenly across all touchpoints in the conversion path:

```sql
WITH conversion_paths AS (
    SELECT
        c.user_id,
        c.order_id,
        c.revenue,
        t.campaign_id,
        t.channel,
        count() OVER (PARTITION BY c.user_id, c.order_id) AS path_length
    FROM conversions AS c
    JOIN ad_touchpoints AS t
        ON c.user_id = t.user_id
        AND t.event_time BETWEEN c.convert_time - INTERVAL 30 DAY AND c.convert_time
)
SELECT
    campaign_id,
    channel,
    round(sum(revenue / path_length), 2) AS attributed_revenue
FROM conversion_paths
GROUP BY campaign_id, channel
ORDER BY attributed_revenue DESC;
```

## Attribution Window Analysis

See how revenue attribution changes with different lookback windows:

```sql
SELECT
    campaign_id,
    round(sumIf(c.revenue, t.event_time >= c.convert_time - INTERVAL 1 DAY), 2) AS revenue_1d,
    round(sumIf(c.revenue, t.event_time >= c.convert_time - INTERVAL 7 DAY), 2) AS revenue_7d,
    round(sumIf(c.revenue, t.event_time >= c.convert_time - INTERVAL 30 DAY), 2) AS revenue_30d
FROM conversions AS c
JOIN ad_touchpoints AS t ON c.user_id = t.user_id AND t.event_time <= c.convert_time
GROUP BY campaign_id
ORDER BY revenue_30d DESC;
```

## ROAS by Channel

```sql
SELECT
    t.channel,
    sum(c.revenue) AS attributed_revenue,
    sum(spend) AS total_spend,
    round(sum(c.revenue) / sum(spend), 2) AS roas
FROM conversions AS c
JOIN ad_touchpoints AS t ON c.user_id = t.user_id
JOIN campaign_spend AS s ON t.campaign_id = s.campaign_id AND t.date = s.date
WHERE t.event_time <= c.convert_time
  AND t.event_time >= c.convert_time - INTERVAL 7 DAY
GROUP BY t.channel
ORDER BY roas DESC;
```

## Summary

ClickHouse window functions and cross-table joins make it possible to implement both last-click and multi-touch attribution without external processing pipelines. By varying lookback windows and credit-distribution logic in SQL, marketers can compare attribution models and understand the true value of each channel.
