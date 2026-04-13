# Validation Summary: How to Avoid Reading Entire Documents When You Only Need a Few Fields

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query projections, covered queries, array projections)
- MongoDB Node.js Driver (findOne, find, projection options)

## Sources Consulted
- MongoDB Manual: Project Fields to Return from Query — https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
- MongoDB Manual: Covered Query — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Manual: $slice (projection) — https://www.mongodb.com/docs/manual/reference/operator/projection/slice/
- MongoDB Node.js Driver: findOne options — https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOne/
- MongoDB Manual: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/

## Issues Found
- **Nested field projection example missing `_id: 0`**: The projection in the "Nested Field Projections" section did not exclude `_id`, but the return value comment showed a result without `_id`. Since the post explicitly teaches that `_id` is included by default, the example was inconsistent. Added `_id: 0` to the projection to match the commented return value.

## Review Notes
- The `createIndex` call on line 74 uses shell syntax (`db.orders.createIndex(...)`) while the rest of the post uses Node.js driver syntax (`db.collection('orders')`). This is a minor stylistic inconsistency but both forms are widely understood and commonly mixed in tutorials, so no change was made.
- The `PROJECTION_COVERED` stage name referenced for explain output is correct for MongoDB 3.6+. Readers on older versions would see different explain output, but those versions are long past end-of-life.
- The `$slice` projection behavior described is accurate for MongoDB 4.4+ where `$slice` respects inclusion projection restrictions. Earlier versions had different behavior, but those are also past end-of-life.
