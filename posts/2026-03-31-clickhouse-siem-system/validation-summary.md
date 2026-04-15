# Validation Summary: How to Build a SIEM System with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine family, materialized views)
- SIEM concepts (security event collection, correlation, threat detection)
- IPv4 data type and network filtering
- SummingMergeTree and AggregatingMergeTree engines
- ClickHouse aggregate function combinators (-State / -Merge)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE syntax — https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse documentation: MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: SummingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation: AggregatingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation: Aggregate function combinators (-State, -Merge) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation: countDistinct (alias for uniqExact) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/countdistinct
- ClickHouse documentation: IPv4 data type — https://clickhouse.com/docs/en/sql-reference/data-types/ipv4
- ClickHouse documentation: Date/time functions (toStartOfFiveMinutes, toStartOfHour, toYYYYMMDD) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
1. **Materialized view used SummingMergeTree with a non-additive aggregate (countDistinct).**
   - **What was wrong:** The `siem_hourly_summary` materialized view used `SummingMergeTree` engine with both `count() AS events` and `countDistinct(source_ip) AS unique_ips`. `SummingMergeTree` sums all numeric columns when merging rows with identical ORDER BY keys. While `count()` results are additive and sum correctly across insert batches, `countDistinct()` results are not additive — summing distinct counts from separate batches overcounts IPs that appear in multiple batches.
   - **What was changed:** Switched the engine to `AggregatingMergeTree` and replaced `count()` / `countDistinct()` with their `-State` combinator equivalents (`countState()` / `uniqState()`). Added a companion query example showing how to read from the view using `-Merge` combinators (`countMerge()` / `uniqMerge()`).
   - **Why:** `AggregatingMergeTree` with `-State`/`-Merge` combinators is the correct pattern for materialized views that need to maintain non-additive aggregates like distinct counts. The intermediate state objects are merged correctly during background part merges.

## Review Notes
- The lateral movement detection query uses `dest_ip LIKE '10.%'` on an `IPv4` column. This works in modern ClickHouse via implicit IPv4-to-String conversion, but is less efficient than using CIDR range checks (e.g., `isIPAddressInRange(toString(dest_ip), '10.0.0.0/8')`) or direct IP range comparisons, which can leverage the column's native UInt32 storage. Not changed since it is functionally correct.
- `countDistinct()` is used throughout as a valid ClickHouse alias for `uniqExact()`. This is correct and well-documented.
- All other SQL syntax, function names, engine configurations, TTL expressions, and partitioning strategies are correct for current ClickHouse versions.
