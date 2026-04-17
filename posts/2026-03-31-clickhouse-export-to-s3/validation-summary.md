# Validation Summary: How to Export ClickHouse Data to S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (`s3` table function, `INSERT INTO FUNCTION`)
- Amazon S3
- Parquet, CSV output formats
- IAM role-based credentials / environment credentials
- MinIO (S3-compatible storage)
- Bash scripting with `clickhouse-client`

## Sources Consulted
- [ClickHouse `s3` Table Function docs](https://clickhouse.com/docs/en/sql-reference/table-functions/s3)
- [ClickHouse S3 Table Engine / Integration docs](https://clickhouse.com/docs/en/engines/table-engines/integrations/s3)
- [ClickHouse settings: `s3_create_new_file_on_insert`, `use_environment_credentials`](https://clickhouse.com/docs/en/operations/settings/settings)
- ClickHouse GitHub issues/discussions on `s3_create_new_file_on_insert` and s3 PARTITION BY

## Issues Found
1. **Invalid URL placeholder `{_part_index}`** — In the "Exporting Multiple Files with Globs" section, the post used `{_part_index}` as a placeholder in the S3 URL. ClickHouse does not support this placeholder for s3 writes. The correct approach is `{_partition_id}` in combination with a `PARTITION BY` clause (or `s3_create_new_file_on_insert = 1` to auto-suffix filenames). Rewrote the section to use `PARTITION BY rand() % 10` with `{_partition_id}`, and added a note about `s3_create_new_file_on_insert`. Section heading updated from "...with Globs" to "...with Partitioning" to accurately reflect the mechanism.
2. **Broken `seq` date-iteration loop** — The bash script used `seq -f "%04g-%02g-%02g" 2026 01 01 to 2026 03 31`, which is not valid `seq` syntax (no `to` keyword, `%g` is a float format, and `seq` cannot iterate calendar dates). Replaced with a proper `while` loop using `date -I -d "$d + 1 day"` to advance through dates.
3. **Incomplete `<s3>` config example** — The original config snippet wrapped `<use_environment_credentials>` directly inside `<s3>`, but ClickHouse requires the setting to be nested within a named endpoint block (the setting is matched by URL prefix). Updated to the documented `<s3><my_endpoint><endpoint>...</endpoint><use_environment_credentials>true</use_environment_credentials></my_endpoint></s3>` form.

## Review Notes
- The main `INSERT INTO FUNCTION s3(url, [key, secret,] format)` signature and the MinIO / path-style S3 URL usage are correct.
- The "Reading Back from S3" SELECT via the `s3` table function is correct.
- The `CSVWithNames` and `Parquet` format names are both valid ClickHouse format identifiers.
- Consider also mentioning the `s3_truncate_on_insert` setting as a companion to `s3_create_new_file_on_insert` in a future revision, since users often hit the "file already exists" error without it.
