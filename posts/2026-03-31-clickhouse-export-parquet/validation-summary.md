# Validation Summary: How to Export ClickHouse Data to Parquet Files

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (clickhouse-client, HTTP interface, s3 table function)
- Parquet file format
- AWS S3
- DuckDB (`read_parquet`)
- Bash / cron for scheduling

## Sources Consulted
- ClickHouse Parquet format docs: https://clickhouse.com/docs/en/interfaces/formats#data-format-parquet
- ClickHouse client interface: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse HTTP interface: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse `s3` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse date functions (`toDate`, `toYYYYMM`, `today`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- DuckDB `read_parquet`: https://duckdb.org/docs/data/parquet/overview.html
- AWS CLI `s3 cp` (stdin support with `-`): https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
No technical issues found.

- `clickhouse-client --format Parquet` is the correct way to set output format.
- HTTP interface using `default_format=Parquet` query string parameter and `X-ClickHouse-User` / `X-ClickHouse-Key` headers is correct.
- `INSERT INTO FUNCTION s3(url, access_key, secret_key, format)` matches the documented `s3` table function signature.
- `toYYYYMM(ts) = 202603` and `toDate(ts) = today()` are valid ClickHouse expressions.
- `aws s3 cp - s3://...` correctly streams stdin to S3.
- DuckDB `read_parquet('events.parquet')` is valid syntax.

## Review Notes
- The `s3` table function signature also supports an optional `compression` parameter (e.g., `'gzip'`, `'snappy'`); for production Parquet exports, callers may want to set `output_format_parquet_compression_method` (defaults to `lz4` in newer versions, `snappy` historically) but this is configuration, not a correctness issue.
- The HTTP example uses GET; for very large queries, POST is recommended to avoid URL length limits, though GET works for short queries as shown.
- Hardcoding `AWS_KEY` / `AWS_SECRET` in SQL is fine for the example but in production, IAM roles or named collections (`s3(named_collection_name, ...)`) are preferable. Out of scope for this tutorial.
- The cron script does not include `--host`, `--user`, or `--password`; it implicitly uses local defaults — fine when run alongside the ClickHouse server.
