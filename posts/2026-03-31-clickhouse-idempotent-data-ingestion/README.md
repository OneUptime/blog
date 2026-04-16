# How to Implement Idempotent Data Ingestion in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Idempotency, Data Ingestion, Deduplication, Reliability

Description: Learn how to implement idempotent data ingestion in ClickHouse so that reprocessing or retrying inserts does not produce duplicate data.

---

## Why Idempotent Ingestion Matters

Distributed ingestion pipelines fail and retry. Without idempotent inserts, retries create duplicate rows. ClickHouse provides several mechanisms to achieve exactly-once semantics at the storage layer.

## Block-Level Deduplication

ClickHouse's `ReplicatedMergeTree` supports automatic block deduplication. Each inserted block is identified by a hash of its content. Inserting the same block twice results in only one copy:

```sql
CREATE TABLE events
(
    event_id    UUID,
    event_time  DateTime,
    user_id     UInt64,
    value       Float64
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_id);
```

The deduplication window is controlled by `replicated_deduplication_window` (default: 10000 blocks) and `replicated_deduplication_window_seconds` (default: one hour).

## Using insert_deduplication_token

Assign a stable token per logical batch to guarantee deduplication even if block content changes:

```sql
INSERT INTO events
SETTINGS insert_deduplication_token = 'batch-2026-03-31-001'
VALUES (...);
```

The same token on a retry skips the insert entirely.

## ReplacingMergeTree for Row-Level Idempotency

For row-level deduplication based on a business key, use `ReplacingMergeTree`:

```sql
CREATE TABLE events
(
    event_id    UUID,
    event_time  DateTime,
    user_id     UInt64,
    value       Float64,
    version     UInt64
)
ENGINE = ReplacingMergeTree(version)
ORDER BY event_id;
```

Inserting the same `event_id` twice keeps the row with the highest `version`. Query with `FINAL` to deduplicate:

```sql
SELECT * FROM events FINAL
WHERE event_time >= today();
```

## Staging Table Pattern

Use a staging table to validate and deduplicate before committing to production:

```sql
CREATE TABLE events_staging AS events
ENGINE = MergeTree()
ORDER BY event_id;

-- Insert raw batch
INSERT INTO events_staging SELECT * FROM input_batch;

-- Insert deduplicated rows to production
INSERT INTO events
SELECT * FROM events_staging
WHERE event_id NOT IN (
    SELECT event_id FROM events
    WHERE event_time >= today() - 1
);

-- Truncate staging
TRUNCATE TABLE events_staging;
```

## Kafka Offset Management

When consuming from Kafka, commit offsets only after confirming successful ClickHouse inserts:

```python
def consume_and_insert(consumer, client):
    messages = consumer.poll(timeout_ms=1000)
    rows = [parse(m) for m in messages]
    client.execute("INSERT INTO events VALUES", rows)
    consumer.commit()  # Only commit after successful insert
```

## Summary

Idempotent ingestion in ClickHouse uses block-level deduplication in `ReplicatedMergeTree`, stable `insert_deduplication_token` values per batch, and `ReplacingMergeTree` for row-level upsert semantics. Staging table patterns add an extra deduplication layer for complex pipelines. Combined, these ensure retries never create duplicate data.
