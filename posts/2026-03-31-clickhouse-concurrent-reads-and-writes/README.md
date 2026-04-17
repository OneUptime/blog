# How to Handle Concurrent Reads and Writes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Concurrency, MergeTree, Insert, SELECT, Performance

Description: Learn how ClickHouse handles concurrent reads and writes using its append-only MergeTree model and how to configure it for high-throughput workloads.

---

ClickHouse is designed for high-throughput concurrent workloads: multiple clients can read and write simultaneously without blocking each other. Understanding the underlying concurrency model is essential for building reliable, high-performance pipelines.

## How ClickHouse Handles Concurrency

ClickHouse uses an append-only write model. INSERTs create new data parts on disk while existing parts are untouched. SELECT queries read the current set of visible parts. This means:

- Reads never block writes
- Writes never block reads
- Multiple concurrent INSERTs can run simultaneously (each creating separate parts)

## Concurrent INSERTs

Multiple clients can insert data simultaneously without locks:

```sql
-- Client 1
INSERT INTO events (user_id, event_type, timestamp)
SELECT number, 'click', now() FROM numbers(100000);

-- Client 2 (simultaneously)
INSERT INTO events (user_id, event_type, timestamp)
SELECT number + 100000, 'view', now() FROM numbers(100000);
```

Both inserts proceed in parallel, each creating a separate data part.

## Controlling INSERT Concurrency

Avoid creating too many small parts (which causes merge pressure):

```sql
-- Limit concurrent inserts to avoid too many small parts
-- In config.xml:
-- <max_concurrent_queries>100</max_concurrent_queries>
-- <merge_tree>
--   <max_parts_in_total>100000</max_parts_in_total>
-- </merge_tree>
```

Use INSERT batching to reduce part count:

```sql
-- Batch inserts every 1-5 seconds rather than row-by-row
-- Target: 10MB-1GB per INSERT block
```

## Concurrent SELECT Queries

ClickHouse uses MVCC-like semantics for reads - each SELECT sees a consistent snapshot of parts at query start:

```sql
-- These run concurrently without blocking each other
SELECT count() FROM events WHERE timestamp >= today();
SELECT avg(response_time_ms) FROM http_logs WHERE status = 500;
SELECT uniq(user_id) FROM events WHERE event_type = 'purchase';
```

## INSERT + SELECT Consistency

By default, a SELECT immediately after an INSERT will see the inserted data because ClickHouse acknowledges INSERTs only after the data is committed to disk:

```sql
INSERT INTO events VALUES (1, 'click', now());
-- This SELECT will see the row above
SELECT * FROM events WHERE user_id = 1 ORDER BY timestamp DESC LIMIT 1;
```

## Monitoring Concurrent Activity

```sql
SELECT
    count() AS running_queries,
    sum(memory_usage) AS total_memory,
    max(elapsed) AS longest_running_sec
FROM system.processes;
```

View part merges happening in parallel:

```sql
SELECT
    database,
    table,
    elapsed,
    progress,
    num_parts
FROM system.merges
ORDER BY elapsed DESC;
```

## Handling INSERT Timeouts Under Load

When the server is overloaded with too many parts, new inserts may be delayed:

```sql
-- Cap overall query/insert execution time to 60 seconds
SET max_execution_time = 60;

-- Raise for batch pipelines that can afford to wait
SET max_execution_time = 300;
```

## Async INSERT Mode

For high-frequency small inserts, use async mode to buffer in server memory:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 1;
SET async_insert_busy_timeout_ms = 5000;
```

This batches small inserts server-side before flushing to disk, reducing part fragmentation.

## Summary

ClickHouse handles concurrent reads and writes through an append-only MergeTree model where reads and writes never block each other. Control insert concurrency via `max_concurrent_queries`, use async INSERT mode for high-frequency small writes, and monitor activity via `system.processes` and `system.merges` to ensure healthy concurrent operation.
