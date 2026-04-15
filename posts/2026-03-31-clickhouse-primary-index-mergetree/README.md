# How to Use Primary Index in ClickHouse MergeTree

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Index, MergeTree, Database, Performance, Query

Description: Learn how ClickHouse primary indexes work in MergeTree tables, how to design ORDER BY keys for fast queries, and how to verify index usage with EXPLAIN.

---

ClickHouse MergeTree tables use a primary index that is fundamentally different from B-tree indexes in relational databases. Understanding how it works is essential to writing queries that run in milliseconds instead of seconds on billion-row tables.

## What Is the Primary Index

The primary index in ClickHouse is a sparse index stored separately from the column data. It does not index every row. Instead, it stores one entry per granule, where a granule is the smallest unit of data ClickHouse reads (8192 rows by default).

The index maps the minimum value of each granule to its offset in the column files. When you query with a `WHERE` clause on the `ORDER BY` key, ClickHouse scans the index to find which granules may contain matching rows, then reads only those granules. All other granules are skipped.

## How ORDER BY Defines the Index

The `ORDER BY` clause in `CREATE TABLE` determines the primary key (unless you specify `PRIMARY KEY` separately):

```sql
CREATE TABLE http_logs
(
    domain     String,
    status     UInt16,
    method     String,
    url        String,
    bytes      UInt32,
    ts         DateTime
)
ENGINE = MergeTree()
ORDER BY (domain, ts);
```

Data is physically sorted by `(domain, ts)`. The primary index contains one entry per 8192 rows, recording the `(domain, ts)` value at that row boundary.

## How ClickHouse Uses the Index

Given the query:

```sql
SELECT count()
FROM http_logs
WHERE domain = 'example.com'
  AND ts BETWEEN '2024-01-01' AND '2024-01-07';
```

ClickHouse performs a binary search on the index to find the first granule where `domain >= 'example.com'` and the last granule where `domain <= 'example.com'`. It then scans only the granules in that range, skipping all others.

## Granule Size

The default granule size is 8192 rows, controlled by `index_granularity`:

```sql
CREATE TABLE http_logs
(
    domain  String,
    ts      DateTime
)
ENGINE = MergeTree()
ORDER BY (domain, ts)
SETTINGS index_granularity = 8192;
```

Smaller granule sizes improve selectivity but increase index memory. The default is appropriate for most workloads.

## Index Granularity in Practice

```sql
-- Check how many granules a table has
SELECT
    table,
    sum(marks) AS granules,
    sum(rows)  AS total_rows,
    round(sum(rows) / sum(marks)) AS rows_per_granule
FROM system.parts
WHERE active = 1
  AND table = 'http_logs'
  AND database = currentDatabase()
GROUP BY table;
```

## Checking Index Effectiveness with EXPLAIN

Use `EXPLAIN indexes = 1` to see how many granules are read:

```sql
EXPLAIN indexes = 1
SELECT count()
FROM http_logs
WHERE domain = 'example.com'
  AND ts BETWEEN '2024-01-01' AND '2024-01-07';
```

The output shows `Granules: X/Y` where X is the number of granules read and Y is the total. A low ratio indicates effective index usage.

## PRIMARY KEY vs ORDER BY

By default, `PRIMARY KEY` equals `ORDER BY`. You can specify a shorter `PRIMARY KEY` to keep the index small while sorting by more columns:

```sql
CREATE TABLE http_logs_extended
(
    domain     String,
    ts         DateTime,
    status     UInt16,
    url        String,
    bytes      UInt32
)
ENGINE = MergeTree()
PRIMARY KEY (domain, ts)
ORDER BY (domain, ts, status);
```

Here the index covers `(domain, ts)`, but data is sorted by `(domain, ts, status)`. Queries filtering on `status` after the primary key columns can still benefit from the sort order even though `status` is not in the index.

## Cardinality and Column Order

Column order in `ORDER BY` matters critically:

- Put columns you filter on most frequently first
- Among frequently filtered columns, order by ascending cardinality (lowest cardinality first) for best granule skipping and compression
- Columns rarely used as filters go last

Example for a multi-tenant SaaS application:

```sql
-- tenant_id has lower cardinality than ts (thousands of tenants vs millions of timestamps)
-- Ascending cardinality order: tenant_id first, then ts
CREATE TABLE tenant_events
(
    tenant_id  UInt32,
    ts         DateTime,
    event_type String,
    payload    String
)
ENGINE = MergeTree()
ORDER BY (tenant_id, ts);
```

A query like `WHERE tenant_id = 42 AND ts > now() - INTERVAL 1 HOUR` skips all granules outside tenant 42's data range.

## Viewing the Index File

```sql
-- Size of primary index files
SELECT
    table,
    formatReadableSize(sum(primary_key_bytes_in_memory)) AS index_size,
    sum(marks) AS granules
FROM system.parts
WHERE active = 1
  AND table = 'http_logs'
  AND database = currentDatabase()
GROUP BY table;
```

## Querying Outside the Index

If you query on a non-primary-key column, ClickHouse performs a full table scan:

```sql
-- This cannot use the primary index
SELECT count()
FROM http_logs
WHERE status = 404;
```

For such queries, add a skip index (set or minmax) on `status`, or add `status` to the `ORDER BY` key if it is a common filter.

## Summary

ClickHouse's sparse primary index is the engine of its query performance. Design your `ORDER BY` key around your most frequent query filters, ordering by ascending cardinality (lowest cardinality first). Use `EXPLAIN indexes = 1` to verify that queries skip most granules. Keep the index small by using `PRIMARY KEY` for a subset of the `ORDER BY` columns when needed.
