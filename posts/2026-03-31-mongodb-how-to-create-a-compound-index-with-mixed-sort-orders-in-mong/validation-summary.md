# Validation Summary: How to Create a Compound Index with Mixed Sort Orders in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (compound indexes, sort order specification, `createIndex()`, `explain()`)
- MongoDB Shell (JavaScript API)

## Sources Consulted
- MongoDB official documentation: Compound Indexes — https://www.mongodb.com/docs/manual/core/index-compound/
- MongoDB official documentation: Index Sort Order — https://www.mongodb.com/docs/manual/core/index-compound/#sort-order
- MongoDB official documentation: ESR Rule — https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/
- MongoDB official documentation: explain() — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/

## Issues Found
1. **Contradiction about reverse index traversal**: The "Creating a Compound Index with Mixed Sort Orders" section stated that the index `{ lastName: 1, createdAt: -1 }` does NOT efficiently support `{ lastName: -1, createdAt: 1 }`. However, the immediately following "Understanding Index Prefix Reversal" section correctly explained that MongoDB CAN use an index when all sort directions are flipped (reverse traversal). This means `{ lastName: -1, createdAt: 1 }` IS supported by that index. Changed the unsupported example to `{ lastName: 1, createdAt: 1 }`, which is a genuinely unsupported sort pattern for that index (mixed directions that don't match forward or reverse traversal).

## Review Notes
- The ESR (Equality, Sort, Range) rule explanation and example are correct and well-demonstrated.
- All `createIndex()` syntax and `explain()` usage are correct.
- The note about checking for `SORT` stage with `memUsage` as an indicator of in-memory sorting is accurate.
- The `totalDocsExamined` matching `totalDocsReturned` guidance is a valid efficiency check.
