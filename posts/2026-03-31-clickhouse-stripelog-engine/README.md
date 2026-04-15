# How to Use StripeLog Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, StripeLog, Log Engine, Table Engine, Lightweight, SQL, Concurrent

Description: Learn how to use the StripeLog table engine in ClickHouse for small tables requiring concurrent reads, with a striped storage format that reduces file count.

---

`StripeLog` is a ClickHouse Log-family engine that stores all column data interleaved into a single `data.bin` file, with a shared `index.mrk` marks file that records offsets for each column of each inserted data block. Unlike `TinyLog`, StripeLog supports concurrent reads from multiple threads. It is suited for small tables up to a few hundred MB where you need multi-threaded read access but do not require partitioning or indexing.

## Creating a StripeLog Table

```sql
CREATE TABLE session_log (
    ts         DateTime,
    session_id UInt64,
    user_id    UInt32,
    action     String
) ENGINE = StripeLog;
```

## Inserting Data

```sql
INSERT INTO session_log VALUES
    ('2026-03-31 10:00:00', 1001, 42, 'login'),
    ('2026-03-31 10:01:00', 1001, 42, 'page_view'),
    ('2026-03-31 10:05:00', 1002, 43, 'login');
```

## Querying Data

```sql
SELECT user_id, count() AS actions
FROM session_log
GROUP BY user_id
ORDER BY actions DESC;
```

## Storage Structure

```text
session_log/
  data.bin       -- all column data interleaved (striped)
  index.mrk      -- offset marks for each column of each data block
```

All columns share one `data.bin` file. The `index.mrk` marks file records the offsets for each column of each inserted data block.

## Concurrent Read Support

StripeLog can serve multiple parallel SELECT queries simultaneously, unlike TinyLog which serializes reads:

```sql
-- These can run concurrently on StripeLog
SELECT count() FROM session_log WHERE user_id = 42;
SELECT count() FROM session_log WHERE action = 'login';
```

## Characteristics

```text
Feature              StripeLog
Index                None (full scan on every SELECT)
Concurrent reads     Yes (multiple threads)
Concurrent writes    No (single writer at a time)
On-disk structure    Single data.bin + marks file
Deletions            Not supported
Updates              Not supported
Max practical size   ~100 MB - 1 GB
```

## Comparing Log Family Engines

```text
Engine     Storage           Concurrent Reads  Best For
TinyLog    Column files      No                < 1000 rows, temp data
StripeLog  Striped single    Yes               Small multi-read tables
Log        Column files      Yes               Small multi-read tables
```

## Use Case: Audit Log Buffer

```sql
CREATE TABLE audit_events (
    recorded_at DateTime,
    user_id     UInt32,
    action      String,
    resource_id UInt64
) ENGINE = StripeLog;

-- Append events
INSERT INTO audit_events SELECT now(), 10, 'delete', 555;

-- Query with concurrent reads
SELECT action, count() FROM audit_events GROUP BY action;
```

## Limitations

- No partitioning or indexing - every SELECT is a full table scan.
- Cannot ALTER TABLE to add columns or change types.
- No replication support.
- Not suitable for tables over ~1 GB.

## Summary

StripeLog stores all columns in a single striped file, supporting concurrent reads while keeping storage overhead low. Use it for small tables (under 1 GB) that require multi-threaded read access without the overhead of MergeTree. For tables requiring indexing, partitioning, or high-throughput analytics, use MergeTree variants instead.
