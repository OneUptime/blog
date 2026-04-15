# Validation Summary: How to Use Lambda Functions Instead of UDFs in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, higher-order array functions, SQL UDFs, executable UDFs)
- ClickHouse higher-order functions: arrayMap, arrayFilter, arrayFold
- ClickHouse lambda (arrow) syntax
- ClickHouse CREATE FUNCTION (SQL UDF)

## Sources Consulted
- ClickHouse official docs — Array Functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official docs — arrayFold: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayfold
- ClickHouse official docs — arrayReduce: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayreduce
- ClickHouse official docs — CREATE FUNCTION: https://clickhouse.com/docs/en/sql-reference/statements/create/function

## Issues Found
1. **`arrayReduce` incorrectly listed as accepting lambdas (intro paragraph):** The opening paragraph stated lambdas could be passed to `arrayReduce`. Per the official docs, `arrayReduce` takes an aggregate function name as a string (e.g., `'sum'`, `'max'`), not a lambda. Changed `arrayReduce` to `arrayFold` in the intro.

2. **Misleading section title "arrayReduce with Lambda":** The section was titled "arrayReduce with Lambda - Custom Accumulation" but the code example used `arrayFold`, not `arrayReduce`. Renamed the section to "arrayFold - Custom Accumulation" to match the actual content and avoid confusion with the unrelated `arrayReduce` function.

3. **Incorrect version for `arrayFold`:** The post stated `arrayFold` was available since "ClickHouse 23.2+". Per the official documentation, `arrayFold` was introduced in v23.10. Corrected to "ClickHouse 23.10+".

## Review Notes
- The claim "SQL UDFs cannot be passed as lambda arguments to `arrayMap`" is correct — you cannot write `arrayMap(myUDF, arr)`. However, you can call a SQL UDF inside a lambda: `arrayMap(x -> myUDF(x), arr)`. The post's wording is technically accurate but readers might misunderstand it as meaning UDFs cannot be used with array functions at all. This could be clarified in a future revision.
- The comparison table row for "Array filtering" marks SQL UDF as "No". While you can't use a UDF alone for filtering, you can use one inside a lambda (`arrayFilter(x -> myUDF(x), arr)`). "Not directly" (matching the array transform row) would be more consistent, but this is a minor stylistic point rather than a factual error.
- All code examples (arrayMap, arrayFilter, arrayFold, CREATE FUNCTION, WITH clause) use correct ClickHouse SQL syntax.
- The computed result `30` for `arrayFold((acc, x) -> acc + x * x, [1, 2, 3, 4], toInt64(0))` is correct (1 + 4 + 9 + 16 = 30).
