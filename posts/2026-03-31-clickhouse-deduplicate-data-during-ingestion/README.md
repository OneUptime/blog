# How to Deduplicate Data During Ingestion into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Deduplication, Ingestion, ReplacingMergeTree, Data Quality, Pipeline

Description: Learn multiple strategies for deduplicating data during ingestion into ClickHouse, from native block deduplication to engine-level deduplication.

---

Duplicate records enter ClickHouse through retry logic, at-least-once delivery semantics, and ETL reruns. ClickHouse provides several layers of deduplication to handle this at ingestion time.

## Layer 1: Native Insert Block Deduplication

ClickHouse automatically deduplicates identical insert blocks using a checksum-based window:

```sql
-- If you insert the exact same block twice, ClickHouse ignores the second insert
-- This works for ReplicatedMergeTree and enabled by default
SET deduplicate_blocks_in_dependent_materialized_views = 1;
```

Check the deduplication window settings:

```sql
SELECT name, value
FROM system.merge_tree_settings
WHERE name IN (
    'replicated_deduplication_window',
    'replicated_deduplication_window_seconds',
    'non_replicated_deduplication_window'
);
```

For non-replicated tables, enable deduplication explicitly:

```sql
CREATE TABLE events (
    event_id String,
    timestamp DateTime,
    payload String
) ENGINE = MergeTree()
ORDER BY (event_id, timestamp)
SETTINGS non_replicated_deduplication_window = 100;
```

## Layer 2: Explicit Deduplication Token

Set a custom deduplication token for your inserts. Re-inserting with the same token is a no-op:

```sql
INSERT INTO events
SETTINGS insert_deduplication_token = 'pipeline-batch-2026-01-01-001'
SELECT event_id, timestamp, payload FROM events_staging;
```

This is ideal for batch pipelines that have natural batch IDs.

## Layer 3: ReplacingMergeTree

Use `ReplacingMergeTree` to keep only the latest row per primary key:

```sql
CREATE TABLE events (
    event_id String,
    timestamp DateTime,
    payload String,
    version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY event_id;
```

Merges happen asynchronously. Force deduplication at query time:

```sql
SELECT * FROM events FINAL;
-- Or optimize manually:
OPTIMIZE TABLE events FINAL;
```

## Layer 4: CollapsingMergeTree for Updates

For records that can be updated, use `CollapsingMergeTree`:

```sql
CREATE TABLE orders (
    order_id String,
    status String,
    amount Float64,
    sign Int8
) ENGINE = CollapsingMergeTree(sign)
ORDER BY order_id;

-- Insert original record
INSERT INTO orders VALUES ('ord-001', 'pending', 99.99, 1);

-- Cancel the old record and insert updated version
INSERT INTO orders VALUES ('ord-001', 'pending', 99.99, -1), ('ord-001', 'shipped', 99.99, 1);
```

## Layer 5: Pre-Deduplication in Staging

Before writing to the final table, deduplicate in a staging query:

```sql
INSERT INTO events
SELECT
    event_id,
    any(timestamp) AS timestamp,
    any(payload) AS payload
FROM events_staging
GROUP BY event_id;
```

Or using `argMax` to keep the latest version:

```sql
INSERT INTO events
SELECT
    event_id,
    argMax(timestamp, version) AS timestamp,
    argMax(payload, version) AS payload
FROM events_staging
GROUP BY event_id;
```

## Verifying Deduplication

```sql
SELECT
    event_id,
    count() AS cnt
FROM events
GROUP BY event_id
HAVING cnt > 1
ORDER BY cnt DESC
LIMIT 20;
```

## Summary

ClickHouse offers deduplication at multiple layers: native block checksums, explicit insert tokens, `ReplacingMergeTree`, `CollapsingMergeTree`, and staging-layer SQL deduplication. For most pipelines, combining `ReplacingMergeTree` with insert deduplication tokens provides both correctness and performance.
