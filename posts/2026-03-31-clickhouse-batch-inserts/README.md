# How to Batch Inserts Efficiently in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Database, Analytics, Infrastructure

Description: Learn how to batch inserts efficiently in ClickHouse to maximize write throughput, minimize part creation, and avoid merge queue saturation in production pipelines.

## Introduction

Efficient batching is the single most impactful optimization for ClickHouse write performance. Unlike row-oriented databases where you can insert rows one at a time, ClickHouse creates a new immutable data part for every INSERT statement. Each part requires disk I/O, metadata updates, and background merge work. Inserting rows one at a time at any meaningful rate will exhaust the merge queue and cause "Too many parts" errors.

The goal is simple: fewer, larger inserts. This guide covers how to implement batching correctly at every stage of your ingestion pipeline.

## The Part Creation Problem

```sql
-- Check how many parts exist in a table
SELECT
    partition,
    count()                              AS part_count,
    sum(rows)                            AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size
FROM system.parts
WHERE table = 'events'
  AND active = 1
GROUP BY partition
ORDER BY partition DESC;
```

If `part_count` per partition exceeds a few hundred, your merge queue is falling behind. By default, once a partition reaches `parts_to_delay_insert` (1,000) ClickHouse starts slowing inserts down, and once it reaches `parts_to_throw_insert` (3,000) inserts are rejected outright.

```text
Code: 252. DB::Exception: Too many parts (3001 with average size of ...) in table 'events'.
Merges are processing significantly slower than inserts.
```

The fix is always the same: increase batch size.

## Minimum Batch Size Guidelines

| Rows per INSERT | Result |
|---|---|
| 1 - 100 | Catastrophic: creates too many parts, merges can never catch up |
| 100 - 10,000 | Problematic: works temporarily but breaks under load |
| 100,000 - 1,000,000 | Good: stable operation for most workloads |
| 1,000,000+ | Excellent: optimal part creation rate |

## Batching in Application Code

### Python with clickhouse-driver

```python
import clickhouse_driver
from datetime import datetime
import time

client = clickhouse_driver.Client('clickhouse.internal')

BATCH_SIZE = 100_000
FLUSH_INTERVAL_SECONDS = 5

batch = []
last_flush = time.time()

def flush_batch(client, batch):
    if not batch:
        return
    client.execute(
        'INSERT INTO events (service, event_type, value, event_time) VALUES',
        batch
    )
    print(f"Flushed {len(batch)} rows")
    batch.clear()

def process_event(event):
    batch.append((
        event['service'],
        event['event_type'],
        event['value'],
        datetime.fromtimestamp(event['timestamp'])
    ))

    # Flush when batch is full or time interval has passed
    if len(batch) >= BATCH_SIZE or (time.time() - last_flush) >= FLUSH_INTERVAL_SECONDS:
        flush_batch(client, batch)
        last_flush = time.time()
```

### Go with clickhouse-go

```go
package main

import (
    "context"
    "time"
    "github.com/ClickHouse/clickhouse-go/v2"
)

const batchSize = 100000
const flushInterval = 5 * time.Second

func main() {
    conn, _ := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"clickhouse.internal:9000"},
    })

    batch, _ := conn.PrepareBatch(
        context.Background(),
        "INSERT INTO events (service, event_type, value, event_time)",
    )

    rowCount := 0
    ticker := time.NewTicker(flushInterval)

    for {
        select {
        case event := <-eventChannel:
            batch.Append(event.Service, event.Type, event.Value, event.Time)
            rowCount++
            if rowCount >= batchSize {
                batch.Send()
                batch, _ = conn.PrepareBatch(
                    context.Background(),
                    "INSERT INTO events (service, event_type, value, event_time)",
                )
                rowCount = 0
            }

        case <-ticker.C:
            if rowCount > 0 {
                batch.Send()
                batch, _ = conn.PrepareBatch(
                    context.Background(),
                    "INSERT INTO events (service, event_type, value, event_time)",
                )
                rowCount = 0
            }
        }
    }
}
```

## Batching from Files

For ETL pipelines loading files, use the ClickHouse client directly with streaming input for maximum efficiency.

