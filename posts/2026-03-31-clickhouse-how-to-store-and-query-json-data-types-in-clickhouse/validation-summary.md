# Validation Summary: How to Store and Query JSON Data Types in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, JSON functions, Object type, Materialized Views, Materialized columns)
- SQL (DDL/DML)
- JSON / JSONEachRow format

## Sources Consulted
- ClickHouse JSON functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse Object data type (experimental): https://clickhouse.com/docs/en/sql-reference/data-types/object-data-type
- ClickHouse Materialized Views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Materialized columns: https://clickhouse.com/docs/en/sql-reference/statements/create/table#materialized

## Issues Found
No technical issues found.

- All `JSONExtract*` function names and signatures match the official ClickHouse reference (`JSONExtractString`, `JSONExtractUInt`, `JSONExtractInt`, `JSONExtractFloat`, `JSONExtractBool`, `JSONExtractArrayRaw`, `JSONExtractRaw`, `JSONExtract` with return type string, `JSONExtractKeys`, `JSONHas`, `isValidJSON`).
- Nested-key access via multiple string arguments (e.g. `JSONExtractString(payload, 'address', 'city')`) is correct per the docs.
- `Object('json')` with `SET allow_experimental_object_type = 1` is the correct setting name and type syntax for the legacy experimental JSON Object type; the post correctly labels it as experimental.
- Sub-column dot-notation access (`payload.user_id`) on `Object('json')` columns is accurate.
- MergeTree DDL, MATERIALIZED VIEW `TO` target table syntax, and MATERIALIZED column definitions are all valid.
- `INSERT ... FORMAT JSONEachRow` usage and the NDJSON payload format match ClickHouse conventions.
- `arrayJoin` + `JSONExtract(payload, 'items', 'Array(String)')` and the `arrayMap(x -> trim('"' FROM x), JSONExtractArrayRaw(...))` pattern are both correct working idioms.

## Review Notes
- The post presents `Object('json')` as the native JSON type. As of ClickHouse 24.8+, a new, non-experimental `JSON` data type has become available (with `allow_experimental_json_type` initially gating it). The `Object('json')` type is now considered legacy/deprecated in favor of the new `JSON` type. The post's description remains accurate for users on older ClickHouse versions, but a future update could mention the newer `JSON` type for completeness.
- `JSONExtractUInt`/`JSONExtractString` return non-nullable values (0 / empty string) when keys are missing. The MV example inserts into `Nullable(...)` columns; ClickHouse will implicitly cast, but missing keys will appear as `0`/`''` rather than `NULL`. This is a subtle semantic caveat worth noting in a future revision but is not technically incorrect.
