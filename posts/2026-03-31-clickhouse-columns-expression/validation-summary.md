# Validation Summary: How to Use COLUMNS Expression in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- `COLUMNS` meta-column selector
- `APPLY` column transformer
- `system.columns` metadata table
- RE2 regex

## Sources Consulted
- ClickHouse SELECT reference — COLUMNS expression: https://clickhouse.com/docs/sql-reference/statements/select/
- ClickHouse modifiers (APPLY / EXCEPT / REPLACE): https://clickhouse.com/docs/sql-reference/statements/select/
- `system.columns` table: https://clickhouse.com/docs/operations/system-tables/columns
- `match()` string function: https://clickhouse.com/docs/sql-reference/functions/string-search-functions#match
- ClickHouse issue #63320 (MULTIPLE_EXPRESSIONS_FOR_ALIAS with COLUMNS): https://github.com/ClickHouse/ClickHouse/issues/63320
- ClickHouse issue #89201 (alias error, COLUMNS expansion): https://github.com/ClickHouse/ClickHouse/issues/89201

## Issues Found

1. **`MAX(COLUMNS('score_.*')) AS max_scores` is incorrect.** `f(COLUMNS(...))` passes each matched column as a separate argument to a single call of `f`. Because `MAX` is unary, this fails with `NUMBER_OF_ARGUMENTS_DOESNT_MATCH` when the pattern matches more than one column. Even if that weren't the case, aliasing a multi-column expansion with a single `AS` triggers `MULTIPLE_EXPRESSIONS_FOR_ALIAS`. Replaced with the idiomatic `COLUMNS('score_.*') APPLY(max)`, which expands to one `max()` per matched column, and added a one-line explanation of why the direct `MAX(COLUMNS(...))` form breaks.

2. **`avg(COLUMNS('cpu_.*')) AS cpu_avgs` / `avg(COLUMNS('mem_.*')) AS mem_avgs` in the dashboard example suffer the same problems.** `avg` is also unary, so both the expansion and the alias fail. Rewrote as `COLUMNS('cpu_.*') APPLY(avg)` and `COLUMNS('mem_.*') APPLY(avg)`.

## Review Notes
- The "Using COLUMNS in WHERE Clauses" heading is slightly misleading: the example queries `system.columns` with `match()` rather than using the `COLUMNS(...)` selector itself. The surrounding prose acknowledges that `COLUMNS` is most useful in `SELECT`, so the section is technically correct as written; left unchanged to respect scope.
- Claims verified as accurate: RE2 regex syntax, "must expand to at least one column or the query errors" (throws when it's the only SELECT expression and matches nothing), mixing named columns with `COLUMNS(...)` in the same `SELECT` list.
- Worth noting for future updates: ClickHouse also supports `EXCEPT` and `REPLACE` column transformers alongside `APPLY`, which pair naturally with `COLUMNS`. Out of scope here, but a useful follow-up.
