# How to Use ClickHouse with Segment for Customer Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Segment, Customer Data, Analytics, Event Tracking

Description: Route Segment event data into ClickHouse for a SQL-queryable customer data store that enables cross-channel analytics beyond what Segment provides natively.

---

## Why Use ClickHouse as a Segment Destination

Segment collects events and routes them to destinations. Using ClickHouse as a destination gives you:

- A full SQL-queryable copy of all customer events
- Join capability with your existing business data
- Custom retention policies and data ownership
- Unlimited query flexibility beyond Segment's built-in analytics

## Routing Segment Data to ClickHouse

Segment does not natively support ClickHouse as a warehouse destination. To route Segment event data into ClickHouse, use one of these approaches:

- **Segment Webhook Destination**: Configure a webhook destination in Segment that sends events to a service you control, which then inserts them into ClickHouse.
- **Third-party connector**: Use a tool like Airbyte, Fivetran, or Vector to sync data from a Segment-supported warehouse (e.g., PostgreSQL or S3) into ClickHouse.

For the webhook approach:

1. Go to Destinations and add a **Webhook** destination
2. Point it at your ingestion service endpoint (e.g., `https://ingest.yourcompany.com/segment`)
3. Your service receives JSON payloads and inserts them into ClickHouse

Set up the ClickHouse side with a database and write user:

```sql
CREATE DATABASE IF NOT EXISTS segment;

CREATE USER segment_writer
    IDENTIFIED WITH sha256_password BY 'strong_password';

GRANT CREATE TABLE, INSERT, SELECT ON segment.* TO segment_writer;
```

Your ingestion service connects to ClickHouse using:

```text
Host: ch.internal
Port: 8443
Database: segment
Username: segment_writer
Password: <secret>
SSL: true
```

## Segment Schema in ClickHouse

Segment uses a convention of one table per event type with standard fields. Replicate this schema in ClickHouse by creating tables that mirror Segment's structure:

```sql
-- segment.order_completed
-- Contains standard Segment fields + your track properties
SELECT
    id,
    user_id,
    anonymous_id,
    received_at,
    sent_at,
    original_timestamp,
    -- Your custom properties
    order_id,
    revenue,
    currency,
    product_category
FROM segment.order_completed
LIMIT 5;
```

## Cross-Event Funnel Analysis

Combine multiple Segment event tables for funnel analysis:

```sql
SELECT
    step,
    count(DISTINCT user_id) AS users
FROM (
    SELECT user_id, 1 AS step FROM segment.product_viewed WHERE received_at >= today() - 7
    UNION ALL
    SELECT user_id, 2 AS step FROM segment.checkout_started WHERE received_at >= today() - 7
    UNION ALL
    SELECT user_id, 3 AS step FROM segment.order_completed WHERE received_at >= today() - 7
) t
GROUP BY step
ORDER BY step;
```

## Joining Segment Events with Your Database

Enrich Segment data with your internal user records:

```sql
SELECT
    oc.user_id,
    u.plan_type,
    u.company_size,
    count() AS orders,
    sum(oc.revenue) AS total_revenue
FROM segment.order_completed oc
JOIN your_db.users u ON u.user_id = oc.user_id
WHERE oc.received_at >= today() - 30
GROUP BY oc.user_id, u.plan_type, u.company_size
ORDER BY total_revenue DESC
LIMIT 20;
```

## Replay and Backfill

Segment supports replaying historical data to destinations, but this feature is limited to Business Tier plans and requires contacting Segment support. Since ClickHouse is not a native Segment destination, replay would target your webhook endpoint or an intermediate warehouse. You can also backfill ClickHouse by exporting historical data from a Segment-connected warehouse:

```bash
# Option 1: Export from a Segment-connected warehouse (e.g., PostgreSQL)
# and bulk-insert into ClickHouse using clickhouse-client
clickhouse-client --host ch.internal --port 9440 --secure \
    --query "INSERT INTO segment.order_completed FORMAT CSVWithNames" < exported_events.csv
```

## Handling Schema Evolution

Segment events evolve as your product changes. When new properties appear in Segment events, you need to add corresponding columns to your ClickHouse tables. You can do this manually:

```sql
ALTER TABLE segment.order_completed
    ADD COLUMN IF NOT EXISTS discount_code String;
```

## Summary

Using ClickHouse as a Segment destination creates a versioned, SQL-queryable copy of all customer event data that can be joined with internal systems, enabling analytics and segmentation capabilities far beyond what Segment's built-in tools provide.
