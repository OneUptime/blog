# How to Track Cross-Device Ad Attribution in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cross-Device Attribution, Ad Tech, Identity Graph, User Journey

Description: Implement cross-device ad attribution in ClickHouse by linking user identities across devices to unify the customer journey.

---

Users interact with ads on multiple devices before converting. Cross-device attribution requires linking device-level events to a unified user identity, then attributing conversions across that identity graph. ClickHouse handles both the identity mapping and the attribution logic efficiently.

## Identity Graph Table

```sql
CREATE TABLE identity_graph (
    canonical_user_id   UInt64,
    device_id           String,
    device_type         LowCardinality(String),
    first_seen          DateTime,
    last_seen           DateTime,
    confidence_score    Float32,
    date                Date DEFAULT toDate(first_seen)
) ENGINE = ReplacingMergeTree(last_seen)
ORDER BY (canonical_user_id, device_id);
```

## Device-Level Touchpoints

```sql
CREATE TABLE device_touchpoints (
    event_time      DateTime,
    device_id       String,
    campaign_id     UInt32,
    channel         LowCardinality(String),
    event_type      LowCardinality(String),
    date            Date DEFAULT toDate(event_time)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (device_id, event_time);
```

## Joining Device Events to Unified Users

```sql
SELECT
    ig.canonical_user_id,
    dt.device_id,
    dt.device_type,
    dt.campaign_id,
    dt.channel,
    dt.event_time
FROM device_touchpoints AS dt
JOIN identity_graph AS ig ON dt.device_id = ig.device_id
WHERE dt.date >= today() - 7;
```

## Cross-Device Attribution

Attribute conversions that happened on one device to touchpoints on other devices via the canonical user ID:

```sql
SELECT
    tp.campaign_id,
    tp.channel,
    count(DISTINCT c.order_id) AS attributed_conversions,
    sum(c.revenue) AS attributed_revenue
FROM conversions AS c
JOIN identity_graph AS ig_c ON c.device_id = ig_c.device_id
JOIN identity_graph AS ig_tp ON ig_c.canonical_user_id = ig_tp.canonical_user_id
JOIN device_touchpoints AS tp
    ON tp.device_id = ig_tp.device_id
    AND tp.event_time BETWEEN c.convert_time - INTERVAL 7 DAY AND c.convert_time
GROUP BY tp.campaign_id, tp.channel
ORDER BY attributed_revenue DESC;
```

## Cross-Device Journey Analysis

Understand how users switch devices along the path to conversion:

```sql
SELECT
    first_device,
    convert_device,
    count() AS journeys
FROM (
    SELECT
        c.order_id,
        argMin(dt.device_type, dt.event_time) AS first_device,
        c.device_type AS convert_device
    FROM conversions AS c
    JOIN identity_graph AS ig_c ON c.device_id = ig_c.device_id
    JOIN identity_graph AS ig_dt ON ig_c.canonical_user_id = ig_dt.canonical_user_id
    JOIN device_touchpoints AS dt ON dt.device_id = ig_dt.device_id
    WHERE dt.event_time <= c.convert_time
    GROUP BY c.order_id, c.device_type
)
GROUP BY first_device, convert_device
ORDER BY journeys DESC;
```

## Cross-Device Reach

Measure unique user reach across all devices for a campaign:

```sql
SELECT
    dt.campaign_id,
    uniq(ig.canonical_user_id) AS unique_users,
    uniq(dt.device_id) AS unique_devices,
    round(uniq(dt.device_id) / uniq(ig.canonical_user_id), 2) AS avg_devices_per_user
FROM device_touchpoints AS dt
JOIN identity_graph AS ig ON dt.device_id = ig.device_id
WHERE dt.date = today()
GROUP BY dt.campaign_id
ORDER BY unique_users DESC;
```

## Summary

Cross-device attribution in ClickHouse relies on an identity graph that maps device IDs to canonical user IDs. By joining this graph with device-level touchpoints and conversions, you can collapse multi-device journeys into unified user paths and attribute revenue accurately across channels.
