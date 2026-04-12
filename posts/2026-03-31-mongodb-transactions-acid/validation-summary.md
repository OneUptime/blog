# Validation Summary: How to Use MongoDB Transactions for ACID Compliance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.0+ for replica sets, 4.2+ for sharded clusters, 4.4+ for collection creation in transactions)
- Node.js MongoDB driver (`mongodb` npm package)
- PyMongo (Python MongoDB driver)
- mongosh (MongoDB Shell)
- JavaScript / Python

## Sources Consulted
- MongoDB official documentation on transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB documentation on transaction production considerations: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- MongoDB documentation on `transactionLifetimeLimitSeconds`: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.transactionLifetimeLimitSeconds
- MongoDB 4.4 release notes (collection creation in transactions): https://www.mongodb.com/docs/manual/release-notes/4.4/
- PyMongo documentation on `ClientSession.with_transaction()`: https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html
- PyMongo documentation on `start_transaction()` context manager: https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html#pymongo.client_session.ClientSession.start_transaction
- Node.js MongoDB driver documentation on `withTransaction()`: https://mongodb.github.io/node-mongodb-native/

## Issues Found

### 1. Outdated claim: "Transactions cannot create new collections"
- **What was wrong:** The post stated "Transactions cannot create new collections; collections must exist before a transaction starts." This was true before MongoDB 4.4, but since MongoDB 4.4 transactions can create collections and indexes.
- **What was changed:** Updated the Transaction Limits bullet to note this was a pre-4.4 restriction. Also updated the Best Practices and Summary sections to qualify the "pre-create collections" advice with the version caveat.

### 2. Misleading 16MB transaction limit claim
- **What was wrong:** The post stated "Documents modified within a transaction must be less than 16MB total (the BSON document limit)." This incorrectly implies a 16MB aggregate limit across all documents in a transaction. The 16MB BSON limit applies per individual document, not as a total for the transaction.
- **What was changed:** Reworded to "Each individual document is still subject to the 16MB BSON document size limit."

### 3. Incorrect claim about Python context manager handling retries
- **What was wrong:** The Best Practices section stated that both `session.withTransaction()` (Node.js) and `with session.start_transaction()` (Python context manager) handle retries automatically. The Python context manager does NOT retry on transient errors — it only handles commit on normal exit and abort on exception. Only PyMongo's `session.with_transaction(callback)` provides automatic retry logic.
- **What was changed:** Updated the Best Practices to recommend `session.with_transaction()` for retry support in Python, and clarified that the context manager handles commit/abort but not retries. Updated the Summary section similarly.

## Review Notes
- The Python code example uses `__import__("datetime").datetime.utcnow()` which is unconventional and `datetime.utcnow()` is deprecated in Python 3.12+ in favor of `datetime.now(datetime.UTC)`. This is a minor style/deprecation issue that does not affect correctness for current Python versions.
- The Python code example uses the `with session.start_transaction():` context manager (no retries), while the Node.js example uses `withTransaction()` (with retries). This inconsistency is now documented in the Best Practices section but the code examples themselves were left as-is since both patterns are valid and the post explains the difference.
- The `OperationFailure` import in the Python example is unused but harmless.
- The mongosh example passes `{ session }` as an option to operations called on collections obtained via `session.getDatabase()`, which is redundant but not harmful.
