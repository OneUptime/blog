# How to Use TinyLog Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TinyLog, Log Engine, Table Engine, Lightweight, SQL

Description: Learn how to use the TinyLog table engine in ClickHouse for small, temporary, or single-threaded datasets where simplicity and minimal overhead matter.

---

`TinyLog` is the simplest ClickHouse table engine. It stores each column in a separate file without any index or compression marks, and supports only single-threaded reads and writes. It is designed for very small tables, temporary data, test fixtures, and intermediate results - not for production analytical workloads.

## Creating a TinyLog Table

```sql
CREATE TABLE temp_results (
    id      UInt32,
    name    String,
    value   Float64
) ENGINE = TinyLog;
```

No `ORDER BY`, `PARTITION BY`, or `PRIMARY KEY` is required or supported.

## Inserting Data

```sql
INSERT INTO temp_results VALUES (1, 'alpha', 3.14);
INSERT INTO temp_results VALUES (2, 'beta', 2.71);
```

## Reading Data

```sql
SELECT * FROM temp_results;
```

```text
id  name   value
1   alpha  3.14
2   beta   2.71
```

## Key Characteristics

```text
Feature              TinyLog
Index                None
Compression marks    None
Concurrent reads     No (single-threaded)
Concurrent writes    No (single-threaded)
On-disk structure    One .bin file per column
Deletions            Not supported
Updates              Not supported
```

## Storage Structure

```text
temp_results/
  id.bin       -- UInt32 column data
  name.bin     -- String column data
  value.bin    -- Float64 column data
  sizes.json   -- file sizes
```

## When to Use TinyLog

TinyLog is appropriate for:
- Lookup tables with a few hundred rows.
- Temporary staging tables in ETL pipelines.
- Unit test fixtures.
- Intermediate results in complex multi-step queries.

```sql
-- Example: temporary lookup used in a JOIN
CREATE TABLE category_map (
    id   UInt16,
    name String
) ENGINE = TinyLog;

INSERT INTO category_map VALUES (1, 'Electronics'), (2, 'Clothing'), (3, 'Food');

SELECT e.event_id, c.name AS category
FROM events AS e
LEFT JOIN category_map AS c ON e.category_id = c.id
LIMIT 10;
```

## Limitations

- No support for concurrent writes - only one INSERT can run at a time.
- No support for concurrent reads - single-threaded only.
- No index - every SELECT does a full scan.
- No support for mutations (ALTER UPDATE / ALTER DELETE).
- Inefficient for tables over a few thousand rows.

## Comparing TinyLog to Log and StripeLog

```text
Engine     Files             Concurrent Reads  Index  Best For
TinyLog    One per column    No                No     < 1000 rows, temp data
Log        One per column    Yes               No     Small tables, multi-read
StripeLog  Striped shared    Yes               No     Small tables, multi-read
```

## Dropping a TinyLog Table

```sql
DROP TABLE temp_results;
```

## Summary

TinyLog is the minimal ClickHouse engine: no index, no compression marks, single-threaded I/O. Use it for tiny lookup tables, test fixtures, and temporary intermediate data where simplicity trumps performance. For anything larger than a few thousand rows or requiring concurrent access, use Log, StripeLog, or a MergeTree variant instead.
