# Validation Summary: How to Use WHERE Clauses Effectively in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (columnar OLAP database)
- SQL (WHERE, PREWHERE, IN, LIKE, ILIKE, IS NULL, EXPLAIN)

## Sources Consulted
- ClickHouse documentation on WHERE clause: https://clickhouse.com/docs/en/sql-reference/statements/select/where
- ClickHouse documentation on PREWHERE: https://clickhouse.com/docs/en/sql-reference/statements/select/prewhere
- ClickHouse documentation on operators (comparison, IN, LIKE): https://clickhouse.com/docs/en/sql-reference/operators
- ClickHouse documentation on EXPLAIN: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse documentation on Nullable type and NULL handling: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse documentation on primary index and sparse indexing: https://clickhouse.com/docs/en/optimize/sparse-primary-indexes
- ClickHouse documentation on settings (optimize_move_to_prewhere, short_circuit_function_evaluation): https://clickhouse.com/docs/en/operations/settings/settings

## Issues Found
1. **Incorrect terminology for LIKE pattern advice (line 80):** The post said "Prefer suffix patterns (`value%`)" but `value%` matches strings *starting with* "value", which is a prefix pattern. Changed "suffix patterns" to "prefix patterns."
2. **Incorrect column name in SQL comment (line 87):** The comment said "PREWHERE reads only status column first" but the actual PREWHERE condition filters on `event_type`, not `status`. Changed "status column" to "event_type column."

## Review Notes
- The claim that "ClickHouse short-circuits AND conditions, so place the most selective filter first" is a simplification. ClickHouse has a `short_circuit_function_evaluation` setting (default: `enable`) that provides adaptive short-circuit behavior, but the query optimizer may also reorder conditions internally. The practical advice to place selective filters first is still reasonable, so no change was made.
- All SQL syntax is correct and current for modern ClickHouse versions. The `EXPLAIN indexes = 1` syntax, `PREWHERE` combined with `WHERE`, `ILIKE`, `INTERVAL` arithmetic, and `today()`/`now()` functions are all valid.
- The post correctly notes that PREWHERE is automatically applied by the optimizer in most cases and that explicit use should be guided by benchmarks. This is good, balanced advice.
