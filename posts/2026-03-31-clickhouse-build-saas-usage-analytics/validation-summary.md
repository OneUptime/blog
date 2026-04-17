# Validation Summary: How to Build a SaaS Usage Analytics System with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree engines)
- SQL (ClickHouse dialect, CTEs, aggregate combinators like `uniqIf`, `countIf`, `sumIf`)
- Kafka (referenced in architecture diagram)
- Grafana / Metabase (referenced in architecture diagram)
- Mermaid diagrams

## Sources Consulted
- ClickHouse SQL Reference — SELECT statement: https://clickhouse.com/docs/sql-reference/statements/select
- ClickHouse SQL Reference — WITH clause (CTEs): https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse Aggregate Function Combinators: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse Date/Time Functions (`dateDiff`, `today`, `toDate`, `toStartOfMonth`, `toYYYYMM`, `toMonday`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse GROUP BY Clause: https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse MergeTree engine family: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse ReplacingMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree

## Issues Found
1. **Churn Prediction Signals query — missing columns bug.** The original query wrapped a pre-aggregated inner subquery (grouped by `account_id, day`) that projected only `account_id, day, active_users, daily_events`, but the outer aggregation referenced `user_id` and `occurred_at` in `max(occurred_at)` and `uniqIf(user_id, occurred_at >= today() - 7)`. ClickHouse would reject this with a "Missing columns" error because those columns are not in the inner SELECT's output scope. Additionally, the `usage_drop_warning` logic (`events_last_30d < avg_events * 0.5`) compared a 30-day row count against an average daily-events value from a different aggregation level, which is semantically incoherent.

   **Fix:** Restructured the subquery as a CTE (`account_stats`) that aggregates directly on `product_events`, producing `last_active_at`, `events_last_30d`, `events_last_7d`, and `active_users_last_7d` from a single GROUP BY. Rewrote `usage_drop_warning` to compare the last 7 days of events against the pro-rated 7-day slice of the 30-day average (`act.events_last_7d < act.events_last_30d / 30.0 * 7 * 0.5`), which is the intended "recent usage is half of baseline" signal.

## Review Notes
- The `uniqIf(feature, occurred_at >= today() - 30)` in the Account Health Scoring CTE has a redundant condition (the outer `WHERE occurred_at >= today() - 30` already enforces it), but it is still technically correct.
- The DAU/MAU stickiness query uses an implicit CROSS JOIN (`FROM dau d, mau m`) which works because `mau` returns a single row. This is valid ClickHouse but readers might prefer `CROSS JOIN` for explicitness.
- The Product Usage Funnel query does not explicitly lower-bound `e.occurred_at >= na.created_at`. Since new accounts cannot have pre-creation events in practice, this has no impact, but adding an explicit lower bound would be defensive.
- Schema choices (MergeTree `PARTITION BY toYYYYMM`, `ORDER BY (account_id, occurred_at)`, `ReplacingMergeTree(version)`, `LowCardinality(String)` for enum-like fields, `Map(String, String)` for properties, `Decimal(10, 2)` for MRR) are all idiomatic ClickHouse and align with official documentation.
