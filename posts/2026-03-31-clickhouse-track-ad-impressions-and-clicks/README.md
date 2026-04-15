# How to Track Ad Impressions and Clicks in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Ad Tech, Impression Tracking, Click Tracking, Analytics

Description: Learn how to store and query ad impression and click events in ClickHouse for high-performance advertising analytics.

---

Impression and click tracking form the foundation of digital advertising measurement. At scale, these events arrive in millions per second and must be stored cost-effectively while remaining queryable for real-time reporting.

## Impressions Table

```sql
CREATE TABLE ad_impressions (
    event_time      DateTime64(3),
    impression_id   String,
    ad_id           UInt32,
    campaign_id     UInt32,
    user_id         UInt64,
    publisher_id    UInt32,
    placement       LowCardinality(String),
    device_type     LowCardinality(String),
    country         LowCardinality(String),
    cost            Float32,
    date            Date DEFAULT toDate(event_time)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (campaign_id, ad_id, event_time);
```

## Clicks Table

```sql
CREATE TABLE ad_clicks (
    event_time      DateTime64(3),
    click_id        String,
    impression_id   String,
    ad_id           UInt32,
    campaign_id     UInt32,
    user_id         UInt64,
    date            Date DEFAULT toDate(event_time)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (campaign_id, impression_id, event_time);
```

## Daily Impression Volume and Spend

```sql
SELECT
    date,
    count() AS impressions,
    sum(cost) AS total_cost
FROM ad_impressions
WHERE date >= today() - 7
GROUP BY date
ORDER BY date;
```

## CTR by Ad Placement

Join impressions and clicks to compute click-through rate per placement:

```sql
SELECT
    i.placement,
    count(DISTINCT i.impression_id) AS impressions,
    count(DISTINCT c.click_id) AS clicks,
    round(count(DISTINCT c.click_id) / count(DISTINCT i.impression_id) * 100, 3) AS ctr_pct
FROM ad_impressions AS i
LEFT JOIN ad_clicks AS c ON i.impression_id = c.impression_id AND i.date = c.date
WHERE i.date = today()
GROUP BY i.placement
ORDER BY impressions DESC;
```

## Top Performing Ads

```sql
SELECT
    i.ad_id,
    i.campaign_id,
    count(DISTINCT i.impression_id) AS impressions,
    count(DISTINCT c.click_id) AS clicks,
    round(count(DISTINCT c.click_id) / count(DISTINCT i.impression_id) * 100, 3) AS ctr_pct,
    sum(i.cost) AS total_spend
FROM ad_impressions AS i
LEFT JOIN ad_clicks AS c ON i.impression_id = c.impression_id AND i.date = c.date
WHERE i.date = today()
GROUP BY i.ad_id, i.campaign_id
ORDER BY ctr_pct DESC
LIMIT 20;
```

## Hourly Impression Trend

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS impressions,
    sum(cost) AS spend
FROM ad_impressions
WHERE date = today()
GROUP BY hour
ORDER BY hour;
```

## Unique Reach by Country

```sql
SELECT
    country,
    uniq(user_id) AS unique_users,
    count() AS impressions
FROM ad_impressions
WHERE date = today()
GROUP BY country
ORDER BY unique_users DESC
LIMIT 20;
```

## Summary

ClickHouse's columnar storage and compression make it ideal for impression-level ad data, which is voluminous but repetitive. Separating impressions and clicks into distinct tables, joining them for CTR metrics, and using `uniq()` for reach estimation gives you a complete view of campaign delivery without the overhead of row-level databases.
