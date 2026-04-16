# Validation Summary: How to Use concat() and || Operator in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- ClickHouse string functions: `concat`, `concatWithSeparator`, `arrayStringConcat`
- ClickHouse `||` concatenation operator
- MergeTree engine, `LowCardinality`, `DateTime`, `formatDateTime`, `ifNull`, `coalesce`

## Sources Consulted
- ClickHouse String Functions docs: https://clickhouse.com/docs/sql-reference/functions/string-functions#concat
- ClickHouse `concatWithSeparator` docs: https://clickhouse.com/docs/sql-reference/functions/string-functions#concatWithSeparator
- ClickHouse Operators docs (concatenation operator `||`): https://clickhouse.com/docs/sql-reference/operators#concatenation-operator
- ClickHouse Splitting-Merging Functions (`arrayStringConcat`): https://clickhouse.com/docs/sql-reference/functions/splitting-merging-functions#arrayStringConcat

## Issues Found
1. **Contradiction in the introduction**: The post said "ClickHouse provides two main ways to concatenate strings" but then listed three items. Changed "two" to "three" so the count matches the enumerated list.
2. **Incorrect claim about `concatWithSeparator` NULL handling**: The post stated that `concatWithSeparator` "skips NULLs in some versions". Per the official ClickHouse docs, `concatWithSeparator` propagates NULL (returns NULL if any argument is NULL) in all versions — unlike MySQL's `CONCAT_WS`, which does skip NULLs. Rewrote this comment to accurately describe the NULL-propagation behavior and to note the divergence from MySQL.

## Review Notes
- The claim that `concat()` is "slightly faster than `||` for many arguments because `||` is converted to `concat()` internally" is consistent with ClickHouse's operator rewriting, though in practice the performance difference is negligible since `||` truly is aliased to `concat()`.
- The post uses `toString()` to convert numeric columns before concatenation. Since ClickHouse 22.9/22.10, `concat()` auto-converts non-string arguments — the explicit `toString()` calls are defensive and still work, but are no longer strictly required on modern versions. This is fine as-is.
- The `users` table in the examples does not define `middle_name`, but the NULL-handling example references it. This is a minor inconsistency in the example narrative but does not affect technical correctness of the function demonstrations.
- The `employees` table used in the email example is not defined in the post; readers should assume a similar schema. Acceptable for a tutorial that focuses on function usage rather than complete schemas.
