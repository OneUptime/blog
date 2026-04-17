# How to Understand Data Parts and Granules in MergeTree

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Data Part, Granule, Primary Index, Storage, Performance

Description: Learn how ClickHouse MergeTree organizes data into parts and granules, how the sparse primary index uses granules, and how this affects query performance.

---

ClickHouse MergeTree stores data in immutable **parts** (one per INSERT batch) which are continuously merged in the background. Within each part, rows are grouped into **granules** - the smallest unit of data that can be skipped or read. Understanding this two-level structure is fundamental to understanding how ClickHouse achieves fast analytical queries.

## What Is a Data Part?

A data part is a directory on disk containing the column data and index files created from a single INSERT or produced by a merge operation.

```sql
-- List active parts for a table
SELECT
    name,
    partition,
    rows,
    formatReadableSize(bytes_on_disk) AS size,
    marks,
    part_type
FROM system.parts
WHERE table = 'events' AND active = 1
ORDER BY name
LIMIT 10;
```

```text
name            partition  rows      size      marks  part_type
202603_1_1_0    202603     8000      400 KiB   2      Compact
202603_1_5_2    202603     5000000   250 MiB   611    Wide
```

## What Is a Granule?

A granule is a fixed-size group of consecutive rows (default: 8192 rows, controlled by `index_granularity`). The sparse primary index stores one entry per granule, and the mark files track the byte offset of each granule start.

```sql
-- Granule count for a part = rows / index_granularity (rounded up)
SELECT
    name,
    rows,
    marks,
    ceil(rows / 8192) AS expected_marks
FROM system.parts
WHERE table = 'events' AND active = 1
LIMIT 5;
```

## How the Sparse Primary Index Uses Granules

When you query with a WHERE clause on the ORDER BY key, ClickHouse:
1. Reads the primary index (one entry per granule) to identify which granules MAY contain matching rows.
2. Uses mark files to find byte offsets for those granules.
3. Reads only the identified granules from the `.bin` column files.

```sql
-- This query reads only the granules where ts falls in range
SELECT count()
FROM events
WHERE ts >= '2026-03-01' AND ts < '2026-04-01';
```

```text
-- EXPLAIN shows how many granules are selected
EXPLAIN indexes=1
SELECT count() FROM events WHERE ts >= '2026-03-01' AND ts < '2026-04-01';
```

## Granule Size vs Query Selectivity

```text
index_granularity  Granule size  Point query reads  Sequential scan speed
1024               1024 rows     Precise (1 KB)     Slower (more marks)
8192               8192 rows     Default balance    Default
65536              65536 rows    Reads more rows    Fastest sequential
```

Smaller granules improve point query precision but add mark overhead. Default 8192 is appropriate for most workloads.

## Adaptive Granule Sizes

ClickHouse supports adaptive granularity - instead of a fixed row count, each granule has a target byte size (~10 MB by default):

```sql
SETTINGS index_granularity_bytes = 10485760,  -- 10 MB target granule size
         index_granularity = 8192;            -- row-based fallback
```

Enable adaptive granularity at table creation (it is on by default; set `index_granularity_bytes = 0` to disable):

```sql
CREATE TABLE events (...)
ENGINE = MergeTree ORDER BY ts
SETTINGS
    index_granularity_bytes = 10485760,
    index_granularity = 8192;
```

With adaptive granularity, rows with large text/JSON columns produce smaller granules (fewer rows per 10 MB), and rows with small numeric columns produce larger granules.

## Part and Granule Lifecycle

```text
INSERT batch -> 1 new part (compact or wide)
Background merge -> multiple parts -> 1 larger part
TTL merge -> expired rows removed from parts
DETACH -> parts moved to detached/ directory
DROP -> parts marked inactive and deleted (approximately within 10 minutes)
```

## Monitoring Granule Efficiency

```sql
-- Average rows per granule across active parts
SELECT
    table,
    round(avg(rows / marks)) AS avg_rows_per_granule
FROM system.parts
WHERE active = 1
GROUP BY table
ORDER BY avg_rows_per_granule DESC;
```

## Summary

MergeTree organizes data into immutable parts (per-insert directories) subdivided into granules (groups of `index_granularity` rows). The sparse primary index stores one entry per granule, enabling ClickHouse to skip entire granules that cannot match a WHERE predicate. Smaller granules improve point query precision; larger granules improve sequential scan throughput. Adaptive granularity (`index_granularity_bytes`) adjusts granule boundaries based on byte size rather than row count, improving efficiency for variable-width row types.
