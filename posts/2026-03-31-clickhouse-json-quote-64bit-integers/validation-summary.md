# Validation Summary: How to Set output_format_json_quote_64bit_integers in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (JSON output formats and format settings)
- JSON (JSON, JSONEachRow, JSONCompact, JSONStringsEachRow)
- JavaScript (IEEE 754 precision limits, `JSON.parse`)
- Integer types: `UInt64`, `Int64`, `UInt128`, `Int128`, `UInt256`, `Int256`

## Sources Consulted
- ClickHouse format settings reference: https://clickhouse.com/docs/operations/settings/formats
- ClickHouse JSON format documentation: https://clickhouse.com/docs/interfaces/formats/JSON
- ClickHouse JSONEachRow format: https://clickhouse.com/docs/interfaces/formats/JSONEachRow
- ClickHouse JSONCompact format: https://clickhouse.com/docs/interfaces/formats/JSONCompact
- ClickHouse JSONStringsEachRow format: https://clickhouse.com/docs/interfaces/formats/JSONStringsEachRow
- IEEE 754 double-precision safe integer limit (`Number.MAX_SAFE_INTEGER` = 2^53 − 1 = 9007199254740991)

## Issues Found
- **"Affected Types" table incorrectly claimed `UInt128`/`UInt256`/`Int128`/`Int256` are "always quoted regardless" of this setting.** The official docs explicitly state the setting "Controls quoting of 64-bit or bigger integers (like `UInt64` or `Int128`)", meaning the setting does govern these wider types — they are not independently always-quoted. Fixed by changing both rows to simply "Yes" so the table matches documented behavior.

## Review Notes
- Default value (`1`) is correctly documented.
- The `Number.MAX_SAFE_INTEGER` value (9007199254740991) is accurate.
- The SQL syntax (both `SET ...` session setting and the per-query `SETTINGS ...` clause after `FORMAT JSON`) is valid ClickHouse syntax.
- The `system.settings` query for verifying the value is correct.
- `JSONStringsEachRow` by design outputs every value as a string, so in that format all numerics are quoted regardless — worth noting in a future revision, but the post's claim that the setting "applies" to it is not technically wrong.
- A sibling setting, `output_format_json_quote_64bit_floats` (defaults to `0`), exists and could be a useful follow-up reference for readers dealing with `Float64` precision in JSON output.
