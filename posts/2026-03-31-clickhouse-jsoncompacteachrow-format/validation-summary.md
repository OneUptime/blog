# Validation Summary: How to Use JSONCompactEachRow Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- JSONCompactEachRow format (and WithNames / WithNamesAndTypes variants)
- JSONEachRow format (for comparison)
- `clickhouse-client` CLI
- `formatRow` SQL function

## Sources Consulted
- ClickHouse official docs — JSONCompactEachRow format: https://clickhouse.com/docs/interfaces/formats/JSONCompactEachRow
- ClickHouse official docs — JSONCompactEachRowWithNames format: https://clickhouse.com/docs/interfaces/formats/JSONCompactEachRowWithNames
- ClickHouse official docs — JSONCompactEachRowWithNamesAndTypes format
- ClickHouse docs — `formatRow` function
- ClickHouse docs — `input_format_with_names_use_header` setting

## Issues Found
No technical issues found.

All technical claims in the post were verified against the official ClickHouse documentation:

- JSONCompactEachRow outputs each row as a JSON array rather than an object — correct.
- The `FORMAT JSONCompactEachRow` clause syntax on SELECT and INSERT is valid.
- JSONCompactEachRowWithNames prepends a single header row containing column names — correct.
- JSONCompactEachRowWithNamesAndTypes prepends two header rows (names then types) — correct.
- Both variants support input and output — correct.
- During import, the header row is consumed by the parser (behavior governed by the `input_format_with_names_use_header` setting, which defaults to 1) — the post's statement is accurate.
- `formatRow('JSONEachRow', ...)` and `formatRow('JSONCompactEachRow', ...)` are valid calls; `length()` on the formatted string returns its byte length as claimed.
- The example SQL (`SELECT ... UNION ALL SELECT ...`) is syntactically valid ClickHouse.

## Review Notes
- The `formatRow` function appends a trailing newline (`\n`) to its output, so both `length()` results in the size-comparison example will include that newline. This doesn't affect the relative comparison the post is making, but readers measuring absolute bytes should be aware. Not a correctness issue.
- The claim "30-60% size reduction for wide tables" is a reasonable qualitative estimate; actual savings depend heavily on column name lengths and value sizes. Left as-is since the post frames it as a range.
- The heredoc INSERT example (`<< 'EOF'`) relies on `clickhouse-client` reading from stdin, which works correctly with the `--query` flag.
