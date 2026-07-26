# Validation Summary: How Do You Choose Bucketing Columns and Bucket Counts in StarRocks?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- StarRocks 2.5.7 through 4.1
- StarRocks hash, random, and range-based bucketing
- StarRocks expression partitioning
- Primary Key, Duplicate Key, Aggregate, and Unique Key tables
- Colocate Join and bucket-shuffle execution
- StarRocks Query Profiles and Information Schema

## Sources Consulted
- [StarRocks data distribution](https://docs.starrocks.io/docs/table_design/data_distribution/)
- [StarRocks bucketing best practices](https://docs.starrocks.io/docs/best_practices/bucketing/)
- [Feature Support: Data Distribution](https://docs.starrocks.io/docs/table_design/data_distribution/feature-support-data-distribution/)
- [StarRocks CREATE TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CREATE_TABLE/)
- [StarRocks ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/ALTER_TABLE/)
- [StarRocks SHOW ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/SHOW_ALTER/)
- [Primary Key table](https://docs.starrocks.io/docs/table_design/table_types/primary_key_table/)
- [Capabilities of different table types](https://docs.starrocks.io/docs/table_design/table_types/table_capabilities/)
- [Colocate Join](https://docs.starrocks.io/docs/using_starrocks/Colocate_join/)
- [Information Schema `tables_config`](https://docs.starrocks.io/docs/sql-reference/information_schema/tables_config/)
- [Query Profile Overview](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_overview/)
- [Query Profile Metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)

## Issues Found
- The post referred to checking a redistribution job with the incomplete command text `SHOW ALTER TABLE`. Changed it to `SHOW ALTER TABLE OPTIMIZE`, which is the documented statement for monitoring asynchronous table-schema optimization operations such as changes to bucketing methods and bucket counts.

## Review Notes
- The SQL examples match the current StarRocks grammar and documented table-model constraints. In particular, the Primary Key example includes both its partitioning and bucketing columns in the primary key, and the Duplicate Key example is eligible for random bucketing.
- The version claims were confirmed: automatic bucket-count selection is available from v2.5.7, random bucketing from v3.1, post-creation distribution optimization from v3.2, and range-based distribution from v4.1 behind the disabled-by-default `enable_range_distribution` FE setting.
- The tablet-size guidance is presented as a benchmark starting point rather than a hard invariant, which is appropriate because current documentation distinguishes recommended targets from v4.1 maximum-size behavior.
- Random bucketing can dynamically increase bucket counts from v3.2 only when `bucket_size` is configured. The post correctly avoids claiming that every automatically selected bucket count adapts indefinitely.
