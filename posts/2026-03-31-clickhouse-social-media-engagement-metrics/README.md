# How to Analyze Social Media Engagement Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Analytics, Social Media, Engagement, Real-Time

Description: Build a ClickHouse pipeline to store and analyze social media engagement events including likes, shares, comments, and reach across multiple platforms.

## Introduction

Social media platforms and analytics tools track every user interaction with content: likes, shares, comments, clicks, impressions, and video views. At scale, a single viral post can trigger millions of events in minutes. Querying those events for trend analysis, A/B testing results, or creator dashboards requires a database that can aggregate billions of rows fast.

ClickHouse is well suited to this use case. Its columnar storage and vectorized query execution makes it possible to compute rolling engagement rates, funnel metrics, and content rankings in milliseconds even when the underlying tables contain hundreds of billions of rows.

## Schema Design

The primary table stores one row per engagement event:

```sql
CREATE TABLE social_engagement_events
(
    event_id        UUID DEFAULT generateUUIDv4(),
    platform        LowCardinality(String),  -- Twitter, Instagram, LinkedIn, TikTok
    content_id      String,
    author_id       String,
    user_id         String,
    event_type      LowCardinality(String),  -- like, share, comment, click, impression, view
    occurred_at     DateTime64(3),
    session_id      String,
    country         LowCardinality(String),
    device_type     LowCardinality(String),  -- mobile, desktop, tablet
    referrer        LowCardinality(String),
    extra           Map(String, String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (platform, author_id, content_id, occurred_at);
```

A content metadata table holds post-level information:

```sql
CREATE TABLE social_content
(
    content_id      String,
    author_id       String,
    platform        LowCardinality(String),
    content_type    LowCardinality(String),  -- post, reel, story, video, article
    published_at    DateTime,
    title           String,
    tags            Array(String),
    campaign_id     LowCardinality(String)
)
ENGINE = MergeTree()
ORDER BY (platform, author_id, content_id);
```

## Inserting Events

```sql
INSERT INTO social_engagement_events
    (platform, content_id, author_id, user_id, event_type, occurred_at, country, device_type, referrer)
VALUES
    ('Instagram', 'post-001', 'creator-42', 'user-1001', 'like',       now64(), 'US', 'mobile',  'feed'),
    ('Instagram', 'post-001', 'creator-42', 'user-1002', 'impression', now64(), 'UK', 'mobile',  'explore'),
    ('Instagram', 'post-001', 'creator-42', 'user-1003', 'share',      now64(), 'CA', 'desktop', 'profile'),
    ('LinkedIn',  'post-002', 'creator-99', 'user-2001', 'comment',    now64(), 'DE', 'desktop', 'home'),
    ('TikTok',    'video-07', 'creator-17', 'user-3001', 'view',       now64(), 'US', 'mobile',  'foryou');
```

## Total Engagement Per Post

```sql
SELECT
    content_id,
    platform,
    countIf(event_type = 'like')       AS likes,
    countIf(event_type = 'share')      AS shares,
    countIf(event_type = 'comment')    AS comments,
    countIf(event_type = 'click')      AS clicks,
    countIf(event_type = 'impression') AS impressions,
    countIf(event_type = 'view')       AS views,
    (countIf(event_type IN ('like','share','comment','click'))
        / nullIf(countIf(event_type = 'impression'), 0)) * 100 AS engagement_rate_pct
FROM social_engagement_events
WHERE occurred_at >= now() - INTERVAL 7 DAY
GROUP BY content_id, platform
ORDER BY engagement_rate_pct DESC
LIMIT 50;
```

## Hourly Engagement Trend

```sql
SELECT
    toStartOfHour(occurred_at) AS hour,
    event_type,
    count()                    AS event_count
FROM social_engagement_events
WHERE content_id = 'post-001'
  AND occurred_at >= now() - INTERVAL 48 HOUR
GROUP BY hour, event_type
ORDER BY hour, event_type;
```

## Top Performing Content Per Creator

```sql
SELECT
    author_id,
    content_id,
    sum(engagement_score) AS total_score
FROM (
    SELECT
        author_id,
        content_id,
        multiIf(
            event_type = 'share',   5,
            event_type = 'comment', 3,
            event_type = 'like',    2,
            event_type = 'click',   1,
            0
        ) AS engagement_score
    FROM social_engagement_events
    WHERE occurred_at >= toStartOfMonth(now())
)
GROUP BY author_id, content_id
ORDER BY total_score DESC
LIMIT 20;
```

## Geographic Breakdown of Reach

