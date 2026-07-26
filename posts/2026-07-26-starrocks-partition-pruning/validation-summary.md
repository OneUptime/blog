# Validation Summary: Why Is StarRocks Scanning Every Partition? A Partition-Pruning Troubleshooting Guide

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- StarRocks
- StarRocks SQL
- Expression, range, and list partitioning
- Hash bucketing and tablet pruning
- `EXPLAIN`, `EXPLAIN COSTS`, and `EXPLAIN ANALYZE`
- Query Profiles

## Sources Consulted

- [StarRocks data distribution](https://docs.starrocks.io/docs/table_design/data_distribution/)
- [StarRocks expression partitioning](https://docs.starrocks.io/docs/table_design/data_distribution/expression_partitioning/)
- [StarRocks range partitioning](https://docs.starrocks.io/docs/table_design/data_distribution/dynamic_partitioning/)
- [StarRocks list partitioning](https://docs.starrocks.io/docs/table_design/data_distribution/list_partitioning/)
- [StarRocks partitioning best practices](https://docs.starrocks.io/docs/best_practices/partitioning/)
- [StarRocks table clustering](https://docs.starrocks.io/docs/best_practices/table_clustering/)
- [StarRocks CREATE TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CREATE_TABLE/)
- [StarRocks SHOW CREATE TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/SHOW_CREATE_TABLE/)
- [StarRocks SHOW PARTITIONS](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/SHOW_PARTITIONS/)
- [StarRocks EXPLAIN](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN/)
- [StarRocks EXPLAIN ANALYZE](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN_ANALYZE/)
- [StarRocks Query Profile metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)
- [StarRocks DATETIME](https://docs.starrocks.io/docs/sql-reference/data-types/date-types/DATETIME/)
- [StarRocks time-zone configuration](https://docs.starrocks.io/docs/administration/management/timezone/)

## Issues Found

- The `CREATE TABLE` example placed `ORDER BY` before `PARTITION BY` and `DISTRIBUTED BY`, which does not follow StarRocks' required clause order. Moved `ORDER BY` after `DISTRIBUTED BY` so the statement is valid.
- The opening implied that extra memory or Backends can only make an unpruned scan more expensive. Clarified that these resources do not reduce the amount of data the planner selects; they may still affect execution speed or capacity.
- The statement that `365/365` is always a partition problem was too broad because a query can legitimately select all partitions. Limited the conclusion to a query expected to select one day.
- The post referred to a generic “default” partition, which is not the documented StarRocks range-partition term. Replaced it with the documented `MAXVALUE` catch-all and clarified that an unusually wide future partition is another layout to inspect.
- The `EXPLAIN ANALYZE` example used `SELECT ...`, which is illustrative but not executable SQL. Replaced it with the complete query used earlier in the guide.

## Review Notes

- The corrected `ORDER BY` form for the default Duplicate Key table requires StarRocks v3.3 or later. `EXPLAIN ANALYZE` is supported from v3.1 onward, and millisecond/microsecond `DATETIME` precision is supported from v3.3.5 onward.
- Current `EXPLAIN` output can use `partitions`/`tabletRatio` or `partitionsRatio`/`tabletsRatio` depending on the detail level, so the post is correct to tell readers to recognize both forms.
- Expression-partition pruning support for complex `DATETIME` function expressions is version-specific; current documentation states that pruning for most such functions is supported from v3.4.4.
