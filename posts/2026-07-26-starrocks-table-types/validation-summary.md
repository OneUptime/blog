# Validation Summary: Which StarRocks Table Type Fits Your Workload?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- StarRocks internal tables
- Duplicate Key tables
- Aggregate tables and aggregate-function states
- Unique Key tables
- Primary Key tables
- StarRocks SQL DDL
- Expression partitioning
- Hash, random, and range-based bucketing
- Sort keys and prefix indexes
- CDC, upserts, deletes, partial updates, and conditional updates
- Primary-key indexes and delete vectors

## Sources Consulted

- [Overview of table types](https://docs.starrocks.io/docs/table_design/table_types/)
- [Capabilities of different table types](https://docs.starrocks.io/docs/table_design/table_types/table_capabilities/)
- [Duplicate Key table](https://docs.starrocks.io/docs/table_design/table_types/duplicate_key_table/)
- [Aggregate table](https://docs.starrocks.io/docs/table_design/table_types/aggregate_table/)
- [Unique Key table](https://docs.starrocks.io/docs/table_design/table_types/unique_key_table/)
- [Primary Key table](https://docs.starrocks.io/docs/table_design/table_types/primary_key_table/)
- [CREATE TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CREATE_TABLE/)
- [Expression partitioning](https://docs.starrocks.io/docs/table_design/data_distribution/expression_partitioning/)
- [Data distribution](https://docs.starrocks.io/docs/table_design/data_distribution/)
- [Prefix indexes](https://docs.starrocks.io/docs/table_design/indexes/Prefix_index_sort_key/)
- [Change data through loading](https://docs.starrocks.io/docs/loading/Load_to_Primary_Key_tables/)
- [Load data using INSERT](https://docs.starrocks.io/docs/loading/InsertInto/)
- [tables_config](https://docs.starrocks.io/docs/sql-reference/information_schema/tables_config/)
- [StarRocks version 3.3 release notes](https://docs.starrocks.io/releasenotes/release-3.3/)
- [StarRocks version 3.4 release notes](https://docs.starrocks.io/releasenotes/release-3.4/)

## Issues Found

- The Primary Key explanation called a replacement row "newer," which could imply that the `updated_at` sort column controls conflict resolution. By default, replacement follows load/commit order; conditional update behavior must be configured separately. The text now says that a later committed upsert replaces the old logical row by default and explicitly states that the sort column does not determine update order.
- The post said that Primary Key tables use hash rather than random bucketing without accounting for the range-based distribution semantic added in v4.1. The text now preserves the rule that random bucketing is unsupported, identifies hash bucketing as the required default strategy, and notes the v4.1 range-based option gated by `enable_range_distribution`.

## Review Notes

- All four `CREATE TABLE` examples match the current StarRocks DDL rules: key columns precede value columns, required partitioning and hash-bucketing columns are included in Aggregate/Primary keys, and the Primary Key sort key is valid.
- The v3.1 random-bucketing, v3.3 `ORDER BY`, v3.4 generic aggregate-state, v3.0 Primary Key sort-key, and 128-byte encoded Primary Key limit claims match the official documentation.
- Generic aggregate-function states remain documented as a Beta feature in the current StarRocks 4.1 documentation.
- The explicit `"enable_persistent_index" = "true"` property is valid, although `true` is currently the documented default.
- The post's documentation links resolve to the intended official StarRocks pages.
