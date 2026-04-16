# Validation Summary: How to Use JSONExtract() and JSONExtractString() in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- JSON parsing functions: `JSONExtract`, `JSONExtractString`, `JSONExtractInt`, `JSONExtractFloat`, `JSONExtractBool`, `JSONHas`
- ClickHouse `MergeTree` engine
- Materialized columns (`ALTER TABLE ... ADD COLUMN ... MATERIALIZED`, `MATERIALIZE COLUMN`)

## Sources Consulted
- ClickHouse JSON functions reference: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse ALTER COLUMN docs (materialized columns): https://clickhouse.com/docs/en/sql-reference/statements/alter/column

## Issues Found
No technical issues found.

All function signatures, behaviors, and code examples were verified against the official ClickHouse documentation:
- `JSONExtractString(json[, indices_or_keys, ...])` returns empty string for missing keys — correct.
- `JSONExtract(json[, indices_or_keys, ...], return_type)` with type as the final argument — correct.
- `JSONExtractInt`, `JSONExtractFloat`, `JSONExtractBool` exist and return 0/false for missing keys — correct.
- `JSONHas(json, ...)` returns 1/0 — correct.
- Nested path traversal via multiple key arguments — correct.
- `Array(String)` and `Map(String, String)` are valid return types for `JSONExtract` — correct.
- Materialized column syntax (`ADD COLUMN ... MATERIALIZED ...` and `MATERIALIZE COLUMN ...`) is valid — correct.

## Review Notes
- The post focuses on the legacy/string-based `JSONExtract*` functions. ClickHouse has more recently introduced a native `JSON` data type (https://clickhouse.com/docs/en/sql-reference/data-types/newjson) that offers better performance for heavy JSON workloads. The post does not discuss this — which is reasonable given its scope (parsing JSON stored as `String`), but readers building new schemas may want to evaluate the native `JSON` type as well.
- The `Map(String, String)` example will coerce non-string values (e.g., `"version": 2`) to their string form (`"2"`). This is correct ClickHouse behavior but may surprise readers expecting strict typing — a brief caveat could be added in a future revision.
- The post does not discuss `simpleJSONExtract*` functions, which are faster but less robust. This is a reasonable scope choice and not an error.
