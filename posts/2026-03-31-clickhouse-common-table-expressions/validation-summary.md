# Validation Summary: How to Use Common Table Expressions in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (Common Table Expressions / WITH clause)
- Recursive CTEs

## Sources Consulted
- ClickHouse WITH clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse INTERVAL / Date arithmetic documentation

## Issues Found
No technical issues found.

All claims were verified against the official ClickHouse documentation:

- `WITH cte_name AS (subquery)` basic syntax — correct.
- Multiple comma-separated CTEs with later CTEs referencing earlier ones — correct (ClickHouse docs confirm this; forward references are also allowed).
- Scalar CTE forms `WITH (SELECT ...) AS name` and `WITH expression AS name` — both are documented syntax forms.
- Recursive CTEs via `WITH RECURSIVE ... UNION ALL ...` — supported (since ClickHouse 24.3 via the new query analyzer).
- The recursion depth setting name `max_recursive_cte_evaluation_depth` — verified as the exact official setting name.
- The claim that ClickHouse inlines CTEs and they do not automatically improve performance — confirmed by the official docs ("ClickHouse inlines the subquery of a CTE at each point of reference, re-executing it every time").
- `now() - INTERVAL 1 DAY` syntax — valid ClickHouse date arithmetic.

## Review Notes
- The post's statement that CTEs are re-executed at each reference point is consistent with ClickHouse's default inlining behavior. A future enhancement could mention the experimental `MATERIALIZED` CTE modifier (requires `enable_materialized_cte = 1` and `enable_analyzer = 1`) which allows a CTE to be evaluated once and reused — this is ClickHouse's official mechanism for the performance optimization that the post correctly notes is not automatic. `MATERIALIZED` cannot be combined with `RECURSIVE`.
- Recursive CTEs require the new query analyzer (default in recent ClickHouse versions); readers on pre-24.3 clusters or with `enable_analyzer = 0` would need to enable it. Not strictly an error, but a version-specific caveat worth awareness.
