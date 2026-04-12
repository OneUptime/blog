# Validation Summary: How to Use Projection in MongoDB to Return Specific Fields

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (find, findOne, aggregation pipeline)
- MongoDB projection operators (`$`, `$project`, `$concat`)
- MongoDB indexing (compound indexes, covered queries)

## Sources Consulted
- MongoDB documentation: db.collection.find() — https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB documentation: Project Fields to Return from Query — https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
- MongoDB documentation: $ (projection) positional operator — https://www.mongodb.com/docs/manual/reference/operator/projection/positional/
- MongoDB documentation: $project (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB documentation: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query

## Issues Found
1. **Inaccurate description of the `$` positional operator**: The text stated "To return only the first element of an array, use the positional operator." The `$` positional projection operator returns the first array element that **matches the query condition**, not the first element unconditionally. Changed to "To return only the first matching element of an array, use the `$` positional operator." This distinction matters because `$slice: 1` is what you'd use for the literal first element regardless of query conditions.

## Review Notes
- The post correctly explains that inclusion and exclusion projections cannot be mixed (except for `_id`). This is accurate for all MongoDB versions.
- The covered query example correctly excludes `_id: 0`, which is necessary because `_id` is not part of the compound index `{ status: 1, name: 1, email: 1 }`. Without excluding `_id`, the query would not be covered.
- The performance claims are appropriately scoped — the disk-read reduction is correctly qualified as applying only to covered queries, while the network payload reduction applies generally.
- The `$project` aggregation stage example correctly demonstrates computed fields with `$concat` alongside simple inclusion/exclusion.
