# Validation Summary: How to Configure Connection Retry Logic in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server 3.6+, 4.2+)
- MongoDB Node.js Driver (`mongodb` npm package)
- PyMongo (Python MongoDB driver)
- Retryable Writes and Retryable Reads
- Exponential backoff with jitter

## Sources Consulted
- MongoDB Retryable Writes documentation: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Retryable Reads documentation: https://www.mongodb.com/docs/manual/core/retryable-reads/
- MongoDB Node.js Driver API documentation: https://www.mongodb.com/docs/drivers/node/current/
- PyMongo errors module documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/errors.html
- MongoDB Server Error Codes: https://www.mongodb.com/docs/manual/reference/error-codes/

## Issues Found
1. **Incorrect version for retryable reads**: The overview stated "MongoDB drivers support retryable writes and reads since version 3.6." Retryable writes were introduced in 3.6, but retryable reads were introduced in 4.2. Fixed to: "retryable writes since version 3.6 and retryable reads since version 4.2."
2. **Incorrect default-enabled version**: The post stated "Retryable writes are enabled by default in MongoDB drivers 4.0+." The correct version is 4.2+, when the default for `retryWrites` changed to `true`. Fixed to "4.2+."

## Review Notes
- The error codes used in the JavaScript retry logic (6, 7, 89, 91, 189, 262, 9001) are valid MongoDB transient/network error codes (HostUnreachable, HostNotFound, NetworkTimeout, ShutdownInProgress, PrimarySteppedDown, ExceededTimeLimit, SocketException).
- In PyMongo, `NetworkTimeout` is a subclass of `AutoReconnect`, so catching both is redundant but harmless and improves readability.
- The `connectWithRetry` function creates the `MongoClient` once outside the retry loop, which is correct — the same client instance can retry `connect()`.
- The claim that `insertMany` with unordered writes is not retried automatically is a reasonable simplification; the actual behavior is that partial progress on unordered bulk writes makes safe retries impossible.
