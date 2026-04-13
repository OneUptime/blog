# Validation Summary: How to Query Nested Documents in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query language, aggregation framework, indexing)
- MongoDB dot notation for nested document queries
- `$elemMatch` operator
- `$unwind`, `$group`, `$match` aggregation stages
- `$slice` projection operator
- Multikey indexes

## Sources Consulted
- MongoDB official documentation: Query on Embedded/Nested Documents (https://www.mongodb.com/docs/manual/tutorial/query-embedded-documents/)
- MongoDB official documentation: Query an Array of Embedded Documents (https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/)
- MongoDB official documentation: $elemMatch (Query) (https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/)
- MongoDB official documentation: Project Fields to Return from Query (https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/)
- MongoDB official documentation: Aggregation Pipeline (https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- MongoDB official documentation: Compound Multikey Indexes (https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/#compound-multikey-indexes)

## Issues Found
No technical issues found.

## Review Notes
- The explanation of exact subdocument matching (requiring field order and all fields to match) is an important nuance that is correctly called out.
- The distinction between cross-element and same-element matching with `$elemMatch` is accurately and clearly explained — this is one of the most common sources of confusion for MongoDB users.
- The compound multikey index example `{ "orders.status": 1, "orders.amount": -1 }` is valid because both indexed paths share the same array prefix (`orders`). MongoDB's restriction only prevents compound multikey indexes across different array fields.
- All aggregation pipeline examples use correct stage syntax and field reference notation (e.g., `"$address.city"` with the `$` prefix).
