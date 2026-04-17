# Validation Summary: How to Calculate Apdex Score in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree, SummingMergeTree, Materialized Views)
- Apdex (Application Performance Index) metric
- ClickHouse aggregation functions: `countIf`, `count`, `sum`, `multiIf`, `round`, `toStartOfHour`, `now`

## Sources Consulted
- Apdex Alliance / Apdex specification (apdex.org) — formula and interpretation bands
- ClickHouse SQL reference — `countIf` (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators)
- ClickHouse SQL reference — `multiIf` (https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions)
- ClickHouse date/time functions — `toStartOfHour`, `now` (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)
- ClickHouse table engines — `MergeTree`, `SummingMergeTree` (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree)
- ClickHouse Materialized Views (https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view)

## Issues Found
No technical issues found.

- The Apdex formula `(Satisfied + Tolerating / 2) / Total` and the Satisfied (≤ T), Tolerating (T < x ≤ 4T), Frustrated (> 4T) classification match the Apdex Alliance specification.
- Operator precedence in the `round((countIf(...) + countIf(...) / 2.0) / count(), 4)` expression correctly evaluates as `(Satisfied + (Tolerating / 2)) / Total`, matching the Apdex definition.
- The schema definition uses valid `MergeTree` syntax with a reasonable `ORDER BY (service, timestamp)`.
- `WITH 500 AS t` is valid ClickHouse CTE/scalar-binding syntax.
- The per-endpoint query using `multiIf` works correctly because `GROUP BY endpoint` ensures all rows within a group share the same `endpoint` value, so the threshold lookup is consistent.
- The `SummingMergeTree`-based materialized view pattern is idiomatic: `countIf` produces `UInt64` values at insert time, which `SummingMergeTree` sums during merges, and the read query re-applies `sum()` to aggregate across unmerged parts — this is the standard approach.
- The Apdex interpretation bands (0.94–1.0 Excellent, 0.85–0.94 Good, 0.70–0.85 Fair, 0.50–0.70 Poor, <0.50 Unacceptable) match Apdex Alliance definitions.

## Review Notes
- Minor stylistic observation (not an error): the interpretation table lists both `1.0 - Excellent` and `0.94-1.0 - Excellent`. The first line is redundant with the range but is not technically incorrect — 1.0 is the theoretical maximum and is often called out separately. No change made.
- The per-endpoint query repeats the `multiIf(...)` expression several times. A CTE or subquery that projects the threshold once could improve readability, but the query as written is functionally correct. No change made (stylistic, not technical).
- `duration_ms UInt32` caps observable durations at ~4.29 billion ms (~49 days); fine for HTTP request durations in practice.
