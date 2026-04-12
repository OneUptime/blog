# Validation Summary: How to Use Projection to Return Only Specific Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell queries)
- MongoDB Node.js Driver (v4+)
- MongoDB Indexing / Covered Queries

## Sources Consulted
- MongoDB official documentation: `db.collection.find()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB official documentation: Project Fields to Return from Query — https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
- MongoDB official documentation: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Node.js Driver documentation — https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read/project/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct and current MongoDB shell syntax.
- The Node.js driver example correctly passes projection inside the options object (`{ projection: {...} }`), which is the required pattern for driver v4+.
- The covered query section correctly notes that `_id: 0` must be set for a query to be fully covered by an index, since `_id` is not part of the compound index in the example.
- The rule about not mixing inclusion and exclusion projections (except for `_id`) is accurately stated. Note that starting in MongoDB 4.4, certain projection operators like `$elemMatch`, `$slice`, and `$meta` can appear alongside inclusion/exclusion fields, but the post's statement is correct for the general case of simple field projections.
