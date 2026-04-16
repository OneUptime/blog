# Validation Summary: How to Use Object('json') Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse `Object('json')` experimental data type
- ClickHouse new `JSON` data type (ClickHouse 24+)
- ClickHouse SQL (MergeTree, JSONEachRow format)
- JSON extraction functions (`JSONExtractString`, `JSONExtractUInt`, `JSONExtractFloat`, `toJSONString`)

## Sources Consulted
- [ClickHouse: A new powerful JSON data type for ClickHouse](https://clickhouse.com/blog/a-new-powerful-json-data-type-for-clickhouse)
- [ClickHouse Docs: JSON schema inference](https://clickhouse.com/docs/integrations/data-formats/json/inference)
- [ClickHouse Docs: JSON Extract example](https://clickhouse.com/docs/knowledgebase/json_extract_example)
- [ClickHouse JSON functions source docs](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/functions/json-functions.md)
- [Altinity: ClickHouse JSON data type, version 22.6](https://altinity.com/blog/clickhouse-json-data-type-version-22-6)
- [ClickHouse Issue #68428: JSON type improvements umbrella](https://github.com/ClickHouse/ClickHouse/issues/68428)

## Issues Found
No technical issues found.

Verified claims:
- `Object('json')` type is experimental and requires `SET allow_experimental_object_type = 1;` — correct.
- Sub-columns accessed via dot notation (`payload.field`) — correct.
- Arrays in JSON inferred as `Array(Nullable(T))` sub-columns — correct, matches schema inference docs.
- Sub-columns cannot be used in `ORDER BY` or `PRIMARY KEY` — correct limitation.
- Type conflicts across inserts (e.g., `{"x": 1}` then `{"x": "hello"}`) cause issues with old Object type — correct.
- `toJSONString`, `JSONExtractString`, `JSONExtractUInt`, `JSONExtractFloat` are all valid ClickHouse functions — confirmed.
- New `JSON` type in ClickHouse 24+ with `SET enable_json_type = 1;` — correct (the setting was renamed from `allow_experimental_json_type` as the type became production-ready in more recent versions).

## Review Notes
- The `Object('json')` type is officially deprecated in favor of the new `JSON` type. Readers on ClickHouse 24.8+ should prefer the new `JSON` type, which the post correctly calls out in its "Migration Path and Future" section.
- The blog notes that the old Object type's schema inference from the first inserted batch can cause type conflicts — this is a well-known limitation that the new JSON type solves via `Dynamic` sub-paths.
- In very recent ClickHouse versions, the new JSON type may no longer require any setting to enable (as it has reached production-ready status), but `SET enable_json_type = 1;` remains valid.
