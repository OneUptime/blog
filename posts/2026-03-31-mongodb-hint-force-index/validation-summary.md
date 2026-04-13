# Validation Summary: How to Use hint() to Force an Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query planner, indexing, hint method)
- MongoDB Shell (mongosh)
- MongoDB Aggregation Framework

## Sources Consulted
- MongoDB official documentation: `cursor.hint()` — https://www.mongodb.com/docs/manual/reference/method/cursor.hint/
- MongoDB official documentation: `db.collection.updateMany()` hint option — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB official documentation: `db.collection.deleteMany()` hint option — https://www.mongodb.com/docs/manual/reference/method/db.collection.deleteMany/
- MongoDB official documentation: `db.collection.aggregate()` hint option — https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/
- MongoDB official documentation: `PlanCache.clearPlansByQuery()` — https://www.mongodb.com/docs/manual/reference/method/PlanCache.clearPlansByQuery/
- MongoDB official documentation: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation: `$natural` sort — https://www.mongodb.com/docs/manual/reference/operator/meta/natural/

## Issues Found
1. **`updateMany` hint referenced a non-existent index**: The example used `{ hint: { status: 1 } }` but the setup section only creates a compound index `{ status: 1, createdAt: -1 }` (named `idx_status_date`). A hint key pattern must match an existing index exactly, so `{ status: 1 }` would throw a "bad hint" error. Fixed to `{ hint: { status: 1, createdAt: -1 } }` to match the compound index.

2. **`deleteMany` hint referenced a non-existent index**: The example used `{ hint: { createdAt: 1 } }` but no index with key pattern `{ createdAt: 1 }` was created in the setup. The filter was also changed from `{ createdAt: { $lt: ... } }` to `{ status: "cancelled", createdAt: { $lt: ... } }` so that the compound index `{ status: 1, createdAt: -1 }` can be effectively used, and the hint was updated to `{ hint: { status: 1, createdAt: -1 } }`.

## Review Notes
- The `hint` option in `updateMany()` was added in MongoDB 4.2.1 and in `deleteMany()` in MongoDB 4.4. The post does not mention version requirements, which could be noted in a future update.
- The `PlanCache.clearPlansByQuery()` method works on query shapes (structure matters, not values). The post's usage is correct but does not explain this nuance.
- The `executionTimeMillis` field includes plan selection time, so hinted queries may show lower values partly because they skip plan evaluation — not purely because of faster execution. This subtlety could be mentioned in a future revision.
