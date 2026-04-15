# Validation Summary: How to Query S3 Files with clickhouse-local

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (clickhouse-local)
- S3 table function (`s3()`)
- Amazon S3 / S3-compatible object storage (MinIO, Cloudflare R2)
- Apache Parquet, CSV, JSON/NDJSON file formats
- AWS IAM instance profiles

## Sources Consulted
- ClickHouse official documentation: S3 table function — https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse official documentation: clickhouse-local — https://clickhouse.com/docs/en/operations/utilities/clickhouse-local
- ClickHouse official documentation: file table function — https://clickhouse.com/docs/en/sql-reference/table-functions/file
- ClickHouse official documentation: INSERT INTO FUNCTION — https://clickhouse.com/docs/en/sql-reference/statements/insert-into#inserting-into-a-table-function

## Issues Found
- **Inconsistent format name quoting**: Three format names were unquoted (`JSONEachRow` in the environment variables example, `Parquet` in two `file()` calls) while all other format names in the post were properly quoted as string literals (e.g., `'Parquet'`, `'CSVWithNames'`). The official ClickHouse documentation consistently uses single-quoted strings for format names in table function calls. Fixed all three instances to use quoted strings for consistency with official docs and with the rest of the post.

## Review Notes
- The `use_environment_credentials` setting must be active for ClickHouse to pick up `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` from environment variables. This defaults to enabled in standard configurations, so the blog post's approach works out of the box, but readers with custom ClickHouse configurations should be aware of this setting.
- The post correctly distinguishes between omitting credentials (which falls through to the credential chain for IAM roles) and the `NOSIGN` keyword (which is for unsigned/public bucket access). The IAM role section is accurate.
- The `clickhouse local` subcommand form (with a space) is the modern invocation. The older `clickhouse-local` hyphenated binary also works but the modern form used here is preferred.
