# Validation Summary: How to Use $shift for Lag and Lead Calculations in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ aggregation framework
- `$setWindowFields` stage
- `$shift` window operator
- Aggregation expression operators (`$cond`, `$addFields`, `$subtract`, `$divide`, `$multiply`, `$or`, `$and`, `$gt`, `$lt`, `$ifNull`)
- `$$REMOVE` system variable

## Sources Consulted
- MongoDB official documentation for `$shift`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/
- MongoDB official documentation for `$setWindowFields`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation for `$$REMOVE`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#remove-variable
- MongoDB official documentation for aggregation expression operators: https://www.mongodb.com/docs/manual/reference/operator/aggregation/

## Issues Found
No technical issues found.

## Review Notes
- Example 3 (Year-over-Year) uses `by: -12` which only works correctly when the dataset contains exactly 12 consecutive monthly records per year per product with no gaps. The comment in the code ("Multi-year dataset") correctly signals that additional data beyond the 6-month setup is needed, but readers may miss this nuance. This is not an error, just something to be aware of.
- All code examples use correct MongoDB aggregation syntax and would execute successfully on MongoDB 5.0+.
- The `$$REMOVE` usage in Example 5 is an advanced but valid pattern for conditionally excluding fields from output when no previous row exists in the partition.