```bash
# Stream a CSV file directly into ClickHouse (entire file as one batch)
clickhouse-client --query "INSERT INTO events FORMAT CSV" < events.csv

# Stream a gzipped file without uncompressing to disk
zcat events.csv.gz | clickhouse-client --query "INSERT INTO events FORMAT CSV"

# Stream JSON lines
cat events.jsonl | clickhouse-client --query "INSERT INTO events FORMAT JSONEachRow"

# Load a Parquet file
clickhouse-client --query "INSERT INTO events FORMAT Parquet" < events.parquet

# Load multiple files as a single batch using shell pipe
cat /data/events_2024_09_*.csv | clickhouse-client \
    --query "INSERT INTO events FORMAT CSV"
```

## Batching with the HTTP API

The HTTP API is preferred for language-agnostic integrations.

```bash
# Single large batch via POST
curl -X POST "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow" \
     --data-binary @events.jsonl

# With compression (reduces network I/O significantly for text formats)
gzip -c events.jsonl | curl -X POST \
     "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow" \
     -H "Content-Encoding: gzip" \
     --data-binary @-

# Set insert settings via URL parameters
curl -X POST "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow&max_insert_block_size=1000000" \
     --data-binary @events.jsonl
```

## Controlling Block Size

ClickHouse splits large inserts into blocks internally. Tune the block size so each block is large enough to generate efficiently-sized parts.

```sql
-- Default: 1,048,449 rows per block (~1M)
SET max_insert_block_size = 1000000;

-- For very large single inserts, increase this further
SET max_insert_block_size = 10000000;

-- Minimum block size the server will squash inserts up to before writing a part.
-- Defaults: min_insert_block_size_rows = 1,048,449 rows,
--           min_insert_block_size_bytes = 268,402,944 bytes (~256 MiB).
-- Increase for very write-heavy tables to produce larger parts.
SET min_insert_block_size_rows = 1000000;
SET min_insert_block_size_bytes = 268435456;  -- 256 MB
```

## Parallel Inserts to Multiple Shards

On distributed setups, send batches to all shards in parallel rather than routing through a single `Distributed` table endpoint.

```python
import clickhouse_driver
from concurrent.futures import ThreadPoolExecutor

shards = [
    'shard1.clickhouse.internal',
    'shard2.clickhouse.internal',
    'shard3.clickhouse.internal',
    'shard4.clickhouse.internal',
]

clients = [clickhouse_driver.Client(host) for host in shards]

def insert_to_shard(client_and_batch):
    client, batch = client_and_batch
    client.execute('INSERT INTO events_local VALUES', batch)

# Split the full batch across shards
def distribute_batch(full_batch):
    shard_count = len(clients)
    shard_batches = [[] for _ in range(shard_count)]
    for i, row in enumerate(full_batch):
        shard_batches[i % shard_count].append(row)
    return shard_batches

full_batch = get_events()  # 1,000,000 rows
shard_batches = distribute_batch(full_batch)

with ThreadPoolExecutor(max_workers=len(clients)) as executor:
    executor.map(insert_to_shard, zip(clients, shard_batches))
```

## Monitoring Batch Health

```sql
-- Track insert rows per minute to verify batching is effective
SELECT
    toStartOfMinute(event_time) AS minute,
    count()                     AS insert_count,
    sum(written_rows)           AS total_rows,
    avg(written_rows)           AS avg_rows_per_insert,
    min(written_rows)           AS min_rows_per_insert
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

If `avg_rows_per_insert` is below 100,000, your batching is too small. Target at least 100,000 rows per insert, ideally 500,000+.

## Summary

Efficient batching in ClickHouse means accumulating at least 100,000 rows before each INSERT, flushing on either a size threshold or a time interval (5-10 seconds), using streaming file input or the HTTP API for file-based pipelines, and tuning `max_insert_block_size` to match your batch sizes. Monitor `system.query_log` for average rows per insert and `system.parts` for per-partition part counts. If part counts exceed 100 per partition, increase your batch size or enable async inserts to let ClickHouse handle the buffering server-side.
