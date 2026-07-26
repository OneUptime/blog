# Validation Summary: Why Are StarRocks Primary Key Upserts Slowing Down? Index, Compaction, and Schema Checks

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- StarRocks Primary Key tables
- StarRocks shared-data and shared-nothing clusters
- Primary key indexes and persistent indexes
- DelVector-based Delete+Insert updates
- Data loading, upserts, deletes, partial updates, and conditional updates
- Routine Load
- Tablet versions, rowsets, and compaction
- StarRocks Information Schema and `SHOW PROC`

## Sources Consulted

- [StarRocks Primary Key table](https://docs.starrocks.io/docs/table_design/table_types/primary_key_table/)
- [StarRocks Primary Key table best practices](https://docs.starrocks.io/docs/best_practices/primarykey_table/)
- [Compaction for shared-data clusters](https://docs.starrocks.io/docs/administration/management/compaction/)
- [Information Schema `tables_config`](https://docs.starrocks.io/docs/sql-reference/information_schema/tables_config/)
- [StarRocks `ALTER TABLE`](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/ALTER_TABLE/)
- [StarRocks `SHOW PROC`](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/nodes_processes/SHOW_PROC/)
- [StarRocks `SHOW TRANSACTION`](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/SHOW_TRANSACTION/)
- [Change data through loading](https://docs.starrocks.io/docs/loading/Load_to_Primary_Key_tables/)
- [StarRocks `CREATE ROUTINE LOAD`](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [Feature differences between shared-nothing and shared-data clusters](https://docs.starrocks.io/docs/introduction/feature_difference/)

## Issues Found

- The opening description said that StarRocks records the old row location in a delete vector. The primary key index stores the row-location mapping, while the DelVector stores deletion markers for rows in segment files. The text now accurately says that StarRocks locates the old row through the index, marks it deleted in the DelVector, writes the replacement to a new data file, and updates the index.
- The shared-data slowdown example identified the message as an `ErrMsg`. In the current documented transaction result, the compaction-delay text appears in the `Reason` column, and the `SHOW TRANSACTION` reference defines `Reason` as the transaction error-message field. The post now directs readers to the `Reason` field.

## Review Notes

- The SQL statements, Information Schema column names, memory-tracker URLs, configuration parameter names, error examples, threshold behavior, and manual compaction syntax were verified against the current StarRocks 4.1 documentation.
- Several capabilities are version-dependent. In particular, shared-data Primary Key tables and persistent-index storage options were introduced incrementally, per-job Routine Load timing controls require v3.1.0 or later, and manual compaction requires v3.1 or later. Operators should verify behavior against the documentation for their deployed StarRocks release.
