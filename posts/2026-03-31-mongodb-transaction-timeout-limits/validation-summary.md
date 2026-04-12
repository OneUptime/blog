# Validation Summary: How to Set Transaction Timeout Limits in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (multi-document transactions)
- MongoDB `transactionLifetimeLimitSeconds` server parameter
- MongoDB `maxCommitTimeMS` transaction option
- MongoDB `maxTransactionLockRequestTimeoutMillis` server parameter
- MongoDB Node.js driver (`session.withTransaction` API)
- `mongod.conf` configuration

## Sources Consulted
- MongoDB documentation: `transactionLifetimeLimitSeconds` parameter — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.transactionLifetimeLimitSeconds
- MongoDB documentation: Transaction options and `maxCommitTimeMS` — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB documentation: `maxTransactionLockRequestTimeoutMillis` parameter — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.maxTransactionLockRequestTimeoutMillis
- MongoDB Node.js driver documentation: `session.withTransaction()` API — https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB documentation: `db.serverStatus()` transactions metrics — https://www.mongodb.com/docs/manual/reference/command/serverStatus/#transactions

## Issues Found
1. **Misleading section heading and introduction for `maxCommitTimeMS`**: The section was titled "Setting maxTimeMS on Individual Transactions" and the introductory text stated: "set a per-transaction timeout using `maxTimeMS`. This overrides the global limit for a specific transaction." This was incorrect — `maxCommitTimeMS` only limits the duration of the commit phase, not the entire transaction. It does not override `transactionLifetimeLimitSeconds`. The note at the bottom of the section already correctly stated this, but the heading and introduction contradicted it. Fixed by renaming the section to "Setting maxCommitTimeMS on Individual Transactions" and rewriting the introduction to accurately describe `maxCommitTimeMS` as a commit-phase timeout.

## Review Notes
- The `withTransaction` callback API automatically retries on `TransientTransactionError`, so the error-handling example showing a catch for `TransientTransactionError` would only trigger after internal retries are exhausted. This is technically correct but could be called out more explicitly.
- The `serverStatus().transactions` output fields shown (e.g., `totalContactedParticipants`) are specific to sharded cluster deployments and may not appear in standalone or replica set configurations. The example is still valid but could note this nuance.
- The default value of 60 seconds for `transactionLifetimeLimitSeconds`, the default of 5ms for `maxTransactionLockRequestTimeoutMillis`, and the semantics of `-1` and `0` values for lock timeout are all accurate.
- The `setParameter` / `getParameter` command syntax and `mongod.conf` YAML format are correct.
