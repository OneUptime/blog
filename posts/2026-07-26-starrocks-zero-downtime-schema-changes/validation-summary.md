# Validation Summary: How to Run Zero-Downtime Schema Changes on Large StarRocks Tables

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- StarRocks SQL and online schema changes
- StarRocks shared-nothing and shared-data cluster architectures
- Fast Schema Evolution and Fast Schema Evolution v2
- Primary Key tables, partitioning, bucketing, and sort keys
- Materialized views, Routine Load, Stream Load, Flink, Kafka, and CDC
- Prometheus-compatible StarRocks monitoring metrics

## Sources Consulted

- [ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/ALTER_TABLE/)
- [SHOW ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/SHOW_ALTER/)
- [CANCEL ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CANCEL_ALTER_TABLE/)
- [CREATE TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CREATE_TABLE/)
- [CREATE TABLE LIKE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CREATE_TABLE_LIKE/)
- [SHOW PARTITIONS](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/SHOW_PARTITIONS/)
- [Schema tuning recipes](https://docs.starrocks.io/docs/best_practices/query_tuning/schema_tuning/)
- [Overview of table types](https://docs.starrocks.io/docs/table_design/table_types/)
- [Manage Alerts](https://docs.starrocks.io/docs/administration/management/monitoring/alert/)
- [StarRocks metric details: schema_change_mem_bytes](https://docs.starrocks.io/docs/administration/management/monitoring/metric_details/s/)
- [Official BE process metric prefix registration](https://github.com/StarRocks/starrocks/blob/main/be/src/service/service_be/starrocks_be.cpp)
- [Official schema-change memory metric registration](https://github.com/StarRocks/starrocks/blob/main/be/src/runtime/process_memory_metrics.cpp)
- [Compaction for shared-data clusters](https://docs.starrocks.io/docs/administration/management/compaction/)
- [Data modeling with materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/data_modeling_with_materialized_views/)
- [StarRocks table swap FAQ](https://docs.starrocks.io/docs/faq/Others/)
- [StarRocks v4.1 release notes](https://docs.starrocks.io/releasenotes/release-4.1/)
- [Official StarRocks SQL grammar](https://github.com/StarRocks/starrocks/blob/main/fe/fe-grammar/src/main/antlr/com/starrocks/grammar/StarRocks.g4)

## Issues Found

- The introduction stated too broadly that successful DDL submission only means an asynchronous job was accepted. Qualified this statement so it applies only to asynchronous paths; StarRocks also has synchronous operations, including swaps and Fast Schema Evolution v2 schema changes.
- The standard ALTER section described all column changes as asynchronous without acknowledging Fast Schema Evolution v2. Added the synchronous-path exception while retaining the documented asynchronous behavior for standard column, bucket, and rollup operations.
- The schema-change memory metric used the internal short name `schema_change_mem_bytes`. Changed it to the exported Prometheus metric name `starrocks_be_schema_change_mem_bytes`.
- The shadow-table instructions implied that `CREATE TABLE LIKE` could always be followed by the desired redesign. Clarified that `LIKE` is only an appropriate starting point when copied characteristics such as the table model and primary key already match, because a table's model cannot be changed after creation.
- The swap example qualified both table names. StarRocks syntax accepts a qualified source table but requires an unqualified identifier after `SWAP WITH`; changed `SWAP WITH analytics.orders_next` to `SWAP WITH orders_next`.
- The post did not state the documented materialized-view side effect of swapping tables. Added that dependent materialized views are automatically set inactive and must be reviewed and reactivated or rebuilt.

## Review Notes

- The documented Fast Schema Evolution version boundaries are current: shared-nothing support starts in v3.2.0, shared-data support starts in v3.3, and Fast Schema Evolution v2 is available for cloud-native tables in shared-data clusters from v4.1.
- The v4.1 defaults and downgrade caveats are accurately described. New v4.1 cloud-native tables enable Fast Schema Evolution v2 by default, while tables retained through an upgrade require explicit enablement.
- Shadow-table synchronization remains intentionally implementation-specific. A production rollout must ensure that its dual-write or CDC design preserves the selected boundary, deletes, and ordering through cutover and rollback.
