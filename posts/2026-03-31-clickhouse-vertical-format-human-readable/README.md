# How to Use Vertical Format for Human-Readable Output in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Vertical Format, Human-Readable, Debugging, Query Output

Description: Learn how to use the Vertical format in ClickHouse to display query results with one column per line, making wide rows much easier to read and debug.

---

The Vertical format in ClickHouse displays each row with one field per line, showing the column name alongside its value. This is similar to MySQL's `\G` suffix and is invaluable when working with wide tables or rows with many columns that would be difficult to read in a traditional tabular layout.

## Basic Usage

Append `FORMAT Vertical` to any SELECT query:

```sql
SELECT *
FROM system.tables
WHERE database = 'default'
LIMIT 1
FORMAT Vertical;
```

Output:

```text
Row 1:
──────────────────────────────────
database:                  default
name:                      events
uuid:                      3f2c8d1a-4b5e-...
engine:                    MergeTree
is_temporary:              0
data_paths:                ['/var/lib/clickhouse/data/default/events/']
metadata_path:             /var/lib/clickhouse/metadata/default/events.sql
total_rows:                150000000
total_bytes:               4831838208
```

## When to Use Vertical Format

Vertical format is most useful for:
- Inspecting system tables like `system.tables`, `system.parts`, `system.processes`
- Debugging single rows with many columns
- Reading configuration or metadata that has long values
- Any query returning rows too wide for terminal display

## Debugging with Vertical Format

```sql
-- Inspect a specific table's metadata
SELECT *
FROM system.parts
WHERE database = 'default'
  AND table = 'events'
  AND active = 1
LIMIT 1
FORMAT Vertical;
```

```text
Row 1:
────────────────────────────────────
database:                    default
table:                       events
name:                        202406_1_100_5
part_type:                   Wide
active:                      1
marks:                       512
rows:                        4194304
bytes_on_disk:               189234567
data_compressed_bytes:       185012345
data_uncompressed_bytes:     892345678
```

## Inspecting Processes

```sql
SELECT *
FROM system.processes
FORMAT Vertical;
```

## Querying System Replicas

```sql
SELECT *
FROM system.replicas
WHERE is_leader = 1
FORMAT Vertical;
```

## Vertical in clickhouse-client

You can use `\G` at the end of a query in `clickhouse-client` as a shorthand for FORMAT Vertical (similar to MySQL):

```text
clickhouse-client
:) SELECT * FROM system.tables LIMIT 1\G
```

## Vertical for SHOW CREATE TABLE

```sql
SHOW CREATE TABLE events FORMAT Vertical;
```

Output:

```text
Row 1:
────────────────────
statement: CREATE TABLE default.events
(
    `event_id` UInt64,
    `event_type` String,
    `ts` DateTime,
    `user_id` UInt32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, ts)
```

## Vertical is Output-Only

Vertical format is only for SELECT output. It cannot be used as an input format for INSERT.

## Summary

The Vertical format is a practical debugging and inspection tool in ClickHouse. Whenever you need to read a wide row, inspect system table metadata, or understand the full structure of a single result, FORMAT Vertical makes the output far more readable. It is the ClickHouse equivalent of MySQL's `\G` and should be in every ClickHouse developer's debugging toolkit.
