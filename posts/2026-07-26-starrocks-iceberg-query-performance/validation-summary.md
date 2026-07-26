# Validation Summary: Why Are StarRocks Iceberg Queries Slow? Metadata Cache, Statistics, and File-Pruning Fixes

## Status
validated

## Post Type
Technical troubleshooting and performance-tuning guide

## Technologies Covered

- StarRocks 3.4, 3.5, 4.0, and 4.1
- Apache Iceberg
- StarRocks external Iceberg catalogs
- StarRocks Query Profile and `EXPLAIN VERBOSE`
- Iceberg metadata caching and metadata planning
- Cost-based optimizer statistics and `ANALYZE TABLE`
- Iceberg partition, manifest, and data-file pruning
- Iceberg data-file compaction and manifest rewriting
- Object storage and data caching

## Sources Consulted

- [StarRocks Iceberg catalog documentation](https://docs.starrocks.io/docs/data_source/catalog/iceberg/iceberg_catalog/)
- [StarRocks Iceberg procedures documentation](https://docs.starrocks.io/docs/data_source/catalog/iceberg/procedures/)
- [StarRocks system variables](https://docs.starrocks.io/docs/sql-reference/System_variable/)
- [StarRocks cost-based optimizer statistics](https://docs.starrocks.io/docs/using_starrocks/Cost_based_optimizer/)
- [StarRocks `ANALYZE TABLE` reference](https://docs.starrocks.io/docs/sql-reference/sql-statements/cbo_stats/ANALYZE_TABLE/)
- [StarRocks Query Profile overview](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_overview/)
- [StarRocks Query Profile metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)
- [StarRocks `LAST_QUERY_ID()` reference](https://docs.starrocks.io/docs/sql-reference/sql-functions/utility-functions/last_query_id/)
- [StarRocks `EXPLAIN` reference](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN/)
- [StarRocks `SHOW CREATE CATALOG` reference](https://docs.starrocks.io/docs/sql-reference/sql-statements/Catalog/SHOW_CREATE_CATALOG/)
- [StarRocks 4.0 release notes](https://docs.starrocks.io/releasenotes/release-4.0/)
- [StarRocks 4.1 release notes](https://docs.starrocks.io/releasenotes/release-4.1/)
- [StarRocks 4.1.3 SQL grammar](https://github.com/StarRocks/starrocks/blob/4.1.3/fe/fe-grammar/src/main/antlr/com/starrocks/grammar/StarRocks.g4)
- [StarRocks 4.1.3 connector-property implementation](https://github.com/StarRocks/starrocks/blob/4.1.3/fe/fe-core/src/main/java/com/starrocks/connector/ConnectorProperties.java)
- [StarRocks 4.1.3 session-variable implementation](https://github.com/StarRocks/starrocks/blob/4.1.3/fe/fe-core/src/main/java/com/starrocks/qe/SessionVariable.java)
- [Apache Iceberg partitioning documentation](https://iceberg.apache.org/docs/latest/partitioning/)
- [Apache Iceberg performance documentation](https://iceberg.apache.org/docs/latest/performance/)
- [Apache Iceberg maintenance documentation](https://iceberg.apache.org/docs/latest/maintenance/)
- [Apache Iceberg specification](https://iceberg.apache.org/spec/)

## Issues Found

- The introduction attributed all manifest reading and parsing to the StarRocks frontend. In distributed metadata-planning mode, backends or compute nodes parse manifests. The text now distinguishes frontend planning from local or distributed manifest parsing.
- The baseline directed readers to inspect a Query Profile without enabling profile collection, even though the `enable_profile` session variable defaults to `false`. Added `SET enable_profile = true;` before the baseline query.
- The post called the metadata-planning setting “adaptive,” but the actual `plan_mode` value is `auto`; `local` and `distributed` are the other valid values. Updated the terminology while retaining the explanation of adaptive behavior.
- The pruning example used ANSI `TIMESTAMP` literals. StarRocks native SQL uses the `DATETIME` type, and its 4.1.3 grammar accepts typed `DATE` and `DATETIME` literals, not a typed `TIMESTAMP` literal. Replaced both literals with `DATETIME`.
- The external-metadata statistics discussion did not name the actual session control and stated a single default across releases. Updated it to use `enable_iceberg_column_statistics`, documented that this session variable defaults to `false`, and clarified that `enable_get_stats_from_external_metadata` defaults to `false` in the 3.4/3.5 lines and 4.0.0 but to `true` from 4.0.1 onward in the 4.x line.
- The maintenance section did not state the procedure release boundaries. Clarified that `rewrite_data_files` is available from StarRocks 4.0 and `rewrite_manifests` from 4.1.
- The `rewrite_data_files` example compared a date column with an untyped string despite the post's advice to avoid implicit casts. Replaced it with a typed `DATE` literal.

## Review Notes

- The current Iceberg catalog documentation still lists `enable_get_stats_from_external_metadata` as defaulting to `false`, while the StarRocks 4.0.1 release notes state that metadata statistics became enabled by default and the 4.1.3 implementation uses `true`. The post follows the versioned release notes and implementation and explicitly preserves the 3.4/3.5 behavior.
- The remaining SQL examples and configuration names match the current StarRocks references. The maintenance commands still require a writable catalog, suitable privileges, and a table whose partitioning makes the `WHERE` predicate select the intended partition.
- Iceberg hidden partitioning, partition evolution, manifest/file pruning, file-level metrics, delete-file handling, and manifest maintenance descriptions agree with the Apache Iceberg documentation and specification.
