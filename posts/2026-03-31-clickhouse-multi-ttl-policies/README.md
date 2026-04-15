# How to Set Up Multi-TTL Policies in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TTL, Data Lifecycle, MergeTree, Storage Management

Description: Learn how to define multiple TTL rules on a single ClickHouse table to implement tiered data retention and automated storage management.

---

## What Are Multi-TTL Policies?

ClickHouse allows you to define multiple TTL (Time To Live) rules on a single table. These rules can move data between storage volumes, recompress data, or delete it based on different time thresholds - all automatically managed by the MergeTree engine.

## Basic Multi-TTL Table

```sql
CREATE TABLE metrics (
    timestamp   DateTime,
    host        LowCardinality(String),
    metric_name LowCardinality(String),
    value       Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (metric_name, host, timestamp)
TTL
    timestamp + INTERVAL 7  DAY TO VOLUME 'warm',
    timestamp + INTERVAL 30 DAY TO VOLUME 'cold',
    timestamp + INTERVAL 90 DAY DELETE;
```

This configuration:
1. Moves data to "warm" storage after 7 days
2. Moves data to "cold" storage after 30 days
3. Deletes data after 90 days

## Combining Volume Moves with Recompression

```sql
CREATE TABLE http_logs (
    timestamp   DateTime,
    service     String,
    payload     String,
    status_code UInt16
) ENGINE = MergeTree()
ORDER BY (timestamp, service)
TTL
    timestamp + INTERVAL 7  DAY TO VOLUME 'warm',
    timestamp + INTERVAL 30 DAY RECOMPRESS CODEC(ZSTD(3)) TO VOLUME 'cold',
    timestamp + INTERVAL 365 DAY DELETE;
```

The RECOMPRESS directive applies heavier compression when data is moved to cold storage, reducing storage costs further.

## Adding Multi-TTL to an Existing Table

```sql
ALTER TABLE http_logs
MODIFY TTL
    timestamp + INTERVAL 30  DAY TO VOLUME 'warm',
    timestamp + INTERVAL 90  DAY TO VOLUME 'cold',
    timestamp + INTERVAL 365 DAY DELETE;
```

## Row-Level TTL (Different Retention per Category)

Apply different retention rules to different data categories in the same table:

```sql
CREATE TABLE events (
    timestamp   DateTime,
    event_type  LowCardinality(String),
    payload     String
) ENGINE = MergeTree()
ORDER BY (event_type, timestamp)
TTL
    timestamp + INTERVAL 30 DAY DELETE WHERE event_type = 'debug',
    timestamp + INTERVAL 90 DAY DELETE WHERE event_type NOT IN ('purchase', 'signup'),
    timestamp + INTERVAL 365 DAY DELETE;
```

## Monitoring TTL Execution

```sql
SELECT
    database,
    table,
    merge_reason,
    part_name,
    event_time
FROM system.part_log
WHERE merge_reason LIKE 'TTL%'
ORDER BY event_time DESC
LIMIT 20;
```

Check merge activity triggered by TTL:

```sql
SELECT
    table,
    merge_reason,
    count() AS merges
FROM system.part_log
WHERE (merge_reason = 'TTLDeleteMerge' OR merge_reason = 'TTLRecompressMerge')
  AND event_date = today()
GROUP BY table, merge_reason;
```

## Forcing TTL Evaluation

TTL is enforced during background merges. Force evaluation immediately:

```sql
OPTIMIZE TABLE metrics FINAL;
```

Or trigger a TTL-focused optimization:

```sql
ALTER TABLE metrics MATERIALIZE TTL;
```

## Summary

Multi-TTL policies in ClickHouse enable sophisticated data lifecycle management in a single table definition. Combine volume moves, recompression, and row-level TTL rules to automatically tier data from fast to cold storage and delete it when retention periods expire - all without manual intervention or external scripts.
