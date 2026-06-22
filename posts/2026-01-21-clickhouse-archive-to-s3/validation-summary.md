# Validation Summary: How to Archive Old Data from ClickHouse to S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse MergeTree
- ClickHouse storage policies and S3 disks
- ClickHouse TTL
- ClickHouse S3 table function
- ClickHouse S3 table engine
- Amazon S3
- Altinity clickhouse-backup

## Sources Consulted
- ClickHouse Docs: External disks for storing data - https://clickhouse.com/docs/operations/storing-data
- ClickHouse Docs: Manage data with TTL - https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse Docs: s3 table function - https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse Docs: S3 table engine - https://clickhouse.com/docs/engines/table-engines/integrations/s3
- ClickHouse Docs: INSERT INTO statement - https://clickhouse.com/docs/sql-reference/statements/insert-into
- ClickHouse Docs: Drop partitions - https://clickhouse.com/docs/managing-data/drop_partition
- ClickHouse Docs: Custom partitioning key - https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- Altinity clickhouse-backup Manual - https://github.com/Altinity/clickhouse-backup/blob/master/Manual.md

## Issues Found
- The S3 cache configuration used incorrect current settings (`cache_enabled`, `cache_path`, and inline cache fields on the S3 disk). Updated it to use a current cache disk wrapper with `type` set to `cache`, `disk` pointing at the S3 disk, `path`, and `max_size`.
- The TTL example referenced `storage_policy = 'default_with_s3'`, but the configuration did not define that policy. Added a matching storage policy with hot local and cold S3-backed cache volumes.
- The TTL example moved data to `s3_archive`, while the corrected cache configuration exposes the cached disk as `s3_archive_cache`. Updated the TTL target to that disk.
- The export-and-drop strategy dropped partition `202401`, but the `events` table had no matching partition key. Added `PARTITION BY toYYYYMM(timestamp)` so the monthly partition exists.
- The S3 export wrote to a directory-like URL. Updated it to write to a concrete Parquet object path, matching ClickHouse `INSERT INTO FUNCTION s3` examples.
- The `archive_manifest` insert selected five columns for a seven-column table and used `location` instead of `s3_location`. Added an explicit insert column list and supplied values for `size_bytes`, `s3_location`, and `retention_until`.
- The `clickhouse-backup` example used `create_remote` followed by `upload`, but `create_remote` already creates and uploads the backup. Changed the first command to `create` so the separate `upload` command is correct.
- The S3 table engine example omitted the table column list. Added the `timestamp DateTime` and `data String` columns required by `CREATE TABLE ... ENGINE = S3(...)`.

## Review Notes
- The `size_bytes` value in the manifest example is set to `0` as a placeholder because the article does not calculate exported object size. A production workflow should populate it from S3 object metadata or another measured source.
