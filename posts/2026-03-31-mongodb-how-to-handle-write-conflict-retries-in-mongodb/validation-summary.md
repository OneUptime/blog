# Validation Summary: How to Handle Write Conflict Retries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (WiredTiger storage engine, multi-document transactions)
- Node.js MongoDB driver (`mongodb` npm package)
- Python PyMongo driver
- Optimistic concurrency control patterns

## Sources Consulted
- MongoDB Server error codes source (`src/mongo/base/error_codes.yml`) — confirmed WriteConflict=112, NoSuchTransaction=251, TransactionTooOld=225
- MongoDB documentation on transactions and error handling — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB documentation on transaction error labels (`TransientTransactionError`, `UnknownTransactionCommitResult`) — https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- PyMongo documentation on `start_session()` and `start_transaction()` context managers — https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html

## Issues Found
1. **Incorrect error code for TransactionTooOld**: The post listed error code `267` as `TransactionTooOld`. Error code 267 is actually `PreparedTransactionInProgress`. The correct code for `TransactionTooOld` is `225`. Fixed in both the prose description and the code comment block.

2. **Silent success after commit retry exhaustion**: In the Node.js `withTransactionRetry` function, after the inner commit retry `while` loop exhausted all retries without a successful commit, the code fell through to a bare `return;` statement — silently treating the operation as successful. Changed to `throw new Error("Transaction commit failed after max retries")` so the caller knows the commit was not confirmed.

3. **Linear backoff mislabeled as exponential**: The retry sleep in the outer catch block used `50 * attempt` (linear backoff) but the comment said "exponential backoff". Changed to `50 * Math.pow(2, attempt)` to match the stated strategy and be consistent with the exponential backoff function shown later in the post.

## Review Notes
- The Python example defines `COMMIT_LABEL = "UnknownTransactionCommitResult"` but never uses it. The `start_transaction()` context manager handles commit automatically but does not retry on `UnknownTransactionCommitResult`. For production use, `session.with_transaction()` is the recommended PyMongo API as it handles both `TransientTransactionError` and `UnknownTransactionCommitResult` automatically. This is not incorrect in the post, but could be improved in a future revision.
- The `abortTransaction()` call after a `TransientTransactionError` is technically redundant since the server typically aborts the transaction automatically on transient errors. The Node.js driver handles this gracefully (it's a no-op), so it's not a bug, but worth noting.
