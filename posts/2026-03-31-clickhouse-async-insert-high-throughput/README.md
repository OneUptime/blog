# How to Use Async INSERT in ClickHouse for High-Throughput Writes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Async Insert, High Throughput, Write Performance, Buffering

Description: Learn how to use ClickHouse's async INSERT mode to batch high-frequency writes automatically, reducing merge pressure and improving insert throughput.

---

Async INSERT in ClickHouse allows the server to buffer incoming inserts in memory and flush them as a single batch, rather than creating a new data part for every INSERT statement. This dramatically reduces part merge overhead for high-frequency insert workloads.

## The Problem with Synchronous Inserts

Every synchronous INSERT creates a new data part on disk. Thousands of inserts per second create thousands of tiny parts, overwhelming the merge process and causing `Too many parts` errors.

## Enabling Async INSERT

Set `async_insert = 1` at the query or session level:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 0;  -- Fire-and-forget mode

INSERT INTO events (ts, user_id, event_type) VALUES (now(), 'u1', 'click');
```

## HTTP Interface

```bash
curl "http://localhost:8123/?async_insert=1&wait_for_async_insert=0" \
  --data "INSERT INTO events VALUES (now(), 'u1', 'click')"
```

## Python Client

```python
from clickhouse_driver import Client

client = Client('localhost', settings={
    'async_insert': 1,
    'wait_for_async_insert': 0
})

client.execute(
    "INSERT INTO events (ts, user_id, event_type) VALUES",
    [{'ts': '2026-01-01 00:00:00', 'user_id': 'u1', 'event_type': 'click'}]
)
```

## Flush Triggers

Async inserts are flushed when either:
- `async_insert_max_data_size` bytes are buffered (default: 10 MiB)
- `async_insert_busy_timeout_ms` milliseconds have elapsed (default: 200ms)

Tune these settings:

```sql
SET async_insert_max_data_size = 10485760;   -- 10MB
SET async_insert_busy_timeout_ms = 500;       -- 500ms
```

## Wait for Confirmation

Use `wait_for_async_insert = 1` when you need confirmation that data was written:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 1;

INSERT INTO events VALUES (...);
-- Blocks until the buffer is flushed to storage
```

## Monitoring Async Inserts

```sql
SELECT
    query,
    rows,
    bytes
FROM system.asynchronous_insert_log
ORDER BY event_time DESC
LIMIT 20;
```

## When to Use Async INSERT

- Microservices sending individual events via HTTP
- IoT devices sending one metric at a time
- Application-level inserts that can't be easily batched client-side

## When to Use Client-Side Batching Instead

For bulk ETL or structured pipelines, batch inserts client-side (1000+ rows per INSERT) and skip async mode for lower overhead.

## Summary

Async INSERT solves the high-frequency small-insert problem by server-side buffering and batching. Enable it with `async_insert = 1` and tune flush thresholds based on your latency and throughput requirements.
