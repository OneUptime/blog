# How to Build User Segmentation Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, User Segmentation, Cohort, RFM, Analytics

Description: Learn how to build powerful user segmentation queries in ClickHouse using RFM analysis, behavioral segmentation, and bitmap-based segment operations.

---

## User Segmentation

User segmentation divides users into groups based on behavior, demographics, or engagement. Segments drive personalization, targeted campaigns, and product decisions. ClickHouse excels at running segmentation queries over billions of events in seconds.

## RFM Segmentation

Recency, Frequency, and Monetary segmentation classifies users by purchase behavior:

```sql
WITH rfm AS (
    SELECT
        customer_id,
        dateDiff('day', max(order_time), today()) AS recency,
        count() AS frequency,
        sum(order_value) AS monetary
    FROM orders
    WHERE status = 'completed'
    GROUP BY customer_id
)
SELECT
    customer_id,
    recency, frequency, monetary,
    CASE
        WHEN recency <= 30 AND frequency >= 5 AND monetary >= 500 THEN 'champion'
        WHEN recency <= 60 AND frequency >= 3 THEN 'loyal'
        WHEN recency <= 30 AND frequency = 1 THEN 'new_customer'
        WHEN recency > 180 THEN 'lost'
        ELSE 'at_risk'
    END AS rfm_segment
FROM rfm;
```

## Behavioral Segmentation

Segment users by what features they have used:

```sql
SELECT
    user_id,
    has(feature_array, 'export') AS used_export,
    has(feature_array, 'api') AS used_api,
    has(feature_array, 'dashboard') AS used_dashboard,
    CASE
        WHEN has(feature_array, 'api') AND has(feature_array, 'export') THEN 'power_user'
        WHEN has(feature_array, 'dashboard') THEN 'analyst'
        ELSE 'basic'
    END AS user_type
FROM (
    SELECT user_id, groupUniqArray(feature_name) AS feature_array
    FROM feature_usage
    WHERE event_time >= today() - 30
    GROUP BY user_id
);
```

## Engagement Score Segmentation

Score users by multiple signals:

```sql
SELECT
    user_id,
    login_count * 2 + page_views + (purchases * 10) AS engagement_score,
    CASE
        WHEN login_count * 2 + page_views + (purchases * 10) >= 100 THEN 'highly_engaged'
        WHEN login_count * 2 + page_views + (purchases * 10) >= 30 THEN 'engaged'
        ELSE 'low_engagement'
    END AS segment
FROM (
    SELECT
        user_id,
        countIf(event_type = 'login') AS login_count,
        countIf(event_type = 'page_view') AS page_views,
        countIf(event_type = 'purchase') AS purchases
    FROM user_events
    WHERE event_time >= today() - 30
    GROUP BY user_id
)
ORDER BY engagement_score DESC;
```

## Bitmap Segment Intersections

Use bitmaps for fast set operations across large user bases:

```sql
-- Build segments as bitmaps and find their intersection
SELECT
    bitmapToArray(
        bitmapAnd(pricing_bitmap, signup_bitmap)
    ) AS users_in_both_segments
FROM (
    SELECT
        bitmapBuild(groupArrayIf(toUInt32(user_id), event_type = 'pricing_view')) AS pricing_bitmap,
        bitmapBuild(groupArrayIf(toUInt32(user_id), event_type = 'signup')) AS signup_bitmap
    FROM user_events
);
```

## Segment Size Comparison

Count users in each segment:

```sql
SELECT
    rfm_segment,
    count() AS users,
    round(count() / sum(count()) OVER () * 100, 2) AS pct,
    round(avg(monetary), 2) AS avg_revenue
FROM rfm_segments
GROUP BY rfm_segment
ORDER BY users DESC;
```

## Summary

ClickHouse user segmentation combines RFM scoring, behavioral flags from feature usage, engagement scoring, and bitmap set operations. Segmentation queries run directly over the event log, eliminating the need for external ML pipelines for rule-based segments. Results feed marketing automation, personalization, and product prioritization.
