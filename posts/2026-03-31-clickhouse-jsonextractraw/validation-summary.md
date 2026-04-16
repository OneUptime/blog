# Validation Summary: How to Use JSONExtractRaw() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse JSON functions (`JSONExtractRaw`, `JSONExtractString`, `JSONExtractInt`, `JSONExtractFloat`, `JSONExtractArrayRaw`, `JSONHas`)

## Sources Consulted
- ClickHouse official documentation — JSON functions: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse docs example for `JSONExtractRaw`: `JSONExtractRaw('{"a": "hello", "b": [-100, 200.0, 300]}', 'b')` → `[-100,200.0,300]`

## Issues Found
No technical issues found.

Verified claims:
- `JSONExtractRaw` returns the value as an unparsed JSON fragment — correct.
- Strings keep surrounding double quotes, objects keep braces, arrays keep brackets — correct.
- Whitespace normalization: ClickHouse's `JSONExtractRaw` normalizes whitespace (strips spaces after colons/commas) in the returned fragment, so `{"k": "v"}` in input becomes `{"k":"v"}` in output — the post's expected output matches this behavior.
- `JSONHas(profile, 'address') = 1` — `JSONHas` returns `1`/`0`, so this comparison is valid.
- `JSONExtractString` supports variadic path form `JSONExtractString(json, indices_or_keys...)` — correct.
- Chaining `JSONExtractString(JSONExtractRaw(...), 'city')` works because the raw result is a valid JSON string — correct.
- `JSONExtractArrayRaw` exists and returns an array of unparsed strings for iteration — correct.
- Comparing raw strings with `= '"dark"'` (double quotes inside single quotes) is correct because string values in raw JSON retain their quotes.
- `JSONExtractString`, `JSONExtractInt`, `JSONExtractFloat` are all valid ClickHouse functions — correct.

## Review Notes
- The post could optionally mention that `JSONExtractRaw` returns an empty string (not NULL) when the key is missing or has the wrong type, which is useful for callers chaining downstream functions. Not a correctness issue, just additional context.
- The post uses the legacy `simdjson`-backed `JSON*` scalar functions. ClickHouse also offers a newer `JSON` data type and `JSONAllPaths`/related functions, but the scalar `JSONExtract*` family remains the standard path for JSON-as-String columns and is not deprecated.
