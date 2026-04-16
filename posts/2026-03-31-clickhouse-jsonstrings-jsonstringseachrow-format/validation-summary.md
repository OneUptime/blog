# Validation Summary: How to Use JSONStringsEachRow Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse JSON output formats (JSONEachRow, JSONStringsEachRow, JSONStrings, JSONCompactStringsEachRow, JSONCompactStringsEachRowWithNames)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse formats overview: https://clickhouse.com/docs/interfaces/formats
- ClickHouse JSONStringsEachRow docs: https://clickhouse.com/docs/en/interfaces/formats/JSONStringsEachRow
- ClickHouse JSONStrings docs: https://clickhouse.com/docs/en/interfaces/formats/JSONStrings
- ClickHouse JSONCompactEachRowWithNames docs: https://clickhouse.com/docs/interfaces/formats/JSONCompactEachRowWithNames
- ClickHouse source: `src/Processors/Formats/Impl/JSONEachRowRowOutputFormat.cpp` (raw.githubusercontent.com/ClickHouse/ClickHouse/master/...)
- ClickHouse source: `src/Processors/Formats/Impl/JSONCompactEachRowRowOutputFormat.cpp`
- ClickHouse source: `src/Processors/Formats/Impl/JSONEachRowRowInputFormat.cpp`

## Issues Found
1. **Invalid format name `JSONStringsEachRowWithNames`**: The post originally claimed this format exists and showed a sample output `{"id":"id","name":"name",...}`. Verified against the ClickHouse formats table and source code that this format does **not** exist. Only the compact variants (`JSONCompactEachRowWithNames`, `JSONCompactEachRowWithNamesAndTypes`, `JSONCompactStringsEachRowWithNames`, `JSONCompactStringsEachRowWithNamesAndTypes`) support the `WithNames` header. The non-compact `JSONEachRow`/`JSONStringsEachRow` output formats only register the base names (see `registerOutputFormatJSONEachRow` which registers `JSONEachRow`, `PrettyJSONEachRow`, `JSONLines`, `PrettyJSONLines`, `NDJSON`, `PrettyNDJSON`, and `JSONStringsEachRow` — nothing else).

   **Fix**: Renamed the section to `JSONCompactStringsEachRowWithNames`, updated the SQL example to use the correct format, and replaced the example output with the correct compact-array-with-header shape: `["id", "name", "value"]` on the header row followed by `["1", "Alice", "3.14"]` data rows (matching the logic in `JSONCompactEachRowRowOutputFormat::writePrefix` which writes column names as a JSON array when `with_names` is true).

## Review Notes
- The claim that numbers in native `JSONEachRow` output appear unquoted (e.g., `"id":1`) assumes the column type is not a 64-bit integer. By default `output_format_json_quote_64bit_integers = 1`, so `UInt64`/`Int64` values are already quoted in `JSONEachRow`. The example uses small-looking ids which is fine for an illustration, but readers on wide integer columns will see quoted values in plain `JSONEachRow` too. Not a technical error, just a caveat.
- For `Bool` columns ClickHouse outputs `true`/`false` in `JSONEachRow` — the example's `"active":1` implicitly treats `active` as `UInt8`, which is fine.
- The `JSONStrings` output example omits the `statistics` block that real ClickHouse output typically includes. This is an accepted simplification for readability and not incorrect.
- `clickhouse-client`'s `INSERT ... FORMAT JSONStringsEachRow` pattern shown is valid; the format is registered for input in `registerInputFormatJSONEachRow`.
