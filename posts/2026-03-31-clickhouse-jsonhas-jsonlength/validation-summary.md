# Validation Summary: How to Use JSONHas() and JSONLength() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- ClickHouse JSON functions (`JSONHas`, `JSONLength`, `JSONExtractString`)
- SQL

## Sources Consulted
- ClickHouse official documentation: JSON Functions — https://clickhouse.com/docs/en/sql-reference/functions/json-functions

## Issues Found
No technical issues found.

All claims and code examples were verified against the official ClickHouse JSON functions documentation:
- `JSONHas(json[, indices_or_keys, ...])` correctly returns `1`/`0` and supports variadic path arguments for nested navigation, matching the post's nested-key example (`JSONHas(payload, 'context', 'device', 'os')`).
- `JSONLength(json[, indices_or_keys, ...])` correctly returns the number of keys in an object or elements in an array, and supports an optional path argument to navigate into nested arrays/objects (matching `JSONLength(order_json, 'items')`).
- The summary's claim that `JSONExtract*` functions return type defaults (`0`, empty string) for missing keys is accurate, justifying the recommendation to use `JSONHas` for presence checks.
- Expected outputs in the example results blocks (`1 0`, `3`, `3`) match actual ClickHouse behavior.

## Review Notes
- The post uses the legacy `simdjson`-based `JSONHas`/`JSONLength`/`JSONExtract*` family, which is the standard, supported approach for `String`-typed JSON columns. ClickHouse also offers a newer native `JSON` data type (experimental in older versions, generally available since 24.8) with a different access pattern — but the post is explicitly about the inspection functions, so this is appropriate and out of scope.
- The variadic path syntax (e.g., `JSONHas(payload, 'context', 'device', 'os')`) is correct, but readers should note that integer arguments index into arrays while string arguments key into objects — worth a future enhancement but not an error.
