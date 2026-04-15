# How to Use ClickHouse with Snowplow for Event Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Snowplow, Event Collection, Analytics, Behavioral Data

Description: Route Snowplow behavioral events into ClickHouse for a fully self-hosted, schema-validated event analytics pipeline with SQL-based analysis.

---

## Why Snowplow and ClickHouse

Snowplow is an open-source behavioral data platform that provides event tracking with schema validation (via Iglu) and flexible pipeline architecture. Pairing Snowplow with ClickHouse gives you:

- Self-hosted data collection with no vendor dependency
- Schema enforcement at collection time
- A SQL-queryable event store you control
- Retention and access policies you define

## Snowplow Architecture with ClickHouse

```text
Tracker (JS/Mobile SDK)
    --> Collector (Snowplow Mini or Stream Collector)
    --> Enrichment Pipeline (Enrich)
    --> Kafka
    --> ClickHouse (via Kafka Engine or Loader)
```

## ClickHouse Events Schema

Snowplow events have a well-defined structure. Create a table matching the enriched event format:

```sql
CREATE TABLE snowplow.events (
    event_id         UUID,
    collector_tstamp DateTime64(3),
    dvce_created_tstamp DateTime64(3),
    event            LowCardinality(String),
    app_id           LowCardinality(String),
    platform         LowCardinality(String),
    user_id          String,
    domain_userid    String,
    network_userid   String,
    session_id       String,
    page_url         String,
    page_title       String,
    refr_urlhost     String,
    geo_country      LowCardinality(String),
    geo_city         String,
    br_name          LowCardinality(String),
    os_name          LowCardinality(String),
    -- Self-describing event data
    unstruct_event   String,  -- JSON
    -- Context arrays
    contexts         String   -- JSON
) ENGINE = ReplacingMergeTree()
PARTITION BY toDate(collector_tstamp)
ORDER BY (app_id, event, collector_tstamp)
TTL toDate(collector_tstamp) + INTERVAL 180 DAY DELETE;
```

## Loading via Kafka

Configure Snowplow to emit enriched events to Kafka, then consume with ClickHouse:

```sql
CREATE TABLE snowplow.events_kafka (
    event_id         UUID,
    collector_tstamp DateTime64(3),
    dvce_created_tstamp DateTime64(3),
    event            LowCardinality(String),
    app_id           LowCardinality(String),
    platform         LowCardinality(String),
    user_id          String,
    domain_userid    String,
    network_userid   String,
    session_id       String,
    page_url         String,
    page_title       String,
    refr_urlhost     String,
    geo_country      LowCardinality(String),
    geo_city         String,
    br_name          LowCardinality(String),
    os_name          LowCardinality(String),
    unstruct_event   String,
    contexts         String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'snowplow_enriched_good',
    kafka_group_name = 'ch_snowplow',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 4;

CREATE MATERIALIZED VIEW snowplow.events_mv TO snowplow.events AS
SELECT * FROM snowplow.events_kafka;
```

## Querying Self-Describing Events

Extract fields from the custom event JSON:

```sql
SELECT
    collector_tstamp,
    user_id,
    JSONExtractString(unstruct_event, 'data', 'data', 'productId') AS product_id,
    JSONExtractFloat(unstruct_event, 'data', 'data', 'price') AS price
FROM snowplow.events
WHERE event = 'unstruct'
  AND JSONExtractString(unstruct_event, 'data', 'schema') LIKE '%product_view%'
  AND collector_tstamp >= now() - INTERVAL 1 HOUR
ORDER BY collector_tstamp DESC
LIMIT 100;
```

## Session Analysis

Reconstruct user sessions using ClickHouse aggregation:

```sql
SELECT
    domain_userid,
    session_id,
    min(collector_tstamp) AS session_start,
    max(collector_tstamp) AS session_end,
    count() AS events,
    count(DISTINCT page_url) AS pages_viewed
FROM snowplow.events
WHERE toDate(collector_tstamp) = today()
GROUP BY domain_userid, session_id
ORDER BY events DESC
LIMIT 20;
```

## Summary

Snowplow with ClickHouse creates a fully self-hosted behavioral analytics pipeline where Snowplow validates and enriches events at collection time and ClickHouse provides fast SQL-based analysis with full data ownership and custom retention policies.
