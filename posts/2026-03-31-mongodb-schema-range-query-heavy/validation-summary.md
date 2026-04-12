# Validation Summary: How to Design Schemas for Range-Query-Heavy Workloads in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (query operators, indexing, clustered collections, explain plans)
- JavaScript / Node.js (MongoDB driver usage, date handling)
- BSON Date type
- MongoDB compound indexes, sparse indexes, covered queries

## Sources Consulted
- MongoDB Manual: Query and Projection Operators — https://www.mongodb.com/docs/manual/reference/operator/query/
- MongoDB Manual: Compound Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: ESR (Equality, Sort, Range) Rule — https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/
- MongoDB Manual: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Manual: Sparse Indexes — https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: Clustered Collections — https://www.mongodb.com/docs/manual/core/clustered-collections/
- MongoDB Manual: ObjectId.createFromTime — https://www.mongodb.com/docs/manual/reference/method/ObjectId.createFromTime/
- MDN Web Docs: Date.prototype.setMonth — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setMonth

## Issues Found

1. **Non-existent `$between` operator (Line 13):** The post listed `$between` as a MongoDB inequality operator. MongoDB has no `$between` operator; range "between" queries are expressed by combining `$gte` and `$lte`. Removed `$between` from the list of operators.

2. **Incorrect section title — "Attribute Pattern" (Principle 5):** The section was titled "Use the Attribute Pattern for Sparse Range Fields" but the content describes sparse indexes, not the Attribute Pattern. The MongoDB Attribute Pattern is a distinct schema design pattern for handling documents with many similar but varying fields stored as key-value pairs in an array. Renamed the section to "Use Sparse Indexes for Optional Range Fields" to accurately reflect the content.

3. **JavaScript date overflow bug in time-bucketed collection query (Principle 7, Line 155):** The `cursor.setMonth(cursor.getMonth() + 1)` call can skip months due to JavaScript date overflow. For example, if `start` is January 31, `setMonth(1)` produces March 3 (since February has no 31st day), causing the loop to skip February entirely. Fixed by normalizing `cursor` to the 1st of each month using `new Date(year, month, 1)` constructor, which avoids overflow.

## Review Notes
- Principle 2 mentions a 100 MB in-memory sort allowance. This is the default sort memory limit (`internalQueryMaxBlockingSortMemoryUsageBytes`). Starting in MongoDB 6.0, `allowDiskUseByDefault` is enabled by default, so the 100 MB limit triggers spilling to disk rather than an error. The statement is still broadly correct as advice for optimizing sort performance.
- Principle 6 labels `{ status: 1, createdAt: -1 }` as "poor" but it could be reasonable if queries always filter by a specific status. The point about preferring high-cardinality leading keys is valid general advice, though real-world performance depends on query patterns and data distribution.
- The post does not mention the ESR (Equality, Sort, Range) rule by name, which is MongoDB's official guidance for compound index field ordering. The principles described are consistent with ESR but referencing it by name could help readers find official documentation.
- Principle 9's title mentions `$and` but the example uses implicit AND (multiple conditions in a single query document). This is technically fine since MongoDB implicitly ANDs top-level conditions, but could be clearer.
