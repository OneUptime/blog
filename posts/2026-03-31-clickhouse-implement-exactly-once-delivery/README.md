# How to Implement Exactly-Once Delivery into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Exactly-Once, Deduplication, Ingestion, ReplacingMergeTree, Data Pipeline

Description: Learn how to implement exactly-once delivery semantics when ingesting data into ClickHouse using deduplication strategies and ReplacingMergeTree.

---

Exactly-once delivery ensures that each record is processed and stored exactly one time, even when producers retry on failure. ClickHouse provides several mechanisms to achieve this without external coordination systems.

## The Challenge

Most message queues and streaming systems offer at-least-once delivery by default. This means retries can produce duplicate records in ClickHouse. Without deduplication, your analytics will be skewed.

## Strategy 1: ReplacingMergeTree

`ReplacingMergeTree` keeps only the latest version of a row with a given sorting key (the `ORDER BY` columns). It deduplicates asynchronously during merges.

```sql
CREATE TABLE events (
    event_id String,
    user_id UInt64,
    event_type String,
    payload String,
    created_at DateTime,
    version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY event_id;
```

Insert duplicates freely - the engine keeps the row with the highest `version`:

```sql
INSERT INTO events VALUES ('evt-001', 42, 'click', '{}', now(), 1);
INSERT INTO events VALUES ('evt-001', 42, 'click', '{}', now(), 2);
```

Query with FINAL to force deduplication at read time:

```sql
SELECT * FROM events FINAL WHERE event_id = 'evt-001';
```

## Strategy 2: Idempotent Inserts with insert_deduplication_token

ClickHouse supports native insert deduplication. For `ReplicatedMergeTree` tables, if you insert the same block with the same checksum within `replicated_deduplication_window` inserts, it is deduplicated automatically. For non-replicated `MergeTree` tables, this behavior is disabled by default and controlled by the `non_replicated_deduplication_window` table setting (defaults to `0`).

You can also set an explicit deduplication token:

```sql
INSERT INTO events SETTINGS insert_deduplication_token = 'my-batch-id-001'
VALUES ('evt-002', 43, 'view', '{}', now(), 1);
```

Re-inserting with the same token is a no-op.

## Strategy 3: Using a Staging Table with a Materialized View

For streaming pipelines, use a two-table pattern where a `ReplacingMergeTree` destination collapses duplicates on merge:

```sql
-- Staging table receives all inserts
CREATE TABLE events_raw (
    event_id String,
    created_at DateTime,
    payload String
) ENGINE = MergeTree()
ORDER BY (event_id, created_at);

-- Destination table deduplicates by event_id
CREATE TABLE events_deduped (
    event_id String,
    payload String,
    created_at DateTime
) ENGINE = ReplacingMergeTree(created_at)
ORDER BY event_id;

-- Materialized view routes rows from staging to the deduped table
CREATE MATERIALIZED VIEW events_deduped_mv
TO events_deduped
AS
SELECT
    event_id,
    payload,
    created_at
FROM events_raw;
```

## Strategy 4: Block-Level Deduplication with ReplicatedMergeTree

In replicated setups, ClickHouse automatically deduplicates blocks using checksums:

```sql
CREATE TABLE events ON CLUSTER my_cluster (
    event_id String,
    payload String,
    created_at DateTime
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
ORDER BY event_id;
```

`replicated_deduplication_window` is a MergeTree table-level setting (not a session-level setting). Configure it when creating the table, via `ALTER TABLE`, or in the `<merge_tree>` section of `config.xml`:

```sql
ALTER TABLE events MODIFY SETTING replicated_deduplication_window = 100;
```

## Choosing the Right Strategy

```text
Use case                          | Strategy
----------------------------------|---------------------------
Low-volume, simple retry          | insert_deduplication_token
High-volume streaming             | ReplacingMergeTree + FINAL
Replicated cluster                | ReplicatedMergeTree dedup
ETL with transformation           | Staging + Materialized View
```

## Summary

ClickHouse offers multiple approaches to exactly-once delivery, from native block deduplication to `ReplacingMergeTree` engine semantics. Choosing the right strategy depends on your throughput, latency requirements, and whether you are operating a single-node or replicated cluster.
