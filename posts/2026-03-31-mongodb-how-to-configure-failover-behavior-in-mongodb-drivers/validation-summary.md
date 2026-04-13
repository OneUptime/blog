# Validation Summary: How to Configure Failover Behavior in MongoDB Drivers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Replica Sets, Failover)
- MongoDB Node.js Driver
- PyMongo (Python Driver)
- MongoDB Java Driver
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Server Error Codes reference (`src/mongo/base/error_codes.yml`)
- MongoDB Node.js Driver 4.0 Migration Guide (removal of `waitQueueTimeoutMS`)
- MongoDB Node.js Driver API documentation (MongoClient options)
- PyMongo API documentation (MongoClient parameters)
- MongoDB Java Driver API documentation (MongoClientSettings.Builder)
- MongoDB `hello` command documentation (replacement for deprecated `isMaster`)
- MongoDB Retryable Writes specification

## Issues Found

### 1. Removed Node.js driver option: `waitQueueTimeoutMS`
- **What was wrong:** The `waitQueueTimeoutMS` option was listed in the Node.js driver configuration example. This option was removed in the Node.js driver v4.0 and is not available in current driver versions (v5.x/v6.x).
- **What was changed:** Removed the `waitQueueTimeoutMS: 10000` line and its comment from the Node.js configuration example.
- **Why:** Using a removed option could cause confusion or unexpected behavior for readers using current driver versions.

### 2. Invalid MongoDB error codeName: `NotPrimaryError`
- **What was wrong:** The error handling code checked for `error.codeName === 'NotPrimaryError'`, but `NotPrimaryError` is not a valid MongoDB server error codeName.
- **What was changed:** Replaced `'NotPrimaryError'` with `'PrimarySteppedDown'` (error code 189), which is the correct codeName returned when a primary steps down during an operation.
- **Why:** Using invalid codeNames means the retry logic would never match on these errors, defeating the purpose of the failover handling.

### 3. Invalid MongoDB error codeName: `InterruptedAtPrimaryStepDown`
- **What was wrong:** The error handling code checked for `'InterruptedAtPrimaryStepDown'`, which is not a valid MongoDB server error codeName.
- **What was changed:** Replaced with `'InterruptedDueToReplStateChange'` (error code 11602), which is the correct codeName returned when an operation is interrupted due to a replica set state change such as a stepdown.
- **Why:** Same as above — invalid codeNames would never match, so the retry logic would not work as intended.

### 4. Deprecated shell command: `rs.isMaster()`
- **What was wrong:** The testing section used `rs.isMaster()` to verify primary election. The `isMaster` command was deprecated in MongoDB 5.0 in favor of the `hello` command.
- **What was changed:** Replaced `rs.isMaster()` with `db.hello()`.
- **Why:** Using deprecated commands in a tutorial encourages outdated practices. The `hello` command returns equivalent information and is the recommended approach.

## Review Notes
- The `socketTimeoutMS` option in the Node.js driver is being deprecated in favor of `timeoutMS` (Client Side Operation Timeout / CSOT). It still works in current versions but may be removed in future releases.
- The PyMongo example imports `ReadPreference` and `OperationFailure` but does not use them. This is a minor style issue, not a technical error.
- All timeout values, read preference configurations, and general failover concepts are technically accurate.
- The Java driver code correctly uses the `MongoClientSettings.builder()` API pattern with lambda-based configuration blocks.
