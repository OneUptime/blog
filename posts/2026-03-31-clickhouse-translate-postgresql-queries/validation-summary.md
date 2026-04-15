# Validation Summary: How to Translate PostgreSQL Queries to ClickHouse SQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- ClickHouse
- SQL (CTEs, window functions, array operations, JSON handling, upserts)

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on JSON functions: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse documentation on array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse documentation on ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- PostgreSQL documentation on array operators: https://www.postgresql.org/docs/current/functions-array.html
- PostgreSQL documentation on JSON functions: https://www.postgresql.org/docs/current/functions-json.html

## Issues Found

1. **Window functions: `lagInFrame` instead of `lag`** — The post claimed ClickHouse uses `lagInFrame` and `leadInFrame` "instead of" `lag` and `lead`. Modern ClickHouse supports standard `lag()` and `lead()` window functions directly. Using `lag` is the more accurate translation from PostgreSQL since it operates on the full partition (matching PostgreSQL behavior), whereas `lagInFrame` is frame-scoped. Changed all ClickHouse examples to use standard `lag()` and added a note about `lagInFrame` as an alternative.

2. **Array Operations: misleading "JSONB array" comment** — The PostgreSQL example `tags @> ARRAY['analytics']` uses the native array containment operator, not JSONB. The comment "PostgreSQL (JSONB array)" was incorrect. Changed to "PostgreSQL (Array column)".

3. **JSON nested extraction: incorrect nested call** — The ClickHouse example used `JSONExtractString(JSONExtractString(data, 'metadata'), 'source')` for nested JSON access. `JSONExtractString` extracts a string value, not a raw JSON object, so nesting it this way does not work correctly. ClickHouse's `JSONExtractString` supports path-based multi-argument access. Fixed to `JSONExtractString(data, 'metadata', 'source')`.

4. **UPSERT section: `DISTINCT ON` not supported in ClickHouse** — The query comment showed `SELECT DISTINCT ON (id) ...` which is PostgreSQL-specific syntax not available in ClickHouse. Replaced with two correct ClickHouse approaches: using the `FINAL` modifier and using `argMax()`.

## Review Notes
- The post's overall structure and approach (side-by-side PostgreSQL vs ClickHouse examples) is effective for a translation guide.
- ClickHouse has been adding a native JSON data type (experimental in recent versions) which may eventually change the JSON handling recommendations, but the `JSONExtractString` approach remains the standard documented method.
- The Key Incompatibilities table is accurate. ClickHouse has experimental transaction support in recent versions, but the practical guidance of "no multi-statement transactions" remains correct for production use.
