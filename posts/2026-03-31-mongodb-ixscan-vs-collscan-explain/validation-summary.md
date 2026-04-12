# Validation Summary: How to Identify IXSCAN vs COLLSCAN in MongoDB Explain Plans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (explain plans, query optimizer)
- mongosh (MongoDB Shell)
- MongoDB Profiler (system.profile)
- MongoDB Indexes (compound indexes, covered queries)

## Sources Consulted
- MongoDB official documentation: db.collection.find() method signature — https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB official documentation: explain() results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation: Database Profiler output — https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB official documentation: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB official documentation: createIndex — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found

1. **Incorrect projection syntax in covered queries example (line 101-102)**
   - **What was wrong:** The `find()` call used `{ projection: { status: 1, userId: 1, _id: 0 } }` as the second argument. The `{ projection: {...} }` wrapper is a Node.js driver convention, not valid mongosh syntax. In the MongoDB shell, the second argument to `find()` is the projection document directly.
   - **What was changed:** Removed the `projection:` wrapper so the second argument is `{ status: 1, userId: 1, _id: 0 }`.
   - **Why:** Using the driver syntax in the shell would cause MongoDB to interpret "projection" as a literal field name to project, resulting in unexpected output (likely just `_id` for each document).

2. **Outdated profiler field name (line 132)**
   - **What was wrong:** The profiler query projected `query: 1` to show the operation's query filter. Since MongoDB 3.6, the profiler stores the full operation in the `command` field, not `query`.
   - **What was changed:** Changed `query: 1` to `command: 1` in the projection.
   - **Why:** In MongoDB 3.6+ profiler output, `query` is not a documented field for find operations. Using it would return nothing for that field, making the profiler results less useful to the reader.

## Review Notes
- The explain output JSON examples use the classic format (pre-MongoDB 5.1). Starting with MongoDB 5.1+, `explain()` output uses a slightly different format with `queryPlanner.winningPlan.queryPlan` nesting. The classic format shown is still valid for MongoDB 4.x and is widely recognized, but readers on MongoDB 7.0+ may see a slightly different structure.
- The "920x faster" claim (1840ms / 2ms = 920) is mathematically correct and clearly illustrative, though real-world speedups vary.
- The PROJECTION_COVERED stage name is accurate for MongoDB 4.2+.
- All other code examples, explain output structures, and technical explanations are accurate.
