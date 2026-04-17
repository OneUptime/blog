# Common ClickHouse INSERT Mistakes and How to Fix Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Insert, Performance, Async Insert, Batch Insert

Description: Avoid the most common ClickHouse INSERT mistakes that cause too many parts, slow ingestion, and data loss in production pipelines.

---

ClickHouse INSERT performance depends on how data is batched, formatted, and acknowledged. These mistakes are responsible for most ingestion problems in production deployments.

## Mistake 1: Inserting Rows One at a Time

Each INSERT in ClickHouse creates a new data part on disk. Inserting single rows generates thousands of tiny parts, which triggers the "too many parts" error and slows down merges dramatically.

```sql
-- Wrong: one insert per row
INSERT INTO events VALUES (1, now(), 'click');
INSERT INTO events VALUES (2, now(), 'view');

-- Correct: batch thousands of rows per insert
INSERT INTO events VALUES
  (1, now(), 'click'),
  (2, now(), 'view'),
  (3, now(), 'purchase');
```

Aim for batches of at least 1,000 rows or 1 MB of data per INSERT.

## Mistake 2: Not Using Async Inserts for High-Concurrency Clients

When many small clients each send their own batches, the server still sees many small parts. Async inserts let ClickHouse buffer and merge them server-side.

```sql
SET async_insert = 1;
SET wait_for_async_insert = 0;
SET async_insert_max_data_size = 10485760;  -- 10 MB
SET async_insert_busy_timeout_ms = 1000;
INSERT INTO events VALUES (1, now(), 'click');
```

With async inserts, the client does not block for each small write, and ClickHouse accumulates data before flushing to disk.

## Mistake 3: Inserting Into Distributed Tables Without Understanding Buffering

Inserting into a `Distributed` table forwards rows to shards. Without `insert_distributed_sync = 1`, the insert returns before remote shards confirm receipt.

```sql
SET insert_distributed_sync = 1;
INSERT INTO events_distributed VALUES (1, now(), 'click');
```

Use synchronous mode in critical pipelines, or use async mode with a durable queue (Kafka) to tolerate network failures.

## Mistake 4: Wrong Column Order in INSERT ... VALUES

If column order differs from the table definition and you do not name columns explicitly, data lands in wrong columns silently.

```sql
-- Always name columns explicitly
INSERT INTO events (id, ts, event_type) VALUES (1, now(), 'click');
```

## Mistake 5: Using HTTP Interface with Large Payloads Without Compression

Large uncompressed HTTP payloads waste network bandwidth and memory.

```bash
# Wrong: uncompressed
curl -X POST 'http://localhost:8123/?query=INSERT%20INTO%20events%20FORMAT%20CSV' \
  --data-binary @data.csv

# Correct: gzip compressed
gzip -c data.csv | curl -X POST 'http://localhost:8123/?query=INSERT%20INTO%20events%20FORMAT%20CSV' \
  -H 'Content-Encoding: gzip' \
  --data-binary @-
```

## Mistake 6: Ignoring insert_quorum in Replicated Setups

Without `insert_quorum`, a successful INSERT may exist on only one replica. If that node fails before replication completes, data is gone.

```sql
SET insert_quorum = 2;
SET insert_quorum_timeout = 30000;
```

## Summary

ClickHouse INSERT mistakes are mostly about batch size and acknowledgment semantics. Always batch rows, use async inserts for high-concurrency workloads, name columns explicitly, compress HTTP payloads, and enable `insert_quorum` for durability. Monitor `system.parts` to detect too-many-parts conditions early.
