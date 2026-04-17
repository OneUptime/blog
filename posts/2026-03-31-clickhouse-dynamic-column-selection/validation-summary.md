# Validation Summary: How to Use Dynamic Column Selection in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (SQL dialect)
- ClickHouse `COLUMNS` expression
- ClickHouse `APPLY` and `EXCEPT` modifiers
- `system.columns` system table

## Sources Consulted
- ClickHouse SELECT docs — COLUMNS expression: https://clickhouse.com/docs/sql-reference/statements/select/
- ClickHouse syntax docs (string literal escape handling): https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse PR #11208 (backslash escape behavior): https://github.com/ClickHouse/ClickHouse/pull/11208
- ClickHouse Issue #10922 (regexp/LIKE escape RFC): https://github.com/ClickHouse/ClickHouse/issues/10922
- `system.columns` reference: https://clickhouse.com/docs/operations/system-tables/columns

## Issues Found

1. **Incorrect claim that `COLUMNS('metric_.*')` matches columns "starting with `metric_`"**
   - The `COLUMNS` regex is applied unanchored — ClickHouse's docs explicitly show `COLUMNS('a')` matching any column *containing* `a`, not just columns starting with `a`.
   - **Fix:** Changed the example regex to `'^metric_'` so it genuinely matches the prefix, and added a sentence clarifying that the match is unanchored by default.

2. **Incorrect example `SUM(COLUMNS('bytes_.*')) AS total_bytes`**
   - `COLUMNS(...)` expands to multiple arguments, one per matched column. Since `sum()` is a unary aggregate function, this pattern either errors ("Number of arguments for function sum does not match") when multiple columns match, or is misunderstood by readers as producing a single summed total. There is no direct way to produce a single `total_bytes` via `SUM(COLUMNS(...))`.
   - **Fix:** Rewrote the example to use the idiomatic `COLUMNS('bytes_.*') APPLY(sum)` pattern, which correctly aggregates each matched column separately, and updated the surrounding description to reflect the per-column result.

## Review Notes

- The `'p\d+_latency_ms'` escape in the practical use case looked suspect at first, but ClickHouse intentionally preserves the backslash for unrecognized escape sequences (see PR #11208), so `\d` is passed through to the regex engine as-is. No change needed; double-escaping (`\\d`) would also work but is not required.
- `SELECT * EXCEPT (...)` syntax, `APPLY(function)` modifier, and the `system.columns` query with `match()` are all correct as written.
- The `COLUMNS('^(cpu|mem|disk)_usage$')` example is correctly anchored and its description is accurate.
- Minor stylistic note (not changed): readers writing their own regexes should be aware that ClickHouse uses RE2 semantics, so PCRE-specific features like backreferences are not supported. The post doesn't make any PCRE-specific claims, so no correction is needed.
