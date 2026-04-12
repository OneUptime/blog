# Validation Summary: How to Set transactionLifetimeLimitSeconds in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (server parameters, multi-document transactions)
- mongosh (MongoDB Shell)
- mongod configuration
- Node.js MongoDB driver (retry logic example)

## Sources Consulted
- MongoDB Server Parameters documentation: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.transactionLifetimeLimitSeconds
- MongoDB Transactions documentation: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Transactions in Applications (retry logic): https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB currentOp documentation: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB Error Codes reference

## Issues Found

### Issue 1: Incorrect claim about setting value to 0
- **What was wrong:** The post stated "Never set to 0: A value of 0 disables the limit entirely, which is dangerous in production." This is incorrect. MongoDB requires `transactionLifetimeLimitSeconds` to have a minimum value of 1. Setting it to 0 is not accepted by MongoDB and will be rejected with an error. It does not "disable the limit."
- **What was changed:** Replaced with "Minimum value is 1: MongoDB requires this parameter to be at least 1 second. Setting it to 0 is not allowed and will be rejected with an error."
- **Why:** The original text implied that 0 was a valid but dangerous value. In reality, MongoDB enforces a minimum of 1 and will reject 0 outright.

### Issue 2: Incorrect error name for exceeded transaction lifetime
- **What was wrong:** The post stated that the client receives a `TransactionExceededLifetimeLimitError`. This is not an official MongoDB error name or label.
- **What was changed:** Replaced with "the client receives an `ExceededTimeLimit` error (error code 50) with the `TransientTransactionError` label."
- **Why:** The actual MongoDB error code is `ExceededTimeLimit` (code 50), and the error carries the `TransientTransactionError` label, which is what the retry logic in the post correctly checks for. Using the correct error name ensures readers can properly identify and handle the error.

## Review Notes
- The retry logic example correctly checks for the `TransientTransactionError` label, which is the recommended approach per MongoDB documentation.
- The `currentOp` monitoring example uses `secs_running`, which reflects the current operation's duration. For more precise transaction-level timing, `op.transaction.timeOpenMicros` within the transaction subdocument would be more accurate, but the example is acceptable for illustrative purposes.
- The retry loop has no maximum retry count, which could theoretically loop indefinitely. This is a common simplification in examples but worth noting for production use.
- All `setParameter`/`getParameter` command syntax, mongod.conf YAML format, and CLI flag syntax are correct.
- The guidance about applying the setting consistently across all sharded cluster members is accurate.
