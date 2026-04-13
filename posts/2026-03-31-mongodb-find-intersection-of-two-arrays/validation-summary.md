# Validation Summary: How to Find the Intersection of Two Arrays in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$setIntersection` aggregation expression operator
- `$size` aggregation expression operator
- `$ifNull` aggregation expression operator
- `$addFields`, `$project`, `$match`, `$sort` aggregation pipeline stages
- `$all` and `$in` query operators (comparison context)

## Sources Consulted
- MongoDB official documentation: `$setIntersection` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIntersection/
- MongoDB official documentation: `$size` (aggregation) - https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/
- MongoDB official documentation: `$ifNull` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/
- MongoDB official documentation: `$all` query operator - https://www.mongodb.com/docs/manual/reference/operator/query/all/
- MongoDB official documentation: `$addFields` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/
- MongoDB official documentation: `$expr` - https://www.mongodb.com/docs/manual/reference/operator/query/expr/

## Issues Found
No technical issues found.

## Review Notes
- `$setIntersection` treats arrays as sets, meaning it ignores duplicate elements and does not preserve order. The post does not explicitly call this out, but the operator name implies set semantics and this is not a technical error.
- The examples that use `$size` on the result of `$setIntersection` (sections "Filtering to Only Documents with a Non-Empty Intersection" and "Checking Intersection Size") would error if the input array field is null/missing, since `$size` does not accept null. The post correctly addresses null handling in a dedicated later section, so this is acceptable as-is.
- All code examples use current, non-deprecated MongoDB APIs and would work on MongoDB 2.6+.
