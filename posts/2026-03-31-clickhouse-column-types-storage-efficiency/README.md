# How to Optimize Column Types for Storage Efficiency in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Column Type, Storage, Compression, Schema Design, LowCardinality

Description: Choose optimal ClickHouse column types to minimize disk storage and improve query performance through better compression ratios.

---

Choosing the right column types in ClickHouse directly impacts storage size and query performance. Smaller types compress better, fit in CPU cache, and require less I/O.

## Use the Smallest Integer That Fits

ClickHouse has multiple integer sizes. Use the smallest one that covers your data range:

```sql
-- Instead of:
CREATE TABLE events (
  user_id UInt64,    -- 8 bytes, max 18 quintillion
  status UInt64,     -- 8 bytes, but only values 0-5
  age UInt64         -- 8 bytes, but only 0-120
) ENGINE = MergeTree() ORDER BY user_id;

-- Use:
CREATE TABLE events_optimized (
  user_id UInt32,    -- 4 bytes, max 4 billion
  status UInt8,      -- 1 byte, values 0-255
  age UInt8          -- 1 byte, values 0-255
) ENGINE = MergeTree() ORDER BY user_id;
```

This example reduces row size from 24 bytes to 6 bytes for these three columns.

## Use LowCardinality for Repeated Strings

`LowCardinality(String)` stores a dictionary and integer indices instead of repeating strings:

```sql
-- String: stores "United States" for every row
region String

-- LowCardinality: stores the string once, uses 1-byte index
region LowCardinality(String)
```

For a column with 50 distinct 10-character values across 1 billion rows, this reduces storage from ~10GB to ~50MB.

## Use Decimal Instead of Float for Money

`Float64` introduces precision errors and compresses worse than `Decimal`:

```sql
-- Float64: precision issues, poor compression
price Float64

-- Decimal: exact values, better compression with sorted data
price Decimal64(2)  -- 2 decimal places, up to ~10 quadrillion
```

## Use Date Instead of DateTime When Precision Isn't Needed

```sql
-- DateTime: 4 bytes
event_at DateTime

-- Date: 2 bytes (when time-of-day is not needed)
event_date Date

-- DateTime64: 8 bytes (when sub-second precision is needed)
event_at DateTime64(3)  -- millisecond precision
```

## Use Enum for Fixed Value Sets

`Enum8` and `Enum16` store named constants as 1-2 bytes:

```sql
CREATE TABLE orders (
  status Enum8('pending' = 1, 'processing' = 2, 'shipped' = 3, 'delivered' = 4, 'cancelled' = 5),
  priority Enum8('low' = 1, 'medium' = 2, 'high' = 3)
) ENGINE = MergeTree() ORDER BY status;
```

## Measure Storage Impact

After creating tables, compare storage:

```sql
SELECT
  table,
  name AS column,
  type,
  formatReadableSize(sum(data_compressed_bytes)) AS compressed,
  formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
  round(sum(data_uncompressed_bytes) / nullif(sum(data_compressed_bytes), 0), 2) AS ratio
FROM system.columns
WHERE database = 'default'
GROUP BY table, name, type
ORDER BY sum(data_compressed_bytes) DESC
LIMIT 20;
```

## Use ZSTD Codec for Better Compression

For columns with moderate cardinality, ZSTD compresses better than the default LZ4:

```sql
CREATE TABLE events (
  user_id UInt32 CODEC(ZSTD(3)),
  payload String CODEC(ZSTD(6))
) ENGINE = MergeTree() ORDER BY user_id;
```

## Summary

Storage-efficient column types in ClickHouse use the smallest integer type that covers the data range, `LowCardinality(String)` for repeated string values, `Decimal` for monetary values, `Date` instead of `DateTime` when time precision is unnecessary, and `Enum` for fixed value sets. These changes can reduce storage by 50-90% compared to default type choices and improve query performance through smaller I/O.
