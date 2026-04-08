# Validation Summary: How to Use the Core API for Manual Transaction Control in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, Core API)
- Node.js MongoDB Driver (v5+)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual — Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual — Core API vs Callback API: https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB Node.js Driver API — ClientSession: https://mongodb.github.io/node-mongodb-native/6.0/classes/ClientSession.html
- MongoDB Node.js Driver API — Collection.findOneAndUpdate: https://mongodb.github.io/node-mongodb-native/6.0/classes/Collection.html#findOneAndUpdate
- MongoDB Node.js Driver v5 Migration Guide (breaking changes to findOneAndX return types)

## Issues Found

1. **Description mentioned "savepoints" (line 7)**: MongoDB does not support savepoints — that is a relational database concept. The post itself never discussed savepoints. Changed "savepoints" to "conditional commits" in the description.

2. **`findOneAndUpdate` return value checked via `.value` (line 38)**: In MongoDB Node.js driver v5+, `findOneAndUpdate` returns the document directly (or `null`), not a `{ value: doc }` wrapper. The old `{ value: doc }` format was used in driver v4 and earlier. Changed `if (!reserved.value)` to `if (!reserved)`.

3. **Conditional commit paths: insert then abort (lines 135-141)**: The fraud detection example inserted a "blocked" order document into the `orders` collection and then called `abortTransaction()`, which would roll back that insert — making it pointless. If the intent is to persist the blocked order record (for auditing), the transaction should be committed. Changed `abortTransaction()` to `commitTransaction()` and updated the comment accordingly.

## Review Notes
- The `commitWithRetry` function uses `while (true)` without a maximum retry limit. In production code, a cap should be added to prevent infinite loops, but this is acceptable for an illustrative example.
- The `chargeExternalPaymentGateway` call inside an open transaction (Interleaving section) is a valid pattern but worth noting that long-running external calls can hold the transaction open and risk hitting MongoDB's default 60-second transaction timeout.
- The post correctly distinguishes between the Core API and the Callback API (`withTransaction`) and accurately describes when each is appropriate.
