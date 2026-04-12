# Validation Summary: How to Query Documents by Date Range in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators, aggregation pipeline, indexing)
- JavaScript / mongosh (Date objects, ISODate helper)
- BSON Date type

## Sources Consulted
- MongoDB Manual — Query on Date: https://www.mongodb.com/docs/manual/tutorial/query-documents/#query-on-date
- MongoDB Manual — $gte operator: https://www.mongodb.com/docs/manual/reference/operator/query/gte/
- MongoDB Manual — $lt operator: https://www.mongodb.com/docs/manual/reference/operator/query/lt/
- MongoDB Manual — $lte operator: https://www.mongodb.com/docs/manual/reference/operator/query/lte/
- MongoDB Manual — ISODate: https://www.mongodb.com/docs/manual/reference/method/ISODate/
- MongoDB Manual — createIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual — explain: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Manual — Aggregation Pipeline $match: https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/

## Issues Found
1. **Basic Date Range Query used `$lte` with `T23:59:59Z` instead of `$lt` with the start of the next day.**
   - **What was wrong:** The original query used `$lte: new Date("2026-01-31T23:59:59Z")` to define the upper bound. Because `new Date("2026-01-31T23:59:59Z")` resolves to `2026-01-31T23:59:59.000Z`, this misses any documents with timestamps from `23:59:59.001Z` through `23:59:59.999Z` — up to 999 milliseconds of data silently excluded.
   - **What was changed:** Replaced with `$lt: new Date("2026-02-01T00:00:00Z")` and updated the section description from `$lte` to `$lt`. This is the canonical pattern for date range queries and is consistent with the approach already used in the ISODate and aggregation examples later in the post.
   - **Why:** Using `$lt` with the start of the next period is the standard MongoDB best practice for date range queries, as it avoids any sub-second gaps.

## Review Notes
- The post correctly uses the `$lt` (exclusive upper bound) pattern in the ISODate and aggregation sections — only the initial "Basic Date Range Query" example had the issue.
- The compound index example `{ status: 1, createdAt: 1 }` correctly places the equality field before the range field, following MongoDB's ESR (Equality, Sort, Range) indexing guideline.
- The description of `ISODate()` as "a convenient alias for `new Date()`" is a slight simplification — it is technically a wrapper/helper — but this is acceptable for a tutorial and matches common usage in MongoDB documentation.
