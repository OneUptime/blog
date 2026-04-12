# Validation Summary: How to Use $setIntersection and $setDifference in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$setIntersection` operator
- `$setDifference` operator
- `$concatArrays`, `$size`, `$ifNull`, `$expr` aggregation operators

## Sources Consulted
- MongoDB official documentation: $setIntersection (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIntersection/)
- MongoDB official documentation: $setDifference (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setDifference/)
- MongoDB official documentation: $concatArrays (https://www.mongodb.com/docs/manual/reference/operator/aggregation/concatArrays/)
- MongoDB official documentation: $size (https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/)
- MongoDB official documentation: $ifNull (https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/)

## Issues Found
No technical issues found.

## Review Notes
- The "Users Without a Specific Permission" example (line 104-122) could encounter an error if `$permissions` is null/missing, since `$size` on a null value throws an error. However, the post addresses null handling in a dedicated section immediately after, which is an appropriate way to structure the tutorial.
- All code examples use correct MongoDB aggregation syntax and would work as described with properly structured documents.
- The symmetric difference pattern using `$concatArrays` with two `$setDifference` calls is a well-known and correct approach.
