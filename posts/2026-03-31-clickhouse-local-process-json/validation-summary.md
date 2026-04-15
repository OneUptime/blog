# Validation Summary: How to Process JSON Files with clickhouse-local

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- clickhouse-local
- JSON / NDJSON data formats
- JSONEachRow, JSONObjectEachRow, JSONCompactEachRow formats
- JSON extraction functions (JSONExtractString, JSONExtractInt, JSONExtractFloat, JSONExtractArrayRaw)
- arrayJoin function
- parseDateTimeBestEffort function
- countIf aggregate combinator

## Sources Consulted
- ClickHouse Formats documentation: https://clickhouse.com/docs/interfaces/formats
- ClickHouse JSONEachRow format docs: https://clickhouse.com/docs/interfaces/formats/JSONEachRow
- ClickHouse JSON format docs: https://clickhouse.com/docs/interfaces/formats/JSON
- ClickHouse JSONObjectEachRow format docs: https://clickhouse.com/docs/interfaces/formats/JSONObjectEachRow
- ClickHouse JSON functions documentation: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse clickhouse-local documentation: https://clickhouse.com/docs/operations/utilities/clickhouse-local
- ClickHouse ARRAY JOIN documentation: https://clickhouse.com/docs/sql-reference/statements/select/array-join
- ClickHouse Type Conversion Functions (parseDateTimeBestEffort): https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions

## Issues Found

### 1. Incorrect description of `JSON` format (line 13)
- **What was wrong:** The intro described ClickHouse's `JSON` format as being for "JSON array" files. The `JSON` format is actually a metadata-rich output format that wraps results with `meta`, `data`, `rows`, and `statistics` fields — it is not a plain JSON array reader.
- **What was changed:** Replaced `JSON` (JSON array) with `JSONCompactEachRow` (compact row arrays) in both the intro and summary sections, which is an actual input-friendly format that was not already listed.

### 2. Invalid `LATERAL` join syntax (lines 69-79)
- **What was wrong:** The "Flattening Arrays in JSON" example used `LATERAL (SELECT arrayJoin(tags_array) AS tag)` syntax. ClickHouse does not support `LATERAL` joins. The supported join types are INNER, LEFT/RIGHT/FULL OUTER, CROSS, SEMI, ANTI, ANY, ASOF, and PASTE.
- **What was changed:** Replaced the entire subquery+LATERAL pattern with a simpler idiomatic ClickHouse approach using `arrayJoin()` directly in the SELECT clause: `arrayJoin(JSONExtractArrayRaw(raw, 'tags')) AS tag`.

### 3. Non-existent `JSONArrayEachRow` format (lines 98, 119)
- **What was wrong:** The post used `JSONArrayEachRow` as a format name for reading files containing a top-level JSON array. This format does not exist in ClickHouse.
- **What was changed:** Replaced `JSONArrayEachRow` with `JSONEachRow`, which in modern ClickHouse versions can automatically detect and parse top-level JSON arrays. Updated the section description to clarify this behavior.

## Review Notes
- The `clickhouse local` (space-separated subcommand) invocation style used throughout the post is correct and matches modern ClickHouse documentation. The older `clickhouse-local` (hyphenated) form also works but is legacy.
- The JSONExtract* functions with variadic path arguments (e.g., `JSONExtractString(raw, 'user', 'email')`) are correctly used for nested field access.
- The `DESCRIBE TABLE file(...)` pattern works correctly in clickhouse-local for schema inference.
- All other functions (`count()`, `uniq()`, `countIf()`, `parseDateTimeBestEffort()`, `toStartOfHour()`, `avg()`) and output formats (`CSVWithNames`, `PrettyCompact`) are valid.
