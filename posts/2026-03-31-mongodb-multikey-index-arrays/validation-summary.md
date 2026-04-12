# Validation Summary: How to Create a Multikey Index in MongoDB for Array Fields

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multikey indexes, compound indexes, array field indexing)
- MongoDB Shell (mongosh) commands
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB Manual: Multikey Indexes — https://www.mongodb.com/docs/manual/core/index-multikey/
- MongoDB Manual: Covered Query — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Manual: $elemMatch Query Operator — https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB Manual: db.collection.getIndexes() — https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/
- MongoDB Manual: explain() — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Node.js Driver API: Collection.indexes() — https://mongodb.github.io/node-mongodb-native/

## Issues Found

1. **Incorrect method for verifying multikey status (mongosh section, line 39-40)**
   - **What was wrong:** The post stated that `db.products.getIndexes()` returns a `"multikey"` property. In reality, `getIndexes()` returns index specification documents containing fields like `v`, `key`, `name`, and `ns`, but does NOT include a `multikey` or `isMultiKey` property.
   - **What was changed:** Replaced with `db.products.find({ tags: "electronics" }).explain()` and updated the comment to reference the `isMultiKey` field in the winning plan, which is the correct way to verify multikey index status.
   - **Why:** Readers following this instruction would not see any `multikey` property and would be confused.

2. **Incorrect multikey verification in Node.js example (lines 170-172)**
   - **What was wrong:** The code used `await products.indexes()` and then accessed `tagIndex.multiKey`. The `indexes()` method returns index specification documents that do not contain a `multiKey` field — this would return `undefined`.
   - **What was changed:** Replaced with `await products.find({ tags: "laptop" }).explain()` and accessed `explanation.queryPlanner.winningPlan.inputStage.isMultiKey`, which is the correct programmatic way to check multikey status via the Node.js driver.
   - **Why:** The original code would silently print `undefined`, misleading readers into thinking the index is not multikey.

## Review Notes
- All other technical claims are accurate: automatic multikey creation, compound index restriction (at most one array field), shard key limitation, covered query limitation, and $elemMatch behavior.
- The mermaid diagram correctly illustrates how multikey index entries map individual array elements to documents.
- The `explain()` output structure can vary depending on the query plan shape (e.g., `inputStage` vs nested stages). In more complex query plans, `isMultiKey` may be nested deeper. The fix uses the most common simple case, which is appropriate for a tutorial.
