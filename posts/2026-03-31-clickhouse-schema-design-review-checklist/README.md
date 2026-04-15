# ClickHouse Schema Design Review Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Design, Checklist, MergeTree, Optimization

Description: A schema design review checklist for ClickHouse covering data types, sorting keys, partitioning, compression codecs, and materialized view readiness.

---

Schema design is the single most important factor in ClickHouse query performance. A well-designed schema can deliver 10-100x better performance than the same data with a poorly chosen sorting key or column types. Use this checklist before finalizing any ClickHouse table schema.

## Data Types

```text
[ ] Numeric columns use the smallest type that fits:
    - UInt8 (0-255) / Int8 (-128 to 127), UInt16/Int16, UInt32/Int32, UInt64/Int64
    - Float32 instead of Float64 when precision allows
    - Decimal(p, s) for financial values (not Float for money)
[ ] String columns with low cardinality use LowCardinality(String)
    - Rule of thumb: < 10,000 distinct values
[ ] Date/time columns: DateTime for second precision, DateTime64(3) for milliseconds
[ ] Boolean values stored as UInt8, not String
[ ] Fixed-length identifiers stored as FixedString(N) or UInt64 (not String)
```

```sql
-- Check if a column could benefit from LowCardinality
SELECT
    column,
    uniqExact(column_value) AS distinct_count
FROM (
    SELECT 'status' AS column, status AS column_value FROM events
    UNION ALL
    SELECT 'country', country FROM events
)
GROUP BY column;
```

## Sorting Key (ORDER BY)

```text
[ ] Most selective filter columns come first in ORDER BY
[ ] Time column included in ORDER BY (typically last for time-series)
[ ] Columns used in WHERE equality conditions placed before range conditions
[ ] High-cardinality identifier columns (user_id) placed after low-cardinality (country, status)
[ ] Sorting key has no more than 4-6 columns
[ ] Tested query performance against representative queries
```

```sql
-- Good: filter columns in ORDER BY, time at end
ORDER BY (country, event_type, user_id, event_time)

-- Bad: high-cardinality timestamp first defeats index pruning
ORDER BY (event_time, country, event_type)
```

## Partitioning

```text
[ ] Partition granularity matches data retention and query patterns
[ ] Monthly partitioning (toYYYYMM) for most time-series workloads
[ ] Daily partitioning (toYYYYMMDD) only for very high-volume tables
[ ] Not over-partitioning (avoid hourly unless justified)
[ ] TTL defined for automatic partition expiry if needed
```

## Compression

```text
[ ] LZ4 used for hot data (default, fast decompression)
[ ] ZSTD used for cold data (better compression ratio)
[ ] Delta codec applied to monotonically increasing columns (timestamps, IDs)
[ ] Gorilla codec applied to float metrics (sensor readings, prices)
```

```sql
-- Apply codecs to specific columns
CREATE TABLE metrics (
    ts DateTime CODEC(Delta, LZ4),
    value Float32 CODEC(Gorilla, ZSTD(3))
) ENGINE = MergeTree()
ORDER BY ts;
```

## Materialized View Readiness

```text
[ ] Identified top 5 dashboard queries that would benefit from pre-aggregation
[ ] AggregatingMergeTree target tables planned for each materialized view
[ ] Aggregate state functions mapped to each metric (countState, sumState, uniqState)
[ ] Backfill queries planned for existing data
```

## Summary

ClickHouse schema design review should verify column types are the smallest possible, sorting keys match the primary query patterns, partitioning aligns with retention and query granularity, and compression codecs are applied appropriately. Fixing schema issues before data is loaded is far cheaper than migrating billions of rows later.
