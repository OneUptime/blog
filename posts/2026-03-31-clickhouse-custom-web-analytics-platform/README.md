# How to Build a Custom Web Analytics Platform with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Web Analytics, Page View, Session, Event Tracking, Real-Time Analytics

Description: Learn how to build a custom web analytics platform with ClickHouse - covering schema design, event ingestion, sessionization, and dashboard queries.

---

Building your own web analytics platform with ClickHouse gives you full data ownership, lower cost than SaaS alternatives, and complete control over what you track. This guide walks through the core architecture and queries for a production-ready analytics system.

## Schema Design

Design a wide event table to capture all interactions in a single schema:

```sql
CREATE TABLE web_events (
    event_time   DateTime64(3)       DEFAULT now(),
    event_id     UUID                DEFAULT generateUUIDv4(),
    session_id   String,
    visitor_id   String,
    event_type   LowCardinality(String),  -- pageview, click, form_submit
    url          String,
    referrer     String,
    country      LowCardinality(String),
    city         String,
    browser      LowCardinality(String),
    os           LowCardinality(String),
    device_type  LowCardinality(String),
    utm_source   LowCardinality(String),
    utm_medium   LowCardinality(String),
    utm_campaign String,
    duration_ms  UInt32
) ENGINE = MergeTree
PARTITION BY toYYYYMMDD(event_time)
ORDER BY (visitor_id, session_id, event_time)
TTL event_time + INTERVAL 2 YEAR;
```

## Ingestion API

Use a lightweight HTTP endpoint to collect events. Send data directly from JavaScript with a POST request to your ingestion server, which batches and inserts into ClickHouse:

```bash
curl -X POST https://analytics.yoursite.com/track \
  -H "Content-Type: application/json" \
  -d '{"event_type":"pageview","url":"/blog/post","session_id":"abc123","visitor_id":"v456"}'
```

On the server side, buffer events and insert in batches of 1000 or every 5 seconds to ClickHouse's HTTP interface.

## Core Analytics Queries

**Daily unique visitors:**

```sql
SELECT
    toDate(event_time)  AS day,
    uniq(visitor_id)    AS unique_visitors,
    count()             AS total_pageviews,
    uniq(session_id)    AS sessions
FROM web_events
WHERE event_type = 'pageview'
  AND event_time >= today() - 30
GROUP BY day
ORDER BY day;
```

**Top pages:**

```sql
SELECT
    url,
    count()          AS views,
    uniq(visitor_id) AS unique_visitors,
    avg(duration_ms) AS avg_time_ms
FROM web_events
WHERE event_type = 'pageview'
  AND event_time >= today() - 7
GROUP BY url
ORDER BY views DESC
LIMIT 20;
```

## Sessionization with Materialized Views

Automatically compute session metrics as data arrives:

```sql
CREATE MATERIALIZED VIEW session_stats
ENGINE = AggregatingMergeTree
ORDER BY (session_id, day)
AS
SELECT
    session_id,
    toDate(event_time)          AS day,
    minState(event_time)        AS session_start,
    maxState(event_time)        AS session_end,
    countState()                AS event_count,
    anyState(visitor_id)        AS visitor_id,
    anyState(utm_source)        AS utm_source
FROM web_events
GROUP BY session_id, day;
```

## Bounce Rate Calculation

```sql
SELECT
    day,
    countIf(session_events = 1) / count() AS bounce_rate
FROM (
    SELECT
        toDate(min(event_time)) AS day,
        session_id,
        count()                 AS session_events
    FROM web_events
    WHERE event_time >= today() - 30
    GROUP BY session_id
)
GROUP BY day
ORDER BY day;
```

## Summary

ClickHouse provides all the tools needed for a custom web analytics platform - fast ingestion, sub-second aggregation queries, efficient storage with compression, and TTL-based data lifecycle management. With this schema and these queries, you can replace expensive SaaS analytics tools with a self-hosted solution that scales to billions of events.