```sql
SELECT
    country,
    count()                                              AS total_events,
    countIf(event_type = 'impression')                   AS reach,
    countIf(event_type IN ('like','share','comment'))    AS interactions
FROM social_engagement_events
WHERE platform = 'Instagram'
  AND occurred_at >= now() - INTERVAL 30 DAY
GROUP BY country
ORDER BY reach DESC
LIMIT 30;
```

## Device Type Distribution

```sql
SELECT
    device_type,
    event_type,
    count()                      AS events,
    count() / sum(count()) OVER () * 100 AS pct
FROM social_engagement_events
WHERE occurred_at >= now() - INTERVAL 7 DAY
GROUP BY device_type, event_type
ORDER BY device_type, events DESC;
```

## Viral Coefficient - Share-to-Impression Ratio

```sql
SELECT
    content_id,
    platform,
    countIf(event_type = 'share')      AS shares,
    countIf(event_type = 'impression') AS impressions,
    shares / nullIf(impressions, 0)    AS viral_coefficient
FROM social_engagement_events
WHERE occurred_at >= now() - INTERVAL 7 DAY
GROUP BY content_id, platform
HAVING impressions > 100
ORDER BY viral_coefficient DESC
LIMIT 20;
```

## Materialized View for Daily Aggregates

Computing engagement metrics from raw events on every dashboard load is expensive. A materialized view that aggregates daily totals keeps dashboards fast:

```sql
CREATE MATERIALIZED VIEW social_daily_engagement_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (platform, author_id, content_id, day)
AS
SELECT
    platform,
    author_id,
    content_id,
    toDate(occurred_at)                             AS day,
    countIf(event_type = 'like')                    AS likes,
    countIf(event_type = 'share')                   AS shares,
    countIf(event_type = 'comment')                 AS comments,
    countIf(event_type = 'click')                   AS clicks,
    countIf(event_type = 'impression')              AS impressions,
    countIf(event_type = 'view')                    AS views
FROM social_engagement_events
GROUP BY platform, author_id, content_id, day;
```

Query the materialized view for fast creator dashboards:

```sql
SELECT
    content_id,
    sum(likes)       AS total_likes,
    sum(shares)      AS total_shares,
    sum(impressions) AS total_impressions
FROM social_daily_engagement_mv
WHERE author_id = 'creator-42'
  AND day >= today() - 30
GROUP BY content_id
ORDER BY total_likes DESC;
```

## Funnel Analysis: Impression to Action

```sql
SELECT
    platform,
    countIf(event_type = 'impression') AS impressions,
    countIf(event_type = 'click')      AS clicks,
    countIf(event_type = 'like')       AS likes,
    countIf(event_type = 'share')      AS shares,
    countIf(event_type = 'comment')    AS comments,
    round(countIf(event_type = 'click')   / nullIf(countIf(event_type = 'impression'), 0) * 100, 2) AS ctr_pct,
    round(countIf(event_type = 'like')    / nullIf(countIf(event_type = 'click'), 0)      * 100, 2) AS like_rate_pct
FROM social_engagement_events
WHERE occurred_at >= now() - INTERVAL 30 DAY
GROUP BY platform;
```

## Campaign Performance Comparison

```sql
SELECT
    c.campaign_id,
    count(DISTINCT e.content_id)        AS content_pieces,
    sum(e.event_type = 'impression')    AS total_impressions,
    sum(e.event_type = 'like')          AS total_likes,
    sum(e.event_type = 'share')         AS total_shares,
    sum(e.event_type IN ('like','share','comment')) /
        nullIf(sum(e.event_type = 'impression'), 0) * 100 AS eng_rate_pct
FROM social_engagement_events AS e
JOIN social_content AS c ON e.content_id = c.content_id AND e.platform = c.platform
WHERE e.occurred_at >= now() - INTERVAL 30 DAY
  AND c.campaign_id != ''
GROUP BY c.campaign_id
ORDER BY eng_rate_pct DESC;
```

## TTL Policy for Raw Events

Social media event data becomes less useful after a few months. Compress older data into a slower storage tier and then drop it:

```sql
ALTER TABLE social_engagement_events
    MODIFY TTL
        occurred_at + INTERVAL 6 MONTH  TO DISK 'cold_storage',
        occurred_at + INTERVAL 2 YEAR   DELETE;
```

## Conclusion

ClickHouse turns high-volume social media event streams into actionable engagement metrics. The columnar storage model is a natural match for the query patterns that matter: aggregating counts by event type, slicing by geography or device, and comparing campaigns. Materialized views prevent expensive full table scans on every dashboard load, keeping latency low as the dataset grows.

**Related Reading:**

- [How to Build a Recommendation System Tracking Platform with ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-recommendation-system-tracking/view)
- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
- [What Is TTL in ClickHouse and How Data Lifecycle Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-ttl-data-lifecycle/view)
