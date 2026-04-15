# Validation Summary: How to Handle Malformed JSON in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL analytics database)
- ClickHouse JSON functions: `isValidJSON`, `JSONExtractInt`, `JSONExtractString`, `JSONHas`
- ClickHouse aggregate combinators: `countIf`
- ClickHouse Materialized Views with `TO` clause
- simdjson (underlying JSON parser used by ClickHouse)

## Sources Consulted
- ClickHouse JSON Functions documentation: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse CREATE VIEW documentation: https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse Aggregate Function Combinators: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse Date and Time Functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse INTERVAL data type: https://clickhouse.com/docs/sql-reference/data-types/special-data-types/interval
- simdjson DOM parser documentation: https://simdjson.github.io/simdjson/md_doc_2dom.html

## Issues Found
No technical issues found.

## Review Notes
- The claim that `JSONExtractInt('{"id": 1, "broken":', 'id')` returns `0` (not `1`) is correct but subtle. ClickHouse uses simdjson's DOM parser, which validates the entire JSON document before extracting any values. Since the truncated string is invalid JSON, the entire parse fails and the default `0` is returned — even though `"id": 1` is present in the string before the truncation point.
- `isValidJSON` has a known edge case (ClickHouse issue #21984) where it can return false positives for certain strings with unescaped braces inside string values (e.g., `'{"success":"{"test":123}"}'`). This does not affect the correctness of the blog post but is worth noting for readers building production quarantine pipelines.
- The `isValidJSON('null')` returning `1` and `isValidJSON('')` returning `0` claims are correct per RFC 8259 (JSON specification), though these specific edge cases are not explicitly documented in the ClickHouse docs.
