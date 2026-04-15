# Validation Summary: How to Use Nullable Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- Nullable data type wrapper
- MergeTree table engine

## Sources Consulted
- ClickHouse official documentation on Nullable type: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse official documentation on aggregate functions (count, avg): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- ClickHouse official documentation on functions for working with Nullable (isNull, isNotNull, ifNull, coalesce, assumeNotNull): https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse official documentation on MergeTree ORDER BY and primary key constraints: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
- **Misleading comment about `count()`**: The SQL comment said "count() counts non-NULL values" but `count()` with no arguments counts all rows (including those with NULL values in other columns). It is `count(expr)` that counts non-NULL values of that expression. The code itself was correct — `count(phone)` for non-NULL phone count and `count()` for total rows — but the comment was misleading. Changed to: "count(expr) counts non-NULL values; count() counts all rows".

## Review Notes
- The `assumeNotNull` function is described as producing "UB" (undefined behavior) when NULLs exist. The ClickHouse docs state "the result is undefined," so this characterization is accurate, though in practice ClickHouse returns the type's default value (0 for numbers, empty string for String). The current wording is acceptable.
- The post mentions `Nullable(Array(...))` and `Nullable(Map(...))` as unsupported, which is correct. It does not mention that `Nullable(Tuple(...))` and `Nullable(LowCardinality(...))` are also unsupported, but the examples given are sufficient for a tutorial.
- All SQL code examples are syntactically correct and would execute successfully on a current ClickHouse instance.
