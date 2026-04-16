# How to Use Async Inserts in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Async Insert, Performance, Batching, Ingestion

Description: Learn how to enable and use async inserts in ClickHouse to buffer small frequent writes into efficient batches without application-side batching logic.

---

## The Problem: Small Frequent Inserts

ClickHouse is optimized for large batch inserts. Each INSERT creates a new data part, and too many small parts leads to:
- Poor compression
- Slow queries (many small parts to read)
- Background merge pressure
- Potential "too many parts" errors

Traditionally, applications had to batch writes themselves. Async inserts solve this at the server level.

## What Are Async Inserts

With `async_insert = 1`, ClickHouse buffers incoming INSERT statements in memory and flushes them to disk in batches based on time and size thresholds. Multiple small inserts from different clients are merged into a single efficient part.

```sql
-- Enable async inserts at session level
SET async_insert = 1;
SET wait_for_async_insert = 1;  -- wait for buffer flush (default)
SET async_insert_max_data_size = 1000000;  -- flush at 1MB
SET async_insert_busy_timeout_ms = 200;    -- flush after 200ms
```

## Enabling Async Inserts

### Session-Level (per query)

```sql
INSERT INTO events (ts, user_id, event_type) VALUES (now(), 42, 'click')
SETTINGS async_insert = 1, wait_for_async_insert = 0;
```

### User-Level (per user profile)

```sql
-- Set for a specific user
ALTER USER analytics_writer SETTINGS async_insert = 1,
    async_insert_busy_timeout_ms = 500,
    async_insert_max_data_size = 10000000;
```

### System-Level (config.xml)

```xml
<clickhouse>
    <profiles>
        <default>
            <async_insert>1</async_insert>
            <async_insert_busy_timeout_ms>200</async_insert_busy_timeout_ms>
            <async_insert_max_data_size>1000000</async_insert_max_data_size>
        </default>
    </profiles>
</clickhouse>
```

## Key Settings

```sql
-- Enable async insert mode
SET async_insert = 1;

-- Max buffer size before flush (bytes)
-- Flush when buffer reaches this size
SET async_insert_max_data_size = 1000000;  -- default is 10 MiB (10485760)

-- Max time to wait before flush (ms)
-- Flush after this many ms even if buffer not full
SET async_insert_busy_timeout_ms = 200;  -- 200ms default

-- Max number of queries in buffer before flush
SET async_insert_max_query_number = 450;  -- 450 default

-- Whether INSERT should wait for the buffer to flush
SET wait_for_async_insert = 1;  -- 1 = wait (synchronous confirm)
SET wait_for_async_insert = 0;  -- 0 = fire and forget

-- Timeout for waiting on flush
SET wait_for_async_insert_timeout = 120;  -- seconds
```

## Fire-and-Forget vs Acknowledged Mode

```sql
-- Fire and forget: fastest, no confirmation
INSERT INTO events VALUES (now(), 1, 'click')
SETTINGS async_insert = 1, wait_for_async_insert = 0;

-- Acknowledged: waits for buffer flush confirmation (data durability)
INSERT INTO events VALUES (now(), 1, 'click')
SETTINGS async_insert = 1, wait_for_async_insert = 1;

-- The difference: with wait_for_async_insert=0, the INSERT returns
-- as soon as data is added to the in-memory buffer; if ClickHouse
-- crashes before flush, data is lost. With =1, the client waits
-- until the buffer is actually flushed to the table, so you get
-- a durability guarantee equivalent to a synchronous INSERT.
```

## Application Code Examples

```python
import clickhouse_connect

# Client with async inserts enabled
client = clickhouse_connect.get_client(
    host='localhost',
    settings={
        'async_insert': 1,
        'wait_for_async_insert': 1,
        'async_insert_busy_timeout_ms': 500,
    }
)

# Each insert is individually small but buffered together
for event in event_stream:
    client.insert('events', [[
        event['timestamp'],
        event['user_id'],
        event['event_type'],
        event['data']
    ]], column_names=['ts', 'user_id', 'event_type', 'data'])
```

```go
// Go example with clickhouse-go driver
conn, _ := clickhouse.Open(&clickhouse.Options{
    Addr: []string{"localhost:9000"},
    Settings: clickhouse.Settings{
        "async_insert":              1,
        "wait_for_async_insert":     1,
        "async_insert_busy_timeout_ms": 500,
    },
})

// Small inserts are buffered automatically
conn.Exec(ctx, "INSERT INTO events VALUES (?, ?, ?)", now, userID, eventType)
```

## Monitoring Async Insert Buffers

```sql
-- View current async insert queue
SELECT *
FROM system.asynchronous_inserts
WHERE database = currentDatabase();

-- Shows: table, query_id, query, rows, bytes, expires_at

-- Monitor async insert metrics
SELECT *
FROM system.metrics
WHERE metric LIKE '%AsyncInsert%';

-- Async insert log (if enabled)
SELECT
    table,
    rows,
    bytes,
    exception,
    event_time
FROM system.asynchronous_insert_log
WHERE database = currentDatabase()
ORDER BY event_time DESC
LIMIT 20;
```

## Deduplication with Async Inserts

```sql
-- Enable deduplication to avoid duplicate rows from retries.
-- Only applies to Replicated* table engines (e.g. ReplicatedMergeTree);
-- regular MergeTree does not deduplicate inserts.
SET async_insert_deduplicate = 1;

-- ClickHouse hashes the inserted block and stores recent hashes in
-- ZooKeeper/Keeper. The same block inserted multiple times within the
-- deduplication window will only be written to the table once.
```

## When to Use Async Inserts vs Client-Side Batching

| Scenario | Recommendation |
|----------|---------------|
| Many microservices, each inserting small rows | Async inserts |
| Single client, can control batch size | Client-side batching |
| Serverless/edge functions | Async inserts |
| IoT/sensor data with many sources | Async inserts |
| ETL pipelines with large batches | Client-side batching |
| Need guaranteed ordering | Client-side batching |

## Practical Example: High-Frequency Event Tracking

```sql
-- Table for high-frequency events
CREATE TABLE user_events (
    ts DateTime64(3) DEFAULT now64(),
    user_id UInt64,
    session_id UUID,
    event_type LowCardinality(String),
    page String,
    properties String DEFAULT '{}'
) ENGINE = MergeTree()
PARTITION BY toDate(ts)
ORDER BY (event_type, ts, user_id);

-- Insert from many concurrent clients using async mode
-- Each client sends individual events; ClickHouse batches them
INSERT INTO user_events (user_id, session_id, event_type, page)
VALUES (123, generateUUIDv4(), 'pageview', '/home')
SETTINGS async_insert = 1, wait_for_async_insert = 0;
```

## Summary

Async inserts in ClickHouse buffer small, frequent INSERT statements and flush them to disk as efficient large batches based on configurable size and time thresholds. This eliminates the need for application-side batching when data comes from many concurrent sources like microservices, IoT devices, or event tracking SDKs. Enable with `async_insert = 1`, tune `async_insert_busy_timeout_ms` and `async_insert_max_data_size` for your latency/throughput trade-off, and use `wait_for_async_insert = 1` for durability guarantees.
