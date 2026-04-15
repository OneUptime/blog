# Validation Summary: How to Use normalizeQuery() and normalizedQueryHash() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL functions: `normalizeQuery()`, `normalizedQueryHash()`)
- ClickHouse `system.query_log` system table
- SQL aggregate and window functions (`quantile`, `countIf`, `any`)

## Sources Consulted
- ClickHouse official documentation for normalizeQuery: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#normalizequery
- ClickHouse official documentation for system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- Altinity KB useful queries for system.query_log: https://kb.altinity.com/altinity-kb-useful-queries/query_log/

## Issues Found
1. **Array normalization placeholder was incorrect**: The post stated that arrays of literals are replaced with `[?]`, but ClickHouse actually replaces them with `[?..]`. Fixed the description to use the correct placeholder notation.
2. **Expected output showed normalized values instead of originals**: In the "Basic Normalization" section, the last row of the expected output table showed `SELECT id FROM events WHERE ts > ? AND status = ?` in the `query` column (the raw input column). Since the input query contains literal values (`1711900800` and `'active'`), the left side should display those original values. Fixed to show `SELECT id FROM events WHERE ts > 1711900800 AND status = 'active'`.

## Review Notes
- The `system.query_log` column `query_duration_ms` (UInt64, milliseconds) is verified correct.
- The type enum value `'QueryFinish'` is verified correct for filtering completed queries.
- All referenced `system.query_log` columns (`query`, `type`, `event_date`, `read_rows`) exist and are correctly used.
- The use of `any(query)` with `normalizeQuery()` in the hash-based grouping example is a valid and idiomatic ClickHouse pattern.
- ClickHouse supports referencing column aliases earlier in the same SELECT clause (used in the time-window comparison query), which is a ClickHouse-specific extension to standard SQL. This is correct but worth noting as it would not work in most other SQL databases.
