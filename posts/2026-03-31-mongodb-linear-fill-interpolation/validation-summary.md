# Validation Summary: How to Use $linearFill for Linear Interpolation in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.3+ / 6.0+ stable)
- `$linearFill` window function operator
- `$setWindowFields` aggregation stage
- `$densify` aggregation stage
- `$locf` (Last Observation Carried Forward)
- MongoDB time-series collections

## Sources Consulted
- MongoDB official documentation source for `$linearFill`: https://raw.githubusercontent.com/mongodb/docs/master/source/reference/operator/aggregation/linearFill.txt
- MongoDB 5.3 blog post on gap filling: https://www.mongodb.com/blog/post/introducing-gap-filling-time-series-data-mongodb-5-3
- MongoDB developer article on `$densify` and `$fill`: https://www.mongodb.com/developer/products/mongodb/preparing-tsdata-with-densify-and-fill/

## Issues Found
1. **Incorrect claim about value-based interpolation (line 53)**: The "Using $linearFill with Actual Timestamps" section stated "When sort values are actual timestamps or numeric positions, interpolation is proportional to those values." This is incorrect. According to the official MongoDB documentation, `$linearFill` uses position-based interpolation — it divides the value range evenly based on the number of null fields between surrounding non-null values, not based on the actual sort field values. The documentation states: "$linearFill fills null and missing values proportionally spanning the value range between surrounding non-null values. To determine the values for missing fields, $linearFill uses: The difference of surrounding non-null values. The number of null fields to fill between the surrounding values." Fixed the introductory text to correctly explain that interpolation is position-based even when sorting by timestamps.

## Review Notes
- The "How $linearFill Works" section (line 15) correctly states that "interpolation is based on the sorted document order, not the actual time values" — this is consistent with the official documentation.
- The basic example with evenly-spaced timestamps (0, 1, 2, 3) produces correct output (22, 24) because position-based and value-based interpolation yield identical results when sort values are uniformly spaced.
- All code examples use correct `$setWindowFields` syntax with proper `partitionBy`, `sortBy`, and `output` structure.
- The `$densify` + `$linearFill` combination pattern is a well-documented and recommended approach.
- The leading/trailing null behavior description is accurate.
- The `$locf` suggestion for handling trailing nulls is appropriate.
- The `$addFields` pattern for flagging original vs. interpolated values is a valid approach.
