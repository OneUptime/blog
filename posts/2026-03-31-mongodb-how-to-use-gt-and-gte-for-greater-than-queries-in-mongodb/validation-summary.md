# Validation Summary: How to Use $gt and $gte for Greater Than Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators: `$gt`, `$gte`, `$lt`, `$lte`)
- MongoDB Node.js Driver
- MongoDB Aggregation Pipeline
- PyMongo (Python driver)
- MongoDB Indexes and `explain()`

## Sources Consulted
- MongoDB official documentation: `$gt` query operator — https://www.mongodb.com/docs/manual/reference/operator/query/gt/
- MongoDB official documentation: `$gte` query operator — https://www.mongodb.com/docs/manual/reference/operator/query/gte/
- MongoDB official documentation: `$gte` aggregation expression — https://www.mongodb.com/docs/manual/reference/operator/aggregation/gte/
- MongoDB official documentation: `explain()` output — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation: Indexes — https://www.mongodb.com/docs/manual/indexes/
- PyMongo official documentation — https://pymongo.readthedocs.io/

## Issues Found

### 1. Misleading range query comment (line 63)
- **What was wrong:** The comment for `{ $gt: 50, $lt: 200 }` said "(exclusive upper bound)" but both `$gt` and `$lt` are exclusive operators, making both bounds exclusive.
- **What was changed:** Updated the comment from "(exclusive upper bound)" to "(exclusive both ends)".
- **Why:** The original comment implied only the upper bound was exclusive, which could mislead readers into thinking $gt is inclusive (confusing it with $gte).

### 2. Incorrect explain output path (lines 159-160)
- **What was wrong:** The code accessed `plan.executionStats.executionStages.stage` and expected it to show `'IXSCAN'`. For a non-covered query (no projection limiting output to indexed fields only), the top-level `executionStages.stage` is `'FETCH'`, not `'IXSCAN'`. The index scan stage is nested under `inputStage`.
- **What was changed:** Updated the path from `executionStages.stage` to `executionStages.inputStage.stage`.
- **Why:** The query `{ category: 'electronics', price: { $gte: 100 } }` without a restrictive projection requires a FETCH stage to retrieve full documents after the index scan. The IXSCAN is at `executionStages.inputStage.stage`.

## Review Notes
- The PyMongo example uses `datetime.utcnow()`, which is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still works and is common in existing code, but future readers using Python 3.12+ will see a deprecation warning. Not changed since the post focuses on MongoDB operators rather than Python datetime best practices.
- The string comparison section correctly notes lexicographic ordering but does not mention that comparison behavior depends on the collation setting. With a non-default collation, ordering may differ. This is an advanced topic and reasonable to omit from an introductory tutorial.
