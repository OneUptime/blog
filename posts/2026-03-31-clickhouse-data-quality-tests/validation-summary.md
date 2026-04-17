# Validation Summary: How to Write Data Quality Tests for ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, `today()`, `now()`, `dateDiff`, `HAVING` without `GROUP BY`, `WITH` CTEs, `Nullable()` types)
- Python (`clickhouse-connect` client)
- dbt with the ClickHouse adapter (schema tests, `dbt_utils.accepted_range`)
- SQL data quality / assertion patterns

## Sources Consulted
- ClickHouse SQL reference — Date/Time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions (for `today()`, `now()`, `dateDiff`)
- ClickHouse SQL reference — `SELECT ... HAVING`: https://clickhouse.com/docs/en/sql-reference/statements/select/having
- ClickHouse — Nullable data type: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse — Constraints in CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table#constraints
- clickhouse-connect Python client docs: https://clickhouse.com/docs/en/integrations/python (`client.query()` returns `QueryResult` with `result_rows`)
- dbt generic tests (`not_null`, `unique`, `accepted_values`): https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt_utils `accepted_range`: https://github.com/dbt-labs/dbt-utils#accepted_range-source
- dbt ClickHouse adapter: https://github.com/ClickHouse/dbt-clickhouse

## Issues Found

1. **Incorrect claim that "ClickHouse is schemaless about NULL handling."**
   - ClickHouse is strongly typed and columns are `NOT NULL` by default; NULLs are only permitted when a column is explicitly wrapped in `Nullable(T)`. Calling it "schemaless about NULL handling" is misleading.
   - Rewrote the sentence to: *"ClickHouse does not enforce foreign key or uniqueness constraints, and any column wrapped in `Nullable()` can accept NULLs silently."* This preserves the author's original point (that constraint enforcement is weak, so SQL assertions are needed) while being technically accurate.

2. **"Trailing 7-day average" query actually spans 8 days.**
   - The `daily_counts` CTE used `WHERE event_date >= today() - 8`, and `stats` filtered to `event_date < today()`. That window is `today-8` through `today-1` inclusive — 8 days, not 7, even though the alias is `avg_7d` and the section heading says "7-day average."
   - Changed `today() - 8` → `today() - 7` so the window matches the description and the alias.

3. **dbt `unique` test on `user_id` in an `events` table.**
   - The earlier SQL example explicitly identifies duplicates by the composite `(user_id, event_time)` — implying multiple events per user is expected. A dbt `unique` test on `user_id` alone would therefore fail under normal conditions and contradicts the preceding example.
   - Removed the `- unique` test from the `user_id` column. (A proper composite-uniqueness test would require `dbt_utils.unique_combination_of_columns`, but adding that would be beyond a minimal correction.)

## Review Notes
- The `HAVING cnt > 0` / `HAVING null_user_ids > 0` pattern (aggregate-only query with `HAVING` and no `GROUP BY`) is valid in ClickHouse and returns zero rows when the assertion passes — the post's "zero rows = clean" contract is correct.
- The `dateDiff('minute', start, end)` signature used in the freshness check matches current ClickHouse syntax (unit, start, end, optional timezone).
- The Python snippet uses the `clickhouse-connect` shape (`client.query(...).result_rows`). Note: it interpolates `{table}`, `{column}`, and `{date}` directly into the SQL string — fine for a pipeline helper where inputs are trusted, but readers should be aware this is not safe against untrusted input. Not altered since the post targets internal data-quality jobs, but worth flagging.
- `dbt_utils.accepted_range` is still the canonical package-provided range test as of current dbt-utils releases; the built-in dbt tests do not cover numeric ranges out of the box.
- The ClickHouse `unique` dbt test can be expensive on large tables because ClickHouse has no unique index — readers deploying this against production-scale events tables should be prepared to scope it with a `where:` filter or replace with a sampled variant.
