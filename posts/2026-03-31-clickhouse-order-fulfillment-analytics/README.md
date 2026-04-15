# How to Build Order Fulfillment Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Order Fulfillment, E-Commerce, Analytics, SLA, Logistics

Description: Build order fulfillment analytics in ClickHouse to track fulfillment SLAs, pick-pack times, warehouse efficiency, and order accuracy rates.

---

Order fulfillment analytics measures how efficiently orders move from placement to shipment. ClickHouse aggregates fulfillment events to surface bottlenecks, SLA breaches, and warehouse performance metrics.

## Order Fulfillment Events Table

```sql
CREATE TABLE fulfillment_events (
    event_id     UUID,
    order_id     String,
    warehouse_id LowCardinality(String),
    event_type   LowCardinality(String),  -- placed, allocated, picked, packed, labeled, shipped
    operator_id  String,
    notes        String,
    event_at     DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_at)
ORDER BY (order_id, event_at);
```

## Order Cycle Time by Warehouse

Measure time from order placement to shipment:

```sql
SELECT
    warehouse_id,
    count() AS orders,
    avg(dateDiff('minute', placed_at, shipped_at)) AS avg_cycle_minutes,
    quantile(0.9)(dateDiff('minute', placed_at, shipped_at)) AS p90_cycle_minutes,
    countIf(dateDiff('hour', placed_at, shipped_at) > 24) AS sla_breaches
FROM (
    SELECT
        order_id,
        warehouse_id,
        minIf(event_at, event_type = 'placed') AS placed_at,
        minIf(event_at, event_type = 'shipped') AS shipped_at
    FROM fulfillment_events
    WHERE event_at >= today() - 30
    GROUP BY order_id, warehouse_id
    HAVING placed_at > 0 AND shipped_at > 0
)
GROUP BY warehouse_id
ORDER BY avg_cycle_minutes DESC;
```

## Pick-Pack Efficiency

Measure how fast operators complete picks and packs:

```sql
SELECT
    operator_id,
    event_type,
    count() AS events_completed,
    avg(seconds_since_prev) AS avg_seconds_per_event
FROM (
    SELECT
        operator_id,
        event_type,
        dateDiff('second',
            lagInFrame(event_at) OVER (PARTITION BY operator_id ORDER BY event_at),
            event_at) AS seconds_since_prev,
        row_number() OVER (PARTITION BY operator_id ORDER BY event_at) AS rn
    FROM fulfillment_events
    WHERE event_at >= today() - 7
      AND event_type IN ('picked', 'packed')
)
WHERE rn > 1
GROUP BY operator_id, event_type
ORDER BY events_completed DESC;
```

## SLA Breach Rate Over Time

Track daily SLA breach trend:

```sql
SELECT
    toDate(placed_at) AS order_date,
    count() AS total_orders,
    countIf(dateDiff('hour', placed_at, shipped_at) > 24) AS sla_breaches,
    round(countIf(dateDiff('hour', placed_at, shipped_at) > 24) / count() * 100, 2) AS breach_rate_pct
FROM (
    SELECT
        order_id,
        minIf(event_at, event_type = 'placed') AS placed_at,
        minIf(event_at, event_type = 'shipped') AS shipped_at
    FROM fulfillment_events
    WHERE event_at >= today() - 30
    GROUP BY order_id
    HAVING placed_at > 0 AND shipped_at > 0
)
GROUP BY order_date
ORDER BY order_date;
```

## Order Backlog (Stuck Orders)

Identify orders that have been allocated but not shipped after 12 hours:

```sql
SELECT
    f.order_id,
    f.warehouse_id,
    max(f.event_at) AS last_event,
    argMax(f.event_type, f.event_at) AS current_status,
    dateDiff('hour', max(f.event_at), now()) AS hours_in_status
FROM fulfillment_events f
WHERE f.event_at >= today() - 2
GROUP BY f.order_id, f.warehouse_id
HAVING current_status != 'shipped'
   AND hours_in_status > 12
ORDER BY hours_in_status DESC;
```

## Summary

ClickHouse provides a solid analytical foundation for order fulfillment operations - measuring cycle times, identifying SLA breaches, benchmarking operator efficiency, and surfacing stuck orders. These metrics drive continuous improvement in warehouse operations and customer experience.
