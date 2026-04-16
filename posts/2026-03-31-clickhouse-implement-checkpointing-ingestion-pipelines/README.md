# How to Implement Checkpointing in ClickHouse Ingestion Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Checkpointing, Ingestion, Pipeline, Fault Tolerance, Recovery

Description: Learn how to implement checkpointing in ClickHouse ingestion pipelines for fault-tolerant, resumable data loads after failures.

---

Checkpointing records the progress of a data pipeline so it can resume from where it left off after a crash or restart. Without checkpointing, pipeline restarts cause duplicate inserts or data gaps.

## Why Checkpoints Matter

```text
Without checkpoints:
- Restart from scratch -> duplicates or missed data
- No visibility into pipeline progress
- Manual recovery required after failures
```

## Checkpoint Table in ClickHouse

Store pipeline state in a dedicated table:

```sql
CREATE TABLE pipeline_checkpoints (
    pipeline_name String,
    source_name String,
    last_offset String,
    last_processed_at DateTime DEFAULT now(),
    rows_processed UInt64
) ENGINE = ReplacingMergeTree(last_processed_at)
ORDER BY (pipeline_name, source_name);
```

Read and write checkpoints in your pipeline:

```sql
-- Read current checkpoint
SELECT last_offset, last_processed_at
FROM pipeline_checkpoints FINAL
WHERE pipeline_name = 'events-pipeline' AND source_name = 'kafka-events'
LIMIT 1;

-- Write checkpoint after successful batch
INSERT INTO pipeline_checkpoints VALUES
    ('events-pipeline', 'kafka-events', '1234567', now(), 50000);
```

## File-Based Ingestion with Offsets

For file ingestion, checkpoint the last processed file and byte offset:

```sql
CREATE TABLE file_ingestion_state (
    pipeline_name String,
    file_path String,
    byte_offset UInt64,
    rows_ingested UInt64,
    status Enum('in_progress', 'completed', 'failed'),
    updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (pipeline_name, file_path);
```

Mark files as completed after successful insert:

```sql
-- Mark file as completed
INSERT INTO file_ingestion_state VALUES
    ('log-pipeline', '/data/logs/2026-01-01.log', 0, 1000000, 'completed', now());

-- Skip already-completed files
SELECT DISTINCT _path AS file_path
FROM file('/data/logs/*.log', 'LineAsString')
WHERE _path NOT IN (
    SELECT file_path FROM file_ingestion_state FINAL
    WHERE pipeline_name = 'log-pipeline' AND status = 'completed'
);
```

## Kafka Offset Checkpointing

When using ClickHouse's Kafka engine, offsets are managed automatically. For custom consumers, store offsets in ClickHouse:

```sql
CREATE TABLE kafka_offsets (
    topic String,
    partition UInt32,
    consumer_group String,
    offset UInt64,
    committed_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(committed_at)
ORDER BY (topic, partition, consumer_group);
```

## Idempotent Ingestion with Checkpoints

Combine checkpoints with idempotent inserts to make restarts safe:

```sql
-- Only insert rows with timestamps after the last checkpoint
INSERT INTO events
SELECT *
FROM events_staging
WHERE timestamp > (
    SELECT coalesce(max(toDateTime(last_offset)), toDateTime('1970-01-01'))
    FROM pipeline_checkpoints FINAL
    WHERE pipeline_name = 'events-pipeline'
);
```

## Monitoring Pipeline Progress

```sql
SELECT
    pipeline_name,
    source_name,
    last_offset,
    rows_processed,
    dateDiff('second', last_processed_at, now()) AS seconds_since_checkpoint
FROM pipeline_checkpoints FINAL
ORDER BY seconds_since_checkpoint DESC;
```

## Summary

Implementing checkpointing in ClickHouse ingestion pipelines requires a dedicated state table using `ReplacingMergeTree` to track offsets and progress. By combining checkpoints with idempotent inserts, your pipelines can safely resume after failures without duplicating or missing data.
