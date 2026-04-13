# Validation Summary: How to Handle Non-Retryable Write Errors in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (server error codes, retryable writes specification)
- Node.js MongoDB driver (v5+) — `MongoServerError`, `MongoBulkWriteError`, `hasErrorLabel`
- PyMongo — `DuplicateKeyError`, `WriteError`, `OperationFailure`

## Sources Consulted
- MongoDB Retryable Writes Specification (mongodb/specifications on GitHub) — retryable error code list
- MongoDB Server Error Codes documentation
- Node.js MongoDB Driver API documentation — `MongoServerError`, `MongoBulkWriteError`, `WriteError` classes
- PyMongo documentation — `pymongo.errors` module

## Issues Found
- **Incorrect retryable error codes in `isRetryableError` function**: The `retryableCodes` set included three codes (63, 150, 134) that are not in the MongoDB retryable writes specification, despite the comment stating "Retryable error codes per MongoDB spec." Code 63 is an obsolete `StaleShardVersion` code, 150 has no well-known retryable mapping, and 134 (`ReadConcernMajorityNotAvailableYet`) appears in the Node.js driver internals but is not part of the written specification. Removed all three codes to align the list with the official spec (6, 7, 89, 91, 189, 9001, 10107, 11600, 11602, 13435, 13436, 262).

## Review Notes
- The use of optional chaining on `err.hasErrorLabel?.('RetryableWriteError')` is unconventional but functionally correct — it safely handles cases where the caught error is not a `MongoError` instance.
- WriteConflict (code 112) is listed as non-retryable, which is correct in the context of the driver's automatic retry mechanism. However, readers working with transactions should be aware that write conflicts in transactions should be retried at the transaction level.
- ExceededTimeLimit (262) remains in the retryable codes list. It was historically included in the spec, though some newer spec revisions have discussed removing it. Its inclusion is defensible.
