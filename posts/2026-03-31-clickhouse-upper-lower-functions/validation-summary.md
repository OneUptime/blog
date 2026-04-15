# Validation Summary: How to Use upper() and lower() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- UTF-8 / Unicode case conversion
- ClickHouse String functions (upper, lower, upperUTF8, lowerUTF8)
- ClickHouse MATERIALIZED columns
- ClickHouse MergeTree engine

## Sources Consulted
- ClickHouse official documentation on String functions: https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse official documentation on upper/lower: https://clickhouse.com/docs/en/sql-reference/functions/string-functions#upper
- ClickHouse official documentation on MATERIALIZED columns: https://clickhouse.com/docs/en/sql-reference/statements/create/table#materialized
- ClickHouse official documentation on MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **Incorrect output for `lower('cafe')` in UTF-8 comparison table**: The table showed `lower('cafe')` (with accented e) returning `cafE` (with accented uppercase E), but this is wrong. The `lower()` function only converts uppercase ASCII bytes (A-Z, 0x41-0x5A) to lowercase. Since all ASCII characters in `cafe` (with accent) are already lowercase and the accented-e bytes (0xC3 0xA9) fall outside the ASCII range, `lower()` leaves the string completely unchanged. Fixed the table entry from `cafE` (with accents) to `cafe` (with accent, unchanged).

2. **Section heading said "Materialized View" instead of "Materialized Column"**: The section "Normalizing Columns on Ingest with a Materialized View" used a MATERIALIZED column expression in the CREATE TABLE statement, not a materialized view (which is a separate table populated via INSERT triggers). The body text correctly described it as a "materialized column," but the heading was misleading. Changed heading to "Normalizing Columns on Ingest with a Materialized Column."

## Review Notes
- The Turkish locale edge case for `istanbul` is worth noting: in Turkish, lowercase `i` uppercases to `I` (with dot above), not `I`. ClickHouse uses standard Unicode case mapping (not locale-aware), so `upperUTF8('istanbul')` returns `ISTANBUL`, not `ISTANBUL` with a dotted-I. The post's output is correct for ClickHouse's behavior, but a note about this locale-specific nuance could be a future addition for completeness.
- The "Without normalization: 6 distinct tags" comment is slightly misleading since there are only 6 rows with 6 distinct values. It is technically correct but could be confused as implying more tags than rows.
- All SQL syntax is valid ClickHouse SQL. CREATE TABLE, INSERT, SELECT, GROUP BY, UNION ALL, LIKE, MATERIALIZED, round(), avg(), count(), concat() are all used correctly.
