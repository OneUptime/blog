# Validation Summary: How to Use RawBLOB Format in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (RawBLOB format, HTTP interface, MergeTree engine, Memory engine)
- curl (HTTP client for ClickHouse HTTP interface)
- zstd (compression)
- SQL (DDL and DML statements)

## Sources Consulted
- ClickHouse RawBLOB Format documentation — https://clickhouse.com/docs/interfaces/formats/RawBLOB
- ClickHouse String Data Type documentation — https://clickhouse.com/docs/sql-reference/data-types/string
- ClickHouse HTTP Interface documentation — https://clickhouse.com/docs/en/interfaces/http
- ClickHouse file() Table Function documentation — https://clickhouse.com/docs/sql-reference/table-functions/file
- ClickHouse Format Settings documentation — https://clickhouse.com/docs/operations/settings/formats

## Issues Found

1. **Broken curl INSERT with VALUES clause (critical)**: The original post showed inserting binary data by splitting a VALUES clause between the URL query parameter and the POST body (e.g., `...VALUES+(1,%27logo.png%27,%27image/png%27,` with binary data as the body). This does not work because ClickHouse's HTTP interface inserts a line feed between the query parameter and the POST body, breaking SQL syntax. Removed the broken example and restructured the section to present the staging table approach as the primary (and correct) method.

2. **Broken config file storage curl example (critical)**: The config_versions INSERT curl command had the same broken VALUES-splitting pattern, and additionally was missing the `created_by` column value entirely. Replaced with the correct staging table approach consistent with the rest of the post.

3. **Incorrect String size limit claim**: The post stated "String columns in ClickHouse can hold up to 1 GB by default per value." The official ClickHouse documentation states that String type has no formal size limit — "Strings of an arbitrary length. The length is not limited." The 1 GB figure likely comes from `format_binary_max_string_size` which is a format-level deserialization guard, not a storage limit. Corrected to accurately reflect that there is no formal limit, with practical constraints governed by memory settings.

## Review Notes
- The mention of `FixedString` alongside `String` in the single row/column requirement section is plausible but not explicitly confirmed in the official RawBLOB documentation, which says "a single field of type String or similar." Left as-is since it is not clearly wrong.
- The `file()` table function example with RawBLOB (`SELECT * FROM file('logo.png', RawBLOB)`) is reasonable but not shown in official RawBLOB examples. The `file()` function does support a format parameter, so this should work.
- The format comparison table is a helpful simplification but could be expanded with more formats in the future.
