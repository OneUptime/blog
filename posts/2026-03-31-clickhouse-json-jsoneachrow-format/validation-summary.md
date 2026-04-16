# Validation Summary: How to Use JSON and JSONEachRow Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- JSON format
- JSONEachRow format (NDJSON)
- JSONEachRowWithProgress format
- clickhouse-client CLI
- ClickHouse HTTP interface

## Sources Consulted
- ClickHouse Formats overview: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse JSON format: https://clickhouse.com/docs/en/interfaces/formats/JSON
- ClickHouse JSONEachRow format: https://clickhouse.com/docs/en/interfaces/formats/JSONEachRow
- ClickHouse format settings: https://clickhouse.com/docs/operations/settings/formats (for `input_format_defaults_for_omitted_fields` and `input_format_import_nested_json`)

## Issues Found

1. **Incorrect claim that JSON format is output-only.** The post stated "It is an output-only format - you cannot INSERT data in JSON format." Modern ClickHouse versions support both input and output for the JSON format (the formats overview table shows checkmarks for both, and the JSON docs state the format "reads and outputs data in the JSON format"). Updated the sentence to note that modern ClickHouse supports INSERT with FORMAT JSON, while still recommending JSONEachRow for ingestion due to its streaming-friendly nature.

2. **Mismatch between "Nested Objects" heading description and its example.** The post claimed "JSONEachRow can handle nested objects by flattening them with dot notation", but the accompanying example stored nested JSON as a serialized `String` column — not dot-notation flattening into Nested columns. Rewrote the intro so it accurately describes the example (storing as a String) and mentions that the dot-notation/Nested-column approach is controlled by the `input_format_import_nested_json = 1` setting.

## Review Notes
- `input_format_defaults_for_omitted_fields` default was switched to 1 years ago, so the `SET` in the "Handling Missing Fields" section is effectively a no-op on current ClickHouse, but it is still technically valid and makes the behavior explicit for readers.
- JSONEachRowWithProgress is correctly identified as an output-only format used mainly over HTTP to stream progress updates alongside rows.
- The HTTP curl example using `--data-binary` is correct; using `--data-binary` (not `--data`) is important to avoid newline collapsing that would corrupt NDJSON input.
