# Validation Summary: How to Get the Last Element of an Array in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework)
- `$arrayElemAt` operator
- `$last` expression operator (MongoDB 4.4+)
- `$last` accumulator operator (in `$group`)
- `$slice` operator (aggregation and find projection)
- `$ifNull` operator
- `$size` operator

## Sources Consulted
- MongoDB `$arrayElemAt` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/
- MongoDB `$last` (array expression) documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/last-array-element/
- MongoDB `$last` (accumulator) documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/
- MongoDB `$slice` (aggregation) documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/slice/
- MongoDB `$slice` (projection) documentation: https://www.mongodb.com/docs/manual/reference/operator/projection/slice/
- MongoDB `$ifNull` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/
- MongoDB `$group` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/

## Issues Found
No technical issues found.

## Review Notes
- The notation `$arrayElemAt[-1]` on line 81 is used as informal shorthand in prose, not as executable syntax. It is clear in context but could theoretically confuse absolute beginners. Not a technical error.
- The post correctly distinguishes between `$last` as an array expression operator (MongoDB 4.4+) and `$last` as a `$group` accumulator (available since earlier versions). This is an important distinction that many posts get wrong.
- The advice to always sort before using `$last` in a `$group` stage is sound and well-placed.
- All code examples use correct MongoDB shell syntax and current, non-deprecated APIs.
