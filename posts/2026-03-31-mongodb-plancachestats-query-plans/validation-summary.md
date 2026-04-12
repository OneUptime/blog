# Validation Summary: How to Use $planCacheStats to Analyze Query Plans in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, query planner, plan cache)
- `$planCacheStats` aggregation stage
- `PlanCache.clear()` and `PlanCache.clearPlansByQuery()` methods
- `explain()` for query plan analysis

## Sources Consulted
- [$planCacheStats - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/)
- [PlanCache.clearPlansByQuery() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/PlanCache.clearPlansByQuery/)
- [PlanCache.clear() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/PlanCache.clear/)
- [db.collection.getPlanCache() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.collection.getPlanCache/)

## Issues Found
1. **Incorrect `clearPlansByQuery` parameters**: The blog called `clearPlansByQuery` with two arguments `(query, sort)`, but the correct method signature is `clearPlansByQuery(query, projection, sort)`. The second parameter is projection, not sort. Fixed by adding an empty projection `{}` as the second argument and moving the sort document to the third position.
2. **Misleading comment**: The comment above `clearPlansByQuery` said "Clear a specific plan by its query hash", but the method clears by query shape (query + projection + sort), not by query hash. Fixed the comment to "Clear cached plans for a specific query shape".

## Review Notes
- The `createdFromQuery` field and its `.query` subfield are only present in classic query engine output (version 1), not in the SBE engine (version 2). This is a minor version-specific caveat but does not make the post incorrect.
- Starting in MongoDB 8.0, `queryHash` is supplemented by `planCacheShapeHash`. The blog's use of `queryHash` remains valid for current versions.
- The `timeOfCreation` field is only present in classic engine output, not SBE. Again, not incorrect for the post's scope.
- The `cachedPlan` structure described (with `stage`, `inputStage.indexName`, `inputStage.direction`) is accurate for the classic engine but differs for SBE. The post doesn't claim SBE coverage, so this is acceptable.
