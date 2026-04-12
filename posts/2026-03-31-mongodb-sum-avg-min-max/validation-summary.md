# Validation Summary: How to Use $sum, $avg, $min, $max Accumulators in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB Aggregation Framework
- `$sum`, `$avg`, `$min`, `$max` accumulator expressions
- `$group` stage
- `$project` and `$addFields` stages
- `$cond` conditional expression
- `$multiply` arithmetic expression

## Sources Consulted
- MongoDB official documentation: $sum accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/
- MongoDB official documentation: $avg accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/
- MongoDB official documentation: $min accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/min/
- MongoDB official documentation: $max accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/
- MongoDB official documentation: $group stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB official documentation: BSON comparison order — https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/

## Issues Found

### Issue 1: Incorrect totalRevenue for Electronics in Example 1
- **What was wrong:** The output showed `totalRevenue: 10400` for the Electronics category. The correct calculation is: Laptop (1200 x 3 = 3600) + Phone (800 x 5 = 4000) + Monitor (600 x 4 = 2400) = **10000**.
- **What was changed:** Corrected `10400` to `10000`.
- **Why:** Arithmetic error in the example output.

### Issue 2: Incorrect totalRevenue for Grand Total in Example 2
- **What was wrong:** The output showed `totalRevenue: 13300` for the grand total across all products. The correct calculation is: 3600 + 4000 + 900 + 2000 + 2400 = **12900**.
- **What was changed:** Corrected `13300` to `12900`.
- **Why:** Arithmetic error in the example output, consistent with the error in Example 1 (Electronics was overcounted by 400, and 12900 + 400 = 13300).

## Review Notes
- All other calculations (avgPrice, minPrice, maxPrice, totalUnits, Example 3 counts, Example 4 array stats, Example 6 conditional sum) are correct.
- The syntax for using accumulators in both `$group` and `$project` contexts is correct per MongoDB documentation.
- The BSON comparison order listed in the Non-Numeric Behavior section (null < numbers < strings < objects < arrays < dates) is correct per MongoDB's documented comparison order.
- The description of `$sum: 1` for counting documents is correct.
- The use of `$cond` within `$sum` for conditional aggregation is a valid and correct pattern.
- The note about `$sum` returning 0 for non-numeric fields and `$avg` returning null when all values are non-numeric is accurate.
