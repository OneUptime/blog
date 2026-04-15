# Validation Summary: How to Configure SSD and HDD Tiering in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, storage policies, TTL rules)
- SSD/HDD tiered storage configuration
- ClickHouse system tables (system.parts, system.disks)

## Sources Consulted
- ClickHouse MergeTree multiple volumes documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse SYSTEM statements (START TTL MERGES): https://clickhouse.com/docs/en/sql-reference/statements/system#start-ttl-merges
- ClickHouse ALTER TABLE TTL documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse system.parts table reference: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse system.disks table reference: https://clickhouse.com/docs/en/operations/system-tables/disks

## Issues Found
1. **Removed `<type>local</type>` from disk definitions**: The original post included `<type>local</type>` inside both the `<ssd>` and `<hdd>` disk definitions. In ClickHouse, local disks are defined simply with a `<path>` element — the `<type>` tag is only used for remote/external storage backends (S3, Azure Blob Storage, HDFS, etc.). Removed the `<type>local</type>` lines from both disk definitions to match the official documentation.

## Review Notes
- The `OPTIMIZE TABLE ... FINAL` command shown for forcing TTL processing works but is generally not recommended for routine daily operations per the ClickHouse documentation — it is better suited for administrative use. The post's usage in a "manual trigger" context is appropriate.
- All SQL queries against system.parts and system.disks use correct column names.
- The TTL TO VOLUME syntax, ALTER TABLE MODIFY TTL syntax, SYSTEM START TTL MERGES command, and EXPLAIN SELECT are all valid.
- The move_factor and max_data_part_size_bytes settings are correctly placed in the XML hierarchy.
