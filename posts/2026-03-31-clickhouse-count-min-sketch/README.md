# How to Use Count-Min Sketch in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Count-Min Sketch, Approximate Query, Streaming Analytics, Heavy Hitter

Description: Learn how to use the Count-Min Sketch in ClickHouse to estimate item frequencies with bounded error using constant memory.

---

## What Is Count-Min Sketch?

Count-Min Sketch (CMS) is a probabilistic data structure for estimating the frequency of elements in a dataset. It uses a compact matrix of counters to provide frequency estimates with a bounded overestimation error. ClickHouse exposes this through a column-level statistics type named `CountMin`, which the query planner consults when estimating the selectivity of equality predicates.

## Why Use Count-Min Sketch?

Exact frequency counting requires memory proportional to the number of distinct items - impractical for high-cardinality columns. Count-Min Sketch trades a small, controlled overcount error for a fixed memory footprint regardless of dataset size. In ClickHouse, this lets the optimizer pick better plans for filters like `col = 'value'` - reordering joins or choosing more selective filters first - without reading the underlying data.

## Attaching Count-Min Statistics to a Column

Statistics creation is currently experimental, so enable the feature flag first:

```sql
SET allow_experimental_statistics = 1;
```

You can declare `CountMin` statistics inline when creating a table:

```sql
CREATE TABLE access_logs
(
    timestamp DateTime,
    url       String STATISTICS(CountMin),
    user_id   UInt64
)
ENGINE = MergeTree
ORDER BY timestamp;
```

Or add them to an existing column and rebuild the sketch over existing parts:

```sql
ALTER TABLE access_logs
    ADD STATISTICS url TYPE CountMin;

ALTER TABLE access_logs
    MATERIALIZE STATISTICS url;
```

New parts populate the sketch automatically as they are written.

## Supported Data Types and Operations

`CountMin` works with:

- `String` and `FixedString`
- `(U)Int*` integer types
- `Float*` and `Decimal*` numeric types
- `Date`, `Date32`, `DateTime`, `DateTime64`

It accelerates selectivity estimation for equality predicates (`=` and `IN`). Range predicates are not supported by `CountMin` - pair it with a statistics type such as `TDigest` or `MinMax` for those.

## Enabling the Planner to Use Statistics

Declaring the statistic is not enough; the optimizer must also be allowed to use it:

```sql
SET allow_statistics_optimize = 1;

SELECT count()
FROM access_logs
WHERE url = '/checkout';
```

With the setting on, the planner uses the `CountMin` sketch to estimate how many rows match before scanning, which can improve join ordering and filter placement.

## Managing Statistics

The full set of `ALTER TABLE` statements for column statistics is:

```sql
-- Remove metadata and stop maintaining the sketch for the column
ALTER TABLE access_logs DROP STATISTICS url;

-- Clear the sketch data in existing parts but keep the metadata
ALTER TABLE access_logs CLEAR STATISTICS url;

-- Rebuild statistics for all columns that declare them
ALTER TABLE access_logs MATERIALIZE STATISTICS ALL;
```

## Combining Count-Min Sketch with Bloom Filter Skip Indexes

`CountMin` complements Bloom filter skip indexes. Use a Bloom filter to prune granules during scan and `CountMin` to inform the planner about selectivity:

```sql
ALTER TABLE access_logs
    ADD INDEX url_bloom_idx url TYPE bloom_filter GRANULARITY 4;
```

The Bloom filter prunes granules at scan time; the `CountMin` statistic lets the optimizer reason about predicate cardinality before execution.

## Practical Use Cases

- Detecting DDoS patterns: attach `CountMin` to an `ip_address` column so equality filters on suspicious IPs get accurate selectivity estimates and better plans.
- Ad fraud detection: improve plan quality when filtering on `click_source` values that have a highly skewed frequency distribution.
- Log analysis: help the planner when filtering on `status_code` or `error_code` columns where a few values dominate and most are rare.

```sql
SET allow_experimental_statistics = 1;

ALTER TABLE http_logs
    ADD STATISTICS status_code TYPE CountMin;

ALTER TABLE http_logs
    MATERIALIZE STATISTICS status_code;

SET allow_statistics_optimize = 1;

SELECT count()
FROM http_logs
WHERE status_code = 500;
```

## Summary

Count-Min Sketch in ClickHouse is surfaced as a lightweight column statistics type that the query planner uses to estimate the selectivity of equality predicates. Attaching it to high-cardinality, skewed columns lets the optimizer pick better execution plans without the memory cost of exact frequency counts - making it a useful tool for heavy-hitter-aware query planning on large MergeTree tables.
