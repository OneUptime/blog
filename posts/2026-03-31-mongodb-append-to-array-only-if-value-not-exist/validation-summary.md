# Validation Summary: How to Append to an Array Only If the Value Does Not Exist in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`$addToSet` update operator)
- MongoDB (`$push` update operator, for comparison)
- MongoDB (`$each` modifier)
- MongoDB (`$inc` update operator)
- MongoDB unique indexes
- Node.js MongoDB driver (in the `modifiedCount` example)

## Sources Consulted
- MongoDB official documentation: `$addToSet` — https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/
- MongoDB official documentation: `$push` — https://www.mongodb.com/docs/manual/reference/operator/update/push/
- MongoDB official documentation: `$each` modifier — https://www.mongodb.com/docs/manual/reference/operator/update/each/
- MongoDB official documentation: Update operators behavior — https://www.mongodb.com/docs/manual/reference/operator/update/

## Issues Found
- **Inaccurate description of `$addToSet` object comparison**: The post originally stated that `$addToSet` uses "deep equality" for embedded objects and that "the entire object must match exactly." This is misleading. MongoDB's `$addToSet` uses exact BSON matching, which includes field order — `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` are considered different documents. The MongoDB docs explicitly state: "the existing document has the exact same fields and values and the fields are in the same order." Updated the section to clarify that field order matters and added a concrete example showing two documents with the same fields/values but different order being treated as distinct.

## Review Notes
- The post mixes `mongosh` shell syntax (`db.posts.updateOne(...)`) with Node.js driver syntax (`await db.collection("posts").updateOne(...)`) across different examples. This is not technically wrong but is a style inconsistency.
- The caveat about `$addToSet` + `$inc` is well-noted and accurate — this is a common pitfall that's good to highlight.
- The `modifiedCount` check pattern shown is correct and is a practical approach for the like-count use case.
