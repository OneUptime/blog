# How to Handle Late-Arriving Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Late Data, Streaming, Data Ingestion, Time-Series

Description: Learn strategies for handling late-arriving data in ClickHouse, including ReplacingMergeTree, deduplication, and partition-aware ingestion patterns.

---

## The Late Data Problem

In real-time analytics pipelines, events often arrive after their event time due to network delays, retries, or offline clients syncing. ClickHouse ingests data in immutable parts, so handling late data requires deliberate design.

## Using ReplacingMergeTree

For event streams where the latest version of a record should win, use `ReplacingMergeTree` with a version column:

```sql
CREATE TABLE user_events
(
    event_id    UUID,
    user_id     UInt64,
    event_time  DateTime,
    value       Float64,
    updated_at  DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_id);
```

Late arrivals with newer `updated_at` values will replace earlier versions after merges.

## Querying with FINAL

Until background merges complete, use `FINAL` to deduplicate at query time:

```sql
SELECT user_id, sum(value)
FROM user_events FINAL
WHERE event_time >= today() - 7
GROUP BY user_id;
```

`FINAL` has a performance cost so combine it with tight `WHERE` filters.

## Buffered Ingestion Windows

Design your ingestion pipeline to accept events within a grace window. For example, allow events up to 2 hours late:

```bash
# Kafka consumer offset reset example
kafka-consumer-groups.sh \
  --bootstrap-server kafka:9092 \
  --group clickhouse-sink \
  --reset-offsets --to-datetime 2026-03-31T00:00:00.000 \
  --execute --topic events
```

## Partition-Based Reprocessing

If late data lands in the wrong partition, use a drop-and-replace approach. First prepare corrected data in a staging table with the same structure, then swap the partition:

```sql
-- Drop the stale partition
ALTER TABLE user_events DROP PARTITION '202603';

-- Move the corrected partition from staging
ALTER TABLE user_events ATTACH PARTITION '202603'
FROM user_events_staging;
```

## Using CollapsingMergeTree

For scenarios where you need to cancel old records and insert new ones, `CollapsingMergeTree` provides a sign-based approach:

```sql
CREATE TABLE orders
(
    order_id    UInt64,
    amount      Float64,
    sign        Int8
)
ENGINE = CollapsingMergeTree(sign)
ORDER BY order_id;

-- Cancel old record
INSERT INTO orders VALUES (123, 99.99, -1);
-- Insert corrected record
INSERT INTO orders VALUES (123, 109.99, 1);
```

## Summary

Handling late-arriving data in ClickHouse requires choosing the right table engine (ReplacingMergeTree or CollapsingMergeTree), using `FINAL` for real-time correctness, and designing ingestion pipelines with configurable grace windows. Partition-level reprocessing gives you a clean mechanism for bulk corrections without full table rewrites.
