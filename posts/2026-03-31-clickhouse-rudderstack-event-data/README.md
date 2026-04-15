# How to Use ClickHouse with Rudderstack for Event Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, RudderStack, Event Tracking, Customer Data Platform, Analytics

Description: Use RudderStack to collect and route event data from your web and mobile apps into ClickHouse for real-time product analytics.

---

## Why RudderStack and ClickHouse

RudderStack is an open-source Customer Data Platform (CDP) that collects events from SDKs and APIs and routes them to destinations. ClickHouse as the destination gives you a SQL-queryable analytical store for all your product events - without Segment's per-event pricing.

## Architecture

```text
Web/Mobile Apps --> RudderStack SDK --> RudderStack Server --> ClickHouse Destination
                                                           --> Other Destinations (Amplitude, etc.)
```

## Setting Up RudderStack with ClickHouse

In RudderStack, add a ClickHouse destination:

1. Go to Destinations and add ClickHouse
2. Configure connection settings:

```text
Host: ch.internal
Port: 9000
Database: rudder
User: rudder_writer
Password: <secret>
```

RudderStack automatically creates tables per event type in the configured database.

## How RudderStack Structures ClickHouse Tables

RudderStack creates tables following its standard schema. For a `page` event:

```sql
-- Auto-created by RudderStack
CREATE TABLE rudder.pages (
    id                 Nullable(String),
    anonymous_id       Nullable(String),
    user_id            Nullable(String),
    sent_at            Nullable(DateTime),
    received_at        Nullable(DateTime),
    original_timestamp Nullable(DateTime),
    timestamp          Nullable(DateTime),
    channel            Nullable(String),
    context_page_url   Nullable(String),
    context_page_title Nullable(String),
    name               Nullable(String),
    context_ip         Nullable(String),
    context_user_agent Nullable(String),
    context_source_id  Nullable(String),
    uuid_ts            Nullable(DateTime)
) ENGINE = ReplacingMergeTree
PARTITION BY toDate(received_at)
ORDER BY (received_at, id);
```

## Custom Track Events

Track a custom event from your app:

```javascript
rudderanalytics.track("Purchase Completed", {
  order_id: "abc123",
  revenue: 49.99,
  currency: "USD",
  product_name: "Pro Plan"
});
```

RudderStack creates a `purchase_completed` table with these properties as columns.

## Querying Event Data in ClickHouse

Funnel analysis across events:

```sql
WITH
    signups AS (
        SELECT user_id, min(sent_at) AS signup_time
        FROM rudder.identifies
        WHERE sent_at >= today() - 30
        GROUP BY user_id
    ),
    purchases AS (
        SELECT user_id, min(sent_at) AS purchase_time
        FROM rudder.purchase_completed
        WHERE sent_at >= today() - 30
        GROUP BY user_id
    )
SELECT
    count(DISTINCT s.user_id) AS signups,
    count(DISTINCT p.user_id) AS purchasers,
    round(count(DISTINCT p.user_id) / count(DISTINCT s.user_id) * 100, 2) AS conversion_pct
FROM signups s
LEFT JOIN purchases p ON p.user_id = s.user_id
  AND p.purchase_time >= s.signup_time
  AND p.purchase_time <= s.signup_time + INTERVAL 7 DAY;
```

## User Journey Analysis

Reconstruct session paths using ClickHouse aggregate functions:

```sql
SELECT
    user_id,
    groupArray(name) AS page_sequence
FROM rudder.pages
WHERE sent_at >= today() - 7
GROUP BY user_id
HAVING length(page_sequence) >= 3
LIMIT 50;
```

## Summary

RudderStack with ClickHouse provides an open-source, self-hostable alternative to Segment + a SaaS analytics warehouse, giving you full control over event collection, routing, and analysis at any scale without per-event fees.
