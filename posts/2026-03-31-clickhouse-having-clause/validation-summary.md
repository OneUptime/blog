# Validation Summary: How to Use HAVING Clause in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (HAVING, WHERE, GROUP BY, aggregate functions)
- ClickHouse-specific features: `WITH ROLLUP`, `WITH TOTALS`, `today()`, `now()`, `toDate()`, `INTERVAL` expressions

## Sources Consulted
- ClickHouse SELECT/HAVING documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/having
- ClickHouse GROUP BY documentation (WITH ROLLUP, WITH TOTALS, WITH CUBE): https://clickhouse.com/docs/en/sql-reference/statements/select/group-by
- ClickHouse SELECT WHERE documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/where
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions

## Issues Found
No technical issues found.

Verified claims:
- HAVING filters rows after aggregation; WHERE filters before aggregation — correct.
- Aggregates cannot be referenced inside WHERE — correct, ClickHouse will throw an error.
- HAVING can reference aggregate expressions directly (not only SELECT aliases) — correct.
- Column aliases (e.g. `total_spent`, `cnt`) can be referenced in HAVING and GROUP BY — correct in ClickHouse (aliases are resolved for these clauses).
- `GROUP BY ... WITH ROLLUP` followed by `HAVING` filters the rollup/subtotal rows — correct; ROLLUP produces additional rows that participate in HAVING.
- `today() - 30`, `now() - INTERVAL 90 DAY`, `toDate(created_at)` are all valid ClickHouse syntax.
- The performance recommendation — push non-aggregate conditions from HAVING down to WHERE — aligns with ClickHouse's execution model; the query pipeline benefits when fewer rows enter the aggregation stage.

## Review Notes
- The section "HAVING with GROUP BY Modifiers" mentions both WITH ROLLUP and WITH TOTALS. The statement that HAVING filters the additional rows applies cleanly to WITH ROLLUP and WITH CUBE. For WITH TOTALS specifically, the interaction with HAVING is controlled by the `totals_mode` setting (`before_having`, `after_having_exclusive` (default), `after_having_inclusive`, `after_having_auto`), which affects how the totals row is computed relative to the HAVING predicate. The post's example uses WITH ROLLUP, so the described behavior matches, but a future revision could mention `totals_mode` when discussing WITH TOTALS.
- "Using WHERE for pre-group conditions is always faster" is a reasonable generalization; it holds in practice because WHERE predicates are evaluated before aggregation and can benefit from primary-key/index pruning on MergeTree tables.
- No deprecated APIs or outdated syntax detected.
