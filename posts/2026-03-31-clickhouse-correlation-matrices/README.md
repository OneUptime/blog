# How to Build Correlation Matrices in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Correlation, Statistics, Analytics, corr

Description: Learn how to compute Pearson correlation coefficients and build correlation matrices in ClickHouse using the corr aggregate function.

---

A correlation matrix shows pairwise correlations between numeric variables, revealing which metrics move together. ClickHouse provides a built-in `corr` aggregate function that makes this straightforward.

## Computing Pearson Correlation

`corr(x, y)` returns the Pearson correlation coefficient between -1 and 1:

```sql
SELECT
    corr(cpu_pct, memory_pct) AS cpu_mem_corr,
    corr(cpu_pct, latency_ms) AS cpu_latency_corr,
    corr(memory_pct, latency_ms) AS mem_latency_corr
FROM host_metrics
WHERE host = 'web01'
  AND ts >= now() - INTERVAL 7 DAY;
```

## Building a Full Correlation Matrix

Use multiple `corr()` calls in one query to build an N-by-N matrix inline:

```sql
SELECT
    'cpu_pct' AS metric,
    1.0 AS cpu_pct,
    corr(cpu_pct, mem_pct) AS mem_pct,
    corr(cpu_pct, disk_io) AS disk_io,
    corr(cpu_pct, net_bytes) AS net_bytes
FROM host_metrics
UNION ALL
SELECT
    'mem_pct',
    corr(mem_pct, cpu_pct),
    1.0,
    corr(mem_pct, disk_io),
    corr(mem_pct, net_bytes)
FROM host_metrics
UNION ALL
SELECT
    'disk_io',
    corr(disk_io, cpu_pct),
    corr(disk_io, mem_pct),
    1.0,
    corr(disk_io, net_bytes)
FROM host_metrics;
```

## Correlations per Host

Compute correlations for each host in one pass:

```sql
SELECT
    host,
    corr(cpu_pct, latency_ms) AS cpu_latency_corr
FROM host_metrics
GROUP BY host
ORDER BY abs(cpu_latency_corr) DESC;
```

## Identifying Strong Correlations

Filter for metrics with strong relationships:

```sql
SELECT host, corr(cpu_pct, latency_ms) AS r
FROM host_metrics
GROUP BY host
HAVING abs(r) > 0.7
ORDER BY r DESC;
```

## Using corrMatrix

In ClickHouse 23.2+, `corrMatrix` computes a full correlation matrix for a list of columns, returning `Array(Array(Float64))`:

```sql
SELECT corrMatrix(cpu_pct, mem_pct, disk_io)
FROM host_metrics;
```

To print the matrix row-by-row with rounded values, combine it with `arrayJoin` and `arrayMap`:

```sql
SELECT arrayMap(x -> round(x, 3), arrayJoin(corrMatrix(cpu_pct, mem_pct, disk_io)))
FROM host_metrics;
```

## Summary

ClickHouse's `corr(x, y)` aggregate computes Pearson correlations efficiently. Build matrices with multiple corr calls or `UNION ALL` rows. Use `corrMatrix` in newer versions for a compact way to compute all pairwise correlations in a single pass.
