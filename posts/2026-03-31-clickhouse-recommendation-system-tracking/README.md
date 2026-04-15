# How to Build a Recommendation System Tracking Platform with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Recommendation System, Analytics, Machine Learning, Personalization

Description: Track recommendation impressions, clicks, and conversions in ClickHouse to evaluate model performance, run A/B tests, and compute collaborative filtering signals at scale.

## Introduction

Recommendation systems are only as good as the feedback loop that improves them. To know whether a recommendation model is working, you need to track every impression (what was shown), every click (what was engaged with), and every conversion (what led to a purchase or desired action).

At scale, a single platform might generate hundreds of millions of recommendation events per day. ClickHouse handles this volume well and enables the analytical queries that data science teams need: click-through rate by model version, item co-occurrence for collaborative filtering, position bias analysis, and A/B test significance testing.

## Schema Design

### Recommendation Impressions

```sql
CREATE TABLE recommendation_impressions
(
    impression_id   UUID DEFAULT generateUUIDv4(),
    occurred_at     DateTime64(3),
    user_id         String,
    session_id      String,
    page_context    LowCardinality(String),  -- home, pdp, cart, email
    position        UInt8,                   -- rank position of this item
    item_id         String,
    item_type       LowCardinality(String),  -- product, article, video
    model_id        LowCardinality(String),  -- which recommender model
    model_version   LowCardinality(String),
    experiment_id   LowCardinality(String),  -- A/B test bucket
    score           Float32,                 -- model confidence score
    device_type     LowCardinality(String),
    country         LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (model_id, experiment_id, user_id, occurred_at);
```

### Recommendation Interactions

```sql
CREATE TABLE recommendation_interactions
(
    interaction_id  UUID DEFAULT generateUUIDv4(),
    impression_id   UUID,
    occurred_at     DateTime64(3),
    user_id         String,
    item_id         String,
    model_id        LowCardinality(String),
    model_version   LowCardinality(String),
    experiment_id   LowCardinality(String),
    interaction_type LowCardinality(String), -- click, add_to_cart, purchase, save, share
    value_usd       Nullable(Decimal(12, 4)) -- for purchase events
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (model_id, experiment_id, user_id, occurred_at);
```

### User Preference Signals

```sql
CREATE TABLE user_preference_signals
(
    user_id         String,
    item_id         String,
    item_category   LowCardinality(String),
    signal_type     LowCardinality(String),  -- view, like, purchase, explicit_dislike
    signal_weight   Float32,
    occurred_at     DateTime,
    model_id        LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (user_id, occurred_at);
```

## Click-Through Rate by Model and Page Context

```sql
SELECT
    i.model_id,
    i.model_version,
    i.page_context,
    count(DISTINCT i.impression_id)  AS impressions,
    count(DISTINCT e.impression_id)  AS clicks,
    round(count(DISTINCT e.impression_id) / count(DISTINCT i.impression_id) * 100, 4) AS ctr_pct
FROM recommendation_impressions AS i
LEFT JOIN recommendation_interactions AS e
    ON i.impression_id = e.impression_id
    AND e.interaction_type = 'click'
WHERE i.occurred_at >= now() - INTERVAL 7 DAY
GROUP BY i.model_id, i.model_version, i.page_context
ORDER BY ctr_pct DESC;
```

## A/B Test Performance Comparison

```sql
SELECT
    i.experiment_id,
    count(DISTINCT i.impression_id)                                     AS impressions,
    countIf(e.interaction_type = 'click')                              AS clicks,
    countIf(e.interaction_type = 'purchase')                           AS purchases,
    round(countIf(e.interaction_type = 'click') /
        count(DISTINCT i.impression_id) * 100, 4)                      AS ctr_pct,
    round(countIf(e.interaction_type = 'purchase') /
        count(DISTINCT i.impression_id) * 100, 4)                      AS conversion_pct,
    sum(e.value_usd)                                                    AS revenue_usd,
    sum(e.value_usd) / count(DISTINCT i.impression_id)                 AS revenue_per_impression
FROM recommendation_impressions AS i
LEFT JOIN recommendation_interactions AS e
    ON i.impression_id = e.impression_id
WHERE i.occurred_at >= now() - INTERVAL 14 DAY
  AND i.experiment_id IN ('control', 'treatment-v2')
GROUP BY i.experiment_id
ORDER BY i.experiment_id;
```

## Position Bias Analysis

Recommendations shown at position 1 always get higher CTR. This query shows how much position affects clicks:

```sql
SELECT
    position,
    count(DISTINCT i.impression_id)    AS impressions,
    count(DISTINCT e.impression_id)    AS clicks,
    round(count(DISTINCT e.impression_id) /
        count(DISTINCT i.impression_id) * 100, 3) AS ctr_pct
FROM recommendation_impressions AS i
LEFT JOIN recommendation_interactions AS e
    ON i.impression_id = e.impression_id
    AND e.interaction_type = 'click'
WHERE i.occurred_at >= now() - INTERVAL 7 DAY
  AND i.page_context = 'home'
GROUP BY position
ORDER BY position;
```

## Item Co-Occurrence for Collaborative Filtering

Users who clicked item A often also clicked item B. This query computes item co-occurrence counts, a core signal for collaborative filtering:

