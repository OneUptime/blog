# Validation Summary: How to Handle Transaction Errors and Retry Logic in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions)
- MongoDB Node.js Driver (`session.withTransaction`, `startTransaction`, `commitTransaction`, `abortTransaction`)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual: Transactions in Applications — https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB Manual: Transaction Error Handling — https://www.mongodb.com/docs/manual/core/transactions/#transactions-retry
- MongoDB Node.js Driver API: ClientSession.withTransaction — https://mongodb.github.io/node-mongodb-native/6.0/classes/ClientSession.html#withTransaction
- MongoDB Manual: Driver Retry Patterns — https://www.mongodb.com/docs/manual/core/transactions-in-applications/#std-label-txn-callback-api

## Issues Found

### 1. `abortTransaction()` called unconditionally after commit failure
- **What was wrong:** In the "Basic Retry Wrapper" code example, `session.abortTransaction()` was called unconditionally in the catch block. If the error originated from `commitTransaction()` with a `TransientTransactionError`, the transaction is already aborted by the server. Calling `abortTransaction()` again throws an error (e.g., "Cannot call abortTransaction twice"), which propagates up and bypasses the retry logic entirely.
- **What was changed:** Wrapped the `abortTransaction()` call in a try-catch so that if the abort fails (because the transaction was already aborted or committed), the retry logic still executes.
- **Why:** The official MongoDB retry patterns (in the MongoDB manual) do not call `abortTransaction()` before retrying on `TransientTransactionError` because the server has already aborted the transaction. Wrapping in try-catch is the safest approach since the error could also come from `txnFunc()` where the transaction is still active and aborting is correct.

### 2. Retry condition included `UnknownTransactionCommitResult` for full transaction retry
- **What was wrong:** The retry condition in the basic retry wrapper used `isTransientError(error)`, which checks for both `TransientTransactionError` and `UnknownTransactionCommitResult`. However, the wrapper retries the *entire* transaction (including the business logic). For `UnknownTransactionCommitResult`, only the commit should be retried — re-running the full transaction could cause double-execution of business logic (e.g., transferring money twice if the original commit actually succeeded). The post itself correctly explains this in the "Handling UnknownTransactionCommitResult" section.
- **What was changed:** Replaced `isTransientError(error)` with `error.hasErrorLabel?.("TransientTransactionError")` in the retry condition so that only `TransientTransactionError` triggers a full transaction retry.
- **Why:** Per MongoDB documentation, `TransientTransactionError` warrants retrying the entire transaction, while `UnknownTransactionCommitResult` should only retry the commit step. The `commitWithRetry` function shown later in the post handles the commit-only retry correctly.

## Review Notes
- The `commitWithRetry` function has no backoff delay or maximum retry limit (infinite `while(true)` loop). This matches the official MongoDB documentation examples but could be problematic in production. Authors may want to add backoff and a retry cap for production use.
- The `isTransientError` utility function is still useful as a general-purpose check for identifying all retryable error labels — it just shouldn't be used to decide whether to retry the *entire transaction* (only `TransientTransactionError` warrants that).
- The `session.withTransaction()` helper also handles `UnknownTransactionCommitResult` automatically (by retrying only the commit), not just `TransientTransactionError`. The post's description that it "automatically retries the entire callback on `TransientTransactionError`" is correct but could mention the commit retry behavior as well.
- The `hasErrorLabel` usage is inconsistent: `isTransientError` uses optional chaining (`?.`) while `commitWithRetry` does not. Both patterns work in typical MongoDB error scenarios, but optional chaining is safer for edge cases with non-MongoDB errors.
