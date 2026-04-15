# How to Build a Replay-Safe Ingestion Pipeline for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Idempotent Insert, Replay, ReplacingMergeTree, Data Pipeline

Description: Learn how to build a replay-safe ClickHouse ingestion pipeline that handles duplicate inserts without corrupting analytics using deduplication strategies.

---

A replay-safe pipeline processes the same data multiple times without creating duplicates. This is essential for at-least-once delivery systems where retries or pipeline restarts can re-send events.

## Strategy 1 - ReplacingMergeTree

`ReplacingMergeTree` deduplicates rows with the same sorting key (`ORDER BY`), keeping the latest version:

```sql
CREATE TABLE events (
    event_id String,
    ts DateTime,
    user_id UInt32,
    event_type LowCardinality(String),
    payload String,
    _version UInt64 DEFAULT toUnixTimestamp64Milli(now64())
) ENGINE = ReplacingMergeTree(_version)
ORDER BY event_id;
```

Inserting the same `event_id` twice keeps only the row with the higher `_version`.

Read deduplicated data with FINAL:

```sql
SELECT * FROM events FINAL
WHERE ts >= today()
LIMIT 100;
```

## Strategy 2 - insert_deduplication Setting

ClickHouse tracks recent insert checksums and drops duplicate batches:

```sql
SET insert_deduplicate = 1;
-- For ReplicatedMergeTree the default window is 10000 blocks.
-- For non-replicated MergeTree tables the window defaults to 0 (disabled);
-- set non_replicated_deduplication_window to enable it.
```

If you retry the exact same `INSERT` query with the same data, ClickHouse skips the re-insert automatically within the deduplication window.

## Strategy 3 - Idempotency Key in Pipeline

Track processed offsets externally and skip already-handled ranges:

```python
def get_last_processed_offset(client):
    result = client.query("SELECT max(kafka_offset) FROM events")
    return result.first_row[0] or 0

def ingest_batch(client, messages):
    last = get_last_processed_offset(client)
    new_messages = [m for m in messages if m['offset'] > last]
    if new_messages:
        client.insert('events', new_messages)
```

## Strategy 4 - Deduplication View

Create a materialized view that tracks the latest event data per ID:

```sql
CREATE MATERIALIZED VIEW events_deduped
ENGINE = AggregatingMergeTree()
ORDER BY event_id
AS SELECT
    event_id,
    argMaxState(ts, ts) AS latest_ts,
    argMaxState(payload, ts) AS latest_payload
FROM events
GROUP BY event_id;
```

Query:

```sql
SELECT event_id, argMaxMerge(latest_ts), argMaxMerge(latest_payload)
FROM events_deduped
GROUP BY event_id;
```

## Testing Replay Safety

```bash
# Insert batch twice
for i in 1 2; do
  curl -X POST 'http://clickhouse:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow' \
    -d '{"event_id":"evt_001","ts":"2026-03-31 10:00:00","user_id":1,"event_type":"click","payload":"{}"}'
done

# Verify count
curl 'http://clickhouse:8123/?query=SELECT+count()+FROM+events+FINAL+WHERE+event_id%3D%27evt_001%27'
# Expected: 1
```

## Summary

Build replay-safe ClickHouse pipelines using `ReplacingMergeTree` for row-level deduplication, `insert_deduplicate` for batch-level deduplication, or offset tracking for stream-level idempotency. Always query `FINAL` on `ReplacingMergeTree` tables to get deduplicated results.
