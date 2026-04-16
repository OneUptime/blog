# Validation Summary: How to Store and Query JSON Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL DDL, MergeTree engine)
- ClickHouse JSON functions (`JSONExtractString`, `JSONExtractInt`, `JSONExtractFloat`, `JSONExtractRaw`, `JSONExtractKeys`)
- ClickHouse `simpleJSON*` functions (`simpleJSONExtractString`, `simpleJSONExtractUInt`, `simpleJSONHas`)
- ClickHouse `Object('json')` semi-structured type
- ClickHouse new native `JSON` data type
- `JSONEachRow` input format

## Sources Consulted
- [JSON Data Type | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/data-types/newjson)
- [JSON Functions | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/functions/json-functions)
- [How we built a new powerful JSON data type for ClickHouse (ClickHouse blog)](https://clickhouse.com/blog/a-new-powerful-json-data-type-for-clickhouse)
- [ClickHouse Release 24.8 LTS](https://clickhouse.com/blog/clickhouse-release-24-08)
- [Upgrade to 24.8.x with Object('json') tables (GitHub Discussion #70832)](https://github.com/ClickHouse/ClickHouse/discussions/70832)
- [ClickHouse: JSON data type, version 22.6 (Altinity Blog)](https://altinity.com/blog/clickhouse-json-data-type-version-22-6)

## Issues Found
1. **Incorrect version for `Object('json')` type**: The post claimed `Object('json')` was available in ClickHouse 21.12+. It was actually introduced as experimental in **22.3** (March 2022). Updated the post to reflect the correct version.
2. **Incorrect version attribution for the new `JSON` type**: The post stated the modern `JSON` type was introduced in 22.6+. The 22.6 implementation was the original experimental JSON type that became the deprecated `Object('json')` lineage. The **redesigned, current** `JSON` type was introduced as experimental in **24.8** (August 2024) and became production-ready in **25.3**. Updated the section heading text and the comparison table accordingly.

## Review Notes
- The `JSONExtract*` function names, signatures, default-return-on-missing behavior (`0` / `0.0` for numeric extractors), and the multi-argument nested-path syntax are all confirmed correct against the official ClickHouse JSON functions documentation.
- `simpleJSONExtractString`, `simpleJSONExtractUInt`, and `simpleJSONHas` exist and behave as described.
- `JSONExtractRaw` and `JSONExtractKeys` exist and return the documented results.
- The `allow_experimental_json_type = 1` setting was required during the experimental phase (24.8 through 25.2). In ClickHouse 25.3+ the new `JSON` type is GA and the setting is no longer required, though leaving it in the example does not break anything for users on older releases.
- The `Object('json')` type is deprecated; users on new clusters should prefer the new `JSON` type. The post correctly notes the supersession.
- Minor stylistic note (not changed): the `INSERT ... FORMAT JSONEachRow` blocks include a trailing semicolon after the inline JSON data; in practice the semicolon can be parsed as part of the data depending on the client. This works in `clickhouse-client` interactive mode but is something readers running these via HTTP/JDBC may need to adjust.
