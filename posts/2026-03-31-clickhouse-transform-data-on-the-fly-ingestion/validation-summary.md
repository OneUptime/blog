# Validation Summary: How to Transform Data On-The-Fly During ClickHouse Ingestion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, materialized views, MATERIALIZED columns, dictionaries)
- ClickHouse SQL functions (JSONExtractString, JSONExtractUInt, parseDateTimeBestEffort, fromUnixTimestamp, dictGet, lower, upper, trim, toDateTime, toDate)
- ClickHouse HTTP interface (CSV and JSON ingestion via curl)
- ETL / data pipeline patterns

## Sources Consulted
- ClickHouse JSON functions documentation (clickhouse.com/docs/en/sql-reference/functions/json-functions) — verified JSONExtract* variadic path syntax for nested access
- ClickHouse Materialized Views documentation (clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view) — verified TO table syntax and trigger-on-insert behavior
- ClickHouse MATERIALIZED column expressions documentation (clickhouse.com/docs/en/sql-reference/statements/create/table#materialized) — verified computed-on-insert semantics and dependency resolution between MATERIALIZED columns
- ClickHouse Dictionaries documentation (clickhouse.com/docs/en/sql-reference/dictionaries) — verified CREATE DICTIONARY syntax, LIFETIME, LAYOUT, and dictGet usage
- ClickHouse HTTP interface documentation (clickhouse.com/docs/en/interfaces/http) — verified query parameter vs body behavior for INSERT with data
- ClickHouse input() table function documentation (clickhouse.com/docs/en/sql-reference/table-functions/input) — verified usage in INSERT-SELECT pattern
- curl man page — verified --data-binary behavior with literal strings vs @file and stdin redirection

## Issues Found

### Issue 1: Incorrect nested JSON extraction syntax (Approach 1)
- **What was wrong:** `JSONExtractString(raw_json, 'geo.country')` used dot notation in a single string argument to access a nested JSON field. In ClickHouse, `JSONExtract*` functions do not support dot-path notation; each nesting level must be a separate argument.
- **What was changed:** Changed to `JSONExtractString(raw_json, 'geo', 'country')` with separate string arguments for each path element.
- **Why:** Using `'geo.country'` as a single argument would look for a literal top-level key named `"geo.country"` rather than navigating into `geo` then `country`. This would silently return an empty string instead of the expected value.

### Issue 2: Broken curl command for JSON ingestion via HTTP interface (Approach 5)
- **What was wrong:** The command used `--data-binary "INSERT INTO ... FORMAT JSONEachRow"` with `< events.ndjson` stdin redirect. When `--data-binary` receives a literal string (not prefixed with `@`), curl uses that string as the HTTP body and ignores stdin entirely. The data from `events.ndjson` would never be sent.
- **What was changed:** Moved the SQL query into the URL as a query parameter (URL-encoded) and changed the body to `--data-binary @events.ndjson` to send the file contents as the request body.
- **Why:** ClickHouse's HTTP interface expects the query in the URL parameter and the data payload in the request body when inserting data. The original command would only send the SQL text, with no actual data rows.

## Review Notes
- The MATERIALIZED column in Approach 2 where `date` references another MATERIALIZED column `timestamp` is correct — ClickHouse resolves dependency chains between MATERIALIZED columns during evaluation.
- The `LIFETIME(3600)` dictionary syntax is shorthand for `LIFETIME(MIN 0 MAX 3600)`, meaning the reload interval is randomized between 0 and 3600 seconds. This is correct but the reader may not realize the randomized behavior.
- All other SQL functions (parseDateTimeBestEffort, fromUnixTimestamp, lower, upper, trim, toDateTime, toDate, if, length, dictGet) are verified as correct and current ClickHouse functions.
