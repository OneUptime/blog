# How to Stop DuckDB Queries Exhausting Memory on Large Parquet Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DuckDB, Memory Management, Parquet, Analytics, Performance

Description: Bound DuckDB memory and spill, reduce scanned Parquet data, and rewrite blocking query shapes that still exceed memory.

---

DuckDB supports out-of-core execution and can spill many larger-than-memory operations to disk. It can still run out of memory when several blocking operators overlap, some aggregate states cannot spill, too many queries run concurrently, or the surrounding process uses memory outside DuckDB's buffer manager.

Treat memory, temporary disk, query shape, and concurrency as one budget.

## Reproduce the exact failure

Distinguish a DuckDB `OutOfMemoryException` from the Linux OOM killer terminating the whole process. Save the complete exception and, where authorized, inspect kernel or container termination events. Record:

- DuckDB version and client binding;
- query text and `EXPLAIN` plan;
- input file list, sizes, row groups, and schemas;
- memory and CPU limits seen by the process;
- current DuckDB settings;
- concurrent query count;
- free and peak temporary-disk use.

Query effective settings rather than assuming defaults:

```sql
SELECT name, value, scope
FROM duckdb_settings()
WHERE name IN (
    'memory_limit',
    'threads',
    'temp_directory',
    'max_temp_directory_size',
    'preserve_insertion_order'
);
```

## Leave room outside the buffer manager

DuckDB's current default memory limit is 80 percent of RAM, which can be too high inside a larger application or when several processes share a host. Set an explicit lower limit after reserving memory for the runtime, result objects, Arrow or Pandas conversion, filesystem cache, and other services:

```sql
SET memory_limit = '6GB';
SET threads = 4;
```

The setting is not a strict cap on total process resident memory. Some allocations and client-side materialization live outside it. Enforce a container or operating-system boundary, but leave enough headroom that DuckDB can return a controlled exception before the process is killed.

Reducing threads can reduce simultaneous operator state and often improves stability under a tight budget. Benchmark rather than assigning every core to every query.

## Provision and cap spill storage

Set a fast local temporary directory with monitored capacity:

```sql
SET temp_directory = '/var/lib/analytics/duckdb-spill';
SET max_temp_directory_size = '100GB';
```

Create the directory with restrictive permissions before starting the service. Do not place it on a slow or unreliable network filesystem. Alert on free space and spill growth. A successful out-of-core query may write far more temporary data than the compressed Parquet input size.

For large import or export jobs where output order is not promised by an `ORDER BY`, DuckDB recommends considering:

```sql
SET preserve_insertion_order = false;
```

Test consumers first. Without an explicit `ORDER BY`, SQL result order should not be treated as a contract.

## Scan fewer Parquet bytes

DuckDB pushes required columns and eligible filters into its Parquet reader. Avoid `SELECT *`, filter on source columns before expensive expressions, and let partition paths narrow the file list:

```sql
SELECT
    customer_id,
    sum(amount_cents) AS amount_cents
FROM read_parquet('/lake/orders/order_date=2026-09-*/*.parquet')
WHERE order_date BETWEEN DATE '2026-09-01' AND DATE '2026-09-07'
  AND status = 'settled'
GROUP BY customer_id;
```

Inspect `EXPLAIN` to ensure filters are pushed to the scan. Keep Parquet row groups large enough for efficient scans but sized so metadata and parallel work are manageable. Compact tiny files upstream; opening and coordinating thousands of small files adds overhead.

## Break up blocking operator pipelines

Grouping, joins, sorting, and window functions are blocking operators. DuckDB can spill these, but several in one plan may still exhaust memory. Some aggregates such as `list()` and `string_agg()` and operations built on them can retain large states.

Reduce cardinality before joining, project unused columns away, aggregate in stages, and materialize a selective intermediate result when it shortens object lifetimes:

```sql
CREATE TEMP TABLE recent_customer_totals AS
SELECT customer_id, sum(amount_cents) AS total_cents
FROM read_parquet('/lake/orders/order_date=2026-09-*/*.parquet')
WHERE status = 'settled'
GROUP BY customer_id;

SELECT c.region, sum(t.total_cents)
FROM recent_customer_totals AS t
JOIN customer AS c USING (customer_id)
GROUP BY c.region;
```

This is a pattern to test, not a guarantee of lower memory. Compare plans, peak memory, spill, and duration. Avoid building unbounded lists or strings when a table result can represent the same data.

## Admit fewer queries

The `memory_limit` setting applies to a DuckDB instance, not to each query: concurrent queries in the same instance share that budget. Four separate instances each configured for 6 GB can exceed a 12 GB container. Within one instance, concurrent queries still compete for memory, and allocations outside the buffer manager can exceed the configured limit. Put analytical work behind a semaphore or weighted queue. Assign heavier jobs a higher weight, impose deadlines, and cancel work whose result is no longer needed.

Return aggregated or paginated results. Converting a large result into an in-memory dataframe can trigger an OOM after DuckDB has executed the query successfully.

## Validate under pressure

Run production-sized files with cold caches, realistic concurrency, the real container limit, and a nearly full but still safe spill volume. Confirm that excess work queues or fails cleanly, temporary files are reclaimed, and the service remains healthy after cancellation and OOM errors.

## Conclusion

Prevent DuckDB OOM failures by reserving process headroom, setting explicit memory and thread limits, provisioning bounded local spill, scanning only needed Parquet data, and rewriting overlapping blocking operators. The final control is admission: cap concurrent analytical work and avoid materializing unbounded results in the client.

## Official Documentation

- [DuckDB out-of-memory troubleshooting](https://duckdb.org/docs/current/guides/troubleshooting/oom_errors.html)
- [DuckDB larger-than-memory workload tuning](https://duckdb.org/docs/current/guides/performance/how_to_tune_workloads.html#larger-than-memory-workloads-out-of-core-processing)
- [DuckDB configuration reference](https://duckdb.org/docs/current/configuration/overview.html)
- [DuckDB Parquet projection and filter pushdown](https://duckdb.org/docs/current/data/parquet/overview.html#partial-reading)
