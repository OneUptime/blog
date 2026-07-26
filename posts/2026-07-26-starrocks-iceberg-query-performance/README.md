# Slow StarRocks Iceberg Queries: Metadata and File-Pruning Fixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Apache Iceberg, Query Performance, Metadata Cache, Statistics, Data Lake

Description: Diagnose slow StarRocks Iceberg queries by separating metadata planning, pruning, optimizer statistics, file layout, and object-storage work.

---

An Iceberg query can be slow before StarRocks reads a single data row. The frontend must resolve a snapshot, retrieve metadata, enumerate candidate files, and build a plan. Depending on `plan_mode`, manifest parsing runs locally or is distributed across backends or compute nodes. Only then do those nodes scan data and apply delete files.

Treat "slow Iceberg" as four separate problems:

1. metadata discovery and planning;
2. partition, manifest, and file pruning;
3. cost-based optimization;
4. remote data-file execution.

Changing scan concurrency cannot repair a five-second planning phase. Increasing the metadata cache cannot repair a query that legitimately selects every file.

## Establish a Reproducible Baseline

Run the same query twice and record both client-visible latency and the StarRocks query ID:

```sql
SET enable_profile = true;

SELECT /* iceberg_baseline */
       region, sum(net_amount)
FROM lakehouse.sales.orders
WHERE order_date >= DATE '2026-07-01'
  AND order_date <  DATE '2026-07-08'
GROUP BY region;

SELECT LAST_QUERY_ID();
```

The first run may populate metadata and data caches. A much faster second run points toward remote metadata or object reads. Similar runs point toward plan shape, pruning, CPU, or a consistently undersized cache.

Inspect both the plan and Query Profile:

```sql
EXPLAIN VERBOSE
SELECT region, sum(net_amount)
FROM lakehouse.sales.orders
WHERE order_date >= DATE '2026-07-01'
  AND order_date <  DATE '2026-07-08'
GROUP BY region;
```

Check the scan operator's partition and file counts, predicates, bytes read, I/O time, and delete-file work. Also compare the time before execution begins with operator time in the profile. Do not infer pruning from the SQL text alone.

## Fix Metadata Planning First

StarRocks enables `enable_iceberg_metadata_cache` by default. It caches table, partition, data-file, and delete-file metadata; `iceberg_manifest_cache_with_column_statistics` also defaults to `true`. Disabling these globally normally makes repeated planning slower.

Check the catalog definition and relevant settings:

```sql
SHOW CREATE CATALOG lakehouse;

SHOW VARIABLES LIKE 'plan_mode';
```

StarRocks supports `local`, `distributed`, and `auto` Iceberg metadata planning. The default `auto` mode adaptively chooses between inexpensive local planning for small metadata sets and distributed parsing for large numbers of manifests. Pin `plan_mode` only after a profile demonstrates that the automatic choice is wrong for a repeatable workload.

The current documentation also describes a two-level memory and disk cache. Disk caching is controlled by FE settings such as `enable_iceberg_metadata_disk_cache` and is disabled by default. Before enabling it, verify that the configured cache path exists on every relevant FE, has enough fast storage, and is monitored for capacity and latency.

Metadata freshness is a separate requirement. Background connector refresh is enabled by default, and frequently accessed Iceberg catalogs are refreshed periodically. Starting in StarRocks 3.5.7, `iceberg_table_cache_refresh_interval_sec` controls the asynchronous table-cache refresh interval and defaults to 60 seconds.

Do not set cache time-to-live values to zero cluster-wide merely to investigate stale data. That forces more remote metadata work. If the application requires fresher snapshots, define its freshness objective, tune refresh deliberately, and compare planning latency before and after.

## Prove That Pruning Is Happening

Iceberg hidden partitioning does not remove the need for filter expressions that StarRocks can translate into partition and file predicates. Prefer typed, direct ranges:

```sql
-- Easier to prune.
WHERE order_ts >= DATETIME '2026-07-01 00:00:00'
  AND order_ts <  DATETIME '2026-07-08 00:00:00'
```

Avoid transforming the filtered column unless the plan proves the transformation is pushed down:

```sql
-- May prevent effective pushdown or pruning.
WHERE date_format(order_ts, '%Y-%m-%d') = '2026-07-01'
```

Also check:

- predicate types match the Iceberg column types, avoiding implicit casts;
- filters are applied to source columns used by the partition transform or sort order;
- an `OR` clause has not widened the candidate-file set;
- time-zone conversion has not shifted timestamp boundaries;
- the selected snapshot actually contains the expected partition specification.

