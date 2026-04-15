# How to Use Log and TinyLog Engines in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Log Engine, TinyLog, Storage Engine, Write-Once

Description: Learn how to use the Log and TinyLog table engines in ClickHouse for simple append-only storage, temporary data dumps, and lightweight single-file column storage.

---

ClickHouse provides a family of simple log-family engines - `Log`, `TinyLog`, and `StripeLog` - designed for write-once or append-only workloads where simplicity matters more than query performance. `TinyLog` stores each column in a separate file with no marks file, making it the simplest possible persistent engine. `Log` adds a marks file for parallel column reads. Both support concurrent inserts (serialized) and are ideal for small auxiliary tables, data dumps, and development fixtures.

## TinyLog Engine

`TinyLog` writes each column to a separate binary file. There are no index or marks files, so reads must scan each file from the beginning.

### Creating a TinyLog Table

```sql
CREATE TABLE import_staging
(
    row_id       UInt64,
    source_file  String,
    raw_line     String,
    imported_at  DateTime DEFAULT now()
)
ENGINE = TinyLog;
```

### Inserting Into TinyLog

```sql
INSERT INTO import_staging (row_id, source_file, raw_line) VALUES
    (1, 'data_2024_06_15.csv', 'alice,30,engineer'),
    (2, 'data_2024_06_15.csv', 'bob,25,designer'),
    (3, 'data_2024_06_15.csv', 'carol,28,manager');
```

### Querying TinyLog

```sql
SELECT row_id, source_file, raw_line, imported_at
FROM import_staging
ORDER BY row_id;
```

```text
row_id  source_file           raw_line              imported_at
1       data_2024_06_15.csv   alice,30,engineer     2024-06-15 09:00:00
2       data_2024_06_15.csv   bob,25,designer       2024-06-15 09:00:00
3       data_2024_06_15.csv   carol,28,manager      2024-06-15 09:00:00
```

### Concurrent INSERT Limitation

TinyLog serializes all writes. Two simultaneous `INSERT` statements will queue, not fail. Reads are blocked while an insert is in progress and will wait for the write to complete before returning results.

## Log Engine

`Log` is similar to `TinyLog` but adds a `__marks.mrk` file that tracks byte offsets for each column block. This allows ClickHouse to skip to the correct offset when reading specific column ranges, enabling slightly faster full reads on larger tables.

### Creating a Log Table

```sql
CREATE TABLE error_archive
(
    logged_at   DateTime,
    level       LowCardinality(String),
    service     String,
    message     String,
    stack_trace String
)
ENGINE = Log;
```

### Batch Inserting Into Log

```sql
INSERT INTO error_archive VALUES
    (now(),    'ERROR', 'auth-service',    'Token validation failed',  ''),
    (now(),    'WARN',  'payment-service', 'Retry attempt 2 of 3',     ''),
    (now(),    'ERROR', 'payment-service', 'Downstream timeout',        'at pay.Service.call(Service.java:42)'),
    (now() - INTERVAL 1 HOUR, 'INFO', 'auth-service', 'Service started', '');
```

### Filtering a Log Table

```sql
SELECT
    logged_at,
    level,
    service,
    message
FROM error_archive
WHERE level = 'ERROR'
  AND logged_at >= now() - INTERVAL 2 HOUR
ORDER BY logged_at DESC;
```

```text
logged_at             level  service          message
2024-06-15 10:05:00   ERROR  payment-service  Downstream timeout
2024-06-15 10:05:00   ERROR  auth-service     Token validation failed
```

### Aggregating Over a Log Table

```sql
SELECT
    service,
    level,
    count() AS event_count
FROM error_archive
WHERE logged_at >= today()
GROUP BY service, level
ORDER BY service, level;
```

## Comparing Log and TinyLog

```sql
-- Create side-by-side tables to illustrate the difference
CREATE TABLE demo_tinylog (id UInt32, val String) ENGINE = TinyLog;
CREATE TABLE demo_log     (id UInt32, val String) ENGINE = Log;

INSERT INTO demo_tinylog VALUES (1,'a'),(2,'b'),(3,'c');
INSERT INTO demo_log     VALUES (1,'a'),(2,'b'),(3,'c');

-- Both return the same results
SELECT * FROM demo_tinylog ORDER BY id;
SELECT * FROM demo_log     ORDER BY id;
```

```text
id  val
1   a
2   b
3   c
```

The difference is internal: `Log` creates a `__marks.mrk` file alongside each column file, allowing block-level seeking.

## Using Log as a Data Dump Target

Log engines are useful when you need to quickly persist query results to disk without defining a full MergeTree schema.

```sql
-- Dump yesterday's anomalies for offline analysis
CREATE TABLE anomaly_dump_20240615
(
    event_id   UInt64,
    metric     String,
    value      Float64,
    z_score    Float64,
    detected_at DateTime
)
ENGINE = Log;

INSERT INTO anomaly_dump_20240615
SELECT
    event_id,
    metric,
    value,
    (value - avg_val) / stddev_val AS z_score,
    recorded_at
FROM metrics AS m
JOIN (
    SELECT metric, avg(value) AS avg_val, stddevPop(value) AS stddev_val
    FROM metrics
    WHERE event_date = yesterday()
    GROUP BY metric
) AS stats ON m.metric = stats.metric
WHERE m.event_date = yesterday()
  AND abs((m.value - stats.avg_val) / stats.stddev_val) > 3;
```

## Appending Multiple Batches

Both Log engines support multiple `INSERT` statements; each appends to the column files.

```sql
-- First batch
INSERT INTO error_archive VALUES
    (now(), 'INFO', 'cache-service', 'Cache warm-up complete', '');

-- Second batch - appends to existing data
INSERT INTO error_archive VALUES
    (now(), 'ERROR', 'cache-service', 'Cache eviction storm detected', '');

SELECT count() FROM error_archive;
```

```text
count()
6
```

## File Layout on Disk

```bash
# Typical Log table directory layout
ls /var/lib/clickhouse/data/default/error_archive/

# Output:
# logged_at.bin
# level.bin
# service.bin
# message.bin
# stack_trace.bin
# __marks.mrk   <- Log only; TinyLog does not have this file
```

## Limitations

- No primary key or index - all reads are full scans.
- Data is compressed (like MergeTree), but lacks advanced MergeTree features such as configurable granularity and secondary indices.
- No partitioning, no replication, no mutations.
- Not suitable for production OLAP workloads.
- Concurrent reads are fine; concurrent writes serialize.

## Summary

`TinyLog` and `Log` are the simplest persistent ClickHouse engines. `TinyLog` stores each column in a file with no extra metadata, while `Log` adds a marks file for block-level seeking. Both are write-once or append-only storage formats best suited for temporary data dumps, test fixtures, staging tables, and small auxiliary datasets where schema simplicity outweighs query performance.
