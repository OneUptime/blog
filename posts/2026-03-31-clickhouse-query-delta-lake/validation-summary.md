# Validation Summary: How to Query Delta Lake Tables with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (DeltaLake table engine and deltaLake table function)
- Delta Lake
- Amazon S3
- Apache Parquet
- SQL

## Sources Consulted
- ClickHouse official documentation: DeltaLake table engine (https://clickhouse.com/docs/en/engines/table-engines/integrations/deltalake)
- ClickHouse official documentation: deltaLake table function (https://clickhouse.com/docs/en/sql-reference/table-functions/deltalake)
- ClickHouse source code: `src/Core/Settings.cpp` — confirmed actual setting names for Delta Lake time travel (`delta_lake_snapshot_version`, `delta_lake_snapshot_start_version`, `delta_lake_snapshot_end_version`)
- ClickHouse source code: `src/Storages/ObjectStorage/DataLakes/DataLakeConfiguration.h` — confirmed `supportsPrewhere()` returns `false` for DeltaLake (only Iceberg returns `true`)

## Issues Found

### 1. Incorrect time travel setting name
- **What was wrong:** The post used `SETTINGS delta_lake_version = 10` for time travel. The setting `delta_lake_version` does not exist in ClickHouse.
- **What was changed:** Replaced with `SETTINGS delta_lake_snapshot_version = 10`, which is the correct setting name confirmed in ClickHouse source code (`src/Core/Settings.cpp`).
- **Why:** Using the wrong setting name would cause an error or be silently ignored, making the time travel example non-functional.

### 2. PREWHERE not supported for DeltaLake engine
- **What was wrong:** The Performance Tips section recommended using `PREWHERE` with DeltaLake tables and included a `PREWHERE` SQL example. However, ClickHouse's `supportsPrewhere()` method returns `true` only for Iceberg tables, not DeltaLake. Using `PREWHERE` on a DeltaLake table would either error or be silently ignored.
- **What was changed:** Removed the `PREWHERE` recommendation and replaced the example with a standard `WHERE` clause on a partition column, which correctly leverages predicate pushdown for Delta Lake.
- **Why:** Recommending an unsupported feature would mislead readers and produce queries that don't work as described.

## Review Notes
- The `deltaLake()` table function shown is specifically the S3 variant (alias of `deltaLakeS3`). For Azure, users need `deltaLakeAzure()`, and for local files, `deltaLakeLocal()`. The post focuses on S3, so this is fine, but could be mentioned.
- Delta Lake write support was added in ClickHouse v25.10 via `SET allow_experimental_delta_lake_writes = 1`. The post focuses on reads, which is appropriate, but readers should know writes are now possible.
- The time travel feature (`delta_lake_snapshot_version`) requires the delta-kernel-rs backend, which is enabled by default in recent ClickHouse versions via `allow_experimental_delta_kernel_rs`.
- The partition pruning claims are correct — confirmed by the existence of `PartitionPruner.h`/`.cpp` and the `delta_lake_enable_engine_predicate` setting in the ClickHouse source.
- The `DESCRIBE TABLE` output format shown is illustrative; actual ClickHouse output includes additional columns (default_type, default_expression, etc.), but the core Column/Type information shown is accurate.
