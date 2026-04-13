# Validation Summary: How to Enable Retryable Writes in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server 3.6+)
- MongoDB Node.js Driver
- PyMongo (Python MongoDB Driver)
- MongoDB Retryable Writes specification
- MongoDB Connection Strings

## Sources Consulted
- MongoDB Retryable Writes documentation: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Driver Retryable Writes specification: https://github.com/mongodb/specifications/blob/master/source/retryable-writes/retryable-writes.md
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/
- MongoDB Server Error Codes: https://www.mongodb.com/docs/manual/reference/error-codes/

## Issues Found

1. **Incorrect driver version for default enablement (line 19)**: The post stated retryable writes are enabled by default in "MongoDB drivers 4.0 and later." This is incorrect — retryable writes became the default in MongoDB **4.2-compatible** drivers. Fixed to "MongoDB 4.2-compatible drivers and later."

2. **Incorrect retryable operations table (lines 53-65)**: Multiple errors:
   - `insertMany (ordered)` was listed as not retryable. In reality, `insertMany` is retryable regardless of whether it is ordered or unordered.
   - `bulkWrite (ordered)` was listed as retryable while `bulkWrite with unordered: false` (which IS ordered) was listed as not retryable — a direct contradiction.
   - The actual rule: `bulkWrite` is retryable when it contains only single-document operations (`insertOne`, `updateOne`, `replaceOne`, `deleteOne`), regardless of ordering.
   - Rewrote the table to accurately reflect the MongoDB retryable writes specification.

3. **Misleading Python "disable at collection level" example (lines 104-109)**: The original code used `collection.with_options()` to supposedly disable retryable writes at the collection level. This is incorrect — `with_options()` does not control retryable writes; that setting is only configurable at the client level. Replaced with a correct `MongoClient` constructor example using `retryWrites=False` and added a note clarifying the client-level restriction.

4. **Deprecated error name `NotMaster` (lines 73, 126)**: The `NotMaster` error code was renamed to `NotWritablePrimary` in MongoDB 5.0. Updated both occurrences to use the current name.

5. **Unreliable monitoring approach (lines 146-150)**: The original code checked `event.failure.message.includes("retryable")` to detect retries. MongoDB errors use error labels (e.g., `RetryableWriteError`), not string matching on the message. The "retryable" substring is not guaranteed to appear in error messages. Replaced with straightforward command monitoring that logs failures and successes, which is the correct way to observe driver behavior.

## Review Notes
- The `NotMaster` error code, while renamed to `NotWritablePrimary` in MongoDB 5.0, is still recognized by the server for backwards compatibility. The update to use the modern name improves accuracy for current deployments.
- The idempotency explanation with `lsid` and `txnNumber` in the "Idempotency and the Transaction ID" section is accurate and well-explained.
- The post could benefit from mentioning `retryReads` (available since MongoDB 4.2) as a related feature, but this is outside the stated scope.
- The requirements section is accurate: retryable writes do require a replica set or sharded cluster, MongoDB 3.6+, a compatible driver, and write concern `w: 1` or higher.
