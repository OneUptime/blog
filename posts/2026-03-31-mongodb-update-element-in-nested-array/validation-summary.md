# Validation Summary: How to Update an Element in a Nested Array in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell / mongosh)
- MongoDB update operators (`$set`, `$inc`)
- MongoDB positional operators (`$`, `$[]`, `$[identifier]`)
- MongoDB `arrayFilters` option (MongoDB 3.6+)
- MongoDB aggregation pipeline updates (MongoDB 4.2+)
- MongoDB aggregation expressions (`$map`, `$mergeObjects`, `$cond`, `$eq`)

## Sources Consulted
- MongoDB documentation: Update Operators — https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB documentation: Positional Operator `$` — https://www.mongodb.com/docs/manual/reference/operator/update/positional/
- MongoDB documentation: All Positional Operator `$[]` — https://www.mongodb.com/docs/manual/reference/operator/update/positional-all/
- MongoDB documentation: Filtered Positional Operator `$[identifier]` — https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/
- MongoDB documentation: `arrayFilters` — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/#std-label-update-one-arrayFilters
- MongoDB documentation: Update with Aggregation Pipeline — https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/

## Issues Found
No technical issues found.

## Review Notes
- The nested array example uses `$[]` (all positional) for the outer `modules` array, which updates matching lessons across all modules. This is a valid and common pattern. If a user needed to target only a specific module, they would need an additional `arrayFilter` for the outer array as well. The post's example is correct as written.
- The `courseId` variable in the nested array example is undefined in the snippet, but this is acceptable for illustrative code showing a pattern.
- All code examples use `mongosh`-compatible JavaScript syntax.
