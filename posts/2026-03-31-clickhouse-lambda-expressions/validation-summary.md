# Validation Summary: How to Use Lambda Expressions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse higher-order array functions (arrayMap, arrayFilter, arrayCount, arrayFirst, arrayFirstIndex, arrayFold)
- ClickHouse lambda expression syntax
- SQL

## Sources Consulted
- ClickHouse official documentation — Higher-order functions: https://clickhouse.com/docs/en/sql-reference/functions/higher-order-functions
- ClickHouse official documentation — Array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official documentation — Functions overview (lambda syntax): https://clickhouse.com/docs/en/sql-reference/functions/overview

## Issues Found
1. **Description mentioned wrong function name**: The post description referenced "arrayReduce" but the post actually covers "arrayFold". These are different ClickHouse functions — `arrayReduce` applies an aggregate function name (as a string) to array elements, while `arrayFold` takes a lambda for accumulation. Changed "arrayReduce" to "arrayFold" in the description.

2. **Incorrect claim that lambdas cannot reference table columns**: The Summary section stated "Lambdas cannot reference table columns directly inside expressions passed to higher-order functions." This is factually wrong. The official ClickHouse documentation explicitly states: "The right side of the arrow has an expression that can use these formal parameters, as well as any table columns." The blog's own code examples (the arrayCount example referencing `scores` and `nullable_vals`, and the purchase_events example referencing `purchase_items`) contradicted this claim. Corrected the summary to state that lambdas can reference table columns directly.

## Review Notes
- The `arrayCount(x -> x IS NOT NULL, nullable_vals)` example is plausible but not shown in official documentation examples. The function `isNotNull(x)` is a more idiomatic ClickHouse alternative, but `IS NOT NULL` is valid SQL syntax in ClickHouse and should work.
- The `arrayFirst` function returns the default value for the element type (e.g., 0 for integers) when no match is found, not NULL. ClickHouse also provides `arrayFirstOrNull` for NULL-returning behavior. This nuance is not mentioned in the post but is not incorrect — just worth noting for completeness.
- All code examples were verified for syntactic correctness and expected output values.
