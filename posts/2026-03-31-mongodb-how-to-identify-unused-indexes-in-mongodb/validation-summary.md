# Validation Summary: How to Identify Unused Indexes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, indexing, `$indexStats`, `dropIndex`, `explain`)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB $indexStats aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB dropIndex() documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.dropIndex/
- MongoDB explain() documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB lock documentation for collection operations: https://www.mongodb.com/docs/manual/reference/command/dropIndexes/#behavior

## Issues Found
- **Incorrect claim about collection locking on index drop**: The post stated "does not lock the collection in MongoDB 4.4+". This is incorrect — `dropIndex()` acquires an exclusive (W) collection-level lock in all MongoDB versions, including 4.4+. The operation completes quickly so the lock is brief, but it is still acquired. Changed to: "though it briefly acquires an exclusive collection lock."

## Review Notes
- The example `$indexStats` output is simplified (omits `key`, `host`, and `spec` fields) but this is acceptable for illustrative purposes.
- The `accesses.since` field resets on server restart but can also reset on index recreation; the post's simplification to "since the last server restart" is reasonable for the target audience.
- All JavaScript code examples are syntactically correct and use current, non-deprecated APIs.
- The mongosh CLI invocation syntax is correct.
