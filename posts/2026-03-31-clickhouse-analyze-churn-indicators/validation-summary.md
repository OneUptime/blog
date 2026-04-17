# Validation Summary: How to Analyze Churn Indicators with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, aggregate combinators)
- SQL analytics patterns for SaaS churn analysis

## Sources Consulted
- ClickHouse docs: MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs: Data types (LowCardinality, Date, UInt*) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse docs: Aggregate function combinators (`-If`) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse docs: Date/time functions (`today`, `toStartOfWeek`, `dateDiff`) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse docs: Arithmetic / comparison (`least`, `round`, Date arithmetic) — https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse docs: SELECT / HAVING (alias usage in HAVING) — https://clickhouse.com/docs/en/sql-reference/statements/select/having
- ClickHouse docs: Operators — INTERVAL syntax — https://clickhouse.com/docs/en/sql-reference/operators

## Issues Found
No technical issues found.

- `CREATE TABLE ... ENGINE = MergeTree() PARTITION BY toYYYYMM(day) ORDER BY (account_id, day)` is valid.
- `LowCardinality(String)`, `UInt16/32/64`, and `Date` types are correct.
- `today() - max(day)` returns `Int32` (days) — valid in ORDER BY/HAVING and as operand of multiplication.
- Aliases (`days_inactive`, `pct_change`) are permitted in ClickHouse `HAVING` clauses.
- `sumIf`/`countIf` conditional-aggregation combinators are correctly used.
- `toStartOfWeek`, `least`, `round`, and `dateDiff('day', ...)` all exist with the argument orders shown.
- `BETWEEN ... AND ...` and `INTERVAL 30 DAY` arithmetic on `Date` values is supported.
- `JOIN` on `account_id` with the assumed `churned_accounts(account_id, churned_at)` shape is straightforward and valid.

## Review Notes
- The post assumes a `churned_accounts` table exists for the post-hoc pattern section; its schema is implied but not shown. Readers are expected to infer columns `account_id` and `churned_at`.
- `today()` uses the server timezone; teams operating across timezones may prefer `toDate(now('UTC'))` for deterministic windows.
- `HAVING days_inactive >= 14` relies on alias resolution; in stricter SQL dialects the underlying expression would be required — ClickHouse accepts both.
- The composite risk score is illustrative rather than calibrated — readers should treat the coefficients (`* 2`, `* 50`) as starting points to tune against their own churn labels.
