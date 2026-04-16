# Validation Summary: How to Use INSERT with FORMAT in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (database)
- clickhouse-client CLI
- ClickHouse HTTP interface (port 8123)
- ClickHouse native protocol (port 9000)
- Data formats: JSONEachRow, CSV, CSVWithNames, TabSeparated, TabSeparatedWithNames, Parquet, Native
- curl
- gzip / gunzip

## Sources Consulted
- ClickHouse Formats documentation: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse FORMAT clause: https://clickhouse.com/docs/sql-reference/statements/select/format
- ClickHouse Format Settings: https://clickhouse.com/docs/en/operations/settings/formats
- ClickHouse Command-Line Client docs: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse blog "An Introduction to Data Formats in ClickHouse": https://clickhouse.com/blog/data-formats-clickhouse-csv-tsv-parquet-native

## Issues Found

1. **Incorrect default format for clickhouse-client interactive mode.** The post stated: "`TabSeparated` is the default format for `clickhouse-client` interactive output". This is wrong — `PrettyCompact` is the default for interactive mode; `TabSeparated` is the default for batch (non-interactive) mode and the HTTP interface. Updated the sentence to read: "`TabSeparated` is the default format for `clickhouse-client` in batch mode (and for the HTTP interface), and a fast format for bulk loads."

2. **Misnamed setting `input_format_json_read_booleans_as_numbers`.** The actual ClickHouse setting is `input_format_json_read_bools_as_numbers` (note: "bools", not "booleans"). The original URL parameter would be silently ignored or rejected by the server. Renamed to the correct setting name in the curl example.

## Review Notes

- The claim "ClickHouse supports over 20 input/output formats" is conservative — ClickHouse actually supports 70+ formats today — but it remains technically true and was not changed.
- Parquet column matching by name is correct as the default behavior in ClickHouse; the position-vs-name matching is also configurable via `input_format_parquet_case_insensitive_column_matching` and related settings, but the default and most common case matches by name.
- The HTTP examples use `--data-binary` correctly; this is important to preserve newlines for line-based formats like JSONEachRow / TSV / CSV.
- The Content-Type header (`application/json` for JSONEachRow, `application/octet-stream` for Parquet) is informational — ClickHouse uses the `FORMAT` clause in the query to determine parsing, not the HTTP Content-Type header.
- Port assignments (9000 native, 8123 HTTP) are the documented defaults.
- The "FORMAT in the HTTP API" section's introductory sentence ("you can embed the format in the query string or as a URL parameter") is slightly imprecise — both code samples actually place the entire INSERT statement (including FORMAT) in the request body; the second sample additionally demonstrates passing a format setting via URL parameter. This is a wording/clarity issue rather than a technical error, so it was left as-is per the "only fix technical errors" instruction.
