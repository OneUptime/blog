# Validation Summary: How to Use the New JSON Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (database)
- SQL
- JSON data type (new JSON type, not the old `Object('json')`)
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation: JSON data type (https://clickhouse.com/docs/sql-reference/data-types/newjson)
- ClickHouse official documentation: JSON functions (https://clickhouse.com/docs/sql-reference/functions/json-functions)
- ClickHouse changelog and release notes for version 24.8
- Altinity blog on ClickHouse JSON data type evolution

## Issues Found

1. **Incorrect version number (intro paragraph)**: The post stated the native `JSON` data type was introduced in "ClickHouse 22.6". This is incorrect — ClickHouse 22.x had the old `Object('json')` experimental type which used the `allow_experimental_object_type` setting. The **new** `JSON` data type (with `allow_experimental_json_type`, dot-notation access, `JSONAllPathsWithTypes`, etc.) was introduced in ClickHouse **24.8**. Changed "22.6" to "24.8" in the intro paragraph.

2. **Incorrect version number (summary section)**: The summary referenced "ClickHouse 22.6+" — changed to "24.8+" to match the corrected version.

3. **Incorrect SQL comment**: A comment said "Filter by a string subfield" but the query filters on `data.success = true`, which is a **boolean** field, not a string. Changed "string" to "boolean".

## Review Notes
- The `JSONAllPathsWithTypes()` function returns a `Map(String, String)`. Using `arrayJoin()` on a Map in ClickHouse works by iterating over key-value tuples, so the example query is functional, though the result will be tuples like `('user_id', 'Int64')` rather than simple strings. This is a minor presentation detail that doesn't affect correctness.
- The JSON type remains experimental as of ClickHouse 24.x and requires the `allow_experimental_json_type` setting. The post correctly documents this requirement.
- All SQL syntax, INSERT formats, dot-notation access patterns, NULL behavior for missing fields, and aggregation examples are correct.
- The comparison with `JSONExtract` on String columns is accurate — the native JSON type avoids repeated parsing and reads only the needed subcolumns.
