# Validation Summary: How to Use the readConcernLevel Option in MongoDB Connection Strings

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (replica sets, sharded clusters, connection strings)
- MongoDB Read Concern levels (local, available, majority, linearizable, snapshot)
- Node.js MongoDB Driver
- PyMongo (Python MongoDB Driver)
- Java MongoDB Driver
- Multi-document transactions

## Sources Consulted
- MongoDB Read Concern documentation: https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Transactions and Read Concern: https://www.mongodb.com/docs/manual/core/transactions/#read-concern
- Node.js MongoDB Driver source code (connection_string.ts) for `readConcernLevel` option handling
- PyMongo source code (common.py) for `readConcernLevel` keyword argument validation

## Issues Found

### 1. Per-operation readConcern inside transaction (line ~88)
**What was wrong:** The `withTransaction` example set `readConcern: { level: 'snapshot' }` on the `findOne` call inside the transaction callback, in addition to the transaction-level option. MongoDB ignores per-operation read concern inside transactions — only the transaction-level read concern applies.
**What was changed:** Removed the per-operation `readConcern` from the `findOne` options inside the callback, leaving only `{ session }`. The transaction-level `readConcern` option on `withTransaction` was already correct and remains.
**Why:** Setting per-operation read concern inside a transaction is misleading and could confuse readers into thinking they can override read concern per-operation within transactions.

### 2. `snapshot` read concern description (line ~22)
**What was wrong:** The description said `snapshot` is "used in transactions; reads from a consistent snapshot at transaction start." Since MongoDB 5.0, `snapshot` read concern is also available outside of transactions for `find`, `aggregate`, and `distinct` operations.
**What was changed:** Updated to: "reads from a consistent snapshot; required in transactions, also available outside since MongoDB 5.0."
**Why:** The original wording implied `snapshot` is exclusive to transactions, which is no longer accurate as of MongoDB 5.0.

## Review Notes
- The Node.js driver example uses `readConcernLevel` as a MongoClient constructor option. While this works (the driver has an internal transform for it), the more conventional/idiomatic form is `readConcern: { level: 'majority' }`. Not technically wrong, so left as-is since the post is specifically about the `readConcernLevel` parameter.
- The `linearizable` section correctly shows usage with `findOne` and `maxTimeMS`. It's worth noting that `linearizable` can only be used against the primary and cannot be used in transactions or with causally consistent sessions, but these constraints aren't needed for a connection-string-focused tutorial.
- All code examples (Node.js, PyMongo, Java) are syntactically correct and use current APIs.
