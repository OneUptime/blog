# Validation Summary: How to Set allow_experimental_object_type in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (experimental `Object('json')` data type)
- SQL (ClickHouse dialect)
- XML (users.xml / profiles configuration)
- JSONEachRow input format

## Sources Consulted
- ClickHouse ErrorCodes.cpp source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp
- ClickHouse issue #37302 (JSON type usability): https://github.com/ClickHouse/ClickHouse/issues/37302
- ClickHouse discussion #63785 (enabling allow_experimental_object_type globally): https://github.com/ClickHouse/ClickHouse/discussions/63785
- ClickHouse discussion #70832 (upgrade from Object('json') to new JSON type): https://github.com/ClickHouse/ClickHouse/discussions/70832
- ClickHouse Release 24.8 LTS blog: https://clickhouse.com/blog/clickhouse-release-24-08
- ClickHouse JSON data type docs: https://clickhouse.com/docs/sql-reference/data-types/newjson
- ClickHouse issue #74599 (experimental vector similarity index – SUPPORT_IS_DISABLED pattern): https://github.com/ClickHouse/ClickHouse/issues/74599
- ClickHouse issue #55501 (experimental inverted index – SUPPORT_IS_DISABLED pattern): https://github.com/ClickHouse/ClickHouse/issues/55501

## Issues Found
- **Wrong error code (`Code: 451`).** The post claimed the error raised without the setting is `Code: 451`. In ClickHouse's `ErrorCodes.cpp`, `451` maps to `BAD_TTL_FILE` — unrelated to experimental features. ClickHouse consistently uses `344` (`SUPPORT_IS_DISABLED`) when a setting-gated experimental feature is used without its flag. Changed `Code: 451` to `Code: 344` and also corrected the wording from "Set allow_experimental_object_type = 1" to "Set setting allow_experimental_object_type = 1" to match the actual server message format.
- **Incorrect successor-version claim.** The post said "As of ClickHouse 23.x, the `JSON` type (a newer iteration) is the recommended path forward". The new production-grade `JSON` type was introduced in ClickHouse 24.8 (LTS), not 23.x — in 23.x only the deprecated `Object('json')` existed. Updated to "As of ClickHouse 24.8+, the new `JSON` type...".

## Review Notes
- The SQL syntax (`Object('json')`, `SET allow_experimental_object_type = 1`, `DESCRIBE TABLE`, dot-notation access on sub-columns, `system.columns` query) is all valid ClickHouse syntax.
- The `<profiles>`/`<default>` XML structure for `users.xml` is the correct ClickHouse configuration path.
- Deprecation context worth knowing: the ClickHouse team has effectively frozen `Object('json')` in favor of the new `JSON` type (`allow_experimental_json_type = 1` in 24.8, later stabilized). Readers picking this up on 24.8+ should generally prefer the new `JSON` type — the post does point this out in the Limitations section, which is good.
- The `JSONEachRow` insert example is valid; ClickHouse will infer types at ingest for `Object('json')` columns.
- The default-value behavior for missing sub-column fields (0 for numeric, empty string for strings) matches ClickHouse's observed behavior.
- The Mermaid flowchart is a reasonable conceptual representation of how sub-columns are stored; no technical claims to verify there.
