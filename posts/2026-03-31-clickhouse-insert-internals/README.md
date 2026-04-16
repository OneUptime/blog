# How ClickHouse Handles INSERT Operations Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Insert, Internal, MergeTree, Write Path

Description: Explore the internal steps ClickHouse takes when processing an INSERT - from data parsing to part creation and background async insert buffering.

---

## Synchronous vs. Asynchronous Inserts

ClickHouse supports two insert modes. Synchronous inserts (the default) write a part to disk immediately and return success. Async inserts buffer data in memory across multiple INSERT statements before flushing to disk as one part.

## Synchronous INSERT - Step by Step

When you run:

```sql
INSERT INTO events (user_id, event_time, event_type) VALUES (1, now(), 'login');
```

ClickHouse performs:

1. Parses the VALUES or format block into columnar in-memory buffers
2. Sorts rows by the table's ORDER BY key
3. Applies column compression (LZ4 by default)
4. Writes column `.bin` files, mark files (`.mrk3`), and primary index (`primary.idx`) to a temporary part directory
5. Atomically renames the temporary directory to the final part name (e.g., `20240101_1_1_0`)
6. Returns success to the client

## Part Naming

```text
{partition_id}_{min_block}_{max_block}_{level}
```

A fresh INSERT always has `level = 0`. Block numbers are monotonically increasing per partition.

## Async Inserts

For high-frequency small inserts (e.g., from application code), async inserts reduce part proliferation:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 1;
SET async_insert_max_data_size = 10485760;   -- flush at 10 MB
SET async_insert_busy_timeout_ms = 200;       -- flush every 200 ms
```

With async inserts, ClickHouse buffers rows in memory per table per user and flushes them as a single part. This keeps part counts low even with thousands of small inserts per second.

## Deduplication

ClickHouse can deduplicate identical INSERT blocks for `Replicated*` MergeTree tables using a block checksum log stored in Keeper:

```sql
SET insert_deduplicate = 1;
```

If the same block (same data, same checksum) is inserted twice, the second is silently dropped. This is useful for exactly-once semantics with retried inserts.

## Monitoring Write Activity

```sql
-- See recent inserts and their part sizes
SELECT event_time, table, part_name, rows, size_in_bytes
FROM system.part_log
WHERE event_type = 'NewPart'
ORDER BY event_time DESC
LIMIT 20;
```

## Best Practices

- Batch inserts to at least a few thousand rows each to avoid too-many-parts errors
- Use async inserts when ingesting from many small producers
- Insert into a Buffer table in front of the MergeTree for write buffering at the engine level

```sql
CREATE TABLE events_buffer AS events
ENGINE = Buffer(default, events, 4, 5, 30, 10000, 100000, 1000000, 10000000);
```

## Summary

ClickHouse INSERT operations sort and compress incoming rows, write them as an immutable part directory atomically, and return success. Async inserts and Buffer engines reduce part counts from high-frequency small inserts. Monitoring `system.part_log` reveals write patterns and helps diagnose too-many-parts issues.
