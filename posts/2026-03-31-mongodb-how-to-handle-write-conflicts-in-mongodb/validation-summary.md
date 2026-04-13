# Validation Summary: How to Handle Write Conflicts in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, WiredTiger storage engine)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)
- JavaScript (async/await, error handling)
- Python

## Sources Consulted
- MongoDB official documentation on transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB official documentation on transaction error handling and retry: https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB Node.js driver API documentation for ClientSession: https://mongodb.github.io/node-mongodb-native/
- PyMongo documentation on transactions: https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html
- MongoDB serverStatus command reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- WiredTiger transaction statistics documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger

## Issues Found

1. **Introduction: incorrect conflict detection timing** — The post stated MongoDB "detects conflicts at commit time." This is inaccurate; MongoDB's WiredTiger engine detects write-write conflicts eagerly when the conflicting write operation is attempted within a transaction, not at commit time. Changed to "detects conflicts when a conflicting write is attempted."

2. **BAD pattern example: missing session on find()** — In the "Minimizing Conflict Surface Area" section, the "BAD" example's `find({}).toArray()` call did not pass `{ session }`, meaning the read was not actually part of the transaction despite appearing between `startTransaction()` and `commitTransaction()`. This undermined the example's purpose of showing a long-running transaction. Added `{ session }` to the find options so the read is truly inside the transaction, correctly demonstrating the anti-pattern.

3. **Detecting Conflict Metrics: incorrect serverStatus path** — The post used `wiredTiger.concurrentTransactions` with a comment about "write conflict counts." This path actually shows read/write ticket information (available, out, totalTickets), not write conflict statistics. Changed to `wiredTiger.transaction`, which contains transaction-level statistics including conflict data, and updated the comment accordingly.

## Review Notes
- The basic retry pattern treats `TransientTransactionError` and `UnknownTransactionCommitResult` identically by retrying the entire transaction. The MongoDB documentation recommends retrying only the commit for `UnknownTransactionCommitResult` (not the whole transaction). The current approach is safe and correct, but suboptimal since it redoes all transaction work unnecessarily. This is acceptable for a simplified tutorial example.
- The Python example manually implements retry logic with `session.start_transaction()` as a context manager. PyMongo also provides `session.with_transaction(callback)` which handles all retry logic automatically and is the recommended approach for production code. The manual implementation is appropriate for educational purposes.
- The `metrics.document` path in the metrics section shows document-level operation counts (deleted, inserted, returned, updated) which is useful general information but does not specifically surface write conflict counts. The comment "Check operation metrics" is slightly misleading but not incorrect.
