# How ClickHouse Column-Oriented Storage Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Columnar Storage, MergeTree, Internal, Performance

Description: An explanation of how ClickHouse stores data in columns on disk, why this layout benefits analytical queries, and how it interacts with compression and the primary index.

---

## Row-Oriented vs Column-Oriented

In a row-oriented database (MySQL, PostgreSQL), each row is stored contiguously on disk. Reading one column means loading the entire row and discarding the columns you do not need.

In ClickHouse, each column is stored in its own file. A query that reads 3 out of 50 columns touches only those 3 column files.

```text
Row-oriented storage (one row per disk read unit):
[user_id=1, name="Alice", country="US", amount=99.5, status="active", ...]
[user_id=2, name="Bob",   country="UK", amount=42.0, status="inactive", ...]

Column-oriented storage (one column per file):
user_id.bin:  [1, 2, 3, 4, ...]
name.bin:     ["Alice", "Bob", "Carol", ...]
country.bin:  ["US", "UK", "US", ...]
amount.bin:   [99.5, 42.0, 77.1, ...]
status.bin:   ["active", "inactive", "active", ...]
```

## On-Disk File Structure

For each column in a MergeTree table part, ClickHouse writes:

```text
part_dir/
  column_name.bin        - compressed column data
  column_name.mrk3       - mark file (granule offsets)
  primary.idx            - sparse primary index
  columns.txt            - column names and types
  count.txt              - row count
  checksums.txt          - data integrity checksums
```

```bash
# Inspect a data part on disk
ls /var/lib/clickhouse/data/analytics/events/all_1_1_0/
```

## Granules: The Unit of I/O

ClickHouse reads data in granules, not individual rows. The default granule size is 8192 rows (configurable via `index_granularity`). Each mark file stores the compressed block offset and uncompressed offset for each granule.

```sql
-- View granule information
SELECT
  table,
  column,
  marks_bytes,
  data_compressed_bytes,
  data_uncompressed_bytes,
  formatReadableSize(data_compressed_bytes) AS compressed
FROM system.columns
WHERE table = 'events' AND database = 'analytics';
```

## Compression per Column

Because each column contains values of the same type, the data compresses much better than mixed-type rows. String columns use LZ4 or ZSTD. Integer columns often use delta or DoubleDelta encoding before compression.

```sql
-- Column-level compression ratios
SELECT
  column,
  formatReadableSize(data_compressed_bytes) AS compressed,
  formatReadableSize(data_uncompressed_bytes) AS uncompressed,
  round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE table = 'events'
ORDER BY data_compressed_bytes DESC;
```

## Vectorized Execution

Column storage enables vectorized execution. ClickHouse processes a granule of 8192 values at once using SIMD instructions, rather than processing one row at a time. This is 10-100x more CPU-efficient for aggregate operations.

## Query Execution Flow

```text
1. Parse SQL, identify needed columns
2. Read primary.idx to find relevant granule range
3. Use mark files to seek to correct positions in .bin files
4. Decompress and decode only the needed column granules
5. Apply WHERE filters, GROUP BY, aggregate
6. Return results
```

## Summary

ClickHouse stores each column in separate files and reads data in granule-sized chunks of 8192 rows. This layout minimizes I/O for analytical queries that touch a subset of columns, enables per-column compression algorithms that achieve 5-20x compression ratios, and allows vectorized SIMD processing of column batches. The result is query performance that is typically 10-100x faster than row-oriented databases for analytical workloads.
