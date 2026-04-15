# How to Optimize ClickHouse for Write Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Infrastructure, Database, Analytics

Description: Learn how to configure ClickHouse insert settings, background merge threads, and ingestion patterns to maximize sustainable write throughput for high-volume data pipelines.

## Introduction

ClickHouse is primarily an analytical database, but it also receives very high write volumes in many production deployments - millions of events per second from logging pipelines, metrics collectors, and event streams. Write throughput depends on how well you batch inserts, configure the MergeTree engine, tune background merge settings, and manage part creation rates. This guide covers every aspect of write optimization.

## How ClickHouse Handles Writes

When you execute `INSERT INTO`, ClickHouse writes each insert as a new immutable part on disk. Parts are later merged by background threads into larger parts. The key tension is:

- Too many small inserts create too many parts, causing "Too many parts" errors and degrading query performance.
- Too few large inserts add latency to the ingestion pipeline.

The ideal pattern is **large, batched inserts**: each insert should write at least 100,000 rows, and ideally 1-10 million rows.

## Batching Inserts

Never insert one row at a time. Always batch.

```sql
-- Bad: one row per INSERT (creates one part per row, overwhelms the merger)
INSERT INTO events VALUES ('e1', 'web', now());
INSERT INTO events VALUES ('e2', 'api', now());
-- ...thousands of times

-- Good: single INSERT with large batch
INSERT INTO events VALUES
    ('e1', 'web', now()),
    ('e2', 'api', now()),
    ('e3', 'worker', now());
    -- ... 100,000+ rows in one statement
```

From the ClickHouse HTTP API:

```bash
# Send a large batch via stdin (most efficient method)
cat events.tsv | clickhouse-client --query "INSERT INTO events FORMAT TabSeparated"

# Or via HTTP
curl -X POST "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow" \
     --data-binary @events.jsonl
```

## Choosing the Right INSERT Format

Binary formats are faster to parse than JSON:

```bash
# RowBinary: fastest for high-throughput inserts
clickhouse-client --query "INSERT INTO events FORMAT RowBinary" < events.bin

# Native format: zero-copy columnar, fastest possible
clickhouse-client --query "INSERT INTO events FORMAT Native" < events.native

# JSONEachRow: convenient but slower (JSON parsing overhead)
clickhouse-client --query "INSERT INTO events FORMAT JSONEachRow" < events.jsonl

# CSV: good balance of human-readability and speed
clickhouse-client --query "INSERT INTO events FORMAT CSV" < events.csv
```

## Configuring Background Merges

The background merge pool controls how quickly ClickHouse consolidates small parts into larger ones. Increase it on write-heavy servers.

```xml
<!-- /etc/clickhouse-server/config.d/write_tuning.xml -->
<clickhouse>
    <!-- Number of concurrent background merge/mutation threads -->
    <background_pool_size>32</background_pool_size>

    <!-- Allow merges to use more CPU when the pool is busy -->
    <background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>

    <!-- MergeTree table-level defaults -->
    <merge_tree>
        <!-- Maximum parts per partition before inserts are throttled -->
        <!-- Default is 150; increase to accommodate write bursts -->
        <parts_to_delay_insert>500</parts_to_delay_insert>
        <parts_to_throw_insert>1000</parts_to_throw_insert>

        <!-- Delay in seconds applied when too many parts exist (throttles new inserts) -->
        <max_delay_to_insert>5</max_delay_to_insert>
    </merge_tree>
</clickhouse>
```

## Insert Settings for Maximum Throughput

```sql
-- fsync after insert is disabled by default in MergeTree (fsync_after_insert = 0)
-- If enabled on your table, disable for throughput (table-level setting):
-- ALTER TABLE your_table MODIFY SETTING fsync_after_insert = 0;

-- Insert deduplication window: set to 0 to disable (reduces overhead)
-- Only disable if your pipeline handles deduplication externally
SET insert_deduplicate = 0;

-- Allow parallel parsing of insert data
SET input_format_parallel_parsing = 1;

-- Increase the block size for inserts (rows per block, default 1048576)
SET max_insert_block_size = 10000000;

-- Commit inserts asynchronously (requires async insert feature, see below)
SET async_insert = 1;
```

## Monitoring Write Throughput

```sql
-- Check how many parts exist per table (high part count = merge lag)
SELECT
    database,
    table,
    sum(active)                              AS active_parts,
    sum(rows)                                AS total_rows,
    formatReadableSize(sum(bytes_on_disk))   AS disk_size
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY active_parts DESC
LIMIT 10;

-- Check background merge activity
SELECT
    table,
    count()                AS active_merges,
    sum(rows_read)         AS total_rows_being_merged,
    avg(elapsed)           AS avg_merge_duration_sec
FROM system.merges
GROUP BY table
ORDER BY active_merges DESC;

-- Insert rate per minute
SELECT
    toStartOfMinute(event_time) AS minute,
    count()                     AS insert_queries,
    sum(written_rows)           AS rows_written
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Partitioning Strategy for High Write Volume

Too many partitions increase the number of open parts and background merge work. Choose a partition granularity that balances partition management with query filtering.

```sql
-- For high write volume, coarser partitioning = fewer parts to manage
-- Monthly partitioning (recommended for most high-volume tables)
CREATE TABLE events
(
    service    LowCardinality(String),
    level      LowCardinality(String),
    message    String,
    event_time DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, service);

-- Avoid daily partitioning for tables receiving millions of inserts per day
-- Daily partitioning can create 1000+ parts per day on high-volume tables
-- PARTITION BY toDate(event_time)  -- avoid for very high write rates
```

## Replication and Write Throughput

On replicated setups, inserts are written to the local replica and then replicated asynchronously by default (`insert_quorum = 0`). If your setup has enabled quorum writes for stronger consistency, you can relax these settings to improve throughput.

```sql
-- Disable quorum writes for maximum throughput (this is the default)
-- Inserts are acknowledged after writing to the local replica only
SET insert_quorum = 0;

-- Quorum timeout in ms (default: 600000 = 10 minutes)
-- Only relevant when insert_quorum > 0
SET insert_quorum_timeout = 600000;

-- Don't wait for ALTER operations to sync across replicas
SET replication_alter_partitions_sync = 0;
```

## Using a Distributed Table for Sharded Writes

On multi-shard setups, write to a `Distributed` table to fan out inserts across shards automatically.

```sql
-- Local MergeTree on each shard
CREATE TABLE events_local ON CLUSTER my_cluster
(
    service    LowCardinality(String),
    event_time DateTime,
    value      Float64
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, service);

-- Distributed table that fans out to all shards
CREATE TABLE events ON CLUSTER my_cluster
AS events_local
ENGINE = Distributed(my_cluster, default, events_local, rand());

-- Insert goes to the Distributed table; ClickHouse routes to shards
INSERT INTO events VALUES ('api', now(), 42.5);
```

## Summary

Maximum ClickHouse write throughput requires large batched inserts (100K-10M rows per INSERT), binary insert formats to minimize parse overhead, tuned background merge pool settings to keep part counts low, coarse partition granularity to reduce merge work, and asynchronous inserts when the source produces many small events. Monitor `system.parts` for part count and `system.merges` for merge lag - if active parts per partition exceed 300, either increase the merge pool size or reduce insert frequency by accumulating larger batches.
