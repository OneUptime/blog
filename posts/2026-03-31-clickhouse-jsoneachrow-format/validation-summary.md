# Validation Summary: How to Use JSONEachRow Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (JSONEachRow / NDJSON input & output format)
- ClickHouse HTTP interface
- `clickhouse-client` CLI
- MergeTree table engine
- `file()` table function
- `INTO OUTFILE` clause
- `JSONExtractString` JSON function
- `JSONEachRowWithProgress` format
- ClickHouse format settings (`input_format_skip_unknown_fields`, `input_format_defaults_for_omitted_fields`, `input_format_json_read_objects_as_strings`, `output_format_json_quote_64bit_integers`, `output_format_json_escape_forward_slashes`)

## Sources Consulted
- ClickHouse Formats documentation: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse Format Settings reference: https://clickhouse.com/docs/en/operations/settings/formats
- ClickHouse source — `src/Core/FormatFactorySettings.h` (master): https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/FormatFactorySettings.h
- ClickHouse source — `src/Core/Settings.cpp` (master): https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp
- `file()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/file
- JSONEachRowWithProgress format: https://clickhouse.com/docs/en/interfaces/formats#jsoneachrowwithprogress

## Issues Found

1. **Incorrect claim about default behavior for missing fields.** The post stated "By default, missing fields in the JSON cause an error." This is wrong: `input_format_defaults_for_omitted_fields` defaults to `true` (1), so ClickHouse uses the column's default (or the type's zero value) for omitted fields by default — it does not error. Rewrote the "Handling Missing Fields" section to reflect the true default behavior and to describe what setting the value to `0` actually does.

2. **Wrong default in Settings Summary table.** The table listed `input_format_defaults_for_omitted_fields` with a default of `0`. Verified against `FormatFactorySettings.h` on master: the actual default is `true` (1). Corrected the table.

3. **Wrong default in Settings Summary table.** The table listed `output_format_json_quote_64bit_integers` with a default of `1`. Verified against `FormatFactorySettings.h` on master (line 835): the actual default is `false` (0). Corrected the table and updated the description to "Wrap 64-bit integers in quotes" since it affects both `UInt64` and `Int64`.

4. **Non-existent setting referenced.** The "Nested JSON Objects" section told the reader to `SET input_format_flatten_nested = 1`. No such setting exists in ClickHouse. There is a DDL-time `flatten_nested` setting that controls how `Nested` columns are stored at CREATE TABLE time — it does not flatten nested JSON during JSONEachRow parsing. Also, `SET input_format_json_read_objects_as_strings = 0` would in fact *disable* the ability to read nested objects into a `String` column, which contradicts the "parse it later" approach shown immediately after. Rewrote this section to remove the invalid setting and to correctly note that `input_format_json_read_objects_as_strings` is already `1` by default, enabling the `String`-column approach that the example demonstrates.

## Review Notes

- The `input_format_skip_unknown_fields` default (1) and the statement that ClickHouse ignores extra JSON fields by default are correct — verified against source at `FormatFactorySettings.h:60`.
- The `output_format_json_escape_forward_slashes` default of `1` is correct.
- `JSONEachRowWithProgress` is a real format and the description is accurate — ClickHouse interleaves `{"progress":{...}}` rows with data rows over the HTTP interface.
- The `file()` table function syntax, `INTO OUTFILE` syntax, and `clickhouse-client --query` usage are all valid.
- The curl URL-encoded query style (`INSERT+INTO+events+FORMAT+JSONEachRow`) works correctly with the HTTP interface.
- The post recommends `async_insert` for high-throughput producers, which aligns with current ClickHouse guidance.
- For future-proofing: the experimental `JSON` data type (introduced around 24.8) is a newer alternative to the "store as String and `JSONExtract*` later" pattern. The post does not mention it, which is fine for an introductory JSONEachRow guide but could be a natural follow-up.
