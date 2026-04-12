# Validation Summary: How to Implement Pessimistic Locking in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js (JavaScript)
- MongoDB multi-document transactions

## Sources Consulted
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB findOneAndUpdate documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Transactions documentation: https://www.mongodb.com/docs/manual/core/transactions/
- Mongoose Schema documentation: https://mongoosejs.com/docs/guide.html
- Mongoose Transactions documentation: https://mongoosejs.com/docs/transactions.html

## Issues Found

### Issue 1 (Critical): TTL index on `lockExpiresAt` would delete entire documents
- **What was wrong:** The schema defined `lockExpiresAt` with `index: { expireAfterSeconds: 0 }`, which creates a MongoDB TTL index. TTL indexes automatically delete the entire document once the indexed date field value is reached. This means MongoDB would delete account documents when their locks expire — a catastrophic data loss bug.
- **What was changed:** Removed the `index: { expireAfterSeconds: 0 }` option from the `lockExpiresAt` field definition. The application code already handles expired locks correctly via the query filter `{ lockExpiresAt: { $lt: now } }` in the `acquireLock` function, so the TTL index is unnecessary.
- **Why:** TTL indexes are designed for data that should be automatically purged (e.g., session records, temporary tokens). They must never be placed on fields within documents that represent persistent business data like account balances.

### Issue 2: Unused `lockToken` variable in `acquireLock`
- **What was wrong:** The `acquireLock` function generated a `lockToken` using `crypto.randomBytes(16).toString('hex')` but never stored it in the document. The `lockedBy` field was set to the `lockHolder` parameter instead. The function returned `lockToken`, but no caller used the return value. This was dead code that would mislead readers into thinking the token was part of the locking mechanism.
- **What was changed:** Removed the `crypto` require statement, the `lockToken` generation, and the `return lockToken` statement.
- **Why:** The lock identification is correctly handled by the `lockHolder` string (used in both `acquireLock` and `releaseLock`). The unused token added confusion without serving any purpose.

## Review Notes
- The `transferFunds` function correctly acquires locks in a sorted, consistent order to prevent deadlocks — this is good practice.
- The transfer operation performs two separate `findByIdAndUpdate` calls without a MongoDB session/transaction. While the pessimistic lock prevents concurrent access, this is not crash-safe: if the process dies between the debit and credit, funds would be lost. The post does present transactions as an alternative in the next section, which partially addresses this. In production, combining pessimistic locking with transactions would be the safest approach.
- The "Querying for Stale Locks" section uses MongoDB shell syntax (`db.accounts.find(...)`) while the rest of the post uses Mongoose. This is a minor inconsistency but not technically incorrect.
- The summary's claim to "prefer MongoDB transactions over manual locking when the operation spans fewer than three documents" is somewhat arbitrary — there is no special significance to the number three. The real consideration is whether the complexity of manual locking is justified over using built-in transaction support.
