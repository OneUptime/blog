# Validation Summary: How to Export ClickHouse Data to Different File Formats

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL `FORMAT` clause, `INTO OUTFILE`, `clickhouse-client`, HTTP interface)
- Export formats: Parquet, ORC, Arrow, CSV / CSVWithNames, TabSeparatedWithNamesAndTypes, JSONEachRow (NDJSON), Native, RowBinary, Avro, Protobuf
- Compression codecs: gzip, deflate, br (Brotli), xz, zstd, lz4, bz2
- S3 table function (`INSERT INTO FUNCTION s3(...)`) with partitioning
- Bash / curl for HTTP export and parallel export scripting

## Sources Consulted
- ClickHouse SQL reference — INTO OUTFILE: https://clickhouse.com/docs/en/sql-reference/statements/select/into-outfile
- ClickHouse formats reference: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse format settings reference: https://clickhouse.com/docs/en/operations/settings/formats
- ClickHouse s3 table function docs: https://clickhouse.com/docs/en/sql-reference/table-functions/s3

## Issues Found
1. **Incorrect claim that `INTO OUTFILE` writes to the ClickHouse server filesystem.** According to the official docs, `INTO OUTFILE` redirects query results to a file on the **client** side (the machine running `clickhouse-client` or `clickhouse-local`). It is also not supported via the HTTP interface. Updated the "INTO OUTFILE" section to describe the correct client-side semantics and HTTP limitation, and changed the example path from `/var/lib/clickhouse/exports/...` (which implied a server path) to a generic `/path/to/exports/...`.
2. **Incorrect statement that "every format supported for input is also supported for output."** Several formats are output-only (e.g., `Pretty`, `Vertical`, `SQLInsert`) and others are input-only (e.g., `Regexp`, `MySQLDump`). Rewrote the sentence in the Overview to reflect this asymmetry.

## Review Notes
- `COMPRESSION 'zstd' LEVEL 3` syntax and the listed compression codecs (`none`, `gzip`, `deflate`, `br`, `xz`, `zstd`, `lz4`, `bz2`) are correct per the `INTO OUTFILE` docs. Note that valid `LEVEL` ranges depend on the codec (1–12 for lz4, 1–22 for zstd, 1–9 for the others); the post's `LEVEL 3` for zstd is in range.
- The `output_format_parquet_compression_method` setting name and accepted values (snappy, lz4, brotli, zstd, gzip, none) are accurate.
- Format names used in the examples (`Parquet`, `ORC`, `Arrow`, `CSVWithNames`, `TabSeparatedWithNamesAndTypes`, `JSONEachRow`, `Native`, `RowBinary`) are the correct ClickHouse names.
- The `INSERT INTO FUNCTION s3(url, access_key, secret_key, format)` signature and the `{_partition_id}` placeholder with `PARTITION BY` are valid ClickHouse usage.
- The parallel-export bash loop will work, but users should be aware that each shard is a full independent query against `events`; for very large tables, running 12 concurrent scans can strain cluster resources. This is a caveat rather than an error.
