# Validation Summary: How to Use isNull() and isNotNull() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL dialect (isNull, isNotNull, countIf, if, multiIf, IS NULL / IS NOT NULL operators)

## Sources Consulted
- ClickHouse official documentation — Functions for working with Nullable values: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse official documentation — count aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- ClickHouse official documentation — Conditional functions (if, multiIf): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse official documentation — Operators (IS NULL, IS NOT NULL): https://clickhouse.com/docs/en/sql-reference/operators

## Issues Found
1. **Incorrect `count()` example in "Aggregate Functions and NULL" section.** The original example labeled `count()` as `non_null_count` and computed `count() + countIf(isNull(value))` as `total_rows`. This is wrong: in ClickHouse, `count()` with no argument already returns the total number of rows (including NULLs). Only `count(col)` returns the count of non-NULL values. The example was rewritten to correctly use `count()` for `total_rows` and `count(value)` for `non_null_count`, and to drop the incorrect sum.
2. **Incorrect claim that `IS NULL` is not available inside `if()` / `multiIf()`.** In ClickHouse, the `IS NULL` operator is an expression and can be used inside function calls just like `isNull()`. Rephrased the sentence to describe `isNull()` as a function-form alternative to the `IS NULL` operator rather than a replacement where `IS NULL` is "not available."

## Review Notes
- Return type claim for `isNull`/`isNotNull` as `UInt8` is correct per the official docs.
- Standard-SQL NULL semantics (`NULL = NULL` is NULL, never true) are accurately described.
- `countIf`, `if`, `multiIf`, and `round` examples are syntactically valid ClickHouse SQL.
- LEFT JOIN unmatched-row detection pattern using `isNull(o.order_id)` is the canonical approach.
- The post does not mention a specific ClickHouse version; the described behavior has been stable across recent versions.
