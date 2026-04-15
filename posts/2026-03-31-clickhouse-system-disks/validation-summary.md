# Validation Summary: How to Use system.disks in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system.disks table, system.parts table, storage_configuration)
- S3 object storage integration
- Azure Blob Storage integration
- HDFS integration
- ClickHouse tiered storage / storage policies

## Sources Consulted
- ClickHouse official documentation: system.disks table (https://clickhouse.com/docs/en/operations/system-tables/disks)
- ClickHouse official documentation: system.parts table (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse official documentation: storage configuration and multi-volume storage (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes)
- ClickHouse official documentation: formatReadableSize function (https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize)
- ClickHouse official documentation: S3 disk configuration (https://clickhouse.com/docs/en/integrations/s3)

## Issues Found
1. **ORDER BY on formatted string in "Which Parts Live on Which Disk" query**: The query used `ORDER BY data_size DESC` where `data_size` is the alias for `formatReadableSize(sum(p.data_compressed_bytes))`. Since `formatReadableSize()` returns a human-readable string (e.g., "1.00 GiB", "500.00 MiB"), ordering by this alias performs string comparison rather than numeric comparison, producing incorrect sort order. Fixed to `ORDER BY sum(p.data_compressed_bytes) DESC` to sort by the raw byte count.

## Review Notes
- The "Key Columns" table covers the most commonly used columns but omits some newer columns added in recent ClickHouse versions (e.g., `is_remote`, `is_read_only`, `is_write_once`, `is_broken`, `object_storage_type`, `metadata_type`). This is acceptable since the post focuses on the most useful columns.
- The `type` column values listed (local, s3, s3_plain, azure, hdfs, web) cover the most common disk types. Additional types exist in newer versions (e.g., `s3_plain_rewritable`, `object_storage`, `cache`, `encrypted`, `local_blob_storage`) but are not essential for this introductory post.
- The "Viewing All Disks" query's `used_pct` calculation uses `free_space / total_space` which works correctly in ClickHouse since the `/` operator returns Float64 even for integer operands. However, it could produce a division-by-zero for remote disks where `total_space` may be 0. A production alert query should add a `WHERE total_space > 0` guard.
- All SQL syntax is correct and uses valid ClickHouse functions (`formatReadableSize`, `round`, `currentDatabase`, `count`).
- The XML configuration examples use correct parameter names and structure for ClickHouse storage configuration.
