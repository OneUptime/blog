# Validation Summary: How to Fix Data Skew in StarRocks Hash Joins and Distributed Tables

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- StarRocks
- Distributed hash joins
- Query Profile and EXPLAIN ANALYZE
- Hash, composite, and random bucketing
- Broadcast, Shuffle, Bucket Shuffle, and Colocate Join strategies
- Skew Join V2
- Cost-based optimizer statistics

## Sources Consulted

- [StarRocks Skew Join V2](https://docs.starrocks.io/docs/using_starrocks/skew_join_v2/)
- [StarRocks Query Profile Overview](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_overview/)
- [StarRocks Query Profile Metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)
- [StarRocks Query Tuning Recipes](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_tuning_recipes/)
- [StarRocks EXPLAIN ANALYZE](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN_ANALYZE/)
- [StarRocks Query Hint](https://docs.starrocks.io/docs/best_practices/query_tuning/query_hint/)
- [StarRocks Bucketing](https://docs.starrocks.io/docs/best_practices/bucketing/)
- [StarRocks Data Distribution](https://docs.starrocks.io/docs/table_design/data_distribution/)
- [StarRocks ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/ALTER_TABLE/)
- [StarRocks SHOW ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/SHOW_ALTER/)
- [StarRocks tables_config](https://docs.starrocks.io/docs/sql-reference/information_schema/tables_config/)
- [StarRocks Colocate Join](https://docs.starrocks.io/docs/using_starrocks/Colocate_join/)
- [StarRocks Gather Statistics for CBO](https://docs.starrocks.io/docs/using_starrocks/Cost_based_optimizer/)

## Issues Found

- The command named for monitoring an asynchronous distribution optimization was incomplete. Changed `SHOW ALTER TABLE` to `SHOW ALTER TABLE OPTIMIZE`, the documented statement for inspecting bucketing-method and bucket-count optimization jobs.

## Review Notes

- The post's v3.2 qualification for changing bucketing after table creation and its shared-data limitation match the current StarRocks 4.1 documentation.
- Skew Join V2 still requires manually supplied heavy values and currently supports INNER, LEFT, LEFT SEMI, and LEFT ANTI joins with the skewed large table on the left.
- Random bucketing remains limited to Duplicate Key tables and does not support bucket pruning, Bucket Shuffle Join, or Colocate Join.