```sql
SELECT
    e1.item_id         AS item_a,
    e2.item_id         AS item_b,
    count()            AS co_occurrence_count
FROM recommendation_interactions AS e1
JOIN recommendation_interactions AS e2
    ON e1.user_id = e2.user_id
    AND e1.item_id != e2.item_id
    AND e2.occurred_at BETWEEN e1.occurred_at - INTERVAL 1 HOUR
                            AND e1.occurred_at + INTERVAL 1 HOUR
WHERE e1.interaction_type = 'click'
  AND e2.interaction_type = 'click'
  AND e1.occurred_at >= now() - INTERVAL 30 DAY
GROUP BY item_a, item_b
HAVING co_occurrence_count > 10
ORDER BY co_occurrence_count DESC
LIMIT 100;
```

## Model Coverage - How Many Items Each Model Recommends

Low coverage means a model over-recommends a small set of popular items:

```sql
SELECT
    model_id,
    model_version,
    count(DISTINCT item_id)   AS unique_items_recommended,
    count()                   AS total_impressions,
    count(DISTINCT user_id)   AS users_reached
FROM recommendation_impressions
WHERE occurred_at >= now() - INTERVAL 7 DAY
GROUP BY model_id, model_version
ORDER BY unique_items_recommended DESC;
```

## User Engagement Funnel Per Model

```sql
SELECT
    i.model_id,
    count(DISTINCT i.impression_id)                      AS impressions,
    countIf(e.interaction_type = 'click')               AS clicks,
    countIf(e.interaction_type = 'add_to_cart')         AS add_to_cart,
    countIf(e.interaction_type = 'purchase')            AS purchases,
    round(countIf(e.interaction_type = 'click') /
        count(DISTINCT i.impression_id) * 100, 3)       AS imp_to_click_pct,
    round(countIf(e.interaction_type = 'add_to_cart') /
        nullIf(countIf(e.interaction_type = 'click'), 0) * 100, 3) AS click_to_cart_pct,
    round(countIf(e.interaction_type = 'purchase') /
        nullIf(countIf(e.interaction_type = 'add_to_cart'), 0) * 100, 3) AS cart_to_purchase_pct
FROM recommendation_impressions AS i
LEFT JOIN recommendation_interactions AS e ON i.impression_id = e.impression_id
WHERE i.occurred_at >= now() - INTERVAL 30 DAY
GROUP BY i.model_id;
```

## Top Recommended Items vs Top Purchased Items

Identify items that are frequently shown but rarely purchased:

```sql
WITH shown AS (
    SELECT item_id, count() AS impressions
    FROM recommendation_impressions
    WHERE occurred_at >= now() - INTERVAL 7 DAY
    GROUP BY item_id
),
purchased AS (
    SELECT item_id, count() AS purchases
    FROM recommendation_interactions
    WHERE interaction_type = 'purchase'
      AND occurred_at >= now() - INTERVAL 7 DAY
    GROUP BY item_id
)
SELECT
    s.item_id,
    s.impressions,
    coalesce(p.purchases, 0)                              AS purchases,
    coalesce(p.purchases, 0) / s.impressions              AS purchase_rate,
    s.impressions / coalesce(p.purchases, 1)              AS impressions_per_purchase
FROM shown AS s
LEFT JOIN purchased AS p ON s.item_id = p.item_id
ORDER BY impressions_per_purchase DESC
LIMIT 50;
```

## User-Level Recommendation Performance

```sql
SELECT
    i.user_id,
    count(DISTINCT i.impression_id)               AS impressions_served,
    countIf(e.interaction_type = 'click')         AS clicks,
    countIf(e.interaction_type = 'purchase')      AS purchases,
    sum(e.value_usd)                              AS total_spend_usd
FROM recommendation_impressions AS i
LEFT JOIN recommendation_interactions AS e ON i.impression_id = e.impression_id
WHERE i.occurred_at >= now() - INTERVAL 30 DAY
GROUP BY i.user_id
ORDER BY total_spend_usd DESC
LIMIT 100;
```

## Materialized View for Daily Model Metrics

```sql
CREATE MATERIALIZED VIEW recommendation_daily_metrics_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (model_id, experiment_id, page_context, day)
AS
SELECT
    i.model_id,
    i.experiment_id,
    i.page_context,
    toDate(i.occurred_at)                         AS day,
    uniqState(i.impression_id)                    AS impressions,
    sumIfState(toUInt64(1), e.interaction_type = 'click')  AS clicks,
    sumIfState(toUInt64(1), e.interaction_type = 'purchase') AS purchases,
    sumState(e.value_usd)                         AS revenue_usd
FROM recommendation_impressions AS i
LEFT JOIN recommendation_interactions AS e ON i.impression_id = e.impression_id
GROUP BY i.model_id, i.experiment_id, i.page_context, day;
```

## Conclusion

ClickHouse gives recommendation system teams the analytical infrastructure to close the feedback loop. Tracking impressions, clicks, and conversions at scale enables CTR measurement, A/B test evaluation, position bias analysis, and collaborative filtering signal extraction. The combination of fast aggregations, columnar storage, and materialized views makes it practical to run these analyses continuously rather than in nightly batch jobs.

**Related Reading:**

- [How to Analyze Social Media Engagement Metrics in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-social-media-engagement-metrics/view)
- [How to Build a Machine Learning Feature Store with ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-ml-feature-store/view)
- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
