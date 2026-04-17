# Validation Summary: ClickHouse for PostgreSQL Developers - Key Differences

## Status
validated

## Post Type
Guide / Migration reference

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree engines; SQL dialect; array, string, and window functions; EXPLAIN modes)
- PostgreSQL (MVCC transactions, tablespaces, array and string functions, window functions, EXPLAIN ANALYZE)

## Sources Consulted
- ClickHouse SQL Reference — Statements and Functions: https://clickhouse.com/docs/en/sql-reference
- ClickHouse Table Engines (MergeTree family): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse Array Functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse String Search / Regex Functions (match, extract, extractAll): https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse Splitting Functions (splitByChar): https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse EXPLAIN statement (PLAN, PIPELINE, ESTIMATE): https://clickhouse.com/docs/en/sql-reference/statements/explain
- PostgreSQL Documentation — Pattern Matching (regexp_match), String Functions, Array Functions, Window Functions: https://www.postgresql.org/docs/current/

## Issues Found
1. **Misleading window-functions claim** — The original comment stated "ClickHouse requires ORDER BY in the window," which implies a syntactic difference from PostgreSQL. Neither engine strictly requires `ORDER BY` inside a window; both use standard SQL syntax and `row_number()` returns non-deterministic results without it in either system. Updated the comment to note both engines use the same standard SQL syntax, and added a small version note that ClickHouse added window functions in 21.10.
2. **Incorrect `regexp_match` → `match` mapping** — PostgreSQL's `regexp_match(string, pattern)` returns the matched substring(s) as `text[]`, while ClickHouse's `match(haystack, pattern)` returns a `UInt8` boolean (0/1) indicating whether the pattern matches. The semantically equivalent function for extracting the first match in ClickHouse is `extract(haystack, pattern)`. Changed the ClickHouse side of the mapping from `match` to `extract`.

## Review Notes
- The "No ACID Transactions" section is simplified but appropriate for a beginner migration guide. ClickHouse has had experimental transaction support (`BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`) since 22.x for MergeTree-family tables, but it is limited and not commonly used in production. The post's framing of "design around idempotent inserts" reflects typical production practice.
- The `length(array)` mapping is correct: ClickHouse's `length()` works on both strings and arrays, whereas PostgreSQL uses `array_length(arr, 1)` or `cardinality(arr)` for arrays.
- PostgreSQL's `split_part(s, ',', 1)` is correctly mapped to `splitByChar(',', s)[1]` — both are 1-indexed.
- `substring(s, 1, 5)` works identically in both systems.
- `EXPLAIN PIPELINE` and `EXPLAIN ESTIMATE` are valid ClickHouse EXPLAIN modes.
