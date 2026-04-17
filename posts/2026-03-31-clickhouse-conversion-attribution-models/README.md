# How to Build Conversion Attribution Models in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Attribution, Conversion, Marketing, Analytics

Description: Build first-touch, last-touch, and linear attribution models in ClickHouse to understand which channels drive conversions.

---

Attribution modeling answers the question: which marketing touchpoints deserve credit for a conversion? ClickHouse's window functions and array aggregations make it straightforward to implement multiple attribution models on large event datasets.

## Touchpoint Table

```sql
CREATE TABLE touchpoints
(
    user_id UInt64,
    touch_id UUID DEFAULT generateUUIDv4(),
    channel LowCardinality(String),
    campaign String,
    touch_time DateTime,
    converted UInt8 DEFAULT 0,
    conversion_value Decimal(10, 2) DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(touch_time)
ORDER BY (user_id, touch_time);
```

## First-Touch Attribution

Give 100% of credit to the first channel the user encountered.

```sql
WITH first_touch AS (
    SELECT
        user_id,
        argMin(channel, touch_time) AS first_channel,
        argMin(campaign, touch_time) AS first_campaign
    FROM touchpoints
    GROUP BY user_id
),
conversions AS (
    SELECT user_id, sum(conversion_value) AS total_value
    FROM touchpoints
    WHERE converted = 1
    GROUP BY user_id
)
SELECT
    ft.first_channel,
    count() AS converting_users,
    sum(c.total_value) AS attributed_revenue
FROM conversions c
JOIN first_touch ft ON c.user_id = ft.user_id
GROUP BY ft.first_channel
ORDER BY attributed_revenue DESC;
```

## Last-Touch Attribution

Give 100% of credit to the channel immediately before conversion.

```sql
WITH last_touch AS (
    SELECT
        user_id,
        argMax(channel, touch_time) AS last_channel
    FROM touchpoints
    GROUP BY user_id
),
conversions AS (
    SELECT user_id, sum(conversion_value) AS total_value
    FROM touchpoints
    WHERE converted = 1
    GROUP BY user_id
)
SELECT
    lt.last_channel,
    count() AS converting_users,
    sum(c.total_value) AS attributed_revenue
FROM conversions c
JOIN last_touch lt ON c.user_id = lt.user_id
GROUP BY lt.last_channel
ORDER BY attributed_revenue DESC;
```

## Linear Attribution

Distribute credit equally across all touchpoints in the path.

```sql
WITH touch_counts AS (
    SELECT user_id, count() AS num_touches
    FROM touchpoints
    GROUP BY user_id
),
conversion_values AS (
    SELECT user_id, sum(conversion_value) AS total_value
    FROM touchpoints
    WHERE converted = 1
    GROUP BY user_id
)
SELECT
    t.channel,
    round(sum(cv.total_value / tc.num_touches), 2) AS linear_attributed_revenue
FROM touchpoints t
JOIN touch_counts tc ON t.user_id = tc.user_id
JOIN conversion_values cv ON t.user_id = cv.user_id
GROUP BY t.channel
ORDER BY linear_attributed_revenue DESC;
```

## Path Analysis - Most Common Conversion Paths

Understand which channel sequences lead to conversions.

```sql
SELECT
    path,
    count() AS users,
    sum(revenue) AS revenue
FROM (
    SELECT
        user_id,
        arrayMap(x -> x.2, arraySort(groupArray((touch_time, channel)))) AS path,
        sum(conversion_value) AS revenue
    FROM touchpoints
    WHERE user_id IN (
        SELECT user_id FROM touchpoints WHERE converted = 1
    )
    GROUP BY user_id
    HAVING length(path) BETWEEN 2 AND 5
)
GROUP BY path
ORDER BY users DESC
LIMIT 20;
```

## Comparing Models Side by Side

```sql
SELECT
    channel,
    first_revenue,
    last_revenue,
    linear_revenue,
    round((first_revenue + last_revenue + linear_revenue) / 3, 2) AS blended_revenue
FROM (
    SELECT 'email' AS channel, 12000 AS first_revenue, 8000 AS last_revenue, 10000 AS linear_revenue
    UNION ALL
    SELECT 'paid_search', 20000, 25000, 22000
    UNION ALL
    SELECT 'organic', 15000, 10000, 12000
)
ORDER BY blended_revenue DESC;
```

## Summary

ClickHouse makes attribution modeling efficient through `argMin`/`argMax` for first and last-touch models, array aggregations for path analysis, and JOIN-based linear attribution. Running all three models lets you compare how credit is distributed across channels and choose the model that best reflects your marketing strategy. These queries run in seconds even on hundreds of millions of touchpoints.
