# Validation Summary: How to Sort Query Results in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sort method, aggregation pipeline, text search, indexes, explain plans)
- Node.js MongoDB Driver (v4+)
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB Manual — cursor.sort(): https://www.mongodb.com/docs/manual/reference/method/cursor.sort/
- MongoDB Manual — $sort (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
- MongoDB Manual — BSON comparison order: https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/
- MongoDB Manual — Text search with $meta textScore: https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Manual — explain() results: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual — allowDiskUse: https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/
- PyMongo documentation — sort(): https://pymongo.readthedocs.io/en/stable/api/pymongo/cursor.html

## Issues Found
1. **Misleading `explain()` output interpretation**: The original code used `plan.executionStats.executionStages.stage` and commented that the value would be either `'IXSCAN'` (index used) or `'SORT'` (in-memory sort). This is misleading because when an index provides the sort order, the top-level stage is typically `FETCH`, not `IXSCAN` — the index scan is a child stage. Changed the code to print the full `winningPlan` and updated the comments to explain that the key diagnostic is whether a `SORT` stage appears anywhere in the plan, rather than checking only the top-level stage name.

## Review Notes
- Starting in MongoDB 6.0, the `allowDiskUseByDefault` server parameter defaults to `true`, meaning sorts exceeding the 32 MB memory limit automatically spill to disk. The post's advice to explicitly set `allowDiskUse: true` remains valid and is a good defensive practice for compatibility with older versions.
- Starting in MongoDB 4.4, `find()` operations also support `allowDiskUse`. The post only shows this option for `aggregate()`, which is not wrong but is an omission readers should be aware of.
- The `$unset` aggregation stage used in the null-handling example requires MongoDB 4.2+.
