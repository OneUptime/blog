# Validation Summary: How to Migrate from Databricks to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, materialized views, `s3()` table function)
- Databricks
- Apache Spark / Spark SQL
- Delta Lake (delta-spark Python API)
- Apache Parquet
- Amazon S3

## Sources Consulted
- ClickHouse `s3` table function documentation (https://clickhouse.com/docs/en/sql-reference/table-functions/s3)
- ClickHouse `quantile` aggregate function documentation (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile)
- ClickHouse `LowCardinality` data type documentation (https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality)
- ClickHouse `SummingMergeTree` engine documentation (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree)
- ClickHouse `MergeTree` engine documentation (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse materialized view documentation (https://clickhouse.com/docs/en/sql-reference/statements/create/view)
- Apache Spark SQL function reference (`date_trunc`, `approx_count_distinct`, `percentile_approx`)
- Delta Lake Python API documentation (`DeltaTable.forPath`, `toDF`)

## Issues Found
No technical issues found.

## Review Notes
- The `s3()` table function call uses positional arguments `(url, access_key_id, secret_access_key, format)` which matches the official signature.
- The parametric quantile syntax `quantile(0.95)(duration_ms)` is correct ClickHouse syntax.
- The materialized view using `SummingMergeTree` with a `count()` aggregation works correctly because partial counts written by the MV are summed during merges — this is a standard ClickHouse idiom. For workloads requiring exact aggregate composition (e.g., distinct counts), `AggregatingMergeTree` with `*State`/`*Merge` combinators is the more canonical pattern, but is out of scope for this introductory migration guide.
- Spark SQL function references (`date_trunc('hour', ...)`, `approx_count_distinct`, `percentile_approx`) all use the correct names and argument orders.
- Delta Lake API calls (`DeltaTable.forPath`, `.toDF()`) match the current `delta-spark` Python API.
- Hard-coded AWS credentials in the `s3()` call are appropriate for illustration; production deployments should prefer IAM roles or named collections, but the post does not claim otherwise.
