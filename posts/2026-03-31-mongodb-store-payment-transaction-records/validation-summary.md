# Validation Summary: How to Store Payment Transaction Records in MongoDB

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (document schema design, indexing, update operators)
- Node.js MongoDB driver (`insertOne`, `findOne`, `updateOne`, `createIndex`)
- Stripe payment processor (referenced in examples)

## Sources Consulted
- MongoDB documentation on `createIndex` with `sparse` vs `partialFilterExpression` options: https://www.mongodb.com/docs/manual/core/index-sparse/ and https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB documentation on compound indexes and sparse behavior: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB documentation on `$nin` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/nin/
- MongoDB documentation on `$set` and `$push` update operators: https://www.mongodb.com/docs/manual/reference/operator/update/set/ and https://www.mongodb.com/docs/manual/reference/operator/update/push/
- MongoDB Node.js driver documentation for `insertOne`, `updateOne`, error handling (error code 11000 for duplicate key): https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

1. **Sparse index on compound index doesn't work as intended**: The idempotency key index used `sparse: true` on the compound index `{ idempotencyKey: 1, merchantId: 1 }`. A sparse compound index only excludes documents where *all* indexed fields are missing. Since `merchantId` is always present on every transaction, no documents would ever be excluded — meaning two transactions from the same merchant without an `idempotencyKey` would cause a duplicate key error on the compound value `(null, "merch_456")`. Changed to `partialFilterExpression: { idempotencyKey: { $exists: true } }`, which correctly excludes documents without an `idempotencyKey` from the unique index.

2. **Status field comment missing "void"**: The status field comment listed `pending | processing | succeeded | failed | refunded`, but the `updateTransactionStatus` function's `$nin` guard included `"void"` as a terminal status to guard against double-updates. This implied "void" is a valid status value, but it was missing from the schema comment. Added `void` to the status options comment for consistency.

## Review Notes
- The overall schema design is sound — storing amounts in smallest currency unit (cents), using idempotency keys for deduplication, and the append-only `statusHistory` pattern are all well-established practices.
- The `err.keyPattern?.idempotencyKey` check for identifying which index caused a duplicate key error is correct for the MongoDB Node.js driver.
- The `processorTransactionId` index also uses `sparse: true`, which works correctly there since it's a single-field index and only that one field needs to be present/absent.
- MongoDB `$set` and `$push` used together in a single update operation is valid and correctly demonstrated.
