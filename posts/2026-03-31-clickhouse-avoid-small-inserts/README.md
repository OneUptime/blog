# Why You Should Avoid Small Inserts in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, INSERT Performance, MergeTree, Best Practice, Batch Insert

Description: Explains why frequent small inserts harm ClickHouse performance and how to batch data correctly to keep part counts under control.

---

## How ClickHouse Handles Inserts

Every `INSERT` into a MergeTree table creates a new data part on disk. ClickHouse later merges these parts in the background. If inserts are too frequent or too small, the number of active parts grows faster than background merges can reduce it, causing the dreaded "too many parts" error and degraded query performance.

## The Problem in Practice

```bash
# Simulating row-by-row inserts - NEVER do this in production
for i in $(seq 1 10000); do
  clickhouse-client --query "INSERT INTO events VALUES ($i, 'click', now())"
done
```

After 10,000 single-row inserts, you could have 10,000 parts. The default `parts_to_throw_insert` limit is 3,000 active parts per partition (reduced to 300 in ClickHouse versions before 23.6); ClickHouse also starts delaying inserts when a partition reaches `parts_to_delay_insert` (default 1,000).

## Check Current Part Count

```sql
SELECT
  table,
  partition,
  count() AS part_count,
  sum(rows) AS total_rows
FROM system.parts
WHERE active = 1
  AND database = 'analytics'
GROUP BY table, partition
ORDER BY part_count DESC
LIMIT 20;
```

## The Correct Pattern: Batch Inserts

Insert at least 1,000 rows per statement, ideally 10,000 to 1,000,000 rows.

```sql
-- Good: insert a batch
INSERT INTO events (event_id, event_type, user_id, event_time)
VALUES
  (1, 'click', 101, '2026-03-31 10:00:00'),
  (2, 'view',  102, '2026-03-31 10:00:01'),
  -- ... thousands more rows
  (100000, 'purchase', 999, '2026-03-31 10:05:00');
```

## Using a Buffer Table

For high-frequency single-event writes, use a Buffer engine table that accumulates rows and flushes to the target table in batches.

```sql
CREATE TABLE events_buffer AS events
ENGINE = Buffer(
  analytics,   -- target database
  events,      -- target table
  16,          -- num_layers
  10,          -- min_time (seconds)
  100,         -- max_time (seconds)
  10000,       -- min_rows
  1000000,     -- max_rows
  10000000,    -- min_bytes
  100000000    -- max_bytes
);

-- Application writes to events_buffer, ClickHouse flushes to events
INSERT INTO events_buffer VALUES (...);
```

## Using Kafka or a Message Queue

A common production pattern is to write events to Kafka and use a Kafka engine table to consume them in batches into ClickHouse:

```sql
CREATE TABLE events_kafka (
  event_id   UInt64,
  event_type String,
  user_id    UInt32,
  event_time DateTime
) ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list  = 'events',
  kafka_group_name  = 'clickhouse',
  kafka_format      = 'JSONEachRow';
```

## Summary

Small inserts create too many parts, slow down queries, and can trigger throttling. Always batch inserts to at least thousands of rows per statement. For real-time ingestion, use a Buffer table or Kafka engine to aggregate rows before they hit the MergeTree table. Monitor `system.parts` regularly to catch part count growth early.
