# Validation Summary: How to Build Pricing Tier Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL / MergeTree engine)
- SaaS pricing analytics patterns (usage vs quota, upgrade/downgrade signals)

## Sources Consulted
- ClickHouse `CREATE TABLE` / MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (`LowCardinality`, `DateTime`, `UInt64`, `Float64`): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse date/time functions (`toStartOfMonth`, `toYYYYMMDD`, `now`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions (`sum`, `any`, `uniqExact`, `quantile`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse `INTERVAL` operator: https://clickhouse.com/docs/en/sql-reference/operators#operator-interval
- ClickHouse `JOIN` clause: https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
No technical issues found.

All DDL and SELECT statements use valid ClickHouse syntax:
- `MergeTree()` engine with `PARTITION BY toYYYYMMDD(ts)` and `ORDER BY` is correct.
- `LowCardinality(String)` is the recommended type for low-cardinality enums like `plan` / `resource`.
- `quantile(0.5)(col)` parametric aggregate function syntax is correct.
- `INTERVAL 30 DAY` is a valid ClickHouse interval expression.
- `uniqExact`, `any`, `sum` aggregates used correctly.
- JOIN patterns with subqueries resolve unqualified columns from the outer (left) side as expected in ClickHouse.

## Review Notes
- The "Revenue by Plan - Monthly Trend" section title mentions revenue, but the query only returns `uniqExact(account_id) AS active_accounts` (a count of active accounts, not revenue). This is a content/labeling nuance rather than a technical error — the SQL itself is correct — so it was left as-is per the instruction to only fix technical mistakes.
- `AS limit` is used as a column alias in the "Usage vs Quota per Account" query. `LIMIT` is a SQL keyword but ClickHouse's context-sensitive parser accepts it as an unquoted alias in the `SELECT` list. Consider renaming it (e.g., `monthly_limit`) in future revisions for portability with stricter tooling, but it is not incorrect today.
- Percentage calculations (`sum(...) * 100.0 / any(...)`) could divide by zero if `monthly_limit` is 0 for any plan/resource pair; that is an operational concern and not a syntax issue.
- Column references like `plan` and `resource` in the "Under-Utilization" query are unqualified but resolve to the left (subquery) side; adding aliases would improve readability but is not required.
