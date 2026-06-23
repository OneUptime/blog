# Validation Summary: How to Fix 'cannot acquire exclusive lock' Errors in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- MongoDB locking and concurrency
- MongoDB indexing
- MongoDB administrative commands
- MongoDB schema validation
- MongoDB Node.js driver
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual: FAQ - Concurrency: https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB Manual: Index Builds on Populated Collections: https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: $currentOp aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentop/
- MongoDB Manual: currentOp command: https://www.mongodb.com/docs/manual/reference/command/currentop/
- MongoDB Manual: compact command: https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB Manual: killOp command: https://www.mongodb.com/docs/manual/reference/command/killop/
- MongoDB Manual: collMod command: https://www.mongodb.com/docs/manual/reference/command/collmod/
- MongoDB Manual: Schema validation validationLevel: https://www.mongodb.com/docs/manual/core/schema-validation/specify-validation-level/
- MongoDB Manual: Schema validation validationAction: https://www.mongodb.com/docs/manual/core/schema-validation/handle-invalid-documents/
- MongoDB Node.js Driver: Connection pools: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- MongoDB Node.js Driver: Connection options: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/

## Issues Found
- The post used `db.currentOp()` and the `currentOp` command throughout. MongoDB 6.2+ deprecates the `currentOp` command and recommends the `$currentOp` aggregation stage, so diagnostic and monitoring examples were updated to use `$currentOp`.
- The index creation example said `createIndex()` blocks the collection. Current MongoDB index builds only hold an exclusive collection lock at the beginning and end of the build, so the wording and inline comment were corrected.
- The compact section said `compact` requires an exclusive lock and may fail for that reason. Current MongoDB documentation says `compact` does not block CRUD operations, though it should still be scheduled carefully and concurrent compact commands on the same collection are not allowed. The comments were corrected.
- The schema validation example used `validator: { $jsonSchema: { ... } }`, which is not valid JavaScript. It was replaced with a minimal valid `$jsonSchema` example.
- The write concern section said write concern reduces lock contention. Write concern controls acknowledgement behavior, not lock acquisition, so the wording was changed to avoid claiming it reduces lock contention directly.
- The locking hierarchy diagram showed a literal document lock. MongoDB uses multi-granularity locks and storage-engine-level concurrency control, so the diagram was adjusted to avoid implying a separate documented document-lock level in the lock hierarchy.

## Review Notes
- The post remains a high-level troubleshooting guide. Some examples require admin privileges such as `inprog`, `killop`, or `compact` depending on authorization settings.
- Killing operations is technically valid but should be limited to client-initiated operations; the post already warns to use it only when necessary.
