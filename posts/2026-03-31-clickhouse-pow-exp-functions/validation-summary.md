# Validation Summary: How to Use pow() and exp() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- Mathematical functions: pow(), power(), exp()
- Window functions (OVER clause)
- ARRAY JOIN clause
- Common Table Expressions (CTEs)

## Sources Consulted
- ClickHouse Mathematical Functions documentation: https://clickhouse.com/docs/sql-reference/functions/math-functions
- ClickHouse Rounding Functions documentation: https://clickhouse.com/docs/sql-reference/functions/rounding-functions
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse WITH Clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse ARRAY JOIN documentation: https://clickhouse.com/docs/sql-reference/statements/select/array-join
- ClickHouse arrayJoin function documentation: https://clickhouse.com/docs/sql-reference/functions/array-join

## Issues Found
1. **Softmax query used two independent `arrayJoin()` calls producing a Cartesian product.** The original code used `arrayJoin(['class_A', 'class_B', 'class_C']) AS class_label` and `arrayJoin([2.0, 1.0, 0.5]) AS raw_score` in the same SELECT. In ClickHouse, multiple `arrayJoin()` function calls in a single SELECT create a Cartesian product of all arrays, producing 9 rows (3 x 3) instead of the intended 3 paired rows. Fixed by using the `ARRAY JOIN` clause with two parallel arrays, which correctly pairs elements by index (class_A with 2.0, class_B with 1.0, class_C with 0.5).

## Review Notes
- All mathematical formulas (compound interest, continuous compounding, exponential decay, softmax) are correct.
- The `pow()` / `power()` alias and `exp()` function signatures and return types (Float64) are accurately described.
- Table definitions, INSERT syntax, and MergeTree engine usage are all correct.
- The CROSS JOIN with a subquery using `arrayJoin` in the decay modeling example is correct because `arrayJoin` is called alone in the subquery (no Cartesian product issue).
- The `round()` function uses banker's rounding for Float inputs in ClickHouse, which could produce unexpected results at exact midpoints (e.g., 0.5), but this is not a concern for the examples shown.
