# Validation Summary: How to Use Subqueries in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect)
- SQL subqueries (scalar, FROM/derived table, IN)
- Common Table Expressions (CTEs / WITH clause)
- ClickHouse functions: `multiIf`, `toDate`, `count`, `sum`, `avg`, `max`

## Sources Consulted
- ClickHouse WITH Clause Documentation — https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse FROM Clause Documentation — https://clickhouse.com/docs/sql-reference/statements/select/from
- ClickHouse IN Operators Documentation — https://clickhouse.com/docs/sql-reference/operators/in
- ClickHouse Conditional Functions (multiIf) — https://clickhouse.com/docs/sql-reference/functions/conditional-functions
- ClickHouse Date/Time Functions (toDate) — https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse count Function — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- ClickHouse DISTINCT Clause — https://clickhouse.com/docs/sql-reference/statements/select/distinct
- ClickHouse Syntax (aliases, reserved words) — https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse Correlated Subqueries Umbrella Issue — https://github.com/ClickHouse/ClickHouse/issues/79890

## Issues Found
No technical issues found.

## Review Notes
- The correlated subquery section states ClickHouse has "limited support." Recent ClickHouse versions have expanded correlated subquery support (tracked under a Beta feature flag), but the post's recommendation to prefer JOINs/CTEs remains sound advice for compatibility and performance.
- The first FROM subquery example groups by `event_date` in both the inner and outer queries, meaning the outer `sum()` and `avg()` each operate on a single row per group. The SQL is valid but the outer aggregation is effectively a no-op. This is a pedagogical nuance rather than a technical error.
- `NOT IN` with subqueries that may return NULL values can produce unexpected results in ClickHouse (as in standard SQL). The post doesn't mention this caveat, which could be a useful addition in a future revision.
