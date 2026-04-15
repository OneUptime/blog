# Validation Summary: How to Use LEFT ARRAY JOIN in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- ARRAY JOIN / LEFT ARRAY JOIN clause
- arrayEnumerate function
- Nested data types

## Sources Consulted
- ClickHouse official documentation — ARRAY JOIN clause: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- ClickHouse official documentation — Array functions (arrayEnumerate): https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official documentation — Data types (Nested, Array): https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found
No technical issues found.

## Review Notes
- The introductory paragraph describes LEFT ARRAY JOIN as "emitting a single row with a `NULL` (or zero/empty-string default depending on the element type)." The official documentation states defaults are "usually 0, empty string or NULL." The post lists NULL first, which could imply it is the most common default, whereas non-Nullable types (which produce 0 or empty string) are far more common in practice. The parenthetical makes the statement technically correct, so no change was made.
- The "Practical Use Case" section references an `events` table that is not defined in the post. This is acceptable as a conceptual/illustrative example rather than a runnable snippet.
- All CREATE TABLE, INSERT, and SELECT statements use valid ClickHouse syntax and the expected outputs shown are accurate.
