# Validation Summary: How to Use -OrDefault and -OrNull Combinators in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Aggregate function combinators (`-If`, `-OrDefault`, `-OrNull`)
- MergeTree table engine

## Sources Consulted
- [ClickHouse Docs – Aggregate Function Combinators](https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators)
- [ClickHouse GitHub – combinators.md](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/aggregate-functions/combinators.md)
- [ClickHouse Issue #79185 – avg Returns NULL Instead of NaN on Empty Nullable Column](https://github.com/ClickHouse/ClickHouse/issues/79185)
- [ClickHouse Issue #6134 – maxIf() does not return nulls like Avg(), AvgIf() and max()](https://github.com/yandex/ClickHouse/issues/6134)

## Issues Found
1. **Incorrect combinator suffix order (`-IfOrDefault` / `-IfOrNull`)**
   - What was wrong: The post introduced and used the combined suffix as `-IfOrDefault` / `-IfOrNull` (e.g. `aggFuncIfOrDefault(value, condition)`, `avgIfOrNull(amount, region = 'eu-central')`). ClickHouse's documented and supported form places `-If` as the outer suffix, i.e. `avgOrDefaultIf(x, cond)` and `avgOrNullIf(x, cond)`. `avgIfOrNull` / `avgIfOrDefault` are not recognized aggregate function names.
   - What was changed:
     - In the "Syntax" section, the parenthetical `(as -IfOrDefault and -IfOrNull)` was changed to `(as -OrDefaultIf and -OrNullIf)`.
     - The section heading `## Combining Combinators: -IfOrDefault and -IfOrNull` was changed to `## Combining Combinators: -OrDefaultIf and -OrNullIf`.
     - The pseudocode block `aggFuncIfOrDefault(value, condition)` / `aggFuncIfOrNull(value, condition)` was corrected to `aggFuncOrDefaultIf(value, condition)` / `aggFuncOrNullIf(value, condition)`, along with a brief wording tweak to explain the spelling.
     - The example query `avgIfOrNull(amount, region = 'eu-central')` was changed to `avgOrNullIf(amount, region = 'eu-central')`.
   - Why: The ClickHouse combinators reference explicitly shows `avgOrNullIf` and `avgOrDefaultIf` as the correct forms. The earlier sections of the post already used the correct `avgOrDefaultIf` / `sumOrDefaultIf` / `minOrNullIf` etc., so the corrections also make the post internally consistent.

## Review Notes
- The claim that `avg()` on zero rows returns `nan` matches the documented behavior. Note that on Nullable inputs the observed behavior may instead be `NULL` (see ClickHouse issue #79185), but this does not affect the non-Nullable `Float64` column used in the post's example.
- The claim that `minIf` / `maxIf` return `0` for empty numeric groups (rather than `NULL` or `nan`) is consistent with ClickHouse's behavior as discussed in issue #6134.
- `sum()` on empty input returning `0` is correct (additive identity).
- `first_value()` is mentioned as another function where the empty-group default is non-obvious — this is accurate; `first_value()` is a ClickHouse aggregate function.
- The `CREATE TABLE` / `INSERT` / `SELECT ... GROUP BY` examples are syntactically valid ClickHouse SQL for a MergeTree table.
- The output tables in the post are consistent with the sample data: for `us-east`, only one row has `is_returned = 1` (`amount = 95`), yielding `avg = sum = min = 95`; for `us-west`, no rows have `is_returned = 1`, so `avgIf` → `nan`, `sumIf` → `0`, `minIf` → `0`, matching what the post shows.
