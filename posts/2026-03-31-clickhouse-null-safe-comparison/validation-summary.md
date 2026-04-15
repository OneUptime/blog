# Validation Summary: How to Use NULL-safe Comparisons in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, Nullable types)
- SQL NULL semantics and NULL-safe comparison patterns

## Sources Consulted
- [ClickHouse Comparison Functions Documentation](https://clickhouse.com/docs/sql-reference/functions/comparison-functions) — confirmed `isNotDistinctFrom` is the correct function name (introduced v25.10), and that `nullSafeEquals` does not exist
- [ClickHouse Functions for Nullable Values](https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls) — verified `isNull`, `isNotNull`, `ifNull` function signatures and behavior
- [ClickHouse Operators Documentation](https://clickhouse.com/docs/sql-reference/operators) — confirmed `<=>` operator is a standard operator since v25.10, not limited to MySQL-compatible mode
- [ClickHouse VALUES Table Function](https://clickhouse.com/docs/sql-reference/table-functions/values) — confirmed SQL standard VALUES clause syntax is supported from v26.3+

## Issues Found

1. **Non-existent function `nullSafeEquals`**: The post used `nullSafeEquals(a, b)` throughout, but this function does not exist in ClickHouse. The correct function is `isNotDistinctFrom(a, b)`, introduced in v25.10. Replaced all occurrences of `nullSafeEquals` with `isNotDistinctFrom` in the section heading, code examples, and summary.

2. **Incorrect claim about `<=>` operator availability**: The post stated `a <=> b` is available "in MySQL-compatible mode". In reality, `<=>` is a standard ClickHouse operator available since v25.10 (prior to that, it was limited to JOIN expressions, not MySQL-compatible mode). Corrected the description.

3. **Wrong output in "Counting NULLs Across Multiple Columns" section**: The output showed products 4 (Pen) and 6 (Stapler) with `null_column_count = 1`, but both have 2 NULL columns each (category=NULL and discount_pct=NULL). Products 2 (Notebook) and 5 (Monitor) each have 1 NULL column. Corrected the output and row ordering to match the `ORDER BY null_column_count DESC, product_id` clause.

4. **Inaccurate intro paragraph**: The introduction described `<=>` as working "via `equals` semantics", which is misleading since `equals()` is NOT null-safe while `<=>` IS null-safe. Simplified the intro to clearly list the correct functions and operators.

## Review Notes
- The VALUES clause syntax `(VALUES ...) AS t(a, b)` used in the "NULL-Safe Equality with equals()" section requires ClickHouse v26.3+. Since the post is dated 2026-03-31, this is appropriate but readers on older versions would need to use the `VALUES('a Nullable(Int32), b Nullable(Int32)', ...)` table function syntax instead.
- The GROUP BY section does not show expected output, which is fine for a tutorial but less verifiable.
- The `isNotDistinctFrom` function was introduced in v25.10 and `isDistinctFrom` in v25.11 — both should be widely available by the post's publication date.
