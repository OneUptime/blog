# Validation Summary: How to Write ClickHouse Data to Parquet on S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, s3 table function, INSERT INTO FUNCTION)
- Apache Parquet (file format, compression, row groups)
- Amazon S3 (object storage)
- Bash scripting (scheduled exports)

## Sources Consulted
- ClickHouse S3 Table Function documentation: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse Parquet Format documentation: https://clickhouse.com/docs/interfaces/formats/Parquet
- ClickHouse Format Settings documentation: https://clickhouse.com/docs/operations/settings/formats
- ClickHouse Integrating S3 guide: https://clickhouse.com/docs/integrations/s3
- ClickHouse Knowledgebase — S3 Export by Year/Month: https://clickhouse.com/docs/knowledgebase/s3_export_data_year_month_folders
- GitHub Issue #59522: Change the defaults of Parquet output compression
- GitHub Issue #49141: v23.3 broke Spark compatibility with LZ4 default

## Issues Found

### 1. Incorrect default Parquet compression codec (line 65)
- **What was wrong:** The post stated "ClickHouse writes Parquet with Snappy compression by default" and recommended setting `output_format_parquet_compression_method = 'zstd'` for better ratios. The default was changed from Snappy to LZ4 in v23.3, and later to Zstd in more recent versions. The current default is Zstd, making the original SET example redundant.
- **What was changed:** Updated the text to state the default is Zstd, and changed the SET example to show `'snappy'` as an alternative codec (useful for Spark compatibility), so the section still demonstrates how to control compression.
- **Why:** Claiming Snappy is the default is outdated. Showing how to set a non-default codec is more useful than redundantly setting the current default.

### 2. Invalid wildcard `*` for writing multiple files to S3 (lines 93-101)
- **What was wrong:** The post used `events_*.parquet` with a `*` wildcard in the S3 path for an INSERT operation. Glob patterns (`*`, `?`, `{...}`) are only supported for reading from S3, not writing. This query would not produce multiple output files as described.
- **What was changed:** Replaced the wildcard approach with the correct `PARTITION BY` mechanism using `{_partition_id}` in the URL path. The new example partitions by `toHour(event_time)` to create one file per hour.
- **Why:** `PARTITION BY` with `{_partition_id}` is the only supported way to write multiple output files from a single INSERT INTO FUNCTION s3() statement.

## Review Notes
- The `output_format_parquet_row_group_size` example (line 84) sets the value to 1,000,000, which is the default. It's not wrong but is redundant — a different value (e.g., 500,000 or 2,000,000) would better illustrate the setting's purpose. Left as-is since it's illustrative.
- The scheduled export script uses `date -d yesterday`, which is GNU date syntax (Linux only). It will not work on macOS (`date -v-1d` is the macOS equivalent). Since ClickHouse servers typically run on Linux, this is acceptable but could be noted.
- The partitioned write examples use URLs ending with `/` (e.g., `year={_partition_id}/`), which causes ClickHouse to auto-generate filenames within those directories. This works but the reader might expect to see explicit filenames. Left as-is since the behavior is correct.
