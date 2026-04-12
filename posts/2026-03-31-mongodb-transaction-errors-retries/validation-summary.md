# Validation Summary: How to Handle Transaction Errors and Retries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, error handling, retry logic)
- MongoDB Node.js Driver (`mongodb` npm package)
- JavaScript / Node.js

## Sources Consulted
- MongoDB error_codes.yml source file: https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.yml
- MongoDB Transactions in Applications documentation: https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB Node.js Driver Transactions documentation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB Production Considerations for Transactions: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- MongoDB Node.js Driver error.ts source: https://github.com/mongodb/node-mongodb-native/blob/main/src/error.ts
- MongoDB setParameter reference for transactionLifetimeLimitSeconds: https://www.mongodb.com/docs/manual/reference/parameters/

## Issues Found
- **Incorrect error codes in `classifyTransactionError` function**: The blog listed error codes 217 and 225 as "Session expired or no longer valid". This was wrong:
  - Code 217 is `IncompleteTransactionHistory` (related to oplog history), not session expiry.
  - Code 225 is `TransactionTooOld` (stale transaction snapshot), not session expiry.
  - **Fix applied**: Replaced codes 217 and 225 with the correct codes for session/transaction validity: 206 (`NoSuchSession`) and 251 (`NoSuchTransaction`). Updated the comment to "Session not found or transaction no longer valid".

## Review Notes
- The `TransientTransactionError` and `UnknownTransactionCommitResult` error label handling is correct and follows MongoDB best practices.
- The `hasErrorLabel()` API on `MongoError` is verified as the correct Node.js driver API.
- The default `transactionLifetimeLimitSeconds` of 60 seconds is confirmed correct.
- Error code 112 (`WriteConflict`) is correct.
- The `TransactionExceededLifetimeLimitSeconds` codeName (error code 290) is confirmed correct.
- The retry wrapper pattern with exponential backoff and jitter is a well-established best practice.
- The idempotency section mentions `UnknownTransactionCommitResult` as the motivation for idempotent operations. Technically, retrying `commitTransaction` is already idempotent at the server level. The idempotency advice is more broadly applicable when entire transactions are retried. This is not incorrect, just slightly imprecise in framing.
