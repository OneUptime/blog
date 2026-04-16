# Validation Summary: How to Use isNull() and isNotNull() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Nullable types in ClickHouse
- ClickHouse NULL-handling functions (`isNull`, `isNotNull`, `ifNull`, `countIf`, `toTypeName`)

## Sources Consulted
- ClickHouse Functions for Nulls documentation: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse SQL Syntax (NULL semantics): https://clickhouse.com/docs/en/sql-reference/syntax
- ClickHouse Operators (IS NULL / IS NOT NULL): https://clickhouse.com/docs/en/sql-reference/operators
- ClickHouse Nullable data type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/nullable

## Issues Found
- **Incorrect claim about `NULL = NULL` returning 0.** The post originally stated that `SELECT NULL = NULL` "always returns 0, even for NULL values" and that standard `= NULL` comparisons "always return 0". According to ClickHouse's documented comparison semantics, if at least one operand is NULL, the comparison result is NULL (not 0). The underlying practical point — that `col = NULL` does not match rows and should not be used for NULL testing — is correct, but the explanation was technically wrong.
  - Fixed the code comment in the "Why = NULL Does Not Work" section to state the expression returns NULL (and therefore never matches in WHERE clauses), and renamed the alias `always_false` to `always_null`.
  - Updated the Summary paragraph to correctly describe `= NULL` as returning NULL rather than 0.

## Review Notes
- The `isNull()`, `isNotNull()`, `ifNull()`, `countIf()`, `toTypeName()`, `round()`, and CASE expression usages are all syntactically correct and match official ClickHouse documentation.
- The `CREATE TABLE` statement with `Nullable(String)` / `Nullable(UInt8)` and `MergeTree()` engine, along with the corresponding `INSERT` statement, are valid ClickHouse syntax.
- `IS NULL` and `IS NOT NULL` operators are indeed supported in ClickHouse and are equivalent to `isNull()` / `isNotNull()`, as stated.
- `isNull(1)` correctly returns 0 because the literal `1` is a non-Nullable `UInt8` in ClickHouse; the example output is accurate.
- The `UNION ALL` completeness-report example works, though future authors may want to note that mixing string literals with numeric `countIf` results relies on ClickHouse's automatic type widening in `UNION ALL` — this is fine in current versions but worth being aware of.