Iceberg tables can evolve partition specifications. An apparently simple filter may need to be evaluated against files written under several historical specifications. Use the plan's selected partition and file counts as the result, not assumptions based on the current table definition.

## Give the Optimizer Useful Statistics

Pruning decides what can be skipped. Statistics decide how StarRocks joins and aggregates what remains. Missing or stale row counts and column distributions can produce a poor join order, inappropriate broadcast, or underestimated memory use.

StarRocks supports statistics collection for external Iceberg tables. For a focused test:

```sql
ANALYZE SAMPLE TABLE lakehouse.sales.orders
(customer_id, region, order_date)
WITH ASYNC MODE;
```

Check the exact statistics command supported by your StarRocks version before automating it. External-table sampling is supported from 3.4. Histogram collection for external tables is currently supported only for Hive, not Iceberg.

Starting in 3.4, StarRocks can also obtain Iceberg statistics from external metadata when the catalog property `enable_get_stats_from_external_metadata` is enabled. The property defaults to `false` in the 3.4 and 3.5 release lines and in 4.0.0, and to `true` from 4.0.1 onward in the 4.x line. The `enable_iceberg_column_statistics` session variable remains `false` by default and controls whether StarRocks obtains column statistics; when it is disabled, StarRocks obtains only row counts. Test the resulting estimates with `EXPLAIN VERBOSE`; metadata statistics are useful only when the writer maintains meaningful file-level metrics.

Collect statistics for columns that affect joins, filters, and grouping. Collecting every column on a very wide lake table creates its own metadata and maintenance cost.

## Repair Small Files and Manifest Sprawl

A well-pruned query can still open thousands of tiny objects. In the Query Profile, look for many files and scan tasks relative to bytes read, high remote I/O latency, and significant delete-file processing.

Compaction changes table state, so coordinate it with the Iceberg table owner. StarRocks 4.0 and later expose the `rewrite_data_files` Iceberg maintenance procedure:

```sql
ALTER TABLE lakehouse.sales.orders
EXECUTE rewrite_data_files(
  "min_file_size_bytes" = 134217728
)
WHERE order_date = DATE '2026-07-01';
```

This example targets files smaller than 128 MiB in one partition. Choose thresholds from observed file sizes and writer throughput, not from the example alone. Compact a bounded partition first and measure write amplification and query improvement.

Starting in StarRocks 4.1, excessive small manifests can be addressed independently:

```sql
ALTER TABLE lakehouse.sales.orders
EXECUTE rewrite_manifests();
```

The documented procedure rewrites data manifests for the current snapshot. Both operations require a writable Iceberg catalog and appropriate privileges. They are not read-only tuning switches, and concurrent writers and retention policies must be considered.

## A Safe Tuning Order

Use this sequence to avoid masking the root cause:

1. Capture cold and warm latency, plan, profile, snapshot, and file counts.
2. Confirm catalog connectivity and retain the default metadata cache unless evidence says otherwise.
3. Rewrite predicates so the plan prunes partitions and files.
4. provide current statistics for optimizer-critical columns.
5. Fix small data files or manifest sprawl in the table maintenance layer.
6. Tune metadata plan mode, cache capacities, and execution parallelism only with before-and-after measurements.

Re-run the identical query after every change. A successful fix should reduce a specific quantity: planning time, candidate files, scanned bytes, remote I/O time, or expensive join work.

## Version and Operational Caveats

- Iceberg external catalogs are supported from StarRocks 2.4, but cache, statistics, and maintenance capabilities were added over later releases.
- Manifest-cache memory ratio controls documented for current releases begin in 3.5.6; the table-cache refresh interval begins in 3.5.7.
- External-metadata statistics begin in 3.4. The catalog-level switch defaults to enabled from 4.0.1 onward in the 4.x line, while Iceberg column statistics remain disabled by default at the session level.
- Cache invalidation and background refresh are catalog-dependent. Validate freshness with the exact metastore, catalog, and writer used in production.
- Data and metadata caching can make a benchmark warm. Always report whether a measurement was cold or warm.
- Maintenance procedures mutate Iceberg metadata and files. Test permissions, rollback expectations, and interoperability with other engines first.

## Official Documentation

- [StarRocks Iceberg catalog](https://docs.starrocks.io/docs/data_source/catalog/iceberg/iceberg_catalog/)
- [StarRocks Iceberg procedures](https://docs.starrocks.io/docs/data_source/catalog/iceberg/procedures/)
- [StarRocks cost-based optimizer statistics](https://docs.starrocks.io/docs/using_starrocks/Cost_based_optimizer/)
- [StarRocks ANALYZE TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/cbo_stats/ANALYZE_TABLE/)
- [StarRocks Query Profile overview](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_overview/)
