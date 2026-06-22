# Validation Summary: How to Configure Apache Hudi Tables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Hudi
- Apache Spark and PySpark
- Spark SQL
- Hudi Copy-on-Write and Merge-on-Read tables
- Hudi indexing, compaction, clustering, incremental queries, time travel, CDC, and schema evolution

## Sources Consulted
- Apache Hudi 1.2.0 All Configurations: https://hudi.apache.org/docs/configurations/
- Apache Hudi Table & Query Types: https://hudi.apache.org/docs/table_types/
- Apache Hudi Spark Quick Start: https://hudi.apache.org/docs/quick-start-guide/
- Apache Hudi Batch Writes: https://hudi.apache.org/docs/writing_data/
- Apache Hudi SQL Queries: https://hudi.apache.org/docs/sql_queries/
- Apache Hudi SQL Procedures: https://hudi.apache.org/docs/procedures/

## Issues Found
- The architecture overview implied all Hudi tables use delta log files. Updated it to clarify that delta logs are used by Merge-on-Read tables, while all table actions are tracked in the timeline.
- Removed `hoodie.bloom.index.update.partition.path` from a non-global Bloom index example because the official docs state it only applies to `GLOBAL_BLOOM`.
- Replaced the incorrect Bloom false-positive-rate key `hoodie.bloom.index.filter.fpp` with the documented `hoodie.index.bloom.fpp`.
- Replaced the HBase index example with the documented `GLOBAL_RECORD_LEVEL_INDEX`, because current Hudi index documentation no longer lists `HBASE` as a valid `hoodie.index.type`.
- Corrected the compaction target I/O value from a byte-like value to `500`, because `hoodie.compaction.target.io` is configured in MB, not bytes.
- Fixed the compaction example so the Spark session enables Hudi SQL extensions and the `run_compaction` procedure targets the table path directly.
- Corrected the clustering strategy key from `hoodie.clustering.plan.strategy.class` to `hoodie.clustering.execution.strategy.class` for `SparkSortAndSizeExecutionStrategy`, and removed an undocumented clustering metadata preservation option.
- Clarified that archived timeline instants are not themselves enough to make old data queryable; cleaner retention and savepoints determine what historical file versions remain available.
- Updated the CDC result handling example to use Hudi CDC columns such as `op`, `ts_ms`, `before`, and `after` instead of non-existent `_hoodie_operation` and `_hoodie_change_key` columns.
- Added missing Hudi write key options and the missing `lit` import to the schema evolution example so the snippet is complete.

## Review Notes
The post remains version-general, but several details were checked against Apache Hudi 1.2.0 documentation. Some Hudi APIs and config aliases continue to evolve, especially around record merge fields and incremental checkpoint semantics, so future updates should state a target Hudi version explicitly.
