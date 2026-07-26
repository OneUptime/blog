# Validation Summary: StarRocks Query Is Slow: How to Read EXPLAIN ANALYZE and Query Profiles

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- StarRocks SQL
- StarRocks cost-based optimizer and execution plans
- `EXPLAIN`, `EXPLAIN COSTS`, and `EXPLAIN ANALYZE`
- Query Profile, Runtime Query Profile, and `ANALYZE PROFILE`
- Pipeline execution, operator metrics, joins, aggregation, sorting, exchanges, spill, and data skew
- Shared-data clusters and Data Cache

## Sources Consulted

- [StarRocks EXPLAIN ANALYZE](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN_ANALYZE/)
- [StarRocks EXPLAIN](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN/)
- [StarRocks Explain Analyze text-based profile analysis](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_text_based_analysis/)
- [StarRocks Query plan](https://docs.starrocks.io/docs/best_practices/query_tuning/query_planning/)
- [StarRocks Query Profile Overview](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_overview/)
- [StarRocks Query Profile Metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)
- [StarRocks Query Tuning Recipes](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_tuning_recipes/)
- [StarRocks ANALYZE PROFILE](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/ANALYZE_PROFILE/)
- [StarRocks SHOW PROFILELIST](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/SHOW_PROFILELIST/)
- [StarRocks get_query_profile](https://docs.starrocks.io/docs/sql-reference/sql-functions/utility-functions/get_query_profile/)
- [StarRocks Query Hint](https://docs.starrocks.io/docs/best_practices/query_tuning/query_hint/)
- [StarRocks System variables](https://docs.starrocks.io/docs/sql-reference/System_variable/)
- [StarRocks Data Cache](https://docs.starrocks.io/docs/using_starrocks/caching/block_cache/)
- [StarRocks shared-data FAQ](https://docs.starrocks.io/docs/faq/shared_data_faq/)

## Issues Found

- The post described analyzed `INSERT INTO` statements without their documented scope. It now states that `EXPLAIN ANALYZE INSERT INTO` is supported only for internal tables in the default catalog; the transaction-abort behavior remains correctly described.
- The plan-field list omitted naming variants used by different `EXPLAIN` detail levels. It now includes `partitionRatio`, `partitionsRatio`, and `partitions`, plus both `tabletRatio` and `tabletsRatio`.
- `QueryExecutionWallTime` was described as user-visible execution time, which could imply end-to-end client latency. It is now accurately described as wall-clock execution time.
- The shared-data scan guidance referred generically to remote read bytes. It now names the documented profile metric `CompressedBytesReadRemote` alongside `IOTimeRemote`.
- The post warned against leaving `pipeline_profile_level=2` enabled globally, but the variable is session-scoped. It now tells the reader to return the session to level 1 after the diagnostic.
- The slow-query threshold example did not state that `big_query_profile_threshold` generates threshold-based profiles when `enable_profile` is `false`. That condition is now explicit.

## Review Notes

- The SQL statements and system-variable assignments match current official syntax.
- The version claims were confirmed: `EXPLAIN ANALYZE`, `ANALYZE PROFILE`, and Runtime Query Profile are supported from v3.1; `COSTS` became the default `EXPLAIN` detail level in v3.3.5.
- `pipeline_profile_level=2` retains all profile layers and creates substantially larger profiles. Current documentation also notes that level 2 disables profile visualization tools.
- All six official-documentation links in the post returned HTTP 200 during validation.
