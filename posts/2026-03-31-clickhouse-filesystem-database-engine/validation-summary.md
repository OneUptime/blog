# Validation Summary: How to Use Filesystem as a Database Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse File table engine
- ClickHouse S3 table engine and `s3()` table function
- ClickHouse HDFS table engine
- ClickHouse URL engine (mentioned)
- File formats: CSV, TSV, JSONEachRow, Parquet, ORC, Avro, Arrow, Native
- Hive-style partitioning

## Sources Consulted
- ClickHouse File Engine docs: https://clickhouse.com/docs/engines/table-engines/special/file
- ClickHouse S3 Engine docs: https://clickhouse.com/docs/engines/table-engines/integrations/s3
- ClickHouse `file()` table function docs: https://clickhouse.com/docs/sql-reference/table-functions/file

## Issues Found
1. **Incorrect File engine path parameter.** The post showed `ENGINE = File(TSV, '/var/log/app/access.log')` as a way to bind a persistent File table to an arbitrary path. ClickHouse Server explicitly does not allow specifying a filesystem path for the `File` engine — only the `Format` parameter is accepted in `CREATE TABLE`, and data is always stored under the configured data directory. Replaced the example with the correct `file()` table function, which reads a relative path from `user_files_path`.
2. **Default path was slightly off.** The post stated the default file location as `{data_path}/default/local_csv/data.csv`. Per the official docs, the actual default is `{data_path}/data/default/<table>/data.<Format>` (note the `data/` subdirectory and the format-cased extension). Updated to `{data_path}/data/default/local_csv/data.CSV`.

## Review Notes
- S3 engine syntax, including credentials ordering and glob support, matches current docs.
- INSERT into S3 is supported but with the documented caveat that rows can only be inserted into new files (controlled via `s3_truncate_on_insert` / `s3_create_new_file_on_insert`). The post's one-line note about "creates a new file (or appends depending on settings)" is a reasonable simplification.
- Hive-style partitioning via the S3 engine is supported through the `partition_strategy=HIVE` option; the post's glob-based example is valid for read-side path matching.
- The `file()` table function only accepts paths relative to `user_files_path`; absolute paths are not supported in ClickHouse Server (they are in `clickhouse-local`). The fix preserves this constraint.
