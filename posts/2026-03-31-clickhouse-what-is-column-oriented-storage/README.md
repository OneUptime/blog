# What Is Column-Oriented Storage and Why ClickHouse Uses It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Column-Oriented Storage, Architecture, Compression, Analytics

Description: Understand what column-oriented storage is, how it differs from row-oriented databases, and why ClickHouse uses it for analytical queries.

---

Column-oriented storage is the foundational design decision that makes ClickHouse fast for analytical workloads. Understanding it explains why ClickHouse can scan billions of rows per second while PostgreSQL or MySQL would take minutes on the same query.

## Row-Oriented vs. Column-Oriented Storage

In a row-oriented database (PostgreSQL, MySQL), each row is stored together on disk. Reading any column requires loading entire rows.

```text
Row store layout (3 rows, 4 columns):
[id=1, ts=2024-01-01, region=US, revenue=100]
[id=2, ts=2024-01-02, region=EU, revenue=200]
[id=3, ts=2024-01-03, region=US, revenue=150]
```

In a column-oriented database, each column is stored separately.

```text
Column store layout:
id column:      [1, 2, 3]
ts column:      [2024-01-01, 2024-01-02, 2024-01-03]
region column:  [US, EU, US]
revenue column: [100, 200, 150]
```

## Why This Matters for Analytics

Analytical queries typically read a few columns from millions of rows.

```sql
-- This query only needs the ts, region, and revenue columns
SELECT region, sum(revenue)
FROM sales
WHERE ts >= '2024-01-01'
GROUP BY region;
```

With column storage, ClickHouse reads only the `region`, `revenue`, and `ts` columns from disk. It skips all other columns entirely. On a table with 50 columns, this can reduce I/O by 94%.

## Better Compression

Values in the same column tend to be similar. A `region` column might only contain a handful of distinct strings. ClickHouse can compress this column with LZ4 or ZSTD far more effectively than a row-oriented layout.

```text
Revenue column before compression: [100, 200, 150, 100, 100, 200]
Delta encoding:                     [100, +100, -50, -50, 0, +100]
After LZ4 compression:              60-90% size reduction typical
```

## Vectorized Execution

ClickHouse processes data column by column in batches (vectors) of up to 65,536 rows. Modern CPUs can apply SIMD instructions to a column batch, processing 8-16 values per clock cycle.

```text
Batch of 65536 revenue values -> SIMD sum -> single CPU operation
vs.
65536 individual row lookups -> 65536 cache misses in row storage
```

## When to Use ClickHouse vs. Row-Oriented Databases

ClickHouse is the right choice when:
- Queries aggregate over large numbers of rows
- Only a subset of columns are read per query
- Write patterns are append-only bulk inserts

Row-oriented databases are better when:
- You frequently read or update entire rows
- Transactions spanning multiple tables are required
- The dataset is small (under a few million rows)

## Summary

Column-oriented storage lets ClickHouse scan only the columns needed for a query, compress data aggressively within each column, and apply vectorized CPU instructions across column batches. These three properties combine to deliver query speeds that are 10-1000x faster than row-oriented databases for analytical workloads on the same hardware.
