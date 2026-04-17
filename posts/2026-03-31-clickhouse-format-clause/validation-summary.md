# Validation Summary: How to Use FORMAT Clause to Control ClickHouse Output

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL / analytical database)
- ClickHouse output formats: JSONEachRow, JSON, CSV, CSVWithNames, TabSeparated, TabSeparatedWithNames, Pretty, Vertical, Null
- ClickHouse HTTP interface
- `clickhouse-client` command-line tool
- `curl` HTTP requests

## Sources Consulted
- ClickHouse Formats overview: https://clickhouse.com/docs/en/interfaces/formats
- SELECT ... FORMAT: https://clickhouse.com/docs/en/sql-reference/statements/select/format
- HTTP interface: https://clickhouse.com/docs/en/interfaces/http
- JSONEachRow format: https://clickhouse.com/docs/en/interfaces/formats/JSONEachRow
- JSON format: https://clickhouse.com/docs/en/interfaces/formats/JSON
- CSVWithNames format: https://clickhouse.com/docs/en/interfaces/formats/CSVWithNames
- Null format: https://clickhouse.com/docs/en/interfaces/formats/Null
- Vertical format: https://clickhouse.com/docs/en/interfaces/formats/Vertical
- Pretty format: https://clickhouse.com/docs/en/interfaces/formats/Pretty

## Issues Found

1. **Incorrect default format claim in the introduction.** The original text said: *"By default, ClickHouse uses `TabSeparated` for command-line queries and `JSON` when convenient."* JSON is never a default format in ClickHouse — this claim is fabricated. Corrected to: `PrettyCompact` is the default for interactive `clickhouse-client` sessions, and `TabSeparated` is the default for non-interactive (batch) queries and the HTTP interface.

2. **Partially incorrect default for `clickhouse-client`.** The original text said: *"`TabSeparated` (TSV) is the default format for the `clickhouse-client` command-line tool."* This is only true for non-interactive/batch mode; interactive mode defaults to `PrettyCompact`. Clarified to specify "in non-interactive (batch) mode and the HTTP interface."

## Review Notes

- All other technical claims verified as accurate: JSONEachRow (NDJSON), JSON wrapper structure with `meta`/`data`/`rows`/`statistics`, CSV header behavior, `FORMAT Null` for benchmarking, `Vertical` for wide rows, `default_format` HTTP URL parameter, and the `Pretty` format being a Unicode-art table.
- The `Pretty` example output in the post uses ASCII pipes/dashes for readability; in reality ClickHouse's `Pretty` format uses Unicode box-drawing characters (e.g. `┏`, `┃`, `━`). The simplified rendering is a reasonable documentation convention and does not misrepresent behavior, so it was left unchanged.
- The `Vertical` example output is also slightly simplified (real output right-pads column names and aligns values); not corrected because it is illustrative.
- URL encoding in the `curl` examples uses `+` for spaces, which is valid for `application/x-www-form-urlencoded` query strings. Correct.
