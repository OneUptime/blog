# How to Optimize ClickHouse Cross-Region Query Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Optimization, Multi-Region, Performance, Distributed Query

Description: Reduce latency for ClickHouse distributed queries spanning multiple cloud regions by tuning data locality, query routing, and partition pruning.

---

Cross-region queries suffer from network latency that can dominate query time. The goal is to minimize data movement: route queries to the region where the data lives and avoid cross-region shuffles.

## Understand Where Time Is Spent

```sql
-- Check query duration breakdown
SELECT
    query_id,
    query_duration_ms,
    read_rows,
    read_bytes,
    ProfileEvents['NetworkReceiveBytes'] AS network_receive_bytes
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_duration_ms > 1000
ORDER BY query_duration_ms DESC
LIMIT 20;
```

High `network_receive_bytes` relative to `read_bytes` signals cross-region data movement.

## Partition by Region

Store region-specific data in region-specific partitions and route queries to local replicas:

```sql
CREATE TABLE events
(
    id     UInt64,
    region LowCardinality(String),
    data   String,
    ts     DateTime
)
ENGINE = ReplicatedMergeTree(...)
PARTITION BY (region, toYYYYMM(ts))
ORDER BY (id, ts);
```

```sql
-- Query runs partition pruning - only touches eu-west partitions
SELECT count() FROM events
WHERE region = 'eu-west' AND ts >= '2025-01-01';
```

## Prefer Local Replicas

In `distributed_ddl` or cluster config, set `load_balancing = 'nearest_hostname'` to prefer replicas in the same region:

```xml
<load_balancing>nearest_hostname</load_balancing>
```

## Avoid SELECT * Across Regions

Return only necessary columns. Cross-region bandwidth is expensive:

```sql
-- Bad: pulls all columns across network
SELECT * FROM dist_events WHERE region = 'us-east';

-- Good: minimal columns
SELECT id, ts FROM dist_events WHERE region = 'us-east';
```

## Use Materialized Views for Cross-Region Aggregations

Pre-aggregate on each region's local nodes and replicate the aggregation table instead of raw data:

```sql
CREATE MATERIALIZED VIEW events_hourly_mv
ENGINE = SummingMergeTree()
ORDER BY (region, hour)
AS
SELECT region, toStartOfHour(ts) AS hour, count() AS events
FROM events
GROUP BY region, hour;
```

## Monitoring Latency

Use [OneUptime](https://oneuptime.com) to track p95 query latency per region. Alert when a region's p95 exceeds the baseline by more than 2x, which may indicate a network issue or a cross-region query slipping through.

## Summary

Cross-region query optimization in ClickHouse focuses on partition pruning, local replica preference, minimal column selection, and pre-aggregation. These techniques reduce network data transfer, which is the dominant cost in geographically distributed setups.
