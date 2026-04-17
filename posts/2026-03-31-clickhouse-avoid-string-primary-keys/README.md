# Why You Should Avoid String Primary Keys in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Primary Key, ORDER BY, Performance, Data Type

Description: Explains why using String columns as the leading primary key in ClickHouse increases index size and slows sorting, and what numeric alternatives work better.

---

## Primary Keys and Storage Ordering

In ClickHouse, `ORDER BY` defines both the physical sort order of data and the sparse primary index. ClickHouse writes one index entry per granule (default 8192 rows). For String columns, each index entry stores a variable-length byte sequence. For numeric types, each entry is a fixed-size integer.

The primary index is loaded into RAM at query start. A large index means more RAM consumed and slower binary search during granule selection.

## String Primary Keys: The Problems

### 1. Variable-Length Index Entries

```sql
-- String primary key - index entries have variable size
CREATE TABLE events (
  event_id   String,   -- could be 8 or 128 bytes
  user_id    UInt64,
  event_time DateTime
) ENGINE = MergeTree()
ORDER BY event_id;
```

Index entries for UUIDs stored as String take ~36 bytes each. For UInt128, 16 bytes. For UInt64, 8 bytes.

### 2. Lexicographic vs Numeric Comparison

String comparison is lexicographic, not numeric. This can produce unexpected sort orders and makes range queries on string-encoded IDs unreliable.

```sql
-- String comparison: '9' > '100' > '10' (lexicographic)
-- This ORDER BY does NOT sort numerically
ORDER BY string_id;
```

### 3. Slow Sorting During Merges

Background merges must re-sort data parts by the primary key. String comparisons involve byte-by-byte comparison and are slower than integer comparisons.

## Preferred Alternatives

```sql
-- Use UInt64 for auto-increment IDs
CREATE TABLE events (
  event_id   UInt64,
  user_id    UInt64,
  event_time DateTime
) ENGINE = MergeTree()
ORDER BY (user_id, event_time);

-- Use FixedString or UInt128 for UUIDs
CREATE TABLE sessions (
  session_id UUID,      -- stored as 16 bytes, not 36
  user_id    UInt64,
  started_at DateTime
) ENGINE = MergeTree()
ORDER BY (user_id, started_at);
```

## When String in ORDER BY Is Acceptable

String columns can appear in `ORDER BY` as non-leading columns:

```sql
-- OK: String is second, not leading; integer-based range scans still work
ORDER BY (user_id, event_type);
```

Or when the string column is low-cardinality and you use it as a partition key prefix:

```sql
-- Acceptable for coarse partitioning
PARTITION BY country
ORDER BY (user_id, event_time);
```

## Benchmarking the Difference

```sql
-- Compare primary index sizes
SELECT
  table,
  formatReadableSize(sum(primary_key_bytes_in_memory)) AS pk_index_size
FROM system.parts
WHERE active = 1
GROUP BY table;
```

A table ordered by UInt64 will show a smaller `primary_key_bytes_in_memory` than the same number of rows ordered by a UUID String.

## Summary

String columns as the leading primary key increase ClickHouse's in-memory index size, slow merge sorting, and make range queries unpredictable due to lexicographic ordering. Use integer types (UInt32, UInt64) or the UUID type for identity columns. Reserve String in ORDER BY for trailing positions or low-cardinality grouping columns, not as the primary ordering dimension.
