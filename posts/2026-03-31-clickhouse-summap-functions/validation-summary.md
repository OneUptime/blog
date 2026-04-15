# Validation Summary: How to Use sumMap() and sumMapFiltered() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse aggregate functions (sumMap, sumMapFiltered)
- ClickHouse Map and Array column types
- ARRAY JOIN

## Sources Consulted
- ClickHouse official documentation for sumMap / sumMappedArrays aggregate function (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/summap)
- ClickHouse official documentation for the -Map combinator (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-map)
- ClickHouse official documentation for parametric aggregate functions (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions)
- ClickHouse source code (AggregateFunctionSumMap.cpp) for internal routing of sumMap calls

## Issues Found

1. **Incorrect output format in comment (line 45)**: The comment showed returned keys as strings (`'200','404','500'`) but since `status_codes` is an integer array, the returned keys would be integers (`[200, 404, 500]`). Fixed the comment to remove string quotes.

2. **Unverified version claim (line 29)**: The comment stated "ClickHouse 21.8+" for Map column support. While Map column support for sumMap does exist (via the -Map combinator), the specific version "21.8" could not be confirmed in official documentation. Removed the version number to avoid presenting unverified information.

3. **Misleading description of sumMapFiltered syntax (line 85)**: The text described the filter array as "a second parameter" which is inaccurate. `sumMapFiltered` is a parametric aggregate function where the filter is passed as the function's parameter (first parentheses), separate from the column arguments (second parentheses). Rewrote the description to accurately explain the parametric function syntax.

## Review Notes
- `sumMap` promotes value types to prevent overflow (e.g., UInt8 inputs become UInt64 results). The post does not mention this, nor the existence of `sumMapWithOverflow` for cases where the original type is desired. This is not an error but could be a useful addition in a future update.
- `sumMap` can accept multiple value arrays (`sumMap(keys, values1, values2, ...)`) returning `(keys, summed1, summed2, ...)`. The post only covers the single-value-array form, which is fine for an introductory tutorial but worth noting.
- When passing a Map column to `sumMap`, the return type is a Map (not a tuple of arrays). The post's phrasing "Both return a tuple" in the Syntax section technically only applies to the array forms. This is a minor nuance that could be clarified in a future revision.
- The key and value arrays must have the same length for each row — this constraint is not mentioned in the post but is documented in the official docs.
